import SiteHeader from "../components/SiteHeader.jsx";
import { listSeasons } from "../../lib/seasons.js";
import { getPublicSeasonResults } from "../../lib/public-data.js";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function getParisDate() {
  const parts = new Intl.DateTimeFormat("fr-FR", {
    timeZone: "Europe/Paris", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function dateClass(match, today) {
  if (!match.date) return "match-date date-neutral";
  if (match.date === today) return "match-date date-today";
  if (match.date > today) return "match-date date-future";
  return match.scoreA === null || match.scoreB === null
    ? "match-date date-past-no-score"
    : "match-date date-past-score";
}

function formatDate(value) {
  if (!value) return "Date à renseigner";
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
}

export default async function ResultsPage({ searchParams }) {
  const seasons = listSeasons();
  const query = await searchParams;
  const requestedSeasonId = typeof query?.saison === "string" ? query.saison : "";
  const season = seasons.find((item) => item.id === requestedSeasonId) ?? seasons[0] ?? null;
  const results = season ? getPublicSeasonResults(season.id) : { matches: [] };
  const teamRoquetteMatches = results.matches.filter((match) => match.teamAIsRoquette || match.teamBIsRoquette);
  const today = getParisDate();

  return <><SiteHeader/><main className="container">
    <section className="hero">
      <span className="eyebrow">Team Roquette</span>
      <h1>Résultats</h1>
      <p>Calendrier et scores des matchs de Team Roquette en saison régulière et en coupe.</p>
    </section>
    {!season ? <section className="panel"><p>Aucune saison n’est encore publiée.</p></section> : <>
      <section className="panel section">
        <form method="get" className="inline">
          <label>Saison<select name="saison" defaultValue={season.id}>
            {seasons.map((item) => <option key={item.id} value={item.id}>{item.label} — {item.division}</option>)}
          </select></label>
          <button className="button secondary">Afficher</button>
        </form>
        <p className="muted">{season.label} · {season.division}</p>
      </section>
      {teamRoquetteMatches.length === 0 ? <section className="panel"><p>Aucun match de Team Roquette renseigné pour cette saison.</p></section> :
        <section className="stack section" aria-label={`Matchs de ${season.label}`}>
          {teamRoquetteMatches.map((match) => {
            const involvesRoquette = match.teamAIsRoquette || match.teamBIsRoquette;
            const isCancelled = match.status === "annulé";
            const statusLabel = match.status === "terminé" ? "Terminé" : match.status === "forfait" ? "Forfait" : isCancelled ? "Annulé" : "À venir";
            const hasScore = match.scoreA !== null && match.scoreB !== null && !isCancelled;
            return <article className={`panel match-card${involvesRoquette ? " match-roquette" : ""}${isCancelled ? " match-cancelled" : ""}`} key={match.id}>
              <div className="match-meta">
                <span className="match-round">{match.round ? `Journée ${match.round}` : match.phase || "Coupe"}</span>
                <span className={dateClass(match, today)}>{formatDate(match.date)}</span>
                <span className="match-status">{statusLabel}</span>
              </div>
              <div className="match-scoreline">
                <span className={match.teamAIsRoquette ? "team-name team-roquette-name" : "team-name"}>{match.teamA || "Équipe à renseigner"}</span>
                <strong className="match-score">{hasScore ? `${match.scoreA} – ${match.scoreB}` : "—"}</strong>
                <span className={match.teamBIsRoquette ? "team-name team-roquette-name" : "team-name"}>{match.teamB || "Équipe à renseigner"}</span>
              </div>
            </article>;
          })}
        </section>}
    </>}
  </main></>;
}
