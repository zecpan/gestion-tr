export const SEASON_LABEL_PATTERN = /^\d{4}-\d{4}$/;
export const REGULAR_SEASON_ROUNDS = 26;
export const MATCHES_PER_ROUND = 7;

export function validateSeasonInput(input) {
  const label = typeof input?.label === "string" ? input.label.trim() : "";
  const division = typeof input?.division === "string" ? input.division.trim() : "";
  if (!SEASON_LABEL_PATTERN.test(label)) {
    return { ok: false, error: "Le libellé de saison doit respecter le format AAAA-AAAA (ex. 2025-2026)." };
  }
  if (!division || division.length > 100) {
    return { ok: false, error: "La division doit être renseignée (100 caractères maximum)." };
  }
  const historicalOnly = input?.historicalOnly ?? false;
  if (typeof historicalOnly !== "boolean") return { ok: false, error: "Le type de saison est invalide." };
  return { ok: true, value: { label, division, historicalOnly } };
}

export function validateSeasonHistoricalTotalsInput(input) {
  const team = input?.team;
  const players = input?.players;
  const integer = (value) => Number.isSafeInteger(value) && value >= 0;
  const teamFields = ["matchesPlayed", "wins", "draws", "losses", "forfeits", "goalsFor", "goalsAgainst", "points"];
  if (!team || teamFields.some((field) => !integer(team[field]))) {
    return { ok: false, error: "Le bilan historique de l’équipe est invalide." };
  }
  if (team.matchesPlayed !== team.wins + team.draws + team.losses || team.forfeits > team.losses) {
    return { ok: false, error: "Les résultats du bilan d’équipe sont incohérents." };
  }
  if (!Array.isArray(players) || players.length < 1 || players.length > 100) {
    return { ok: false, error: "La liste des statistiques de joueurs est invalide." };
  }
  const seen = new Set();
  const normalizedPlayers = [];
  for (const player of players) {
    const playerId = typeof player?.playerId === "string" ? player.playerId.trim() : "";
    if (!playerId || playerId.length > 100 || seen.has(playerId)) {
      return { ok: false, error: "Un joueur est invalide ou présent plusieurs fois." };
    }
    const appearances = player.appearances;
    const goals = player.goals;
    const mom = player.mom;
    const assists = player.assists ?? 0;
    const refereePayments = player.refereePayments ?? 0;
    if (![appearances, goals, mom, assists, refereePayments].every(integer)) {
      return { ok: false, error: "Les statistiques historiques doivent être des entiers positifs ou nuls." };
    }
    seen.add(playerId);
    normalizedPlayers.push({ playerId, appearances, goals, assists, mom, refereePayments });
  }
  return { ok: true, value: {
    team: Object.fromEntries(teamFields.map((field) => [field, team[field]])),
    players: normalizedPlayers,
  } };
}

export function validateTeamName(input) {
  const name = typeof input?.name === "string" ? input.name.trim() : "";
  if (!name || name.length > 100) return { ok: false, error: "Le nom de l’équipe est obligatoire (100 caractères maximum)." };
  return { ok: true, value: { name } };
}

export function validatePlayerInput(input) {
  const firstName = typeof input?.firstName === "string" ? input.firstName.trim() : "";
  const lastName = typeof input?.lastName === "string" ? input.lastName.trim() : "";
  const status = input?.status ?? "actif";
  if (!firstName || firstName.length > 100) return { ok: false, error: "Le prénom est obligatoire (100 caractères maximum)." };
  if (!lastName || lastName.length > 100) return { ok: false, error: "Le nom est obligatoire (100 caractères maximum)." };
  if (status !== "actif" && status !== "retraité") return { ok: false, error: "Le statut doit être actif ou retraité." };
  return { ok: true, value: { firstName, lastName, status } };
}

export function validateJerseyNumber(input) {
  if (input === null || input === undefined || input === "") return { ok: true, value: null };
  if (typeof input !== "string" && typeof input !== "number") return { ok: false, error: "Le numéro de maillot est invalide." };
  const jerseyNumber = String(input).trim();
  if (!jerseyNumber) return { ok: true, value: null };
  if (jerseyNumber.length > 10) return { ok: false, error: "Le numéro de maillot ne peut pas dépasser 10 caractères." };
  return { ok: true, value: jerseyNumber };
}

