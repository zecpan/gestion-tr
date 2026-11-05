import "server-only";
import { randomUUID } from "node:crypto";
import { buildRegularCalendarSlots, validateSeasonInput } from "./business.js";
import { getDatabase } from "./db.js";
import { recordAudit } from "./audit.js";

export function listSeasons() {
  return getDatabase().prepare(
    `SELECT s.id, s.label, s.division, s.created_at AS createdAt,
       (SELECT COUNT(*) FROM matches m WHERE m.season_id = s.id) AS matchCount
     FROM seasons s ORDER BY s.label DESC`
  ).all().map((season) => ({ ...season, matchCount: Number(season.matchCount) }));
}

export function listSeasonRounds(seasonId) {
  if (typeof seasonId !== "string" || !seasonId) return [];
  return getDatabase().prepare(
    "SELECT round_number AS roundNumber FROM rounds WHERE season_id = ? ORDER BY round_number"
  ).all(seasonId).map((round) => Number(round.roundNumber));
}

export function createSeason(input, actor) {
  const validation = validateSeasonInput(input);
  if (!validation.ok) return validation;
  const db = getDatabase();
  const { label, division, historicalOnly } = validation.value;
  if (db.prepare("SELECT id FROM seasons WHERE label = ?").get(label)) {
    return { ok: false, error: "Cette saison existe déjà." };
  }
  const seasonId = randomUUID();
  const now = new Date().toISOString();
  const previousSeason = db.prepare("SELECT id, label FROM seasons WHERE label < ? ORDER BY label DESC LIMIT 1").get(label);
  const slots = historicalOnly ? [] : buildRegularCalendarSlots(seasonId);

  db.exec("BEGIN IMMEDIATE");
  try {
    db.prepare("INSERT INTO seasons (id, label, division, created_at, updated_at) VALUES (?, ?, ?, ?, ?)")
      .run(seasonId, label, division, now, now);
    db.prepare("INSERT INTO season_teams (season_id, team_id) VALUES (?, 'team-roquette')")
      .run(seasonId);
    let copiedPlayers = 0;
    if (!historicalOnly) {
      const insertRound = db.prepare("INSERT INTO rounds (id, season_id, round_number) VALUES (?, ?, ?)");
      const insertMatch = db.prepare(
        `INSERT INTO matches (id, season_id, round_id, match_type, slot_number, status, created_at, updated_at)
         VALUES (?, ?, ?, 'regular', ?, 'à venir', ?, ?)`
      );
      for (const round of slots) {
        const roundId = randomUUID();
        insertRound.run(roundId, seasonId, round.roundNumber);
        for (const match of round.matches) {
          insertMatch.run(randomUUID(), seasonId, roundId, match.slotNumber, now, now);
        }
      }
      if (previousSeason) {
        const copied = db.prepare(
          `INSERT INTO season_players (season_id, player_id, jersey_number)
           SELECT ?, sp.player_id, sp.jersey_number
           FROM season_players sp JOIN players p ON p.id = sp.player_id
           WHERE sp.season_id = ? AND sp.is_active = 1 AND p.status = 'actif' AND p.is_fake = 0`
        ).run(seasonId, previousSeason.id);
        copiedPlayers = Number(copied.changes);
      }
    }
    const matchCount = slots.reduce((count, round) => count + round.matches.length, 0);
    recordAudit({ actor, action: "season.create", entityType: "season", entityId: seasonId,
      after: { label, division, historicalOnly, previousSeason: historicalOnly ? null : previousSeason?.label ?? null,
        copiedPlayers, roundCount: slots.length, matchesPerRound: historicalOnly ? 0 : 7 } });
    db.exec("COMMIT");
    return { ok: true, season: { id: seasonId, label, division, createdAt: now, matchCount }, copiedPlayers, historicalOnly };
  } catch (error) {
    db.exec("ROLLBACK");
    if (String(error?.message).includes("UNIQUE constraint failed: seasons.label")) return { ok: false, error: "Cette saison existe déjà." };
    throw error;
  }
}

export function updateSeason(id, input, actor) {
  const validation = validateSeasonInput(input);
  if (!validation.ok) return validation;
  const db = getDatabase();
  const before = db.prepare("SELECT id, label, division FROM seasons WHERE id = ?").get(id);
  if (!before) return { ok: false, status: 404, error: "Saison introuvable." };
  const { label, division } = validation.value;
  const duplicate = db.prepare("SELECT id FROM seasons WHERE label = ? AND id <> ?").get(label, id);
  if (duplicate) return { ok: false, error: "Cette saison existe déjà." };
  const updatedAt = new Date().toISOString();
  try {
    db.prepare("UPDATE seasons SET label = ?, division = ?, updated_at = ? WHERE id = ?")
      .run(label, division, updatedAt, id);
  } catch (error) {
    if (String(error?.message).includes("UNIQUE constraint failed: seasons.label")) return { ok: false, error: "Cette saison existe déjà." };
    throw error;
  }
  const after = { id, label, division };
  recordAudit({ actor, action: "season.update", entityType: "season", entityId: id, before, after });
  return { ok: true, season: after };
}
