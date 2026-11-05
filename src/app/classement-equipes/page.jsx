import SiteHeader from "../components/SiteHeader.jsx";
import { listSeasons } from "../../lib/seasons.js";
import { getPublicTeamStandings } from "../../lib/standings.js";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function TeamStandingsPage({ searchParams }) {
  const seasons = listSeasons();
  const query = await searchParams;
  const requestedSeasonId = typeof query?.saison === "string" ? query.saison : "";
  const season = seasons.find((item) => item.id === requestedSeasonId) ?? seasons[0] ?? null;
  const data = season ? getPublicTeamStandings(season.id) : { standings: [] };

  return <><SiteHeader/><main className="container">
    <section className="hero">
      <h1>Classement des équipes</h1>
      <p>Classement de la saison régulière</p>
    </section>
    {!season ? <section className="panel"><p>Aucune saison n’est encore publiée.</p></section> : <>
      <section className="panel section team-standings-controls">
        <div className="team-standings-controls-top">
          <div className="team-standings-season">
            <span className="eyebrow">Saison sélectionnée</span>
            <strong>{season.label}</strong>
            <span>{season.division}</span>
          </div>
          <form method="get" className="inline team-standings-form">
            <label>Saison<select name="saison" defaultValue={season.id} aria-label="Choisir une saison">
              {seasons.map((item) => <option key={item.id} value={item.id}>{item.label} — {item.division}</option>)}
            </select></label>
            <button className="button secondary">Afficher</button>
          </form>
        </div>
        <div className="team-standings-info">
          {data.aggregateOnly && <p className="muted">Bilan saisonnier agrégé : aucun match ni adversaire individuel n’est enregistré.</p>}
        </div>
      </section>
      {data.standings.length === 0 ? <section className="panel"><p>Aucune équipe n’est encore associée aux matchs de cette saison.</p></section> :
        <section className="section team-standings-results">
          <div className="team-standings-section-heading">
            <div><span className="eyebrow">Saison régulière</span><h2>Classement général</h2></div>
            <span className="team-standings-count">{data.standings.length} {data.standings.length === 1 ? "équipe" : "équipes"}</span>
          </div>
          {data.standings.length >= 10 && <div className="team-standings-legend" aria-label="Repères de promotion et de relégation">
            <span><i className="team-standings-legend-swatch team-standings-legend-promotion" aria-hidden="true"/>5 premiers · promus la saison prochaine</span>
            <span><i className="team-standings-legend-swatch team-standings-legend-relegation" aria-hidden="true"/>5 derniers · relégués la saison prochaine</span>
          </div>}
          <p className="muted team-standings-scroll-hint">Faites défiler le tableau pour consulter toutes les statistiques.</p>
          <div className="panel table-wrap team-standings-table-wrap">
            <table className="standings-table team-standings-table" aria-label={`Classement des équipes — ${season.label}, ${season.division}`}>
              <thead><tr><th scope="col">#</th><th scope="col">Équipe</th><th scope="col" title="Matchs joués">MJ</th><th scope="col" title="Victoires">V</th><th scope="col" title="Nuls">N</th><th scope="col" title="Défaites">D</th><th scope="col" title="Forfaits">F</th><th scope="col" title="Buts pour">BP</th><th scope="col" title="Buts contre">BC</th><th scope="col" title="Différence de buts">Diff.</th><th scope="col" title="Points">Pts</th></tr></thead>
              <tbody>{data.standings.map((team, index) => {
                const rowClasses = [
                  team.isRoquette && "standing-roquette",
                  data.standings.length >= 10 && index < 5 && "standing-promotion",
                  data.standings.length >= 10 && index >= data.standings.length - 5 && "standing-relegation",
                ].filter(Boolean).join(" ");
                return <tr className={rowClasses} key={team.teamName}>
                  <td><span className={`standing-rank${index < 3 ? ` standing-rank-top-${index + 1}` : ""}`}>{index + 1}</span></td>
                  <th scope="row">{team.teamName}</th><td>{team.roundsPlayed}</td><td>{team.wins}</td><td>{team.draws}</td><td>{team.losses}</td><td>{team.forfeits}</td><td>{team.goalsFor}</td><td>{team.goalsAgainst}</td><td>{team.goalDifference}</td><td><strong className="standing-points">{team.points}<span> pts</span></strong></td>
                </tr>;
              })}</tbody>
            </table>
          </div>
        </section>}
    </>}
  </main></>;
}
