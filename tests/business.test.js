import test from "node:test";
import assert from "node:assert/strict";
import { buildRegularCalendarSlots, calculatePlayerStatistics, calculatePlayerStatisticsByStatus, calculateTopCareerPlayers, calculateTeamRoquetteSeasonStatistics, calculateTeamStandings, REGULAR_SEASON_ROUNDS, MATCHES_PER_ROUND, toPlayerDisplayName, validateCupMatchInput, validateJerseyNumber, validateMatchPlayerStatsInput, validatePlayerInput, validateRegularMatchInput, validateSeasonHistoricalTotalsInput, validateSeasonInput, validateTeamName } from "../src/lib/business.js";

test("season label and division are validated", () => {
  assert.equal(validateSeasonInput({ label: "2025-2026", division: "Division 2" }).ok, true);
  assert.equal(validateSeasonInput({ label: "2025-2027", division: "Division 2" }).ok, true);
  assert.equal(validateSeasonInput({ label: "2025/2026", division: "Division 2" }).ok, false);
  assert.equal(validateSeasonInput({ label: "2025-2026", division: "  " }).ok, false);
  assert.deepEqual(validateSeasonInput({ label: "2017-2018", division: "5A", historicalOnly: true }), {
    ok: true, value: { label: "2017-2018", division: "5A", historicalOnly: true },
  });
  assert.equal(validateSeasonInput({ label: "2017-2018", division: "5A", historicalOnly: "yes" }).ok, false);
});

test("season calendar creates exactly 26 rounds with seven empty matches each", () => {
  const rounds = buildRegularCalendarSlots("season-test");
  assert.equal(rounds.length, REGULAR_SEASON_ROUNDS);
  assert.ok(rounds.every((round, index) => round.roundNumber === index + 1));
  assert.ok(rounds.every((round) => round.matches.length === MATCHES_PER_ROUND));
  assert.equal(rounds.flatMap((round) => round.matches).length, 182);
  assert.ok(rounds.flatMap((round) => round.matches).every((match) => match.teamAId === null && match.teamBId === null && match.scoreA === null && match.scoreB === null));
});

test("historical season totals validate match-independent team and player aggregates", () => {
  const input = {
    team: { matchesPlayed: 23, wins: 7, draws: 2, losses: 14, forfeits: 0, goalsFor: 45, goalsAgainst: 71, points: 46 },
    players: [{ playerId: "player-a", appearances: 7, goals: 3, mom: 0 }],
  };
  assert.deepEqual(validateSeasonHistoricalTotalsInput(input), {
    ok: true,
    value: {
      team: input.team,
      players: [{ playerId: "player-a", appearances: 7, goals: 3, assists: 0, mom: 0, refereePayments: 0 }],
    },
  });
  assert.equal(validateSeasonHistoricalTotalsInput({ ...input, team: { ...input.team, matchesPlayed: 22 } }).ok, false);
  assert.equal(validateSeasonHistoricalTotalsInput({ ...input, players: [{ ...input.players[0], goals: -1 }] }).ok, false);
  assert.equal(validateSeasonHistoricalTotalsInput({ ...input, players: [input.players[0], input.players[0]] }).ok, false);
});

test("team names are required and trimmed", () => {
  assert.deepEqual(validateTeamName({ name: "  FC Exemple  " }), { ok: true, value: { name: "FC Exemple" } });
  assert.equal(validateTeamName({ name: " " }).ok, false);
  assert.equal(validateTeamName({ name: "x".repeat(101) }).ok, false);
});

test("player fields are trimmed and default to active", () => {
  assert.deepEqual(validatePlayerInput({ firstName: "  Alice ", lastName: " Martin  " }), {
    ok: true,
    value: { firstName: "Alice", lastName: "Martin", status: "actif" },
  });
  assert.equal(validatePlayerInput({ firstName: "Alice", lastName: "Martin", status: "inconnu" }).ok, false);
  assert.equal(validatePlayerInput({ firstName: " ", lastName: "Martin" }).ok, false);
  assert.equal(validatePlayerInput({ firstName: "Alice", lastName: " " }).ok, false);
});

