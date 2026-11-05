import Link from "next/link";
import { redirect } from "next/navigation";
import AdminNavigation from "../../AdminNavigation.jsx";
import { getAdminSession } from "../../../../lib/auth.js";
import { listHistoricalPlayers } from "../../../../lib/players.js";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function statusLabel(status) {
  return status === "retraité" ? "Retraité" : "Actif";
}

export default async function AdminPlayerHistoryPage() {
  const admin = await getAdminSession();
  if (!admin) redirect("/admin/login");
  const players = listHistoricalPlayers();

  return <><AdminNavigation/><main className="container">
    <div className="inline admin-heading">
      <div><span className="eyebrow">Administration · {admin.username}</span><h1>Historique des joueurs</h1></div>
    </div>
    <p className="muted player-history-intro">Tous les joueurs ayant appartenu à un effectif saisonnier de Team Roquette, actifs ou retraités.</p>
    {players.length === 0 ? <section className="panel"><p>Aucun joueur historique n’est enregistré.</p></section> :
      <section className="player-history-grid" aria-label="Joueurs historiques">
        {players.map((player) => <article className="card player-history-card" key={player.id}>
          <div className="player-history-card-heading">
            <div>
              <h2>{player.firstName} {player.lastName}</h2>
              <span className={`player-status ${player.status === "retraité" ? "player-status-retired" : "player-status-active"}`}>{statusLabel(player.status)}</span>
            </div>
            <Link className="button secondary" href={`/admin/joueurs/historique/${player.id}`} aria-label={`Consulter la fiche de ${player.firstName} ${player.lastName}`}>Voir la fiche</Link>
          </div>
          <div className="player-history-period">
            <div><span className="muted">Période</span><strong>{player.firstSeason === player.lastSeason ? player.firstSeason : `${player.firstSeason} – ${player.lastSeason}`}</strong></div>
            <div><span className="muted">Saisons</span><strong>{player.seasonCount}</strong></div>
          </div>
          <dl className="player-history-stats">
            <div><dt>Présences</dt><dd>{player.appearances}</dd></div>
            <div><dt>Buts</dt><dd>{player.goals}</dd></div>
            <div><dt>Passes</dt><dd>{player.assists}</dd></div>
            <div><dt>MOM</dt><dd>{player.mom}</dd></div>
            <div><dt>Arbitre</dt><dd>{player.refereePayments}</dd></div>
          </dl>
        </article>)}
      </section>}
  </main></>;
}
