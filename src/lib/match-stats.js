import "server-only";
import { validateMatchPlayerStatsInput } from "./business.js";
import { getAdminMatchDetails } from "./cup-matches.js";
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

function mapRow(row) {
  return {
    ...row,
    presence: row.presence === 1,
    refereePayment: row.refereePayment === 1,
    mom: row.mom === 1,
    isActive: row.isActive === 1,
    isFake: row.isFake === 1,
    hasStats: row.hasStats === 1,
    isPriority: row.isPriority === 1,
  };
}

function compareRosterRows(a, b) {
  if (a.isFake !== b.isFake) return a.isFake ? 1 : -1;
  if (a.presence !== b.presence) return a.presence ? -1 : 1;
  return (a.lastName ?? "").localeCompare(b.lastName ?? "", "fr-FR") ||
    (a.firstName ?? "").localeCompare(b.firstName ?? "", "fr-FR");
}

export function getMatchPlayerRoster(matchId) {
  const match = getAdminMatchDetails(matchId);
  if (!match || !match.involvesRoquette) return null;
  const db = getDatabase();
  const rows = db.prepare(
    `SELECT p.id AS playerId, p.first_name AS firstName, p.last_name AS lastName,
       p.status, p.is_fake AS isFake, sp.jersey_number AS jerseyNumber,
       sp.is_active AS isActive,
       COALESCE(pms.presence, 0) AS presence,
       COALESCE(pms.goals, 0) AS goals,
       COALESCE(pms.assists, 0) AS assists,
       COALESCE(pms.referee_payment, 0) AS refereePayment,
       COALESCE(pms.mom, 0) AS mom,
       CASE WHEN pms.match_id IS NULL THEN 0 ELSE 1 END AS hasStats,
       CASE WHEN p.status = 'actif' AND sp.is_active = 1 AND COALESCE(payments.paymentCount, 0) = 0 THEN 1 ELSE 0 END AS isPriority
     FROM season_players sp
     JOIN players p ON p.id = sp.player_id
     LEFT JOIN player_match_stats pms ON pms.player_id = p.id AND pms.match_id = ?
     LEFT JOIN (
       SELECT pms2.player_id, SUM(pms2.referee_payment) AS paymentCount
       FROM player_match_stats pms2
       JOIN matches pm ON pm.id = pms2.match_id
       WHERE pm.season_id = ? AND pm.status NOT IN ('à venir', 'annulé')
       GROUP BY pms2.player_id
     ) payments ON payments.player_id = p.id
     WHERE sp.season_id = ? AND p.is_fake = 0
       AND ((sp.is_active = 1 AND p.status = 'actif') OR pms.match_id IS NOT NULL)
     ORDER BY COALESCE(pms.presence, 0) DESC, lower(p.last_name), lower(p.first_name)`
  ).all(matchId, match.seasonId, match.seasonId).map(mapRow);
  if (match.involvesRoquette) {
    const csc = db.prepare(
      `SELECT p.id AS playerId, p.first_name AS firstName, p.last_name AS lastName,
         p.status, p.is_fake AS isFake, NULL AS jerseyNumber, 0 AS isActive,
         COALESCE(pms.presence, 0) AS presence, COALESCE(pms.goals, 0) AS goals,
         COALESCE(pms.assists, 0) AS assists, COALESCE(pms.referee_payment, 0) AS refereePayment,
         COALESCE(pms.mom, 0) AS mom, CASE WHEN pms.match_id IS NULL THEN 0 ELSE 1 END AS hasStats,
         0 AS isPriority
       FROM players p LEFT JOIN player_match_stats pms ON pms.player_id = p.id AND pms.match_id = ?
       WHERE p.id = 'player-csc'`
    ).get(matchId);
    if (csc) rows.push(mapRow(csc));
  }
  return { match, players: rows.sort(compareRosterRows) };
}