test("jersey number is optional, trimmed and bounded", () => {
  assert.deepEqual(validateJerseyNumber(" 07 "), { ok: true, value: "07" });
  assert.deepEqual(validateJerseyNumber(""), { ok: true, value: null });
  assert.equal(validateJerseyNumber("12345678901").ok, false);
});

test("regular matches validate teams, date, status and integer scores", () => {
  const completed = validateRegularMatchInput({ teamA: "Team Roquette", teamB: "FC Exemple", matchDate: "2026-10-12", status: "terminé", scoreA: "4", scoreB: "3" });
  assert.equal(completed.ok, true);
  assert.deepEqual(completed.value, { teamA: "Team Roquette", teamB: "FC Exemple", matchDate: "2026-10-12", status: "terminé", scoreA: 4, scoreB: 3, forfeitingSide: null });
  assert.equal(validateRegularMatchInput({ teamA: "Même équipe", teamB: "même équipe", matchDate: "2026-10-12" }).ok, false);
  assert.equal(validateRegularMatchInput({ teamA: "A", teamB: "B", matchDate: "2026-02-30", status: "terminé", scoreA: 1, scoreB: 0 }).ok, false);
  assert.equal(validateRegularMatchInput({ teamA: "A", teamB: "B", matchDate: "2026-10-12", status: "terminé", scoreA: 1.5, scoreB: 0 }).ok, false);
  assert.equal(validateRegularMatchInput({ teamA: "A", teamB: "B", matchDate: "2026-10-12", status: "terminé", scoreA: 1 }).ok, false);
  assert.equal(validateRegularMatchInput({ teamA: "A", teamB: "B", matchDate: "2026-10-12", status: "forfait" }).ok, false);
});

test("team standings apply points, forfeit counters, canceled-match exclusion and tie-break order", () => {
  const teams = [
    { id: "tr", name: "Team Roquette", isRoquette: true },
    { id: "alpha", name: "Alpha" },
    { id: "beta", name: "Beta" },
    { id: "zulu", name: "Zulu" },
  ];
  const matches = [
    { roundNumber: 1, teamAId: "tr", teamBId: "alpha", scoreA: 3, scoreB: 1, status: "terminé" },
    { roundNumber: 2, teamAId: "tr", teamBId: "beta", scoreA: 2, scoreB: 2, status: "terminé" },
    { roundNumber: 3, teamAId: "tr", teamBId: "zulu", scoreA: 0, scoreB: 1, status: "terminé" },
    { roundNumber: 4, teamAId: "tr", teamBId: "beta", scoreA: 0, scoreB: 3, status: "forfait", forfeitingTeamId: "tr" },
    { roundNumber: 5, teamAId: "alpha", teamBId: "zulu", scoreA: 5, scoreB: 0, status: "annulé" },
    { roundNumber: 6, teamAId: "tr", teamBId: "alpha", scoreA: null, scoreB: null, status: "à venir" },
  ];
  const standings = calculateTeamStandings(teams, matches);
  assert.deepEqual(standings.map((row) => row.teamName), ["Team Roquette", "Beta", "Zulu", "Alpha"]);
  assert.deepEqual(standings[0], {
    teamId: "tr", teamName: "Team Roquette", isRoquette: true,
    roundsPlayed: 4, wins: 1, draws: 1, losses: 2, forfeits: 1,
    goalsFor: 5, goalsAgainst: 7, goalDifference: -2, points: 7,
  });
  assert.equal(standings[1].points, 6);
  assert.equal(standings[1].forfeits, 0);
  assert.equal(standings[3].points, 1);
});

