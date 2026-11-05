import "server-only";
import { randomUUID } from "node:crypto";
import { validateRegularMatchInput } from "./business.js";
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

export function findOrCreateTeam(db, name) {
  if (!name) return null;
  const existing = db.prepare("SELECT id, name, is_roquette AS isRoquette FROM teams WHERE lower(name) = lower(?)").get(name);
  if (existing) return { ...existing, isRoquette: existing.isRoquette === 1 };
  const id = randomUUID();
  const isRoquette = name.toLocaleLowerCase("fr-FR") === "team roquette";
  db.prepare("INSERT INTO teams (id, name, is_roquette, forfait_general) VALUES (?, ?, ?, 0)")
    .run(id, isRoquette ? "Team Roquette" : name, isRoquette ? 1 : 0);
  return { id, name: isRoquette ? "Team Roquette" : name, isRoquette };
}

function getMatchDetails(db, matchId) {
  return db.prepare(
    `SELECT m.id, m.season_id AS seasonId, m.round_id AS roundId,
       r.round_number AS roundNumber, m.slot_number AS slotNumber,
       m.match_date AS matchDate, m.team_a_id AS teamAId, ta.name AS teamA,
       m.team_b_id AS teamBId, tb.name AS teamB,
       m.score_a AS scoreA, m.score_b AS scoreB, m.status,
       m.forfeiting_team_id AS forfeitingTeamId,
       CASE WHEN m.forfeiting_team_id = m.team_a_id THEN 'A'
            WHEN m.forfeiting_team_id = m.team_b_id THEN 'B' ELSE NULL END AS forfeitingSide
     FROM matches m
     JOIN rounds r ON r.id = m.round_id
     LEFT JOIN teams ta ON ta.id = m.team_a_id
     LEFT JOIN teams tb ON tb.id = m.team_b_id
     WHERE m.id = ? AND m.match_type = 'regular'`
  ).get(matchId);
}

function isSeasonGeneralForfeiter(db, seasonId, teamId) {
  return Boolean(db.prepare("SELECT 1 FROM season_team_forfeits WHERE season_id = ? AND team_id = ?").get(seasonId, teamId));
}

export function listTeams(seasonId) {
  if (!validId(seasonId)) return [];
  return getDatabase().prepare(
    `SELECT t.id, t.name, t.is_roquette AS isRoquette
     FROM season_teams st JOIN teams t ON t.id = st.team_id
     WHERE st.season_id = ?
     ORDER BY t.is_roquette DESC, lower(t.name)`
  ).all(seasonId).map((team) => ({ ...team, isRoquette: team.isRoquette === 1 }));
}

export function listSeasonRoundSummaries(seasonId) {
  if (!validId(seasonId)) return [];
  return getDatabase().prepare(
    `SELECT r.round_number AS roundNumber, COUNT(m.id) AS matchCount,
       SUM(CASE WHEN m.score_a IS NOT NULL AND m.score_b IS NOT NULL THEN 1 ELSE 0 END) AS scoredMatchCount,
       SUM(CASE WHEN m.status = 'à venir' THEN 1 ELSE 0 END) AS upcomingMatchCount,
       SUM(CASE WHEN m.status IN ('forfait', 'terminé') THEN 1 ELSE 0 END) AS resultMatchCount,
       SUM(CASE WHEN m.match_date < date('now', 'localtime')
         AND (m.score_a IS NULL OR m.score_b IS NULL) THEN 1 ELSE 0 END) AS pastUnscoredMatchCount
     FROM rounds r
     LEFT JOIN matches m ON m.round_id = r.id AND m.match_type = 'regular'
     WHERE r.season_id = ?
     GROUP BY r.id, r.round_number
     ORDER BY r.round_number`
  ).all(seasonId).map((round) => ({
    ...round,
    matchCount: Number(round.matchCount),
    scoredMatchCount: Number(round.scoredMatchCount),
    upcomingMatchCount: Number(round.upcomingMatchCount),
    resultMatchCount: Number(round.resultMatchCount),
    pastUnscoredMatchCount: Number(round.pastUnscoredMatchCount),
  }));
}

export function listRegularRoundMatches(seasonId, roundNumber) {
  if (!validId(seasonId) || !Number.isInteger(roundNumber) || roundNumber < 1 || roundNumber > 26) return [];
  return getDatabase().prepare(
    `SELECT m.id, r.round_number AS roundNumber, m.slot_number AS slotNumber,
       m.match_date AS matchDate, m.team_a_id AS teamAId, ta.name AS teamA,
       m.team_b_id AS teamBId, tb.name AS teamB,
       m.score_a AS scoreA, m.score_b AS scoreB, m.status,
       m.forfeiting_team_id AS forfeitingTeamId,
       CASE WHEN m.forfeiting_team_id = m.team_a_id THEN 'A'
            WHEN m.forfeiting_team_id = m.team_b_id THEN 'B' ELSE NULL END AS forfeitingSide,
       CASE WHEN m.team_a_id = 'team-roquette' OR m.team_b_id = 'team-roquette' THEN 1 ELSE 0 END AS involvesRoquette
     FROM matches m
     JOIN rounds r ON r.id = m.round_id
     LEFT JOIN teams ta ON ta.id = m.team_a_id
     LEFT JOIN teams tb ON tb.id = m.team_b_id
     WHERE m.season_id = ? AND r.round_number = ? AND m.match_type = 'regular'
     ORDER BY m.slot_number`
  ).all(seasonId, roundNumber).map((match) => ({ ...match, involvesRoquette: match.involvesRoquette === 1 }));
}