export function updateMatchPlayerStats(matchId, input, actor) {
  if (!validId(matchId)) return { ok: false, error: "Match invalide." };
  const validation = validateMatchPlayerStatsInput(input);
  if (!validation.ok) return validation;
  const db = getDatabase();
  const match = getAdminMatchDetails(matchId);
  if (!match || !match.involvesRoquette) return { ok: false, status: 404, error: "Match de Team Roquette introuvable." };
  if (match.status === "annulé") return { ok: false, error: "Les statistiques ne peuvent pas être saisies pour un match annulé." };

  const roster = db.prepare(
    `SELECT p.id, p.status, p.is_fake AS isFake, sp.is_active AS isActive
     FROM season_players sp JOIN players p ON p.id = sp.player_id
     WHERE sp.season_id = ?`
  ).all(match.seasonId);
  const rosterById = new Map(roster.map((player) => [player.id, player]));
  const existing = db.prepare(
    `SELECT player_id AS playerId, presence, goals, assists,
       referee_payment AS refereePayment, mom
     FROM player_match_stats WHERE match_id = ?`
  ).all(matchId);
  const existingById = new Map(existing.map((row) => [row.playerId, row]));
  const updates = validation.value.players;

  for (const row of updates) {
    const player = rosterById.get(row.playerId);
    const isCsc = row.playerId === "player-csc";
    if (isCsc) {
      if (!match.involvesRoquette) return { ok: false, error: "CSC n’est disponible que pour un match de Team Roquette." };
      if (row.presence || row.assists || row.refereePayment || row.mom) {
        return { ok: false, error: "CSC ne peut recevoir que des buts contre son camp." };
      }
    } else if (!player || player.isFake === 1) {
      return { ok: false, error: "Un joueur n’appartient pas à l’effectif de cette saison." };
    } else if (player.status !== "actif" || player.isActive !== 1) {
      if (!existingById.has(row.playerId)) return { ok: false, error: "Un joueur retiré ou inactif ne peut pas être sélectionné pour ce match." };
    }
  }

  const finalStats = new Map(existing.map((row) => [row.playerId, {
    presence: row.presence === 1,
    goals: row.goals,
    assists: row.assists,
    refereePayment: row.refereePayment === 1,
    mom: row.mom === 1,
  }]));
  for (const row of updates) {
    finalStats.set(row.playerId, {
      presence: row.presence, goals: row.goals, assists: row.assists,
      refereePayment: row.refereePayment, mom: row.mom,
    });
  }
  if (match.generalForfeitGoalsLocked) {
    const cscGoals = finalStats.get("player-csc")?.goals ?? 0;
    const realPlayerGoals = [...finalStats.entries()].filter(([playerId]) => playerId !== "player-csc").some(([, row]) => row.goals !== 0);
    const requiredCscGoals = match.forfeitingTeamId === "team-roquette" ? 0 : 3;
    if (cscGoals !== requiredCscGoals || realPlayerGoals) {
      return { ok: false, error: "Les buts d’un match à venir en forfait général sont fixés automatiquement." };
    }
  }

  inTransaction(db, () => {
    const upsert = db.prepare(
      `INSERT INTO player_match_stats (match_id, player_id, presence, goals, assists, referee_payment, mom)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(match_id, player_id) DO UPDATE SET
         presence = excluded.presence, goals = excluded.goals, assists = excluded.assists,
         referee_payment = excluded.referee_payment, mom = excluded.mom`
    );
    for (const row of updates) {
      const previous = existingById.get(row.playerId);
      const isEmpty = !row.presence && row.goals === 0 && row.assists === 0 && !row.refereePayment && !row.mom;
      if (isEmpty && !previous) continue;
      upsert.run(matchId, row.playerId, row.presence ? 1 : 0, row.goals, row.assists, row.refereePayment ? 1 : 0, row.mom ? 1 : 0);
    }
    const after = db.prepare(
      `SELECT player_id AS playerId, presence, goals, assists,
         referee_payment AS refereePayment, mom
       FROM player_match_stats WHERE match_id = ? ORDER BY player_id`
    ).all(matchId);
    recordAudit({ actor, action: "match.players.update", entityType: "match", entityId: matchId,
      before: { status: match.status, players: existing },
      after: { status: match.status, players: after } });
  });
  return { ok: true, stats: getMatchPlayerRoster(matchId) };
}
