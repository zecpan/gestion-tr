import SiteHeader from "../components/SiteHeader.jsx";
import { listSeasons } from "../../lib/seasons.js";
import { getPublicSeasonPlayerStandings } from "../../lib/player-standings.js";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function formatAverage(value) {
  return value.toLocaleString("fr-FR", { maximumFractionDigits: 2 });
}

export default async function PlayerStandingsPage({ searchParams }) {
  const seasons = listSeasons();
  const query = await searchParams;
  const requestedSeasonId = typeof query?.saison === "string" ? query.saison : "";
  const season = seasons.find((item) => item.id === requestedSeasonId) ?? seasons[0] ?? null;
  const data = season ? getPublicSeasonPlayerStandings(season.id) : { standings: [], totalMatches: 0 };

  return <><SiteHeader/><main className="container">
    <section className="hero">
      <span className="eyebrow">Team Roquette</span>
      <h1>Classement des joueurs</h1>
      <p>Les joueurs sont affichés avec leur prénom complet et l’initiale de leur nom ; CSC n’est pas classé.</p>
    </section>
    {!season ? <section className="panel"><p>Aucune saison n’est encore publiée.</p></section> : <>
      <section className="panel section">
        <form method="get" className="inline">
          <label>Saison<select name="saison" defaultValue={season.id}>
            {seasons.map((item) => <option key={item.id} value={item.id}>{item.label} — {item.division}</option>)}
          </select></label>
          <button className="button secondary">Afficher</button>
        </form>
        <p className="muted">{season.label} · {season.division} · {data.totalMatches} match(s) Team Roquette non annulé(s) dans le calcul du taux de présence.</p>
        {data.aggregateOnly && <p className="muted">Totaux agrégés de saison : aucun match ni adversaire individuel n’est enregistré. Le taux de victoire par joueur n’est pas disponible.</p>}
      </section>
      {data.standings.length === 0 ? <section className="panel"><p>Aucun joueur n’est encore associé à cette saison.</p></section> :
        <section className="panel table-wrap section">
          <table className="player-standings-table">
            <thead><tr><th>#</th><th>Joueur</th><th>Présences</th><th>Buts</th><th>Buts / présence</th><th>Passes</th><th>Passes / présence</th><th>MOM</th><th>Victoires / présence</th><th>Taux de présence</th></tr></thead>
            <tbody>{data.standings.map((row, index) => <tr key={`${row.player}-${index}`}>
              <td>{index + 1}</td><th scope="row">{row.player}</th><td>{row.appearances}</td><td>{row.goals}</td><td>{formatAverage(row.goalsPerAppearance)}</td>
              <td>{row.assists}</td><td>{formatAverage(row.assistsPerAppearance)}</td><td>{row.mom}</td><td>{row.winPercentage === null ? "—" : `${row.winPercentage}%`}</td><td>{row.appearancePercentage}%</td>
            </tr>)}</tbody>
          </table>
        </section>}
    </>}
  </main></>;
}