export function validateRegularMatchInput(input) {
  const teamA = typeof input?.teamA === "string" ? input.teamA.trim() : "";
  const teamB = typeof input?.teamB === "string" ? input.teamB.trim() : "";
  const matchDate = typeof input?.matchDate === "string" ? input.matchDate.trim() : "";
  const status = input?.status ?? "à venir";
  const forfeitingSide = input?.forfeitingSide ?? "";
  const parseScore = (value) => {
    if (value === null || value === undefined || (typeof value === "string" && value.trim() === "")) return { ok: true, value: null };
    const score = typeof value === "number" ? value : Number(value);
    return Number.isSafeInteger(score) && score >= 0
      ? { ok: true, value: score }
      : { ok: false, error: "Les scores doivent être des entiers positifs ou nuls." };
  };
  const scoreA = parseScore(input?.scoreA);
  const scoreB = parseScore(input?.scoreB);

  if (!teamA && teamB || teamA && !teamB) return { ok: false, error: "Renseignez les deux équipes ou laissez les deux champs vides." };
  if (teamA.length > 100 || teamB.length > 100) return { ok: false, error: "Le nom d’une équipe ne peut pas dépasser 100 caractères." };
  if (teamA && teamA.toLocaleLowerCase("fr-FR") === teamB.toLocaleLowerCase("fr-FR")) return { ok: false, error: "Un match doit opposer deux équipes différentes." };
  if (status !== "à venir" && status !== "terminé" && status !== "forfait" && status !== "annulé") return { ok: false, error: "Statut de match invalide." };
  if (!scoreA.ok) return scoreA;
  if (!scoreB.ok) return scoreB;
  if (matchDate && !/^\d{4}-\d{2}-\d{2}$/.test(matchDate)) return { ok: false, error: "La date du match doit être une date valide." };
  if (matchDate) {
    const year = Number(matchDate.slice(0, 4));
    const parsedDate = new Date(`${matchDate}T00:00:00.000Z`);
    if (year < 1000 || !Number.isFinite(parsedDate.getTime()) || parsedDate.toISOString().slice(0, 10) !== matchDate) {
      return { ok: false, error: "La date du match doit être une date valide." };
    }
  }
  if ((teamA || teamB) && !matchDate) return { ok: false, error: "Renseignez la date dès que les deux équipes sont définies." };
  if (status !== "à venir" && !teamA) return { ok: false, error: "Un match doit avoir deux équipes pour recevoir ce statut." };
  if (status === "terminé" && (scoreA.value === null || scoreB.value === null)) {
    return { ok: false, error: "Saisissez les deux scores pour terminer le match." };
  }
  if (status === "forfait" && forfeitingSide !== "A" && forfeitingSide !== "B") {
    return { ok: false, error: "Sélectionnez l’équipe qui déclare forfait." };
  }
  if (status === "à venir" && (scoreA.value !== null || scoreB.value !== null)) {
    return { ok: false, error: "Un match à venir ne peut pas avoir de score saisi." };
  }
  return { ok: true, value: {
    teamA: teamA || null,
    teamB: teamB || null,
    matchDate: matchDate || null,
    status,
    scoreA: scoreA.value,
    scoreB: scoreB.value,
    forfeitingSide: status === "forfait" ? forfeitingSide : null,
  } };
}

export function validateCupMatchInput(input) {
  const opponentName = typeof input?.opponentName === "string" ? input.opponentName.trim() : "";
  const phase = typeof input?.phase === "string" ? input.phase.trim() : "";
  const matchDate = typeof input?.matchDate === "string" ? input.matchDate.trim() : "";
  const status = input?.status ?? "à venir";
  const forfeitingSide = input?.forfeitingSide ?? "";
  const parseScore = (value) => {
    if (value === null || value === undefined || (typeof value === "string" && value.trim() === "")) return { ok: true, value: null };
    const score = typeof value === "number" ? value : Number(value);
    return Number.isSafeInteger(score) && score >= 0
      ? { ok: true, value: score }
      : { ok: false, error: "Les scores doivent être des entiers positifs ou nuls." };
  };
  const scoreA = parseScore(input?.scoreA);
  const scoreB = parseScore(input?.scoreB);

  if (!opponentName || opponentName.length > 100) return { ok: false, error: "Le nom de l’équipe adverse est obligatoire (100 caractères maximum)." };
  if (opponentName.toLocaleLowerCase("fr-FR") === "team roquette") return { ok: false, error: "L’équipe adverse doit être différente de Team Roquette." };
  if (!phase || phase.length > 100) return { ok: false, error: "La phase de coupe est obligatoire (100 caractères maximum)." };
  if (!matchDate || !/^\d{4}-\d{2}-\d{2}$/.test(matchDate)) return { ok: false, error: "Renseignez une date de match valide." };
  const year = Number(matchDate.slice(0, 4));
  const parsedDate = new Date(`${matchDate}T00:00:00.000Z`);
  if (year < 1000 || !Number.isFinite(parsedDate.getTime()) || parsedDate.toISOString().slice(0, 10) !== matchDate) {
    return { ok: false, error: "Renseignez une date de match valide." };
  }
  if (status !== "à venir" && status !== "terminé" && status !== "forfait" && status !== "annulé") return { ok: false, error: "Statut de match invalide." };
  if (!scoreA.ok) return scoreA;
  if (!scoreB.ok) return scoreB;
  if (status === "terminé" && (scoreA.value === null || scoreB.value === null)) return { ok: false, error: "Saisissez les deux scores pour terminer le match." };
  if (status === "forfait" && forfeitingSide !== "A" && forfeitingSide !== "B") return { ok: false, error: "Sélectionnez l’équipe qui déclare forfait." };
  if (status === "à venir" && (scoreA.value !== null || scoreB.value !== null)) return { ok: false, error: "Un match à venir ne peut pas avoir de score saisi." };
  return { ok: true, value: {
    opponentName, phase, matchDate, status,
    scoreA: scoreA.value, scoreB: scoreB.value,
    forfeitingSide: status === "forfait" ? forfeitingSide : null,
  } };
}

