import "server-only";
import { calculatePlayerStatistics } from "./business.js";
import { getDatabase } from "./db.js";

export function getPublicSeasonPlayerStandings(seasonId = null) {
  const db = getDatabase();
  const season = seasonId
    ? db.prepare("SELECT id, label, division FROM seasons WHERE id = ?").get(seasonId)
    : db.prepare("SELECT id, label, division FROM seasons ORDER BY label DESC LIMIT 1").get();
  if (!season) return { season: null, totalMatches: 0, standings: [] };

  const actualTotalMatches = db.prepare(
    `SELECT COUNT(*) AS total
     FROM matches m
     WHERE m.season_id = ? AND m.status NOT IN ('à venir', 'annulé')
       AND (m.team_a_id = 'team-roquette' OR m.team_b_id = 'team-roquette'
         OR (m.match_type = 'cup' AND m.roquette_side IN ('A', 'B')))`
  ).get(season.id).total;
  const historicalTeamTotals = db.prepare(
    "SELECT matches_played AS matchesPlayed FROM season_team_totals WHERE season_id = ? AND team_id = 'team-roquette'"
  ).get(season.id);
  const totalMatches = historicalTeamTotals?.matchesPlayed ?? actualTotalMatches;
  const aggregateOnly = Boolean(historicalTeamTotals) && actualTotalMatches === 0;

  const players = db.prepare(
    `SELECT p.id, p.first_name AS firstName, p.last_name AS lastName,
       COALESCE(historical.appearances, stats.appearances, 0) AS appearances,
       COALESCE(historical.goals, stats.goals, 0) AS goals,
       COALESCE(historical.assists, stats.assists, 0) AS assists,
       COALESCE(historical.mom, stats.mom, 0) AS mom,
       CASE WHEN historical.player_id IS NOT NULL THEN NULL ELSE COALESCE(stats.wins, 0) END AS wins
     FROM season_players sp
     JOIN players p ON p.id = sp.player_id
     LEFT JOIN (
       SELECT pms.player_id,
         SUM(pms.presence) AS appearances,
         SUM(pms.goals) AS goals,
         SUM(pms.assists) AS assists,
         SUM(pms.mom) AS mom,
         SUM(CASE WHEN pms.presence = 1 AND (
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
         ) THEN 1 ELSE 0 END) AS wins
       FROM player_match_stats pms
       JOIN matches m ON m.id = pms.match_id
       WHERE m.season_id = ? AND m.status NOT IN ('à venir', 'annulé')
         AND (m.team_a_id = 'team-roquette' OR m.team_b_id = 'team-roquette'
           OR (m.match_type = 'cup' AND m.roquette_side IN ('A', 'B')))
       GROUP BY pms.player_id
     ) stats ON stats.player_id = p.id
     LEFT JOIN season_player_totals historical ON historical.season_id = sp.season_id AND historical.player_id = p.id
     WHERE sp.season_id = ? AND sp.is_active = 1 AND p.status = 'actif' AND p.is_fake = 0`
  ).all(season.id, season.id);

  const standings = calculatePlayerStatistics(players, totalMatches);

  return {
    season: { id: season.id, label: season.label, division: season.division },
    totalMatches,
    aggregateOnly,
    standings,
  };
}