test("general forfeiter gets the documented fixed row while its opponents are awarded wins", () => {
  const teams = [
    { id: "tr", name: "Team Roquette", isRoquette: true },
    { id: "general", name: "Forfait Général", forfaitGeneral: true },
    { id: "fc", name: "FC Exemple" },
  ];
  const standings = calculateTeamStandings(teams, [
    { roundNumber: 1, teamAId: "general", teamBId: "tr", scoreA: 1, scoreB: 2, status: "terminé" },
    { roundNumber: 2, teamAId: "general", teamBId: "fc", scoreA: null, scoreB: null, status: "à venir" },
    { roundNumber: 3, teamAId: "general", teamBId: "fc", scoreA: null, scoreB: null, status: "annulé" },
  ]);
  const general = standings.find((row) => row.teamId === "general");
  assert.deepEqual({ roundsPlayed: general.roundsPlayed, wins: general.wins, draws: general.draws, losses: general.losses, forfeits: general.forfeits, goalsFor: general.goalsFor, goalsAgainst: general.goalsAgainst, goalDifference: general.goalDifference, points: general.points }, {
    roundsPlayed: 26, wins: 0, draws: 0, losses: 26, forfeits: 26, goalsFor: 0, goalsAgainst: 78, goalDifference: -78, points: 0,
  });
  const teamRoquette = standings.find((row) => row.teamId === "tr");
  assert.equal(teamRoquette.wins, 1);
  assert.equal(teamRoquette.goalsFor, 2);
  assert.equal(teamRoquette.goalsAgainst, 1);
  const fc = standings.find((row) => row.teamId === "fc");
  assert.equal(fc.wins, 1);
  assert.equal(fc.goalsFor, 3);
  assert.equal(fc.goalsAgainst, 0);
});

test("cup match inputs require an opponent, phase, date, valid status and complete scores", () => {
  assert.deepEqual(validateCupMatchInput({ opponentName: "FC Coupe", phase: "Demi-finale", matchDate: "2026-10-20" }), {
    ok: true, value: { opponentName: "FC Coupe", phase: "Demi-finale", matchDate: "2026-10-20", status: "à venir", scoreA: null, scoreB: null, forfeitingSide: null },
  });
  assert.equal(validateCupMatchInput({ opponentName: "Team Roquette", phase: "Finale", matchDate: "2026-10-20" }).ok, false);
  assert.equal(validateCupMatchInput({ opponentName: "FC Coupe", phase: "", matchDate: "2026-10-20" }).ok, false);
  assert.equal(validateCupMatchInput({ opponentName: "FC Coupe", phase: "Finale", matchDate: "2026-02-30" }).ok, false);
  assert.equal(validateCupMatchInput({ opponentName: "FC Coupe", phase: "Finale", matchDate: "2026-10-20", status: "terminé", scoreA: 2 }).ok, false);
  assert.equal(validateCupMatchInput({ opponentName: "FC Coupe", phase: "Finale", matchDate: "2026-10-20", status: "forfait", forfeitingSide: "B" }).ok, true);
});

test("match player statistics enforce presence for assists and allow multiple referee payers, including absent payers", () => {
  const accepted = validateMatchPlayerStatsInput({ players: [
    { playerId: "player-a", presence: true, goals: 3, assists: 1, refereePayment: true, mom: true },
    { playerId: "player-b", presence: true, goals: 0, assists: 0, refereePayment: false, mom: true },
    { playerId: "player-csc", presence: false, goals: 2, assists: 0, refereePayment: false, mom: false },
  ] });
  assert.equal(accepted.ok, true);
  assert.equal(validateMatchPlayerStatsInput({ players: [{ playerId: "p", presence: false, goals: 0, assists: 1, refereePayment: false, mom: false }] }).ok, false);
  assert.equal(validateMatchPlayerStatsInput({ players: [{ playerId: "p", presence: false, goals: 0, assists: 0, refereePayment: true, mom: false }] }).ok, true);
  assert.equal(validateMatchPlayerStatsInput({ players: [
    { playerId: "p1", presence: true, goals: 0, assists: 0, refereePayment: true, mom: false },
    { playerId: "p2", presence: true, goals: 0, assists: 0, refereePayment: true, mom: false },
  ] }).ok, true);
  assert.equal(validateMatchPlayerStatsInput({ players: [{ playerId: "p", presence: true, goals: -1, assists: 0, refereePayment: false, mom: false }] }).ok, false);
});

