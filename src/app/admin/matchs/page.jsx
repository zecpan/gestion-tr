import { redirect } from "next/navigation";
import AdminNavigation from "../AdminNavigation.jsx";
import MatchManagement from "../MatchManagement.jsx";
import { getAdminSession } from "../../../lib/auth.js";
import { listRegularRoundMatches, listSeasonRoundSummaries, listTeams } from "../../../lib/matches.js";
import { listSeasonRounds, listSeasons } from "../../../lib/seasons.js";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function roundColor(summary) {
  if (!summary || summary.matchCount === 0) return "other";
  if (summary.pastUnscoredMatchCount > 0) return "past-unscored";
  if (summary.scoredMatchCount === summary.matchCount) return "complete";
  if (summary.upcomingMatchCount === summary.matchCount) return "upcoming";
  if (summary.resultMatchCount > 0) return "partial";
  return "other";
}

export default async function AdminMatchesPage({ searchParams }) {
  const admin = await getAdminSession();
  if (!admin) redirect("/admin/login");
  const seasons = listSeasons();
  const query = await searchParams;
  const requestedSeasonId = typeof query?.saison === "string" ? query.saison : "";
  const season = seasons.find((item) => item.id === requestedSeasonId) ?? seasons[0] ?? null;
  const rounds = season ? listSeasonRounds(season.id) : [];
  const roundSummaries = season ? new Map(listSeasonRoundSummaries(season.id).map((summary) => [summary.roundNumber, summary])) : new Map();
  const requestedRound = typeof query?.journee === "string" ? Number(query.journee) : 1;
  const roundNumber = rounds.includes(requestedRound) ? requestedRound : rounds[0] ?? 1;
  const matches = season && rounds.includes(roundNumber) ? listRegularRoundMatches(season.id, roundNumber) : [];
  const teams = season ? listTeams(season.id) : [];

  return <><AdminNavigation/><main className="container">
    <div className="inline admin-heading">
      <div><span className="eyebrow">Administration · {admin.username}</span><h1>Gestion des matchs</h1></div>
    </div>
    {seasons.length === 0
      ? <section className="panel section"><p>Créez d’abord une saison et son calendrier.</p><a className="button" href="/admin">Créer une saison</a></section>
      : <>
        <section className="panel match-season-panel">
          <div className="match-season-current">
            <span className="eyebrow">Saison sélectionnée</span>
            <strong>{season.label}</strong>
            <span className="muted">{season.division}</span>
          </div>
          <form method="get" className="inline match-season-selector">
            <label>Changer de saison<select name="saison" defaultValue={season.id}>
              {seasons.map((item) => <option key={item.id} value={item.id}>{item.label} — {item.division}</option>)}
            </select></label>
            <button className="button secondary">Afficher les matchs</button>
          </form>
        </section>
        <section className="panel section round-selector-panel">
          <h2>Choisir une journée</h2>
          <nav className="round-selector-grid" aria-label="Sélectionner une journée">
            {rounds.map((round) => <a key={round}
              className={`round-selector-button round-selector-button-${roundColor(roundSummaries.get(round))}${round === roundNumber ? " selected" : ""}`}
              href={`/admin/matchs?saison=${encodeURIComponent(season.id)}&journee=${round}`}
              title={`Journée ${round}`}
              aria-label={`Journée ${round}`}
              aria-current={round === roundNumber ? "page" : undefined}>
              J{round}
            </a>)}
          </nav>
          <div className="round-selector-legend" aria-label="Légende des couleurs des journées">
            <span><i className="round-selector-swatch round-selector-swatch-complete"/>Complète : tous les scores sont saisis</span>
            <span><i className="round-selector-swatch round-selector-swatch-upcoming"/>À venir : tous les matchs sont à venir</span>
            <span><i className="round-selector-swatch round-selector-swatch-partial"/>Incomplète : au moins un match terminé ou forfait</span>
            <span><i className="round-selector-swatch round-selector-swatch-past-unscored"/>Au moins un match passé sans score : journée en rouge</span>
            <span><i className="round-selector-swatch round-selector-swatch-other"/>Autre situation (ex. matchs annulés)</span>
          </div>
        </section>
        <MatchManagement key={`${season.id}:${roundNumber}`} season={season} roundNumber={roundNumber} matches={matches} teams={teams}/>
      </>}
  </main></>;
}
