import SiteHeader from "../components/SiteHeader.jsx";
import GroupedBarChart from "../components/GroupedBarChart.jsx";
import { getPublicTeamHistoryStatistics } from "../../lib/team-history-stats.js";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function leaderList(leaders) {
  if (leaders.length === 0) return <p className="muted">Pas encore de statistique.</p>;
  return <ol className="career-leader-list">{leaders.map((leader, index) => <li key={`${leader.player}-${index}`}>
    <div className="career-leader-row"><span>{leader.player}</span><strong className="career-leader-value">{leader.value}</strong></div>
  </li>)}</ol>;
}

function formatPointAverage(value) {
  return new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 }).format(value);
}

export default function TeamHistoryStatisticsPage() {
  const data = getPublicTeamHistoryStatistics();
  const categories = data.seasons.map((season) => season.label);

  return <><SiteHeader/><main className="container">
    <section className="hero">
      <h1>Historique de l’équipe</h1>
      <p>Évolution de Team Roquette par saison et division, matchs de saison régulière et de coupe compris.</p>
    </section>
    {data.seasons.length > 0 && <section className="section team-history-summary">
      <h2>Repères toutes saisons</h2>
      <div className="team-history-overview">
        <article className="card"><span className="muted">Saisons</span><strong className="team-history-metric">{data.seasons.length}</strong></article>
        <article className="card"><span className="muted">Matchs</span><strong className="team-history-metric">{data.totals.matchCount}</strong></article>
        <article className="card"><span className="muted">Buts marqués</span><strong className="team-history-metric">{data.totals.goalsFor}</strong></article>
        <article className="card"><span className="muted">Buts encaissés</span><strong className="team-history-metric">{data.totals.goalsAgainst}</strong></article>
        <article className="card"><span className="muted">Points moyens / saison</span><strong className="team-history-metric">{formatPointAverage(data.totals.points)}</strong></article>
        <article className="card"><span className="muted">V · N · D · F</span><strong className="team-history-metric team-history-metric-compact">{data.totals.wins} · {data.totals.draws} · {data.totals.losses} · {data.totals.forfeits}</strong></article>
      </div>
    </section>}


    <section className="grid team-history-leaders section">
      <article className="card"><h2>Top 3 buteurs</h2>{leaderList(data.topScorers)}</article>
      <article className="card"><h2>Top 3 passeurs</h2>{leaderList(data.topAssisters)}</article>
      <article className="card"><h2>Plus de 100 présences</h2>{leaderList(data.playersOver100)}</article>
    </section>

    {data.seasons.length === 0 ? <section className="panel"><p>Aucune saison n’est encore disponible.</p></section> : <>
      <section className="section">
        <h2>Bilan par saison</h2>
        <div className="panel table-wrap">
          <table className="team-history-table">
            <thead><tr><th>Saison</th><th>Division</th><th>Classement</th><th>Matchs</th><th>Buts marqués</th><th>Buts encaissés</th><th>Points rég.</th><th>V</th><th>N</th><th>D</th><th>F</th></tr></thead>
            <tbody>{data.seasons.map((season) => <tr key={season.id}>
              <th scope="row">{season.label}</th><td>{season.division}</td><td>{season.rank ?? "—"}</td><td>{season.matchCount}</td><td>{season.goalsFor}</td><td>{season.goalsAgainst}</td><td>{season.points}</td>
              <td>{season.wins}</td><td>{season.draws}</td><td>{season.losses}</td><td>{season.forfeits}</td>
            </tr>)}</tbody>
            <tfoot><tr><th scope="row" colSpan="3">Totaux (moyenne des points)</th><td>{data.totals.matchCount}</td><td>{data.totals.goalsFor}</td><td>{data.totals.goalsAgainst}</td><td>{formatPointAverage(data.totals.points)}</td>
              <td>{data.totals.wins}</td><td>{data.totals.draws}</td><td>{data.totals.losses}</td><td>{data.totals.forfeits}</td>
            </tr></tfoot>
          </table>
        </div>
      </section>
      <section className="section chart-grid team-history-charts">
        <GroupedBarChart title="Points par saison (saison régulière)" categories={categories} leftAxisLabel="Points" series={[
          { key: "points", label: "Points", color: "#176b45", values: data.seasons.map((season) => season.points) },
        ]}/>
        <GroupedBarChart title="Buts marqués et encaissés par saison" categories={categories} leftAxisLabel="Buts" series={[
          { key: "goalsFor", label: "Buts marqués", color: "#176b45", values: data.seasons.map((season) => season.goalsFor) },
          { key: "goalsAgainst", label: "Buts encaissés", color: "#9b3025", values: data.seasons.map((season) => season.goalsAgainst) },
        ]}/>
        <GroupedBarChart title="Résultats par saison" categories={categories} leftAxisLabel="Matchs" leftAxisMaximum={26} leftAxisTicks={[0, 7, 13, 20, 26]} barGroupScale={0.7} series={[
          { key: "wins", label: "Victoires", color: "#176b45", values: data.seasons.map((season) => season.wins) },
          { key: "draws", label: "Nuls", color: "#d69b00", values: data.seasons.map((season) => season.draws) },
          { key: "losses", label: "Défaites", color: "#9b3025", values: data.seasons.map((season) => season.losses) },
          { key: "forfeits", label: "Forfaits", color: "#18231c", values: data.seasons.map((season) => season.forfeits) },
        ]}/>
      </section>
    </>}
  </main></>;
}
