import { notFound, redirect } from "next/navigation";
import AdminNavigation from "../../../AdminNavigation.jsx";
import { getAdminSession } from "../../../../../lib/auth.js";
import { getHistoricalPlayerProfile } from "../../../../../lib/players.js";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function statusLabel(status) {
  return status === "retraité" ? "Retraité" : "Actif";
}

export default async function AdminHistoricalPlayerPage({ params }) {
  const admin = await getAdminSession();
  if (!admin) redirect("/admin/login");
  const { id } = await params;
  const player = getHistoricalPlayerProfile(id);
  if (!player) notFound();

  return <><AdminNavigation/><main className="container">
    <div className="inline admin-heading">
      <div><span className="eyebrow">Administration · {admin.username}</span><h1>{player.firstName} {player.lastName}</h1></div>
      <span className="match-status">{statusLabel(player.status)}</span>
    </div>

    <section className="section">
      <h2>Bilan toutes saisons</h2>
      <div className="grid player-history-summary">
        <article className="card"><span className="muted">Saisons</span><h2>{player.career.seasonCount}</h2></article>
        <article className="card"><span className="muted">Présences</span><h2>{player.career.appearances}</h2></article>
        <article className="card"><span className="muted">Buts</span><h2>{player.career.goals}</h2></article>
        <article className="card"><span className="muted">Passes décisives</span><h2>{player.career.assists}</h2></article>
        <article className="card"><span className="muted">MOM</span><h2>{player.career.mom}</h2></article>
        <article className="card"><span className="muted">Paiements arbitre</span><h2>{player.career.refereePayments}</h2></article>
      </div>
    </section>

    <section className="section">
      <h2>Effectifs et statistiques par saison</h2>
      {player.seasons.length === 0 ? <div className="panel"><p>Aucune saison associée à ce joueur.</p></div> :
        <div className="panel table-wrap">
          <table className="player-history-table">
            <thead><tr><th>Saison</th><th>Division</th><th>Maillot</th><th>Effectif actif</th><th>Matchs Team Roquette</th><th>Présences</th><th>Buts</th><th>Passes</th><th>MOM</th><th>Arbitre</th></tr></thead>
            <tbody>{player.seasons.map((season) => <tr key={season.seasonId}>
              <th scope="row">{season.label}</th><td>{season.division}</td><td>{season.jerseyNumber ?? "—"}</td>
              <td>{season.isActive ? "Oui" : "Non"}</td><td>{season.aggregateOnly ? `${season.aggregateMatches} (agrégés)` : season.matchCount}</td><td>{season.appearances}</td>
              <td>{season.goals}</td><td>{season.assists}</td><td>{season.mom}</td><td>{season.refereePayments}</td>
            </tr>)}</tbody>
          </table>
        </div>}
    </section>
  </main></>;
}