export function validateMatchPlayerStatsInput(input) {
  if (!Array.isArray(input?.players) || input.players.length > 100) {
    return { ok: false, error: "La liste des statistiques de joueurs est invalide." };
  }
  const seen = new Set();
  const players = [];
  for (const row of input.players) {
    const playerId = typeof row?.playerId === "string" ? row.playerId.trim() : "";
    const goals = row?.goals;
    const assists = row?.assists;
    if (!playerId || playerId.length > 100 || seen.has(playerId)) return { ok: false, error: "Un joueur est invalide ou présent plusieurs fois." };
    if (typeof row?.presence !== "boolean" || typeof row?.refereePayment !== "boolean" || typeof row?.mom !== "boolean") {
      return { ok: false, error: "Les présences, paiements d’arbitre et titres MOM doivent être renseignés." };
    }
    if (!Number.isSafeInteger(goals) || goals < 0 || !Number.isSafeInteger(assists) || assists < 0) {
      return { ok: false, error: "Les buts et passes doivent être des entiers positifs ou nuls." };
    }
    if (!row.presence && assists > 0) return { ok: false, error: "Une passe décisive ne peut être attribuée qu’à un joueur présent." };
    seen.add(playerId);
    players.push({ playerId, presence: row.presence, goals, assists, refereePayment: row.refereePayment, mom: row.mom });
  }
  return { ok: true, value: { players } };
}

