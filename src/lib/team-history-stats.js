import "server-only";
import { calculateTeamRoquetteSeasonStatistics, calculateTopCareerPlayers, toPlayerDisplayName } from "./business.js";
import { getPublicTeamStandings } from "./standings.js";
import { getDatabase } from "./db.js";

export function getPublicTeamHistoryStatistics() {
  const db = getDatabase();
  const seasons = db.prepare("SELECT id, label, division FROM seasons ORDER BY label").all();
  const matches = db.prepare(
    `SELECT m.season_id AS seasonId, m.match_type AS matchType, m.status,
       m.team_a_id AS teamAId, m.team_b_id AS teamBId, m.roquette_side AS roquetteSide,
       m.score_a AS scoreA, m.score_b AS scoreB,
       m.original_score_a AS originalScoreA, m.original_score_b AS originalScoreB,
       m.forfeiting_team_id AS forfeitingTeamId, sf.team_id AS generalForfeiterId,
       COALESCE(goalTotals.cscGoals, 0) AS cscGoals,
       COALESCE(goalTotals.otherPlayerGoals, 0) AS otherPlayerGoals
     FROM matches m
     LEFT JOIN season_team_forfeits sf
       ON sf.season_id = m.season_id AND sf.team_id = m.forfeiting_team_id
     LEFT JOIN (
       SELECT match_id,
         SUM(CASE WHEN player_id = 'player-csc' THEN goals ELSE 0 END) AS cscGoals,
         SUM(CASE WHEN player_id <> 'player-csc' THEN goals ELSE 0 END) AS otherPlayerGoals
       FROM player_match_stats
       GROUP BY match_id
     ) goalTotals ON goalTotals.match_id = m.id
     WHERE m.team_a_id = 'team-roquette' OR m.team_b_id = 'team-roquette'
       OR (m.match_type = 'cup' AND m.roquette_side IN ('A', 'B'))
     ORDER BY m.match_date, m.id`
  ).all();
  const matchesBySeason = new Map();
  for (const match of matches) {
    const seasonMatches = matchesBySeason.get(match.seasonId) ?? [];
    seasonMatches.push(match);
    matchesBySeason.set(match.seasonId, seasonMatches);
  }
  const historicalTotals = new Map(db.prepare(
    `SELECT season_id AS seasonId, matches_played AS matchCount,
       goals_for AS goalsFor, goals_against AS goalsAgainst, points,
       wins, draws, losses, forfeits
     FROM season_team_totals WHERE team_id = 'team-roquette'`
  ).all().map((row) => [row.seasonId, row]));

  const seasonStatistics = seasons.map((season) => {
    const aggregate = historicalTotals.get(season.id);
    const standings = getPublicTeamStandings(season.id);
    const roquetteIndex = standings.standings.findIndex((row) => row.isRoquette);
    const roquetteStanding = standings.standings[roquetteIndex];
    const rank = !standings.aggregateOnly && roquetteStanding?.roundsPlayed > 0 ? roquetteIndex + 1 : null;
    return {
      ...season,
      ...(aggregate ?? calculateTeamRoquetteSeasonStatistics(matchesBySeason.get(season.id) ?? [])),
      rank,
    };
  });
  const totals = seasonStatistics.reduce((result, season) => ({
    matchCount: result.matchCount + season.matchCount,
    goalsFor: result.goalsFor + season.goalsFor,
    goalsAgainst: result.goalsAgainst + season.goalsAgainst,
    points: result.points + season.points,
    wins: result.wins + season.wins,
    draws: result.draws + season.draws,
    losses: result.losses + season.losses,
    forfeits: result.forfeits + season.forfeits,
  }), { matchCount: 0, goalsFor: 0, goalsAgainst: 0, points: 0, wins: 0, draws: 0, losses: 0, forfeits: 0 });
  totals.points = seasonStatistics.length ? totals.points / seasonStatistics.length : 0;

  const playerTotals = db.prepare(
    `SELECT p.first_name AS firstName, p.last_name AS lastName,
       SUM(sources.goals) AS goals, SUM(sources.assists) AS assists,
       SUM(sources.appearances) AS appearances
     FROM (
       SELECT pms.player_id, SUM(pms.goals) AS goals, SUM(pms.assists) AS assists,
         SUM(CASE WHEN m.status NOT IN ('à venir', 'annulé') THEN pms.presence ELSE 0 END) AS appearances
       FROM player_match_stats pms
       JOIN matches m ON m.id = pms.match_id
       WHERE m.status NOT IN ('à venir', 'annulé')
         AND (m.team_a_id = 'team-roquette' OR m.team_b_id = 'team-roquette'
           OR (m.match_type = 'cup' AND m.roquette_side IN ('A', 'B')))
         AND NOT EXISTS (
           SELECT 1 FROM season_player_totals historical
           WHERE historical.season_id = m.season_id AND historical.player_id = pms.player_id
         )
       GROUP BY pms.player_id
       UNION ALL
       SELECT historical.player_id, historical.goals, historical.assists, historical.appearances
       FROM season_player_totals historical
       JOIN season_team_totals teamTotals ON teamTotals.season_id = historical.season_id
         AND teamTotals.team_id = 'team-roquette'
     ) sources
     JOIN players p ON p.id = sources.player_id
     WHERE p.is_fake = 0
     GROUP BY p.id`
  ).all();

  const playersOver100 = playerTotals.filter((player) => player.appearances > 100)
    .sort((a, b) => b.appearances - a.appearances ||
      a.lastName.localeCompare(b.lastName, "fr-FR") || a.firstName.localeCompare(b.firstName, "fr-FR"))
    .map((player) => ({ player: toPlayerDisplayName(player.firstName, player.lastName), value: player.appearances }));

  return {
    seasons: seasonStatistics,
    totals,
    topScorers: calculateTopCareerPlayers(playerTotals, "goals"),
    topAssisters: calculateTopCareerPlayers(playerTotals, "assists"),
    playersOver100,
  };
}
