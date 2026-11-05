import "server-only";
import { randomUUID } from "node:crypto";
import { validateTeamName } from "./business.js";
import { getDatabase } from "./db.js";
import { recordAudit } from "./audit.js";

function validId(value) {
  return typeof value === "string" && value.length > 0 && value.length <= 100;
}

export function ensureSeasonTeam(db, seasonId, teamId) {
  db.prepare("INSERT OR IGNORE INTO season_teams (season_id, team_id) VALUES (?, ?)").run(seasonId, teamId);
}

export function listSeasonTeams(seasonId) {
  if (!validId(seasonId)) return [];
  return getDatabase().prepare(
    `SELECT t.id, t.name, t.is_roquette AS isRoquette
     FROM season_teams st
     JOIN teams t ON t.id = st.team_id
     WHERE st.season_id = ?
     ORDER BY t.is_roquette DESC, lower(t.name)`
  ).all(seasonId).map((team) => ({ ...team, isRoquette: team.isRoquette === 1 }));
}

export function addSeasonTeam(seasonId, input, actor) {
  if (!validId(seasonId)) return { ok: false, error: "Saison invalide." };
  const validation = validateTeamName(input);
  if (!validation.ok) return validation;

  const db = getDatabase();
  if (!db.prepare("SELECT id FROM seasons WHERE id = ?").get(seasonId)) {
    return { ok: false, status: 404, error: "Saison introuvable." };
  }

  const { name } = validation.value;
  const existing = db.prepare("SELECT id, name, is_roquette AS isRoquette FROM teams WHERE lower(name) = lower(?)").get(name);
  const team = existing ?? {
    id: randomUUID(),
    name: name.toLocaleLowerCase("fr-FR") === "team roquette" ? "Team Roquette" : name,
    isRoquette: name.toLocaleLowerCase("fr-FR") === "team roquette" ? 1 : 0,
  };
  const alreadyAdded = Boolean(db.prepare("SELECT 1 FROM season_teams WHERE season_id = ? AND team_id = ?").get(seasonId, team.id));
  if (alreadyAdded) return { ok: true, team: { ...team, isRoquette: team.isRoquette === 1 }, alreadyAdded: true };

  const now = new Date().toISOString();
  db.exec("BEGIN IMMEDIATE");
  try {
    if (!existing) {
      db.prepare("INSERT INTO teams (id, name, is_roquette, forfait_general) VALUES (?, ?, ?, 0)")
        .run(team.id, team.name, team.isRoquette);
    }
    ensureSeasonTeam(db, seasonId, team.id);
    recordAudit({ actor, action: "season.team.add", entityType: "season_team", entityId: `${seasonId}:${team.id}`,
      after: { seasonId, teamId: team.id, teamName: team.name, addedAt: now } });
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    if (String(error?.message).includes("UNIQUE constraint failed: teams.name")) {
      return { ok: false, status: 409, error: "Une équipe portant ce nom existe déjà." };
    }
    throw error;
  }
  return { ok: true, team: { ...team, isRoquette: team.isRoquette === 1 }, alreadyAdded: false };
}
