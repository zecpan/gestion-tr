import "server-only";
import { randomUUID } from "node:crypto";
import { validateJerseyNumber, validatePlayerInput } from "./business.js";
import { getDatabase } from "./db.js";
import { recordAudit } from "./audit.js";

function validId(value) {
  return typeof value === "string" && value.length > 0 && value.length <= 100;
}

function checkDuplicateJersey(db, seasonId, jerseyNumber, exceptPlayerId = null) {
  if (jerseyNumber === null) return false;
  return exceptPlayerId
    ? Boolean(db.prepare("SELECT 1 FROM season_players WHERE season_id = ? AND jersey_number = ? AND player_id <> ?").get(seasonId, jerseyNumber, exceptPlayerId))
    : Boolean(db.prepare("SELECT 1 FROM season_players WHERE season_id = ? AND jersey_number = ?").get(seasonId, jerseyNumber));
}

function getCurrentSeasonId(db) {
  return db.prepare("SELECT id FROM seasons ORDER BY label DESC LIMIT 1").get()?.id ?? null;
}

function handleUniqueConstraint(error) {
  return String(error?.message).includes("UNIQUE constraint failed");
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

export function listSeasonPlayers(seasonId) {
  return getDatabase().prepare(
    `SELECT p.id, p.first_name AS firstName, p.last_name AS lastName,
       p.status, sp.jersey_number AS jerseyNumber,
       sp.is_active AS isActive,
       COALESCE(historical.appearances, stats.appearances, 0) AS appearances,
       COALESCE(historical.goals, stats.goals, 0) AS goals,
       COALESCE(historical.assists, stats.assists, 0) AS assists,
       COALESCE(historical.mom, stats.mom, 0) AS mom,
       COALESCE(historical.referee_payments, stats.referee_payments, 0) AS refereePayments
     FROM season_players sp
     JOIN players p ON p.id = sp.player_id
     LEFT JOIN (
       SELECT pms.player_id,
         SUM(pms.presence) AS appearances,
         SUM(pms.goals) AS goals,
         SUM(pms.assists) AS assists,
         SUM(pms.mom) AS mom,
         SUM(pms.referee_payment) AS referee_payments
       FROM player_match_stats pms
       JOIN matches m ON m.id = pms.match_id
       WHERE m.season_id = ? AND m.status NOT IN ('à venir', 'annulé')
       GROUP BY pms.player_id
     ) stats ON stats.player_id = p.id
     LEFT JOIN season_player_totals historical ON historical.season_id = sp.season_id AND historical.player_id = p.id
     WHERE sp.season_id = ? AND p.is_fake = 0
     ORDER BY CASE WHEN sp.is_active = 1 AND p.status = 'actif' THEN 0 ELSE 1 END,
       lower(p.last_name), lower(p.first_name)`
  ).all(seasonId, seasonId).map((player) => ({ ...player, isActive: player.isActive === 1 }));
}

export function listHistoricalPlayers() {
  return getDatabase().prepare(
    `SELECT p.id, p.first_name AS firstName, p.last_name AS lastName, p.status,
       COUNT(DISTINCT sp.season_id) AS seasonCount,
       MIN(s.label) AS firstSeason, MAX(s.label) AS lastSeason,
       COALESCE(SUM(stats.appearances), 0) AS appearances,
       COALESCE(SUM(stats.goals), 0) AS goals,
       COALESCE(SUM(stats.assists), 0) AS assists,
       COALESCE(SUM(stats.mom), 0) AS mom,
       COALESCE(SUM(stats.refereePayments), 0) AS refereePayments
     FROM players p
     JOIN season_players sp ON sp.player_id = p.id
     JOIN seasons s ON s.id = sp.season_id
     LEFT JOIN (
       SELECT player_id, season_id,
         SUM(appearances) AS appearances, SUM(goals) AS goals,
         SUM(assists) AS assists, SUM(mom) AS mom, SUM(refereePayments) AS refereePayments
       FROM (
         SELECT pms.player_id, m.season_id,
           SUM(pms.presence) AS appearances, SUM(pms.goals) AS goals,
           SUM(pms.assists) AS assists, SUM(pms.mom) AS mom,
           SUM(pms.referee_payment) AS refereePayments
         FROM player_match_stats pms
         JOIN matches m ON m.id = pms.match_id
         WHERE m.status NOT IN ('à venir', 'annulé')
           AND (m.team_a_id = 'team-roquette' OR m.team_b_id = 'team-roquette')
           AND NOT EXISTS (
             SELECT 1 FROM season_player_totals historical
             WHERE historical.season_id = m.season_id AND historical.player_id = pms.player_id
           )
         GROUP BY pms.player_id, m.season_id
         UNION ALL
         SELECT player_id, season_id, appearances, goals, assists, mom,
           referee_payments AS refereePayments
         FROM season_player_totals
       ) per_season
       GROUP BY player_id, season_id
     ) stats ON stats.player_id = p.id AND stats.season_id = s.id
     WHERE p.is_fake = 0
     GROUP BY p.id
     ORDER BY CASE p.status WHEN 'actif' THEN 0 ELSE 1 END,
       lower(p.last_name), lower(p.first_name)`
  ).all();
}

export function getHistoricalPlayerProfile(playerId) {
  if (!validId(playerId)) return null;
  const db = getDatabase();
  const player = db.prepare(
    `SELECT p.id, p.first_name AS firstName, p.last_name AS lastName, p.status
     FROM players p
     WHERE p.id = ? AND p.is_fake = 0
       AND EXISTS (SELECT 1 FROM season_players sp WHERE sp.player_id = p.id)`
  ).get(playerId);
  if (!player) return null;

  const seasons = db.prepare(
    `SELECT s.id AS seasonId, s.label, s.division,
       sp.jersey_number AS jerseyNumber, sp.is_active AS isActive,
       COUNT(DISTINCT m.id) AS matchCount,
       (SELECT historicalTeam.matches_played FROM season_team_totals historicalTeam
        WHERE historicalTeam.season_id = s.id AND historicalTeam.team_id = 'team-roquette') AS aggregateMatches,
       COALESCE((SELECT historical.appearances FROM season_player_totals historical WHERE historical.season_id = s.id AND historical.player_id = sp.player_id), COALESCE(SUM(pms.presence), 0)) AS appearances,
       COALESCE((SELECT historical.goals FROM season_player_totals historical WHERE historical.season_id = s.id AND historical.player_id = sp.player_id), COALESCE(SUM(pms.goals), 0)) AS goals,
       COALESCE((SELECT historical.assists FROM season_player_totals historical WHERE historical.season_id = s.id AND historical.player_id = sp.player_id), COALESCE(SUM(pms.assists), 0)) AS assists,
       COALESCE((SELECT historical.mom FROM season_player_totals historical WHERE historical.season_id = s.id AND historical.player_id = sp.player_id), COALESCE(SUM(pms.mom), 0)) AS mom,
       COALESCE((SELECT historical.referee_payments FROM season_player_totals historical WHERE historical.season_id = s.id AND historical.player_id = sp.player_id), COALESCE(SUM(pms.referee_payment), 0)) AS refereePayments
     FROM season_players sp
     JOIN seasons s ON s.id = sp.season_id
     LEFT JOIN matches m ON m.season_id = s.id AND m.status NOT IN ('à venir', 'annulé')
       AND (m.team_a_id = 'team-roquette' OR m.team_b_id = 'team-roquette')
     LEFT JOIN player_match_stats pms ON pms.match_id = m.id AND pms.player_id = sp.player_id
     WHERE sp.player_id = ?
     GROUP BY s.id, s.label, s.division, sp.jersey_number, sp.is_active
     ORDER BY s.label DESC`
  ).all(playerId).map((season) => ({ ...season, isActive: season.isActive === 1, aggregateOnly: season.aggregateMatches !== null }));
  const career = seasons.reduce((totals, season) => ({
    appearances: totals.appearances + season.appearances,
    goals: totals.goals + season.goals,
    assists: totals.assists + season.assists,
    mom: totals.mom + season.mom,
    refereePayments: totals.refereePayments + season.refereePayments,
  }), { appearances: 0, goals: 0, assists: 0, mom: 0, refereePayments: 0 });

  return { ...player, career: { seasonCount: seasons.length, ...career }, seasons };
}

export function listAvailablePlayers(seasonId) {
  return getDatabase().prepare(
    `SELECT p.id, p.first_name AS firstName, p.last_name AS lastName,
       p.status, sp.jersey_number AS jerseyNumber
     FROM players p
     LEFT JOIN season_players sp ON sp.player_id = p.id AND sp.season_id = ?
     WHERE p.is_fake = 0 AND (sp.player_id IS NULL OR sp.is_active = 0)
     ORDER BY CASE p.status WHEN 'actif' THEN 0 ELSE 1 END,
       lower(p.last_name), lower(p.first_name)`
  ).all(seasonId).map((player) => ({ ...player }));
}

export function createPlayer(input, actor) {
  const playerValidation = validatePlayerInput({ ...input, status: "actif" });
  if (!playerValidation.ok) return playerValidation;
  const jerseyValidation = validateJerseyNumber(input?.jerseyNumber);
  if (!jerseyValidation.ok) return jerseyValidation;
  const seasonId = input?.seasonId;
  if (!validId(seasonId)) return { ok: false, error: "La saison sélectionnée est invalide." };

  const db = getDatabase();
  if (!db.prepare("SELECT id FROM seasons WHERE id = ?").get(seasonId)) {
    return { ok: false, status: 404, error: "Saison introuvable." };
  }
  if (checkDuplicateJersey(db, seasonId, jerseyValidation.value)) {
    return { ok: false, status: 409, error: "Ce numéro de maillot est déjà utilisé pour cette saison." };
  }

  const status = getCurrentSeasonId(db) === seasonId ? "actif" : "retraité";
  const player = { ...playerValidation.value, status };
  const id = randomUUID();
  const now = new Date().toISOString();
  try {
    inTransaction(db, () => {
      db.prepare(
        `INSERT INTO players (id, first_name, last_name, status, is_fake, created_at, updated_at)
         VALUES (?, ?, ?, ?, 0, ?, ?)`
      ).run(id, player.firstName, player.lastName, status, now, now);
      db.prepare("INSERT INTO season_players (season_id, player_id, jersey_number, is_active) VALUES (?, ?, ?, 1)")
        .run(seasonId, id, jerseyValidation.value);
      recordAudit({ actor, action: "player.create", entityType: "player", entityId: id,
        after: { seasonId, fields: ["firstName", "lastName", "status", "jerseyNumber"] } });
    });
  } catch (error) {
    if (handleUniqueConstraint(error)) return { ok: false, status: 409, error: "Ce numéro de maillot est déjà utilisé pour cette saison." };
    throw error;
  }
  return { ok: true, player: { id, ...player, jerseyNumber: jerseyValidation.value, isActive: true } };
}

export function updateSeasonPlayer(playerId, input, actor) {
  if (!validId(playerId)) return { ok: false, error: "Joueur invalide." };
  const jerseyValidation = validateJerseyNumber(input?.jerseyNumber);
  if (!jerseyValidation.ok) return jerseyValidation;
  const seasonId = input?.seasonId;
  if (!validId(seasonId)) return { ok: false, error: "La saison sélectionnée est invalide." };

  const db = getDatabase();
  const before = db.prepare(
    `SELECT p.id, p.first_name AS firstName, p.last_name AS lastName,
       p.status, sp.jersey_number AS jerseyNumber,
       sp.is_active AS isActive
     FROM players p JOIN season_players sp ON sp.player_id = p.id
     WHERE p.id = ? AND sp.season_id = ? AND p.is_fake = 0`
  ).get(playerId, seasonId);
  if (!before) return { ok: false, status: 404, error: "Joueur introuvable dans cette saison." };
  const playerValidation = validatePlayerInput({ ...input, status: input?.status ?? before.status });
  if (!playerValidation.ok) return playerValidation;
  if (playerValidation.value.status !== before.status) {
    return { ok: false, error: "Le statut est déterminé par l’effectif de la saison la plus récente." };
  }
  if (checkDuplicateJersey(db, seasonId, jerseyValidation.value, playerId)) {
    return { ok: false, status: 409, error: "Ce numéro de maillot est déjà utilisé pour cette saison." };
  }

  const after = { ...playerValidation.value, jerseyNumber: jerseyValidation.value };
  const changedFields = Object.keys(after).filter((field) => before[field] !== after[field]);
  if (changedFields.length === 0) return { ok: true, player: { id: playerId, ...after, isActive: before.isActive === 1 } };

  const now = new Date().toISOString();
  try {
    inTransaction(db, () => {
      db.prepare("UPDATE players SET first_name = ?, last_name = ?, updated_at = ? WHERE id = ?")
        .run(after.firstName, after.lastName, now, playerId);
      db.prepare("UPDATE season_players SET jersey_number = ? WHERE season_id = ? AND player_id = ?")
        .run(after.jerseyNumber, seasonId, playerId);
      recordAudit({ actor, action: "player.update", entityType: "player", entityId: playerId,
        before: { seasonId, fields: changedFields }, after: { seasonId, fields: changedFields, status: after.status } });
    });
  } catch (error) {
    if (handleUniqueConstraint(error)) return { ok: false, status: 409, error: "Ce numéro de maillot est déjà utilisé pour cette saison." };
    throw error;
  }
  return { ok: true, player: { id: playerId, ...after, isActive: before.isActive === 1 } };
}

export function addPlayerToSeason(seasonId, playerId, jerseyNumberInput, actor) {
  if (!validId(seasonId) || !validId(playerId)) return { ok: false, error: "La saison ou le joueur est invalide." };
  const jerseyValidation = validateJerseyNumber(jerseyNumberInput);
  if (!jerseyValidation.ok) return jerseyValidation;
  const db = getDatabase();
  if (!db.prepare("SELECT id FROM seasons WHERE id = ?").get(seasonId)) {
    return { ok: false, status: 404, error: "Saison introuvable." };
  }
  const player = db.prepare("SELECT id, status FROM players WHERE id = ? AND is_fake = 0").get(playerId);
  if (!player) return { ok: false, status: 404, error: "Joueur introuvable." };
  const statusAfter = getCurrentSeasonId(db) === seasonId ? "actif" : player.status;
  const existing = db.prepare("SELECT jersey_number AS jerseyNumber, is_active AS isActive FROM season_players WHERE season_id = ? AND player_id = ?")
    .get(seasonId, playerId);
  const jerseyNumber = jerseyValidation.value ?? existing?.jerseyNumber ?? null;
  if (checkDuplicateJersey(db, seasonId, jerseyNumber, playerId)) {
    return { ok: false, status: 409, error: "Ce numéro de maillot est déjà utilisé pour cette saison." };
  }

  try {
    inTransaction(db, () => {
      if (existing) {
        db.prepare("UPDATE season_players SET jersey_number = ?, is_active = 1 WHERE season_id = ? AND player_id = ?")
          .run(jerseyNumber, seasonId, playerId);
      } else {
        db.prepare("INSERT INTO season_players (season_id, player_id, jersey_number, is_active) VALUES (?, ?, ?, 1)")
          .run(seasonId, playerId, jerseyNumber);
      }
      if (statusAfter !== player.status) {
        db.prepare("UPDATE players SET status = ?, updated_at = ? WHERE id = ?")
          .run(statusAfter, new Date().toISOString(), playerId);
      }
      recordAudit({ actor, action: "player.roster.add", entityType: "season_player", entityId: playerId,
        before: { seasonId, isActive: existing?.isActive === 1, status: player.status },
        after: { seasonId, isActive: true, jerseyNumber, status: statusAfter } });
    });
  } catch (error) {
    if (handleUniqueConstraint(error)) return { ok: false, status: 409, error: "Ce numéro de maillot est déjà utilisé pour cette saison." };
    throw error;
  }
  return { ok: true, playerId, seasonId, jerseyNumber, isActive: true, status: statusAfter,
    reactivated: player.status === "retraité" && statusAfter === "actif" };
}

export function removePlayerFromSeason(seasonId, playerId, actor) {
  if (!validId(seasonId) || !validId(playerId)) return { ok: false, error: "La saison ou le joueur est invalide." };
  const db = getDatabase();
  const membership = db.prepare(
    `SELECT sp.is_active AS isActive, p.status
     FROM season_players sp JOIN players p ON p.id = sp.player_id
     WHERE sp.season_id = ? AND sp.player_id = ? AND p.is_fake = 0`
  ).get(seasonId, playerId);
  if (!membership) return { ok: false, status: 404, error: "Joueur introuvable dans cette saison." };
  const statusAfter = getCurrentSeasonId(db) === seasonId ? "retraité" : membership.status;
  const statusChanged = statusAfter !== membership.status;
  if (membership.isActive === 0 && !statusChanged) return { ok: true, isActive: false, status: statusAfter };

  inTransaction(db, () => {
    if (membership.isActive !== 0) {
      db.prepare("UPDATE season_players SET is_active = 0 WHERE season_id = ? AND player_id = ?").run(seasonId, playerId);
    }
    if (statusChanged) {
      db.prepare("UPDATE players SET status = ?, updated_at = ? WHERE id = ?")
        .run(statusAfter, new Date().toISOString(), playerId);
    }
    recordAudit({ actor, action: "player.roster.remove", entityType: "season_player", entityId: playerId,
      before: { seasonId, isActive: membership.isActive === 1, status: membership.status },
      after: { seasonId, isActive: false, status: statusAfter } });
  });
  return { ok: true, isActive: false, status: statusAfter };
}
