import "server-only";
import { validateSeasonHistoricalTotalsInput } from "./business.js";
import { getDatabase } from "./db.js";
import { recordAudit } from "./audit.js";

const TEAM_ID = "team-roquette";

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

export function saveSeasonHistoricalTotals(seasonId, input, actor) {
  if (typeof seasonId !== "string" || !seasonId || seasonId.length > 100) {
    return { ok: false, error: "La saison sélectionnée est invalide." };
  }
  const validation = validateSeasonHistoricalTotalsInput(input);
  if (!validation.ok) return validation;
  const { team, players } = validation.value;
  const db = getDatabase();
  if (!db.prepare("SELECT id FROM seasons WHERE id = ?").get(seasonId)) {
    return { ok: false, status: 404, error: "Saison introuvable." };
  }
  if (db.prepare("SELECT 1 FROM season_teams WHERE season_id = ? AND team_id = ?").get(seasonId, TEAM_ID) === undefined) {
    return { ok: false, status: 409, error: "Team Roquette n’est pas associée à cette saison." };
  }
  if (db.prepare("SELECT 1 FROM matches WHERE season_id = ? LIMIT 1").get(seasonId)) {
    return { ok: false, status: 409, error: "Les totaux agrégés sont réservés aux saisons sans matchs enregistrés." };
  }
  const roster = db.prepare(
    `SELECT p.id AS playerId, p.first_name AS firstName, p.last_name AS lastName
     FROM season_players sp JOIN players p ON p.id = sp.player_id
     WHERE sp.season_id = ? AND p.is_fake = 0 ORDER BY p.id`
  ).all(seasonId);
  const requestedIds = players.map((player) => player.playerId).sort();
  const rosterIds = roster.map((player) => player.playerId).sort();
  if (requestedIds.length !== rosterIds.length || requestedIds.some((id, index) => id !== rosterIds[index])) {
    return { ok: false, status: 409, error: "Les statistiques doivent couvrir exactement l’effectif de la saison." };
  }

  const beforeTeam = db.prepare(
    `SELECT matches_played AS matchesPlayed, wins, draws, losses, forfeits,
       goals_for AS goalsFor, goals_against AS goalsAgainst, points
     FROM season_team_totals WHERE season_id = ? AND team_id = ?`
  ).get(seasonId, TEAM_ID) ?? null;
  const beforePlayers = db.prepare(
    `SELECT player_id AS playerId, appearances, goals, assists, mom,
       referee_payments AS refereePayments, wins
     FROM season_player_totals WHERE season_id = ? ORDER BY player_id`
  ).all(seasonId);
  const expectedTeam = team;
  const expectedPlayers = players.map((player) => ({ ...player, wins: null })).sort((a, b) => a.playerId.localeCompare(b.playerId));
  if (beforeTeam && JSON.stringify(beforeTeam) === JSON.stringify(expectedTeam) &&
      JSON.stringify(beforePlayers) === JSON.stringify(expectedPlayers)) {
    return { ok: true, alreadySaved: true, seasonId, playerCount: players.length, team };
  }

  inTransaction(db, () => {
    db.prepare(
      `INSERT INTO season_team_totals
        (season_id, team_id, matches_played, wins, draws, losses, forfeits, goals_for, goals_against, points)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(season_id, team_id) DO UPDATE SET
         matches_played = excluded.matches_played, wins = excluded.wins,
         draws = excluded.draws, losses = excluded.losses, forfeits = excluded.forfeits,
         goals_for = excluded.goals_for, goals_against = excluded.goals_against, points = excluded.points`
    ).run(seasonId, TEAM_ID, team.matchesPlayed, team.wins, team.draws, team.losses,
      team.forfeits, team.goalsFor, team.goalsAgainst, team.points);
    db.prepare("DELETE FROM season_player_totals WHERE season_id = ?").run(seasonId);
    const insertPlayer = db.prepare(
      `INSERT INTO season_player_totals
        (season_id, player_id, appearances, goals, assists, mom, referee_payments, wins)
       VALUES (?, ?, ?, ?, ?, ?, ?, NULL)
       ON CONFLICT(season_id, player_id) DO UPDATE SET
         appearances = excluded.appearances, goals = excluded.goals, assists = excluded.assists,
         mom = excluded.mom, referee_payments = excluded.referee_payments, wins = NULL`
    );
    for (const player of players) {
      insertPlayer.run(seasonId, player.playerId, player.appearances, player.goals,
        player.assists, player.mom, player.refereePayments);
    }
    recordAudit({ actor, action: "season.historical-totals.set", entityType: "season", entityId: seasonId,
      before: beforeTeam || beforePlayers.length ? { team: beforeTeam, players: beforePlayers } : null,
      after: { team, players: expectedPlayers } });
  });

  return { ok: true, alreadySaved: false, seasonId, playerCount: players.length, team };
}
