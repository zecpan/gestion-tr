import "server-only";
import { calculateTeamStandings } from "./business.js";
import { getDatabase } from "./db.js";

export function getPublicTeamStandings(seasonId = null) {
  const db = getDatabase();
  const season = seasonId
    ? db.prepare("SELECT id, label, division FROM seasons WHERE id = ?").get(seasonId)
    : db.prepare("SELECT id, label, division FROM seasons ORDER BY label DESC LIMIT 1").get();
  if (!season) return { season: null, standings: [] };

  const teams = db.prepare(
    `SELECT t.id, t.name, t.is_roquette AS isRoquette,
       CASE WHEN sf.team_id IS NULL THEN 0 ELSE 1 END AS forfaitGeneral
     FROM teams t
     LEFT JOIN season_team_forfeits sf ON sf.team_id = t.id AND sf.season_id = ?
     WHERE EXISTS (
       SELECT 1 FROM season_teams st WHERE st.season_id = ? AND st.team_id = t.id
     ) OR sf.team_id IS NOT NULL OR EXISTS (
       SELECT 1 FROM matches m
       WHERE m.season_id = ? AND m.match_type = 'regular' AND m.status <> 'annulé'
         AND (m.team_a_id = t.id OR m.team_b_id = t.id)
     )
     ORDER BY t.is_roquette DESC, lower(t.name)`
  ).all(season.id, season.id, season.id).map((team) => ({
    ...team,
    isRoquette: team.isRoquette === 1,
    forfaitGeneral: team.forfaitGeneral === 1,
  }));

  const matches = db.prepare(
    `SELECT r.round_number AS roundNumber,
       m.team_a_id AS teamAId, m.team_b_id AS teamBId,
       m.score_a AS scoreA, m.score_b AS scoreB,
       m.original_score_a AS originalScoreA, m.original_score_b AS originalScoreB,
       m.status, m.forfeiting_team_id AS forfeitingTeamId
     FROM matches m
     JOIN rounds r ON r.id = m.round_id
     WHERE m.season_id = ? AND m.match_type = 'regular'
     ORDER BY r.round_number, m.slot_number`
  ).all(season.id).map((match) => ({ ...match }));

  const historicalTeamTotals = db.prepare(
    `SELECT matches_played AS matchesPlayed, wins, draws, losses, forfeits,
       goals_for AS goalsFor, goals_against AS goalsAgainst, points
     FROM season_team_totals WHERE season_id = ? AND team_id = 'team-roquette'`
  ).get(season.id);
  const standings = calculateTeamStandings(teams, matches).map((row) => {
    const aggregate = row.isRoquette ? historicalTeamTotals : null;
    const result = aggregate ? {
      ...row,
      roundsPlayed: aggregate.matchesPlayed,
      wins: aggregate.wins,
      draws: aggregate.draws,
      losses: aggregate.losses,
      forfeits: aggregate.forfeits,
      goalsFor: aggregate.goalsFor,
      goalsAgainst: aggregate.goalsAgainst,
      goalDifference: aggregate.goalsFor - aggregate.goalsAgainst,
      points: aggregate.points,
    } : row;
    return {
      teamName: result.teamName,
      isRoquette: result.isRoquette,
      roundsPlayed: result.roundsPlayed,
      wins: result.wins,
      draws: result.draws,
      losses: result.losses,
      forfeits: result.forfeits,
      goalsFor: result.goalsFor,
      goalsAgainst: result.goalsAgainst,
      goalDifference: result.goalDifference,
      points: result.points,
    };
  });
  return {
    season: { id: season.id, label: season.label, division: season.division },
    aggregateOnly: Boolean(historicalTeamTotals) && matches.length === 0,
    standings,
  };
}
