import { scryptSync } from "node:crypto";
import { DatabaseSync } from "node:sqlite";

const [action, ...args] = process.argv.slice(2);
if (action === "hash") {
  const [password, salt] = args;
  if (!password || !salt) throw new Error("usage: node test-support.mjs hash <password> <salt>");
  console.log(scryptSync(password, salt, 64).toString("base64url"));
} else if (action === "legacy-db") {
  const [databasePath] = args;
  if (!databasePath) throw new Error("usage: node test-support.mjs legacy-db <database>");
  const database = new DatabaseSync(databasePath);
  database.exec(`
    CREATE TABLE players (
      id TEXT PRIMARY KEY,
      license_number TEXT UNIQUE,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'actif' CHECK (status IN ('actif', 'retraité')),
      is_fake INTEGER NOT NULL DEFAULT 0 CHECK (is_fake IN (0, 1)),
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE season_players (
      season_id TEXT NOT NULL REFERENCES seasons(id) ON DELETE RESTRICT,
      player_id TEXT NOT NULL REFERENCES players(id) ON DELETE RESTRICT,
      jersey_number TEXT,
      PRIMARY KEY (season_id, player_id),
      UNIQUE (season_id, jersey_number)
    );
    CREATE TABLE matches (
      id TEXT PRIMARY KEY,
      season_id TEXT NOT NULL REFERENCES seasons(id) ON DELETE RESTRICT,
      round_id TEXT REFERENCES rounds(id) ON DELETE RESTRICT,
      match_type TEXT NOT NULL CHECK (match_type IN ('regular', 'cup')),
      slot_number INTEGER,
      match_date TEXT,
      team_a_id TEXT REFERENCES teams(id) ON DELETE RESTRICT,
      team_b_id TEXT REFERENCES teams(id) ON DELETE RESTRICT,
      opponent_name TEXT,
      cup_phase TEXT,
      roquette_side TEXT CHECK (roquette_side IN ('A', 'B') OR roquette_side IS NULL),
      score_a INTEGER CHECK (score_a IS NULL OR score_a >= 0),
      score_b INTEGER CHECK (score_b IS NULL OR score_b >= 0),
      status TEXT NOT NULL DEFAULT 'à venir' CHECK (status IN ('à venir', 'terminé', 'forfait', 'annulé')),
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);
  database.close();
} else if (action === "match-id") {
  const [databasePath, seasonId, roundNumber, slotNumber] = args;
  if (!databasePath || !seasonId || !roundNumber || !slotNumber) throw new Error("usage: node test-support.mjs match-id <database> <season-id> <round> <slot>");
  const database = new DatabaseSync(databasePath);
  const match = database.prepare("SELECT m.id FROM matches m JOIN rounds r ON r.id = m.round_id WHERE m.season_id = ? AND r.round_number = ? AND m.slot_number = ? AND m.match_type = 'regular'")
    .get(seasonId, Number(roundNumber), Number(slotNumber));
  if (!match) throw new Error("regular match not found");
  console.log(match.id);
  database.close();
} else if (action === "counts") {
  const [databasePath] = args;
  if (!databasePath) throw new Error("usage: node test-support.mjs counts <database>");
  const database = new DatabaseSync(databasePath);
  console.log(JSON.stringify({
    rounds: database.prepare("SELECT COUNT(*) AS n FROM rounds").get().n,
    matches: database.prepare("SELECT COUNT(*) AS n FROM matches").get().n,
    cupMatches: database.prepare("SELECT COUNT(*) AS n FROM matches WHERE match_type = 'cup'").get().n,
    playerMatchStats: database.prepare("SELECT COUNT(*) AS n FROM player_match_stats").get().n,
    teams: database.prepare("SELECT COUNT(*) AS n FROM teams").get().n,
    completedMatches: database.prepare("SELECT COUNT(*) AS n FROM matches WHERE status = 'terminé'").get().n,
    forfeitedMatches: database.prepare("SELECT COUNT(*) AS n FROM matches WHERE status = 'forfait'").get().n,
    cancelledMatches: database.prepare("SELECT COUNT(*) AS n FROM matches WHERE status = 'annulé'").get().n,
    csc: database.prepare("SELECT COUNT(*) AS n FROM players WHERE is_fake = 1").get().n,
    realPlayers: database.prepare("SELECT COUNT(*) AS n FROM players WHERE is_fake = 0").get().n,
    seasonPlayers: database.prepare("SELECT COUNT(*) AS n FROM season_players").get().n,
    activeSeasonPlayers: database.prepare("SELECT COUNT(*) AS n FROM season_players WHERE is_active = 1").get().n,
    hasSeasonPlayerActiveColumn: database.prepare("PRAGMA table_info(season_players)").all().some((column) => column.name === "is_active"),
    hasForfeitingTeamColumn: database.prepare("PRAGMA table_info(matches)").all().some((column) => column.name === "forfeiting_team_id"),
    hasOriginalScores: ["original_score_a", "original_score_b"].every((name) => database.prepare("PRAGMA table_info(matches)").all().some((column) => column.name === name)),
    hasSeasonTeamForfeits: database.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'season_team_forfeits'").get() !== undefined,
  }));
  database.close();
} else if (action === "season-counts") {
  const [databasePath, seasonId] = args;
  if (!databasePath || !seasonId) throw new Error("usage: node test-support.mjs season-counts <database> <season-id>");
  const database = new DatabaseSync(databasePath);
  const result = {
    rounds: database.prepare("SELECT COUNT(*) AS n FROM rounds WHERE season_id = ?").get(seasonId).n,
    matches: database.prepare("SELECT COUNT(*) AS n FROM matches WHERE season_id = ?").get(seasonId).n,
    seasonPlayers: database.prepare("SELECT COUNT(*) AS n FROM season_players WHERE season_id = ?").get(seasonId).n,
    playerTotals: database.prepare("SELECT COUNT(*) AS n FROM season_player_totals WHERE season_id = ?").get(seasonId).n,
    teamTotals: database.prepare("SELECT COUNT(*) AS n FROM season_team_totals WHERE season_id = ?").get(seasonId).n,
  };
  console.log(JSON.stringify(result));
  database.close();
} else {
  throw new Error("supported actions: hash, legacy-db, match-id, counts, season-counts");
}
