import "server-only";
import { getDatabase } from "./db.js";
import { recordAudit } from "./audit.js";

function validId(value) {
  return typeof value === "string" && value.length > 0 && value.length <= 100;
}

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

export function listSeasonTeams(seasonId) {
  if (!validId(seasonId)) return [];
  return getDatabase().prepare(
    `SELECT t.id, t.name, t.is_roquette AS isRoquette,
       CASE WHEN sf.team_id IS NULL THEN 0 ELSE 1 END AS forfaitGeneral
     FROM teams t
     LEFT JOIN season_team_forfeits sf ON sf.team_id = t.id AND sf.season_id = ?
     WHERE EXISTS (
       SELECT 1 FROM season_teams st WHERE st.season_id = ? AND st.team_id = t.id
     ) OR EXISTS (
       SELECT 1 FROM matches m
       WHERE m.season_id = ? AND m.match_type = 'regular'
         AND (m.team_a_id = t.id OR m.team_b_id = t.id)
     )
     ORDER BY t.is_roquette DESC, lower(t.name)`
  ).all(seasonId, seasonId, seasonId).map((team) => ({
    ...team,
    isRoquette: team.isRoquette === 1,
    forfaitGeneral: team.forfaitGeneral === 1,
  }));
}

export function declareSeasonGeneralForfeit(seasonId, teamId, actor) {
  if (!validId(seasonId) || !validId(teamId)) return { ok: false, error: "La saison ou l’équipe est invalide." };
  const db = getDatabase();
  const season = db.prepare("SELECT id FROM seasons WHERE id = ?").get(seasonId);
  if (!season) return { ok: false, status: 404, error: "Saison introuvable." };
  const team = db.prepare("SELECT id, name, is_roquette AS isRoquette FROM teams WHERE id = ?").get(teamId);
  if (!team) return { ok: false, status: 404, error: "Équipe introuvable." };
  const participates = db.prepare(
    `SELECT 1 FROM season_teams WHERE season_id = ? AND team_id = ?
     UNION ALL
     SELECT 1 FROM matches WHERE season_id = ? AND match_type = 'regular'
       AND (team_a_id = ? OR team_b_id = ?) LIMIT 1`
  ).get(seasonId, teamId, seasonId, teamId, teamId);
  if (!participates) return { ok: false, status: 404, error: "Cette équipe n’appartient pas à la saison sélectionnée." };

  return inTransaction(db, () => {
    const existing = db.prepare("SELECT declared_at FROM season_team_forfeits WHERE season_id = ? AND team_id = ?")
      .get(seasonId, teamId);
    if (existing) return { ok: true, teamId, teamName: team.name, alreadyDeclared: true, updatedMatches: 0 };

    const matches = db.prepare(
      `SELECT id, match_type AS type, status, match_date AS matchDate,
         team_a_id AS teamAId, team_b_id AS teamBId,
         score_a AS scoreA, score_b AS scoreB,
         original_score_a AS originalScoreA, original_score_b AS originalScoreB,
         forfeiting_team_id AS forfeitingTeamId
       FROM matches
       WHERE season_id = ? AND (team_a_id = ? OR team_b_id = ?)
       ORDER BY match_date, id`
    ).all(seasonId, teamId, teamId);
    const beforeMatches = matches.filter((match) => match.status !== "annulé");
    const now = new Date().toISOString();
    db.prepare("INSERT INTO season_team_forfeits (season_id, team_id, declared_at, declared_by) VALUES (?, ?, ?, ?)")
      .run(seasonId, teamId, now, actor);

    const updateMatch = db.prepare(
      `UPDATE matches SET score_a = ?, score_b = ?, status = 'forfait',
         forfeiting_team_id = ?, original_score_a = ?, original_score_b = ?, updated_at = ?
       WHERE id = ?`
    );
    const setOtherPlayerGoalsToZero = db.prepare("UPDATE player_match_stats SET goals = 0 WHERE match_id = ? AND player_id <> 'player-csc'");
    const setAllPlayerGoalsToZero = db.prepare("UPDATE player_match_stats SET goals = 0 WHERE match_id = ?");
    const setCscGoals = db.prepare(
      `INSERT INTO player_match_stats (match_id, player_id, presence, goals, assists, referee_payment, mom)
       VALUES (?, 'player-csc', 0, 3, 0, 0, 0)
       ON CONFLICT(match_id, player_id) DO UPDATE SET
         presence = 0, goals = 3, assists = 0, referee_payment = 0, mom = 0`
    );
    const afterMatches = [];
    const beforePlayerStats = [];
    const afterPlayerStats = [];

    for (const match of beforeMatches) {
      const forfeitingSide = match.teamAId === teamId ? "A" : "B";
      const teamRoquetteInMatch = match.teamAId === "team-roquette" || match.teamBId === "team-roquette";
      const wasPlayed = match.status === "terminé" || match.status === "forfait";
      const scoreA = forfeitingSide === "A" ? 0 : 3;
      const scoreB = forfeitingSide === "A" ? 3 : 0;
      const originalScoreA = teamRoquetteInMatch && wasPlayed
        ? (match.originalScoreA ?? match.scoreA)
        : match.originalScoreA;
      const originalScoreB = teamRoquetteInMatch && wasPlayed
        ? (match.originalScoreB ?? match.scoreB)
        : match.originalScoreB;

      updateMatch.run(scoreA, scoreB, teamId, originalScoreA, originalScoreB, now, match.id);

      if (teamRoquetteInMatch && !wasPlayed) {
        const statsBefore = db.prepare(
          `SELECT player_id AS playerId, presence, goals, assists, referee_payment AS refereePayment, mom
           FROM player_match_stats WHERE match_id = ? ORDER BY player_id`
        ).all(match.id);
        beforePlayerStats.push({ matchId: match.id, players: statsBefore });
        if (teamId === "team-roquette") setAllPlayerGoalsToZero.run(match.id);
        else {
          setOtherPlayerGoalsToZero.run(match.id);
          setCscGoals.run(match.id);
        }
        const statsAfter = db.prepare(
          `SELECT player_id AS playerId, presence, goals, assists, referee_payment AS refereePayment, mom
           FROM player_match_stats WHERE match_id = ? ORDER BY player_id`
        ).all(match.id);
        afterPlayerStats.push({ matchId: match.id, players: statsAfter });
      }
      afterMatches.push({ id: match.id, scoreA, scoreB, status: "forfait", forfeitingTeamId: teamId,
        originalScoreA, originalScoreB });
    }

    recordAudit({ actor, action: "team.general-forfeit.declare", entityType: "season_team", entityId: `${seasonId}:${teamId}`,
      before: { seasonId, teamId, teamName: team.name, forfaitGeneral: false, matches: beforeMatches,
        playerStats: beforePlayerStats },
      after: { seasonId, teamId, teamName: team.name, forfaitGeneral: true, matches: afterMatches,
        playerStats: afterPlayerStats } });
    return { ok: true, teamId, teamName: team.name, alreadyDeclared: false, updatedMatches: afterMatches.length };
  });
}
