import "server-only";
import { randomUUID } from "node:crypto";
import { validateCupMatchInput } from "./business.js";
import { findOrCreateTeam } from "./matches.js";
import { getDatabase } from "./db.js";
import { recordAudit } from "./audit.js";

function validId(value) {
  return typeof value === "string" && value.length > 0 && value.length <= 100;
}

function inTransaction(db, action) {
  db.exec("BEGIN IMMEDIATE");
  try {
    const result = action();
    db.exec("COMMIT");
    return result;
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}

function isSeasonGeneralForfeiter(db, seasonId, teamId) {
  return Boolean(db.prepare("SELECT 1 FROM season_team_forfeits WHERE season_id = ? AND team_id = ?").get(seasonId, teamId));
}

function mapCupMatch(match) {
  if (!match) return null;
  return { ...match, forfeitingSide: match.status === "forfait" ? match.forfeitingSide : null };
}

function findCupMatch(db, matchId) {
  return db.prepare(
    `SELECT m.id, m.season_id AS seasonId, m.match_date AS matchDate,
       m.opponent_name AS opponentName, m.cup_phase AS phase,
       m.team_a_id AS teamAId, m.team_b_id AS teamBId,
       m.forfeiting_team_id AS forfeitingTeamId,
       CASE WHEN m.forfeiting_team_id = m.team_a_id THEN 'A'
            WHEN m.forfeiting_team_id = m.team_b_id THEN 'B' ELSE NULL END AS forfeitingSide,
       m.score_a AS scoreA, m.score_b AS scoreB, m.status
     FROM matches m
     WHERE m.id = ? AND m.match_type = 'cup'`
  ).get(matchId);
}

export function listCupMatches(seasonId) {
  if (!validId(seasonId)) return [];
  return getDatabase().prepare(
    `SELECT id, season_id AS seasonId, match_date AS matchDate,
       opponent_name AS opponentName, cup_phase AS phase,
       forfeiting_team_id AS forfeitingTeamId,
       CASE WHEN forfeiting_team_id = team_a_id THEN 'A'
            WHEN forfeiting_team_id = team_b_id THEN 'B' ELSE NULL END AS forfeitingSide,
       score_a AS scoreA, score_b AS scoreB, status
     FROM matches
     WHERE season_id = ? AND match_type = 'cup'
     ORDER BY match_date, created_at, id`
  ).all(seasonId).map(mapCupMatch);
}

export function createCupMatch(seasonId, input, actor) {
  if (!validId(seasonId)) return { ok: false, error: "La saison sélectionnée est invalide." };
  const validation = validateCupMatchInput(input);
  if (!validation.ok) return validation;
  const db = getDatabase();
  if (!db.prepare("SELECT id FROM seasons WHERE id = ?").get(seasonId)) {
    return { ok: false, status: 404, error: "Saison introuvable." };
  }

  const matchId = randomUUID();
  const { opponentName, phase, matchDate } = validation.value;
  let status = validation.value.status;
  let scoreA = validation.value.scoreA;
  let scoreB = validation.value.scoreB;
  if (status === "à venir") { scoreA = null; scoreB = null; }
  else if (status === "forfait") {
    scoreA = validation.value.forfeitingSide === "A" ? 0 : 3;
    scoreB = validation.value.forfeitingSide === "A" ? 3 : 0;
  }
  const now = new Date().toISOString();
  let opponentTeam;
  let forfeitingTeamId = null;
  let generalOpponent = false;
  let generalConflict = false;
  inTransaction(db, () => {
    opponentTeam = findOrCreateTeam(db, opponentName);
    const generalRoquette = isSeasonGeneralForfeiter(db, seasonId, "team-roquette");
    generalOpponent = isSeasonGeneralForfeiter(db, seasonId, opponentTeam.id);
    if (generalRoquette && generalOpponent) { generalConflict = true; return; }
    if (status !== "annulé" && (generalRoquette || generalOpponent)) {
      status = "forfait";
      forfeitingTeamId = generalRoquette ? "team-roquette" : opponentTeam.id;
      scoreA = generalRoquette ? 0 : 3;
      scoreB = generalOpponent ? 0 : 3;
    } else if (status === "forfait") forfeitingTeamId = validation.value.forfeitingSide === "A" ? "team-roquette" : opponentTeam.id;
    db.prepare(
      `INSERT INTO matches (id, season_id, round_id, match_type, slot_number, match_date,
         team_a_id, team_b_id, opponent_name, cup_phase, roquette_side, forfeiting_team_id,
         score_a, score_b, status, created_at, updated_at)
       VALUES (?, ?, NULL, 'cup', NULL, ?, 'team-roquette', ?, ?, ?, 'A', ?, ?, ?, ?, ?, ?)`
    ).run(matchId, seasonId, matchDate, opponentTeam.id, opponentName, phase, forfeitingTeamId, scoreA, scoreB, status, now, now);
    if (generalOpponent && status === "forfait") {
      db.prepare(
        `INSERT INTO player_match_stats (match_id, player_id, presence, goals, assists, referee_payment, mom)
         VALUES (?, 'player-csc', 0, 3, 0, 0, 0)`
      ).run(matchId);
    }
    recordAudit({ actor, action: "match.cup.create", entityType: "match", entityId: matchId,
      after: { seasonId, matchDate, opponentName, phase, scoreA, scoreB, status, forfeitingTeamId } });
  });
  if (generalConflict) return { ok: false, status: 409, error: "Deux équipes en forfait général ne peuvent pas être opposées." };
  return { ok: true, match: { id: matchId, seasonId, matchDate, opponentName, phase, scoreA, scoreB, status,
    forfeitingSide: status === "forfait" ? (forfeitingTeamId === "team-roquette" ? "A" : "B") : null } };
}

export function updateCupMatch(matchId, input, actor) {
  if (!validId(matchId)) return { ok: false, error: "Match invalide." };
  const validation = validateCupMatchInput(input);
  if (!validation.ok) return validation;
  const db = getDatabase();
  const before = findCupMatch(db, matchId);
  if (!before) return { ok: false, status: 404, error: "Match de coupe introuvable." };
  if (isSeasonGeneralForfeiter(db, before.seasonId, before.teamAId) || isSeasonGeneralForfeiter(db, before.seasonId, before.teamBId)) {
    return { ok: false, status: 409, error: "Ce match est verrouillé par le forfait général déclaré pour cette saison." };
  }

  const { opponentName, phase, matchDate } = validation.value;
  let status = validation.value.status;
  let scoreA = validation.value.scoreA;
  let scoreB = validation.value.scoreB;
  if (status === "à venir") { scoreA = null; scoreB = null; }
  else if (status === "forfait") {
    scoreA = validation.value.forfeitingSide === "A" ? 0 : 3;
    scoreB = validation.value.forfeitingSide === "A" ? 3 : 0;
  }
  const now = new Date().toISOString();
  let opponentTeam;
  let forfeitingTeamId = null;
  let generalConflict = false;
  inTransaction(db, () => {
    opponentTeam = findOrCreateTeam(db, opponentName);
    const generalRoquette = isSeasonGeneralForfeiter(db, before.seasonId, "team-roquette");
    const generalOpponent = isSeasonGeneralForfeiter(db, before.seasonId, opponentTeam.id);
    if (generalRoquette && generalOpponent) { generalConflict = true; return; }
    if (status !== "annulé" && (generalRoquette || generalOpponent)) {
      status = "forfait";
      forfeitingTeamId = generalRoquette ? "team-roquette" : opponentTeam.id;
      scoreA = generalRoquette ? 0 : 3;
      scoreB = generalOpponent ? 0 : 3;
    } else if (status === "forfait") forfeitingTeamId = validation.value.forfeitingSide === "A" ? "team-roquette" : opponentTeam.id;
    db.prepare(
      `UPDATE matches SET match_date = ?, opponent_name = ?, cup_phase = ?,
         team_a_id = 'team-roquette', team_b_id = ?, roquette_side = 'A',
         score_a = ?, score_b = ?, status = ?, forfeiting_team_id = ?, updated_at = ?
       WHERE id = ? AND match_type = 'cup'`
    ).run(matchDate, opponentName, phase, opponentTeam.id, scoreA, scoreB, status, forfeitingTeamId, now, matchId);
    if (generalOpponent && status === "forfait") {
      db.prepare(
        `INSERT INTO player_match_stats (match_id, player_id, presence, goals, assists, referee_payment, mom)
         VALUES (?, 'player-csc', 0, 3, 0, 0, 0)
         ON CONFLICT(match_id, player_id) DO UPDATE SET presence = 0, goals = 3, assists = 0, referee_payment = 0, mom = 0`
      ).run(matchId);
    }
    recordAudit({ actor, action: "match.cup.update", entityType: "match", entityId: matchId,
      before: { seasonId: before.seasonId, ...mapCupMatch(before) },
      after: { seasonId: before.seasonId, matchDate, opponentName, phase, scoreA, scoreB, status, forfeitingTeamId } });
  });
  if (generalConflict) return { ok: false, status: 409, error: "Deux équipes en forfait général ne peuvent pas être opposées." };
  return { ok: true, match: { id: matchId, seasonId: before.seasonId, matchDate, opponentName, phase, scoreA, scoreB, status,
    forfeitingSide: status === "forfait" ? (forfeitingTeamId === "team-roquette" ? "A" : "B") : null } };
}

export function getAdminMatchDetails(matchId) {
  if (!validId(matchId)) return null;
  const match = getDatabase().prepare(
    `SELECT m.id, m.season_id AS seasonId, s.label AS seasonLabel,
       m.match_type AS type, m.match_date AS matchDate,
       m.status, m.score_a AS scoreA, m.score_b AS scoreB,
       m.forfeiting_team_id AS forfeitingTeamId,
       m.original_score_a AS originalScoreA, m.original_score_b AS originalScoreB,
       CASE WHEN sf.team_id IS NULL THEN 0 ELSE 1 END AS isGeneralForfeit,
       CASE WHEN sf.team_id IS NOT NULL AND m.original_score_a IS NULL AND m.original_score_b IS NULL THEN 1 ELSE 0 END AS generalForfeitGoalsLocked,
       m.opponent_name AS opponentName, m.cup_phase AS phase,
       m.slot_number AS slotNumber, r.round_number AS roundNumber,
       CASE WHEN m.match_type = 'cup' THEN 'Team Roquette'
            WHEN m.team_a_id = 'team-roquette' THEN 'Team Roquette' ELSE ta.name END AS teamA,
       CASE WHEN m.match_type = 'cup' THEN m.opponent_name
            WHEN m.team_b_id = 'team-roquette' THEN 'Team Roquette' ELSE tb.name END AS teamB,
       CASE WHEN m.match_type = 'cup' THEN 1
            WHEN m.team_a_id = 'team-roquette' OR m.team_b_id = 'team-roquette' THEN 1 ELSE 0 END AS involvesRoquette
     FROM matches m
     JOIN seasons s ON s.id = m.season_id
     LEFT JOIN rounds r ON r.id = m.round_id
     LEFT JOIN teams ta ON ta.id = m.team_a_id
     LEFT JOIN teams tb ON tb.id = m.team_b_id
     LEFT JOIN season_team_forfeits sf ON sf.season_id = m.season_id AND sf.team_id = m.forfeiting_team_id
     WHERE m.id = ?`
  ).get(matchId);
  return match ? {
    ...match,
    involvesRoquette: match.involvesRoquette === 1,
    isGeneralForfeit: match.isGeneralForfeit === 1,
    generalForfeitGoalsLocked: match.generalForfeitGoalsLocked === 1,
  } : null;
}
