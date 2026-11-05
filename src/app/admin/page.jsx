import { redirect } from "next/navigation";
import AdminNavigation from "./AdminNavigation.jsx";
import SeasonCreateForm from "./SeasonCreateForm.jsx";
import SeasonDivisionForm from "./SeasonDivisionForm.jsx";
import SeasonTeamForm from "./SeasonTeamForm.jsx";

import { getAdminSession } from "../../lib/auth.js";
import { listSeasons } from "../../lib/seasons.js";
import { listRecentAudit } from "../../lib/audit.js";
import { listSeasonTeams } from "../../lib/season-teams.js";

const auditDateFormatter = new Intl.DateTimeFormat("fr-FR", {
  day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
});

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function AdminPage() {
  const admin = await getAdminSession();
  if (!admin) redirect("/admin/login");
  const seasons = listSeasons();
  const audit = listRecentAudit(15);
  return <><AdminNavigation/><main className="container">
    <div className="inline admin-heading"><div><span className="eyebrow">Administration · {admin.username}</span><h1>Gestion des saisons</h1></div></div>
    <section className="panel section"><h2>Créer une saison</h2><SeasonCreateForm/></section>
    <section className="section"><h2>Saisons enregistrées</h2>
      {seasons.length === 0 ? <div className="panel"><p>Aucune saison. La première création génèrera le calendrier vide.</p></div> : <div className="stack">{seasons.map((season) => <article className="panel" key={season.id}>
        <div className="inline" style={{justifyContent:"space-between"}}><h2>{season.label}</h2><span className="muted">{season.matchCount} matchs</span></div>
        <SeasonDivisionForm season={season}/>
        <SeasonTeamForm season={season} teams={listSeasonTeams(season.id)}/>
      </article>)}</div>}
    </section>
    <section className="section"><h2>Historique récent</h2>
      {audit.length === 0 ? <div className="panel"><p>Aucune action enregistrée pour le moment.</p></div> : <div className="panel table-wrap"><table><thead><tr><th>Date</th><th>Administrateur</th><th>Action</th><th>Objet</th></tr></thead><tbody>
        {audit.map((entry) => <tr key={entry.id}><td>{auditDateFormatter.format(new Date(entry.createdAt))}</td><td>{entry.actor}</td><td>{entry.action}</td><td>{entry.entityType}</td></tr>)}
      </tbody></table></div>}
    </section>
  </main></>;
}