test("general-forfeit standings preserve original Team Roquette goals after the displayed score is rewritten", () => {
  const teams = [
    { id: "tr", name: "Team Roquette", isRoquette: true },
    { id: "general", name: "Forfait Général", forfaitGeneral: true },
  ];
  const [roquette] = calculateTeamStandings(teams, [
    { roundNumber: 1, teamAId: "tr", teamBId: "general", scoreA: 3, scoreB: 0,
      originalScoreA: 1, originalScoreB: 2, status: "forfait", forfeitingTeamId: "general" },
  ]);
  assert.equal(roquette.wins, 1);
  assert.equal(roquette.points, 4);
  assert.equal(roquette.goalsFor, 1);
  assert.equal(roquette.goalsAgainst, 2);
});

test("player statistics calculate career averages and percentages and follow the documented ranking order", () => {
  const rows = calculatePlayerStatistics([
    { firstName: "Alice", lastName: "Martin", appearances: 5, winAppearances: 4, goals: 4, assists: 2, mom: 1, wins: 3 },
    { firstName: "Bernard", lastName: "Dupont", appearances: 5, winAppearances: 5, goals: 4, assists: 3, mom: 1, wins: 4 },
    { firstName: "Camille", lastName: "Durand", appearances: 2, winAppearances: 2, goals: 4, assists: 3, mom: 1, wins: 0 },
    { firstName: "Dany", lastName: "Petit", appearances: 0, winAppearances: 0, goals: 0, assists: 0, mom: 0, wins: 0 },
  ], 10);
  assert.deepEqual(rows.map((row) => row.player), ["Bernard D.", "Camille D.", "Alice M.", "Dany P."]);
  assert.deepEqual({ goalsPerAppearance: rows[0].goalsPerAppearance, assistsPerAppearance: rows[0].assistsPerAppearance,
    winPercentage: rows[0].winPercentage, appearancePercentage: rows[0].appearancePercentage },
  { goalsPerAppearance: 0.8, assistsPerAppearance: 0.6, winPercentage: 80, appearancePercentage: 50 });
  assert.equal(rows.find((row) => row.player === "Alice M.").winPercentage, 75);
  assert.equal(rows[3].winPercentage, null);
  assert.equal(rows[3].appearancePercentage, 0);
  assert.equal(calculatePlayerStatistics([
    { firstName: "Vieux", lastName: "Record", appearances: 8, winAppearances: 0, goals: 0, assists: 0, mom: 0, wins: 0 },
  ], 23)[0].winPercentage, null);
  assert.equal(calculatePlayerStatistics([
    { firstName: "Eli", lastName: "Inconnu", appearances: 2, winAppearances: 2, goals: 0, assists: 0, mom: 0, wins: null },
  ], 23)[0].winPercentage, null);
});

test("career player statistics are split by current active or retired status", () => {
  const result = calculatePlayerStatisticsByStatus([
    { firstName: "Alice", lastName: "Active", status: "actif", appearances: 4, winAppearances: 3, goals: 3, assists: 2, mom: 1, wins: 2 },
    { firstName: "Rita", lastName: "Retired", status: "retraité", appearances: 6, winAppearances: 5, goals: 5, assists: 1, mom: 0, wins: 3 },
    { firstName: "Alan", lastName: "Active", status: "actif", appearances: 2, winAppearances: 2, goals: 1, assists: 0, mom: 0, wins: 1 },
  ], 10);
  assert.deepEqual(result.active.map((player) => player.player), ["Alice A.", "Alan A."]);
  assert.deepEqual(result.retired.map((player) => player.player), ["Rita R."]);
});

