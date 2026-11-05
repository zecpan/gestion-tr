import "server-only";
import { getDatabase } from "./db.js";

export function listPublicSeasons() {
  return getDatabase().prepare(
    "SELECT id, label, division FROM seasons ORDER BY label DESC"
  ).all();
}

export function getPublicSeasonResults(seasonId = null) {
  const db = getDatabase();
  const season = seasonId
    ? db.prepare("SELECT id, label, division FROM seasons WHERE id = ?").get(seasonId)
    : db.prepare("SELECT id, label, division FROM seasons ORDER BY label DESC LIMIT 1").get();
  if (!season) return { season: null, matches: [] };

  const matches = db.prepare(
    `SELECT m.id, m.match_date AS date, m.match_type AS type, m.status,
       m.score_a AS scoreA, m.score_b AS scoreB, m.cup_phase AS phase,
       CASE WHEN m.roquette_side = 'A' THEN 'TEAM ROQUETTE'
            ELSE COALESCE(ta.name, m.opponent_name) END AS teamA,
       CASE WHEN m.match_type = 'cup' THEN m.opponent_name
            WHEN m.roquette_side = 'B' THEN 'TEAM ROQUETTE'
            ELSE COALESCE(tb.name, m.opponent_name) END AS teamB,
       CASE WHEN m.team_a_id = 'team-roquette' THEN 1 ELSE 0 END AS teamAIsRoquette,
       CASE WHEN m.team_b_id = 'team-roquette' THEN 1 ELSE 0 END AS teamBIsRoquette,
       r.round_number AS round
     FROM matches m
     LEFT JOIN teams ta ON ta.id = m.team_a_id
     LEFT JOIN teams tb ON tb.id = m.team_b_id
     LEFT JOIN rounds r ON r.id = m.round_id
     WHERE m.season_id = ?
       AND (m.match_date IS NOT NULL OR m.team_a_id IS NOT NULL OR m.team_b_id IS NOT NULL
            OR m.opponent_name IS NOT NULL OR m.score_a IS NOT NULL OR m.score_b IS NOT NULL OR m.status <> 'à venir')
     ORDER BY m.match_date, r.round_number, m.slot_number, m.created_at`
  ).all(season.id);

  // Explicit DTO: never expose player names or player records publicly.
  return {
    season: { id: season.id, label: season.label, division: season.division },
    matches: matches.map(({ id, date, type, status, scoreA, scoreB, phase, teamA, teamB, teamAIsRoquette, teamBIsRoquette, round }) => ({
      id, date, type, status, scoreA, scoreB, phase, teamA, teamB,
      teamAIsRoquette: teamAIsRoquette === 1, teamBIsRoquette: teamBIsRoquette === 1, round,
    })),
  };
}
