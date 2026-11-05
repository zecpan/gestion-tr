import "server-only";
import { calculatePlayerStatisticsByStatus } from "./business.js";
import { getDatabase } from "./db.js";

export function getPublicPlayerCareerStatistics() {
  const db = getDatabase();
  const totalMatches = db.prepare(
    `SELECT
       (SELECT COALESCE(SUM(matches_played), 0) FROM season_team_totals WHERE team_id = 'team-roquette') +
       (SELECT COUNT(*) FROM matches m
        WHERE m.status NOT IN ('à venir', 'annulé')
          AND (m.team_a_id = 'team-roquette' OR m.team_b_id = 'team-roquette'
            OR (m.match_type = 'cup' AND m.roquette_side IN ('A', 'B')))
          AND NOT EXISTS (
            SELECT 1 FROM season_team_totals historical
            WHERE historical.season_id = m.season_id AND historical.team_id = 'team-roquette'
          )) AS total`
  ).get().total;

  const players = db.prepare(
    `SELECT p.id, p.first_name AS firstName, p.last_name AS lastName, p.status,
       COALESCE(stats.appearances, 0) AS appearances,
       COALESCE(stats.winAppearances, 0) AS winAppearances,
       COALESCE(stats.goals, 0) AS goals,
       COALESCE(stats.assists, 0) AS assists,
       COALESCE(stats.mom, 0) AS mom,
       CASE WHEN COALESCE(stats.unknownWins, 0) > 0 THEN NULL ELSE COALESCE(stats.wins, 0) END AS wins
     FROM players p
     LEFT JOIN (
       SELECT playerId, SUM(appearances) AS appearances, SUM(winAppearances) AS winAppearances,
         SUM(goals) AS goals, SUM(assists) AS assists, SUM(mom) AS mom, SUM(wins) AS wins,
         MAX(unknownWins) AS unknownWins
       FROM (
         SELECT pms.player_id AS playerId,
           SUM(pms.presence) AS appearances,
           SUM(CASE WHEN s.label >= '2018-2019' THEN pms.presence ELSE 0 END) AS winAppearances,
           SUM(pms.goals) AS goals,
           SUM(pms.assists) AS assists,
           SUM(pms.mom) AS mom,
           SUM(CASE WHEN s.label >= '2018-2019' AND pms.presence = 1 AND (
             (m.status = 'terminé' AND (
               (m.roquette_side = 'A' AND m.score_a > m.score_b) OR
               (m.roquette_side = 'B' AND m.score_b > m.score_a)
             )) OR
             (m.status = 'forfait' AND (
               (m.forfeiting_team_id IS NOT NULL AND m.forfeiting_team_id <> 'team-roquette') OR
               (m.forfeiting_team_id IS NULL AND (
                 (m.roquette_side = 'A' AND m.score_a > m.score_b) OR
                 (m.roquette_side = 'B' AND m.score_b > m.score_a)
               ))
             ))
           ) THEN 1 ELSE 0 END) AS wins,
           0 AS unknownWins
         FROM player_match_stats pms
         JOIN matches m ON m.id = pms.match_id
         JOIN seasons s ON s.id = m.season_id
         WHERE m.status NOT IN ('à venir', 'annulé')
           AND (m.team_a_id = 'team-roquette' OR m.team_b_id = 'team-roquette'
             OR (m.match_type = 'cup' AND m.roquette_side IN ('A', 'B')))
           AND NOT EXISTS (
             SELECT 1 FROM season_player_totals historical
             WHERE historical.season_id = m.season_id AND historical.player_id = pms.player_id
           )
         GROUP BY pms.player_id
         UNION ALL
         SELECT historical.player_id AS playerId, historical.appearances,
           CASE WHEN s.label >= '2018-2019' THEN historical.appearances ELSE 0 END AS winAppearances,
           historical.goals, historical.assists, historical.mom, COALESCE(historical.wins, 0) AS wins,
           CASE WHEN s.label >= '2018-2019' AND historical.wins IS NULL THEN 1 ELSE 0 END AS unknownWins
         FROM season_player_totals historical
         JOIN season_team_totals teamTotals ON teamTotals.season_id = historical.season_id
           AND teamTotals.team_id = 'team-roquette'
         JOIN seasons s ON s.id = historical.season_id
       ) totalsBySource
       GROUP BY playerId
     ) stats ON stats.playerId = p.id
     WHERE p.is_fake = 0
       AND EXISTS (SELECT 1 FROM season_players sp WHERE sp.player_id = p.id)`
  ).all();

  const hasAggregateOnlySeasons = Boolean(db.prepare(
    "SELECT 1 FROM season_team_totals WHERE team_id = 'team-roquette' LIMIT 1"
  ).get());
  const standings = calculatePlayerStatisticsByStatus(players, totalMatches);
  return {
    totalMatches,
    hasAggregateOnlySeasons,
    activeStandings: standings.active,
    retiredStandings: standings.retired,
  };
}
