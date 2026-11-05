import "server-only";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";

const databasePath = resolve(/* turbopackIgnore: true */ process.env.DATABASE_PATH || "./data/team-roquette.sqlite");

function initialize(database) {
  database.exec("PRAGMA foreign_keys = ON;");
  database.exec("PRAGMA busy_timeout = 5000;");
  database.exec("PRAGMA journal_mode = WAL;");
  database.exec(`
    CREATE TABLE IF NOT EXISTS teams (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      is_roquette INTEGER NOT NULL DEFAULT 0 CHECK (is_roquette IN (0, 1)),
      forfait_general INTEGER NOT NULL DEFAULT 0 CHECK (forfait_general IN (0, 1))
    );
    CREATE TABLE IF NOT EXISTS seasons (
      id TEXT PRIMARY KEY,
      label TEXT NOT NULL UNIQUE,
      division TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS season_teams (
      season_id TEXT NOT NULL REFERENCES seasons(id) ON DELETE RESTRICT,
      team_id TEXT NOT NULL REFERENCES teams(id) ON DELETE RESTRICT,
      PRIMARY KEY (season_id, team_id)
    );
    CREATE TABLE IF NOT EXISTS season_team_forfeits (
      season_id TEXT NOT NULL REFERENCES seasons(id) ON DELETE RESTRICT,
      team_id TEXT NOT NULL REFERENCES teams(id) ON DELETE RESTRICT,
      declared_at TEXT NOT NULL,
      declared_by TEXT NOT NULL,
      PRIMARY KEY (season_id, team_id)
    );
    CREATE TABLE IF NOT EXISTS players (
      id TEXT PRIMARY KEY,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'actif' CHECK (status IN ('actif', 'retraité')),
      is_fake INTEGER NOT NULL DEFAULT 0 CHECK (is_fake IN (0, 1)),
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS season_players (
      season_id TEXT NOT NULL REFERENCES seasons(id) ON DELETE RESTRICT,
      player_id TEXT NOT NULL REFERENCES players(id) ON DELETE RESTRICT,
      jersey_number TEXT,
      is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
      PRIMARY KEY (season_id, player_id),
      UNIQUE (season_id, jersey_number)
    );
    CREATE TABLE IF NOT EXISTS rounds (
      id TEXT PRIMARY KEY,
      season_id TEXT NOT NULL REFERENCES seasons(id) ON DELETE RESTRICT,
      round_number INTEGER NOT NULL CHECK (round_number BETWEEN 1 AND 26),
      UNIQUE (season_id, round_number)
    );
    CREATE TABLE IF NOT EXISTS matches (
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
      forfeiting_team_id TEXT REFERENCES teams(id) ON DELETE RESTRICT,
      original_score_a INTEGER CHECK (original_score_a IS NULL OR original_score_a >= 0),
      original_score_b INTEGER CHECK (original_score_b IS NULL OR original_score_b >= 0),
      score_a INTEGER CHECK (score_a IS NULL OR score_a >= 0),
      score_b INTEGER CHECK (score_b IS NULL OR score_b >= 0),
      status TEXT NOT NULL DEFAULT 'à venir' CHECK (status IN ('à venir', 'terminé', 'forfait', 'annulé')),
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS player_match_stats (
      match_id TEXT NOT NULL REFERENCES matches(id) ON DELETE RESTRICT,
      player_id TEXT NOT NULL REFERENCES players(id) ON DELETE RESTRICT,
      presence INTEGER NOT NULL DEFAULT 0 CHECK (presence IN (0, 1)),
      goals INTEGER NOT NULL DEFAULT 0 CHECK (goals >= 0),
      assists INTEGER NOT NULL DEFAULT 0 CHECK (assists >= 0),
      referee_payment INTEGER NOT NULL DEFAULT 0 CHECK (referee_payment IN (0, 1)),
      mom INTEGER NOT NULL DEFAULT 0 CHECK (mom IN (0, 1)),
      PRIMARY KEY (match_id, player_id)
    );
    CREATE TABLE IF NOT EXISTS season_player_totals (
      season_id TEXT NOT NULL REFERENCES seasons(id) ON DELETE RESTRICT,
      player_id TEXT NOT NULL REFERENCES players(id) ON DELETE RESTRICT,
      appearances INTEGER NOT NULL DEFAULT 0 CHECK (appearances >= 0),
      goals INTEGER NOT NULL DEFAULT 0 CHECK (goals >= 0),
      assists INTEGER NOT NULL DEFAULT 0 CHECK (assists >= 0),
      mom INTEGER NOT NULL DEFAULT 0 CHECK (mom >= 0),
      referee_payments INTEGER NOT NULL DEFAULT 0 CHECK (referee_payments >= 0),
      wins INTEGER CHECK (wins IS NULL OR wins >= 0),
      PRIMARY KEY (season_id, player_id)
    );
    CREATE TABLE IF NOT EXISTS season_team_totals (
      season_id TEXT NOT NULL REFERENCES seasons(id) ON DELETE RESTRICT,
      team_id TEXT NOT NULL REFERENCES teams(id) ON DELETE RESTRICT,
      matches_played INTEGER NOT NULL CHECK (matches_played >= 0),
      wins INTEGER NOT NULL CHECK (wins >= 0),
      draws INTEGER NOT NULL CHECK (draws >= 0),
      losses INTEGER NOT NULL CHECK (losses >= 0),
      forfeits INTEGER NOT NULL CHECK (forfeits >= 0),
      goals_for INTEGER NOT NULL CHECK (goals_for >= 0),
      goals_against INTEGER NOT NULL CHECK (goals_against >= 0),
      points INTEGER NOT NULL CHECK (points >= 0),
      PRIMARY KEY (season_id, team_id)
    );
    CREATE INDEX IF NOT EXISTS idx_season_player_totals_player ON season_player_totals(player_id, season_id);
    CREATE TABLE IF NOT EXISTS admin_sessions (
      token_hash TEXT PRIMARY KEY,
      username TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_admin_sessions_expiry ON admin_sessions(expires_at);
    CREATE INDEX IF NOT EXISTS idx_teams_name_normalized ON teams(lower(name));
    CREATE TABLE IF NOT EXISTS audit_log (
      id TEXT PRIMARY KEY,
      actor TEXT NOT NULL,
      action TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      before_json TEXT,
      after_json TEXT,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_matches_season_date ON matches(season_id, match_date);
    CREATE INDEX IF NOT EXISTS idx_rounds_season_number ON rounds(season_id, round_number);
    CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_log(created_at DESC);
    INSERT OR IGNORE INTO teams (id, name, is_roquette, forfait_general)
      VALUES ('team-roquette', 'Team Roquette', 1, 0);
    INSERT OR IGNORE INTO players (id, first_name, last_name, status, is_fake, created_at, updated_at)
      VALUES ('player-csc', 'CSC', '', 'actif', 1, datetime('now'), datetime('now'));
  `);
  const playerColumns = database.prepare("PRAGMA table_info(players)").all();
  if (playerColumns.some((column) => column.name === "license_number")) {
    database.exec("DROP INDEX IF EXISTS idx_players_license_normalized");
    database.exec("PRAGMA foreign_keys = OFF");
    try {
      database.exec("BEGIN IMMEDIATE");
      database.exec(`
        CREATE TABLE players_without_license (
          id TEXT PRIMARY KEY,
          first_name TEXT NOT NULL,
          last_name TEXT NOT NULL,
          status TEXT NOT NULL DEFAULT 'actif' CHECK (status IN ('actif', 'retraité')),
          is_fake INTEGER NOT NULL DEFAULT 0 CHECK (is_fake IN (0, 1)),
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );
        INSERT INTO players_without_license (id, first_name, last_name, status, is_fake, created_at, updated_at)
          SELECT id, first_name, last_name, status, is_fake, created_at, updated_at FROM players;
        DROP TABLE players;
        ALTER TABLE players_without_license RENAME TO players;
      `);
      database.exec("COMMIT");
    } catch (error) {
      database.exec("ROLLBACK");
      throw error;
    } finally {
      database.exec("PRAGMA foreign_keys = ON");
    }
  }
  const seasonPlayerColumns = database.prepare("PRAGMA table_info(season_players)").all();
  if (!seasonPlayerColumns.some((column) => column.name === "is_active")) {
    database.exec("ALTER TABLE season_players ADD COLUMN is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1))");
  }
  database.exec("CREATE INDEX IF NOT EXISTS idx_season_players_player_active ON season_players(player_id, is_active)");
  const matchColumns = database.prepare("PRAGMA table_info(matches)").all();
  if (!matchColumns.some((column) => column.name === "forfeiting_team_id")) {
    database.exec("ALTER TABLE matches ADD COLUMN forfeiting_team_id TEXT REFERENCES teams(id) ON DELETE RESTRICT");
  }
  if (!matchColumns.some((column) => column.name === "original_score_a")) {
    database.exec("ALTER TABLE matches ADD COLUMN original_score_a INTEGER CHECK (original_score_a IS NULL OR original_score_a >= 0)");
  }
  if (!matchColumns.some((column) => column.name === "original_score_b")) {
    database.exec("ALTER TABLE matches ADD COLUMN original_score_b INTEGER CHECK (original_score_b IS NULL OR original_score_b >= 0)");
  }
  database.exec(`
    CREATE INDEX IF NOT EXISTS idx_season_teams_team ON season_teams(team_id, season_id);
    INSERT OR IGNORE INTO season_teams (season_id, team_id)
      SELECT id, 'team-roquette' FROM seasons;
    CREATE INDEX IF NOT EXISTS idx_season_team_forfeits_team ON season_team_forfeits(team_id, season_id);
    INSERT OR IGNORE INTO season_team_forfeits (season_id, team_id, declared_at, declared_by)
      SELECT DISTINCT m.season_id, t.id, datetime('now'), 'migration'
      FROM teams t JOIN matches m ON m.team_a_id = t.id OR m.team_b_id = t.id
      WHERE t.forfait_general = 1;
  `);
}

export function getDatabase() {
  if (!globalThis.__teamRoquetteDatabase) {
    mkdirSync(dirname(databasePath), { recursive: true });
    const database = new DatabaseSync(databasePath);
    initialize(database);
    globalThis.__teamRoquetteDatabase = database;
  }
  return globalThis.__teamRoquetteDatabase;
}