test("career player leader lists select the top three by each metric with stable tie ordering", () => {
  const players = [
    { firstName: "Sam", lastName: "Zed", goals: 12, assists: 2 },
    { firstName: "Lee", lastName: "Alpha", goals: 12, assists: 8 },
    { firstName: "Jo", lastName: "Bravo", goals: 10, assists: 8 },
    { firstName: "Bea", lastName: "Charlie", goals: 8, assists: 6 },
    { firstName: "Zero", lastName: "NoStat", goals: 0, assists: 0 },
  ];
  assert.deepEqual(calculateTopCareerPlayers(players, "goals"), [
    { player: "Lee A.", value: 12 }, { player: "Sam Z.", value: 12 }, { player: "Jo B.", value: 10 },
  ]);
  assert.deepEqual(calculateTopCareerPlayers(players, "assists"), [
    { player: "Lee A.", value: 8 }, { player: "Jo B.", value: 8 }, { player: "Bea C.", value: 6 },
  ]);
});

test("Team Roquette season statistics combine regular and cup matches and apply general-forfeit rules", () => {
  const statistics = calculateTeamRoquetteSeasonStatistics([
    { matchType: "regular", teamAId: "team-roquette", teamBId: "alpha", scoreA: 2, scoreB: 1, status: "terminé" },
    { matchType: "cup", roquetteSide: "A", scoreA: 1, scoreB: 1, status: "terminé" },
    { matchType: "regular", roquetteSide: "B", scoreA: 4, scoreB: 2, status: "terminé" },
    { matchType: "regular", roquetteSide: "A", scoreA: 0, scoreB: 3, status: "forfait", forfeitingTeamId: "team-roquette" },
    { matchType: "cup", roquetteSide: "A", scoreA: 3, scoreB: 0, status: "forfait", forfeitingTeamId: "opponent" },
    { matchType: "regular", roquetteSide: "A", scoreA: 3, scoreB: 0, status: "annulé" },
    { matchType: "regular", roquetteSide: "A", scoreA: null, scoreB: null, status: "à venir" },
    { matchType: "cup", roquetteSide: "B", scoreA: null, scoreB: null, status: "à venir" },
    { matchType: "regular", roquetteSide: "B", scoreA: 3, scoreB: 0, originalScoreA: 4, originalScoreB: 1,
      status: "forfait", forfeitingTeamId: "general", generalForfeiterId: "general" },
    { matchType: "regular", roquetteSide: "A", scoreA: 3, scoreB: 0, originalScoreA: null, originalScoreB: null,
      status: "forfait", forfeitingTeamId: "general", generalForfeiterId: "general", cscGoals: 3, otherPlayerGoals: 0 },
    { matchType: "regular", roquetteSide: "A", scoreA: 3, scoreB: 0, status: "forfait", forfeitingTeamId: "general",
      generalForfeiterId: "general", cscGoals: 2, otherPlayerGoals: 0 },
    { matchType: "cup", roquetteSide: "A", scoreA: 3, scoreB: 0, status: "forfait", forfeitingTeamId: "general",
      generalForfeiterId: "general", cscGoals: 3, otherPlayerGoals: 1 },
    { matchType: "regular", roquetteSide: "A", scoreA: 0, scoreB: 3, status: "forfait", forfeitingTeamId: "team-roquette",
      generalForfeiterId: "team-roquette", cscGoals: 0, otherPlayerGoals: 0 },
  ]);
  assert.deepEqual(statistics, {
    matchCount: 7, goalsFor: 12, goalsAgainst: 13, points: 13,
    wins: 4, draws: 1, losses: 2, forfeits: 1,
  });
});

test("public player identity uses the full first name and last-name initial", () => {
  assert.equal(toPlayerDisplayName("Jean-Pierre", "Dupont"), "Jean-Pierre D.");
  assert.equal(toPlayerDisplayName("Élodie", "d'Arcy"), "Élodie D.");
  assert.equal(toPlayerDisplayName("", "Roquette"), "R.");
  assert.equal(toPlayerDisplayName("", ""), "?");
});