export function calculateTeamStandings(teams, matches) {
  const standings = new Map();
  for (const team of teams) {
    standings.set(team.id, {
      teamId: team.id,
      teamName: team.name,
      isRoquette: Boolean(team.isRoquette),
      forfaitGeneral: Boolean(team.forfaitGeneral),
      rounds: new Set(),
      wins: 0,
      draws: 0,
      losses: 0,
      forfeits: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      points: 0,
    });
  }
  const addScore = (row, scored, conceded) => {
    row.goalsFor += scored;
    row.goalsAgainst += conceded;
  };
  const isScore = (score) => Number.isSafeInteger(score) && score >= 0;
  const teamById = new Map(teams.map((team) => [team.id, team]));

  for (const match of matches) {
    if (match.status === "annulé" || !match.teamAId || !match.teamBId || match.teamAId === match.teamBId) continue;
    const rowA = standings.get(match.teamAId);
    const rowB = standings.get(match.teamBId);
    if (!rowA || !rowB) continue;

    const generalA = Boolean(teamById.get(match.teamAId)?.forfaitGeneral);
    const generalB = Boolean(teamById.get(match.teamBId)?.forfaitGeneral);
    if (generalA !== generalB) {
      const opponent = generalA ? rowB : rowA;
      const opponentIsA = generalB;
      const originalScoreA = isScore(match.originalScoreA) ? match.originalScoreA : match.scoreA;
      const originalScoreB = isScore(match.originalScoreB) ? match.originalScoreB : match.scoreB;
      const canPreserveRoquetteScore = opponent.isRoquette &&
        (match.status === "terminé" || match.status === "forfait") && isScore(originalScoreA) && isScore(originalScoreB);
      opponent.rounds.add(match.roundNumber);
      if (canPreserveRoquetteScore) {
        addScore(opponent, opponentIsA ? originalScoreA : originalScoreB, opponentIsA ? originalScoreB : originalScoreA);
      } else {
        addScore(opponent, 3, 0);
      }
      opponent.wins += 1;
      opponent.points += 4;
      continue;
    }
    if (generalA && generalB) continue;
    if (match.status !== "terminé" && match.status !== "forfait") continue;
    if (!isScore(match.scoreA) || !isScore(match.scoreB) || !Number.isInteger(match.roundNumber)) continue;
    const forfeitingTeamId = match.status === "forfait"
      ? match.forfeitingTeamId ?? (match.scoreA === 0 && match.scoreB === 3 ? match.teamAId :
        match.scoreA === 3 && match.scoreB === 0 ? match.teamBId : null)
      : null;
    if (match.status === "forfait" && forfeitingTeamId !== match.teamAId && forfeitingTeamId !== match.teamBId) continue;

    rowA.rounds.add(match.roundNumber);
    rowB.rounds.add(match.roundNumber);
    addScore(rowA, match.scoreA, match.scoreB);
    addScore(rowB, match.scoreB, match.scoreA);

    if (match.status === "forfait") {
      const forfeiting = forfeitingTeamId === match.teamAId ? rowA : rowB;
      const winner = forfeitingTeamId === match.teamAId ? rowB : rowA;
      forfeiting.losses += 1;
      forfeiting.forfeits += 1;
      winner.wins += 1;
      winner.points += 4;
    } else if (match.scoreA > match.scoreB) {
      rowA.wins += 1; rowA.points += 4;
      rowB.losses += 1; rowB.points += 1;
    } else if (match.scoreB > match.scoreA) {
      rowB.wins += 1; rowB.points += 4;
      rowA.losses += 1; rowA.points += 1;
    } else {
      rowA.draws += 1; rowA.points += 2;
      rowB.draws += 1; rowB.points += 2;
    }
  }

  const result = [...standings.values()].map((row) => {
    if (row.forfaitGeneral) {
      return {
        teamId: row.teamId, teamName: row.teamName, isRoquette: row.isRoquette,
        roundsPlayed: 26, wins: 0, draws: 0, losses: 26, forfeits: 26,
        goalsFor: 0, goalsAgainst: 78, goalDifference: -78, points: 0,
      };
    }
    const goalsFor = row.goalsFor;
    const goalsAgainst = row.goalsAgainst;
    return {
      teamId: row.teamId, teamName: row.teamName, isRoquette: row.isRoquette,
      roundsPlayed: row.rounds.size, wins: row.wins, draws: row.draws,
      losses: row.losses, forfeits: row.forfeits, goalsFor, goalsAgainst,
      goalDifference: goalsFor - goalsAgainst, points: row.points,
    };
  });

  return result.sort((a, b) => b.points - a.points || b.goalDifference - a.goalDifference ||
    b.goalsFor - a.goalsFor || a.teamName.localeCompare(b.teamName, "fr-FR"));
}

export function buildRegularCalendarSlots(seasonId) {
  return Array.from({ length: REGULAR_SEASON_ROUNDS }, (_, roundIndex) => ({
    seasonId,
    roundNumber: roundIndex + 1,
    matches: Array.from({ length: MATCHES_PER_ROUND }, (_, matchIndex) => ({
      slotNumber: matchIndex + 1,
      matchType: "regular",
      status: "à venir",
      teamAId: null,
      teamBId: null,
      scoreA: null,
      scoreB: null,
      matchDate: null,
    })),
  }));
}

export function calculatePlayerStatistics(players, totalMatches) {
  return players.map((player) => ({
    player: toPlayerDisplayName(player.firstName, player.lastName),
    appearances: player.appearances,
    goals: player.goals,
    goalsPerAppearance: player.appearances ? player.goals / player.appearances : 0,
    assists: player.assists,
    assistsPerAppearance: player.appearances ? player.assists / player.appearances : 0,
    mom: player.mom,
    winPercentage: player.wins === null || player.wins === undefined || !player.winAppearances
      ? null
      : Math.round((player.wins / player.winAppearances) * 100),
    appearancePercentage: totalMatches ? Math.round((player.appearances / totalMatches) * 100) : 0,
    _lastName: player.lastName,
    _firstName: player.firstName,
  })).sort((a, b) => b.goals - a.goals || b.assists - a.assists || b.mom - a.mom ||
    b.appearances - a.appearances || a._lastName.localeCompare(b._lastName, "fr-FR") || a._firstName.localeCompare(b._firstName, "fr-FR"))
    .map(({ _lastName, _firstName, ...row }) => row);
}

export function calculatePlayerStatisticsByStatus(players, totalMatches) {
  return {
    active: calculatePlayerStatistics(players.filter((player) => player.status === "actif"), totalMatches),
    retired: calculatePlayerStatistics(players.filter((player) => player.status === "retraité"), totalMatches),
  };
}

