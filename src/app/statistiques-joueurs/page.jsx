import SiteHeader from "../components/SiteHeader.jsx";
import GroupedBarChart from "../components/GroupedBarChart.jsx";
import { getPublicPlayerCareerStatistics } from "../../lib/player-career-stats.js";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function formatAverage(value) {
  return value.toLocaleString("fr-FR", { maximumFractionDigits: 2 });
}

const PLAYER_CHARTS = [
  { key: "goals", label: "Buts", summary: "Afficher le graphique des buts", color: "#2864b4" },
  { key: "assists", label: "Passes décisives", summary: "Afficher le graphique des passes décisives", color: "#9b3025" },
  { key: "mom", label: "MOM", summary: "Afficher le graphique MOM", color: "#176b45" },
  { key: "appearances", label: "Présences", summary: "Afficher le graphique des présences", color: "#d69b00" },
];

function PlayerStatisticsGroup({ title, standings }) {
  return <section className="section player-statistics-group">
    <div className="inline player-statistics-heading">
      <h2>{title}</h2>
      <span className="player-count">{standings.length} {standings.length === 1 ? "joueur" : "joueurs"}</span>
    </div>
    {standings.length === 0 ? <div className="panel"><p>Aucun joueur dans cette catégorie.</p></div> : <>
      <div className="panel table-wrap player-statistics-table-wrap">
        <table className="player-standings-table" aria-label={`Statistiques des ${title.toLocaleLowerCase("fr-FR")}`}>
          <thead><tr><th scope="col">#</th><th scope="col">Joueur</th><th scope="col">Matchs</th><th scope="col">Buts</th><th scope="col">Buts / matchs</th><th scope="col">Passes</th><th scope="col">Passes / matchs</th><th scope="col">MOM</th><th scope="col" title="Calculé à partir des présences depuis la saison 2018–2019">Taux victoires</th><th scope="col">Taux présence</th></tr></thead>
          <tbody>{standings.map((player, index) => <tr key={`${player.player}-${index}`}>
            <td>{index + 1}</td><th scope="row">{player.player}</th><td>{player.appearances}</td><td>{player.goals}</td><td>{formatAverage(player.goalsPerAppearance)}</td>
            <td>{player.assists}</td><td>{formatAverage(player.assistsPerAppearance)}</td><td>{player.mom}</td><td>{player.winPercentage === null ? "—" : `${player.winPercentage}%`}</td><td>{player.appearancePercentage}%</td>
          </tr>)}</tbody>
        </table>
      </div>
      {PLAYER_CHARTS.map((metric) => {
        const rankedStandings = [...standings].sort((a, b) => b[metric.key] - a[metric.key]);
        return <details className="player-statistics-chart" key={metric.key}>
          <summary>{metric.summary}</summary>
          <GroupedBarChart
            title={`${metric.label} · ${title.toLocaleLowerCase("fr-FR")}`}
            categories={rankedStandings.map((player) => player.player)}
            leftAxisLabel={metric.label}
            series={[
              { key: metric.key, label: metric.label, color: metric.color, values: rankedStandings.map((player) => player[metric.key]) },
            ]}
          />
        </details>;
      })}
    </>}
  </section>;
}

export default function PlayerCareerStatisticsPage() {
  const data = getPublicPlayerCareerStatistics();

  return <><SiteHeader/><main className="container">
    <section className="hero">
      <h1>Statistiques des joueurs</h1>
      <p>Statistiques cumulées en saison régulière et en coupe.</p>
    </section>
    <section className="player-statistics-summary" aria-label="Résumé des statistiques">
      <div className="player-statistics-overview">
        <article className="card"><span className="muted">Joueurs actifs</span><strong className="player-statistics-value">{data.activeStandings.length}</strong></article>
        <article className="card"><span className="muted">Joueurs retraités</span><strong className="player-statistics-value">{data.retiredStandings.length}</strong></article>
        <article className="card"><span className="muted">Matchs (taux présence)</span><strong className="player-statistics-value">{data.totalMatches}</strong></article>
      </div>
    </section>
    <PlayerStatisticsGroup title="Joueurs actifs" standings={data.activeStandings}/>
    <PlayerStatisticsGroup title="Joueurs retraités" standings={data.retiredStandings}/>
  </main></>;
}