export function updateRegularMatch(matchId, input, actor) {
  if (!validId(matchId)) return { ok: false, error: "Match invalide." };
  const validation = validateRegularMatchInput(input);
  if (!validation.ok) return validation;
  const db = getDatabase();
  const before = getMatchDetails(db, matchId);
  if (!before) return { ok: false, status: 404, error: "Match de saison régulière introuvable." };
  if (isSeasonGeneralForfeiter(db, before.seasonId, before.teamAId) || isSeasonGeneralForfeiter(db, before.seasonId, before.teamBId)) {
    return { ok: false, status: 409, error: "Ce match est verrouillé par le forfait général déclaré pour cette saison." };
  }

  try {
    return inTransaction(db, () => {
      const { teamA, teamB, matchDate } = validation.value;
      const teamARecord = findOrCreateTeam(db, teamA);
      const teamBRecord = findOrCreateTeam(db, teamB);
      if (teamARecord && teamBRecord && teamARecord.id === teamBRecord.id) {
        return { ok: false, error: "Un match doit opposer deux équipes différentes." };
      }

      let scoreA = validation.value.scoreA;
      let scoreB = validation.value.scoreB;
      let status = validation.value.status;
      let forfeitingTeamId = null;
      const generalA = teamARecord && isSeasonGeneralForfeiter(db, before.seasonId, teamARecord.id);
      const generalB = teamBRecord && isSeasonGeneralForfeiter(db, before.seasonId, teamBRecord.id);
      if (generalA && generalB) return { ok: false, status: 409, error: "Deux équipes en forfait général ne peuvent pas être opposées." };
      if (generalA || generalB) {
        forfeitingTeamId = generalA ? teamARecord.id : teamBRecord.id;
        status = "forfait";
        scoreA = generalA ? 0 : 3;
        scoreB = generalB ? 0 : 3;
      } else if (status === "à venir") {
        scoreA = null;
        scoreB = null;
      } else if (status === "forfait") {
        forfeitingTeamId = validation.value.forfeitingSide === "A" ? teamARecord.id : teamBRecord.id;
        scoreA = validation.value.forfeitingSide === "A" ? 0 : 3;
        scoreB = validation.value.forfeitingSide === "A" ? 3 : 0;
      }
      const roquetteSide = teamARecord?.isRoquette ? "A" : teamBRecord?.isRoquette ? "B" : null;
      let playerStatsBefore = null;
      let playerStatsAfter = null;
      if ((generalA || generalB) && roquetteSide && before.status === "à venir") {
        playerStatsBefore = db.prepare(
          `SELECT player_id AS playerId, presence, goals, assists, referee_payment AS refereePayment, mom
           FROM player_match_stats WHERE match_id = ? ORDER BY player_id`
        ).all(matchId);
        db.prepare("UPDATE player_match_stats SET goals = 0 WHERE match_id = ? AND player_id <> 'player-csc'").run(matchId);
        if (forfeitingTeamId === "team-roquette") {
          db.prepare("UPDATE player_match_stats SET goals = 0 WHERE match_id = ? AND player_id = 'player-csc'").run(matchId);
        } else {
          db.prepare(
            `INSERT INTO player_match_stats (match_id, player_id, presence, goals, assists, referee_payment, mom)
             VALUES (?, 'player-csc', 0, 3, 0, 0, 0)
             ON CONFLICT(match_id, player_id) DO UPDATE SET presence = 0, goals = 3, assists = 0, referee_payment = 0, mom = 0`
          ).run(matchId);
        }
        playerStatsAfter = db.prepare(
          `SELECT player_id AS playerId, presence, goals, assists, referee_payment AS refereePayment, mom
           FROM player_match_stats WHERE match_id = ? ORDER BY player_id`
        ).all(matchId);
      }
      const now = new Date().toISOString();
      db.prepare(
        `UPDATE matches SET match_date = ?, team_a_id = ?, team_b_id = ?,
           score_a = ?, score_b = ?, status = ?, forfeiting_team_id = ?,
           roquette_side = ?, updated_at = ? WHERE id = ?`
      ).run(matchDate, teamARecord?.id ?? null, teamBRecord?.id ?? null,
        scoreA, scoreB, status, forfeitingTeamId, roquetteSide, now, matchId);

      const effectiveForfeitingSide = status === "forfait" ? (forfeitingTeamId === teamARecord?.id ? "A" : "B") : null;
      const after = {
        seasonId: before.seasonId,
        roundNumber: before.roundNumber,
        slotNumber: before.slotNumber,
        matchDate,
        teamA: teamARecord?.name ?? null,
        teamB: teamBRecord?.name ?? null,
        scoreA,
        scoreB,
        status,
        forfeitingSide: effectiveForfeitingSide,
      };
      recordAudit({ actor, action: "match.regular.update", entityType: "match", entityId: matchId,
        before: {
          seasonId: before.seasonId,
          roundNumber: before.roundNumber,
          slotNumber: before.slotNumber,
          matchDate: before.matchDate,
          teamA: before.teamA,
          teamB: before.teamB,
          scoreA: before.scoreA,
          scoreB: before.scoreB,
          status: before.status,
          forfeitingSide: before.forfeitingSide,
          playerStats: playerStatsBefore,
        },
        after: { seasonId: before.seasonId, ...after, playerStats: playerStatsAfter },
      });
      return { ok: true, match: { id: matchId, ...after, teamAId: teamARecord?.id ?? null, teamBId: teamBRecord?.id ?? null, forfeitingTeamId } };
    });
  } catch (error) {
    if (String(error?.message).includes("UNIQUE constraint failed: teams.name")) {
      return { ok: false, status: 409, error: "Une équipe portant ce nom existe déjà." };
    }
    throw error;
  }
}