export function calculateTopCareerPlayers(players, field) {
  return players.filter((player) => player[field] > 0)
    .sort((a, b) => b[field] - a[field] ||
      a.lastName.localeCompare(b.lastName, "fr-FR") || a.firstName.localeCompare(b.firstName, "fr-FR"))
    .slice(0, 3)
    .map((player) => ({ player: toPlayerDisplayName(player.firstName, player.lastName), value: player[field] }));
}

export function calculateTeamRoquetteSeasonStatistics(matches) {
  const totals = { matchCount: 0, goalsFor: 0, goalsAgainst: 0, points: 0, wins: 0, draws: 0, losses: 0, forfeits: 0 };
  const isScore = (value) => Number.isSafeInteger(value) && value >= 0;

  for (const match of matches) {
    if (match.status === "annulé" || match.status === "à venir") continue;
    const roquetteSide = match.roquetteSide ?? (match.teamAId === "team-roquette" ? "A" : match.teamBId === "team-roquette" ? "B" : null);
    if (roquetteSide !== "A" && roquetteSide !== "B") continue;

    const originalScoresPresent = isScore(match.originalScoreA) && isScore(match.originalScoreB);
    const isGeneralForfeit = Boolean(match.generalForfeiterId);
    const isGeneralPlayedForfeit = match.status === "forfait" && isGeneralForfeit && originalScoresPresent;
    const isPendingGeneralForfeit = match.status === "forfait" && isGeneralForfeit && !originalScoresPresent;
    const scoreFor = (scoreA, scoreB) => roquetteSide === "A" ? { goalsFor: scoreA, goalsAgainst: scoreB } : { goalsFor: scoreB, goalsAgainst: scoreA };

    if (isPendingGeneralForfeit) {
      const current = scoreFor(match.scoreA, match.scoreB);
      if (match.generalForfeiterId === "team-roquette" || match.forfeitingTeamId !== match.generalForfeiterId ||
          match.cscGoals !== 3 || match.otherPlayerGoals !== 0 || current.goalsFor !== 3 || current.goalsAgainst !== 0) continue;
    }

    totals.matchCount += 1;
    const useOriginalScores = isGeneralPlayedForfeit;
    const playedScores = match.status === "terminé" || match.status === "forfait";
    const scoreA = useOriginalScores ? match.originalScoreA : match.scoreA;
    const scoreB = useOriginalScores ? match.originalScoreB : match.scoreB;
    const validPlayedScore = playedScores && isScore(scoreA) && isScore(scoreB);
    const resultScore = validPlayedScore ? scoreFor(scoreA, scoreB) : null;

    if (validPlayedScore) {
      totals.goalsFor += resultScore.goalsFor;
      totals.goalsAgainst += resultScore.goalsAgainst;
    }

    let result = null;
    if (isGeneralPlayedForfeit || isPendingGeneralForfeit) {
      result = match.generalForfeiterId === "team-roquette" ? "forfeit" : "win";
    } else if (match.status === "terminé" && resultScore) {
      result = resultScore.goalsFor > resultScore.goalsAgainst ? "win" :
        resultScore.goalsFor < resultScore.goalsAgainst ? "loss" : "draw";
    } else if (match.status === "forfait" && resultScore) {
      const forfeitingTeamId = match.forfeitingTeamId ??
        (resultScore.goalsFor === 0 && resultScore.goalsAgainst === 3 ? "team-roquette" :
          resultScore.goalsFor === 3 && resultScore.goalsAgainst === 0 ? "opponent" : null);
      result = forfeitingTeamId === "team-roquette" ? "forfeit" : forfeitingTeamId ? "win" : null;
    }

    if (result === "win") {
      totals.wins += 1;
      if (match.matchType === "regular") totals.points += 4;
    } else if (result === "draw") {
      totals.draws += 1;
      if (match.matchType === "regular") totals.points += 2;
    } else if (result === "loss") {
      totals.losses += 1;
      if (match.matchType === "regular") totals.points += 1;
    } else if (result === "forfeit") {
      totals.losses += 1;
      totals.forfeits += 1;
    }
  }
  return totals;
}

export function toPlayerDisplayName(firstName, lastName) {
  const first = String(firstName ?? "").trim();
  const lastInitial = [...String(lastName ?? "").trim()][0]?.toLocaleUpperCase("fr-FR") ?? "";
  if (!first && !lastInitial) return "?";
  return [first, lastInitial ? `${lastInitial}.` : ""].filter(Boolean).join(" ");
}
