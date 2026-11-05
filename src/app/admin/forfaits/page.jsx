import { redirect } from "next/navigation";
import AdminNavigation from "../AdminNavigation.jsx";
import GeneralForfeitManagement from "../GeneralForfeitManagement.jsx";
import { getAdminSession } from "../../../lib/auth.js";
import { listSeasonTeams } from "../../../lib/team-forfeits.js";
import { listSeasons } from "../../../lib/seasons.js";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function AdminForfeitsPage({ searchParams }) {
  const admin = await getAdminSession();
  if (!admin) redirect("/admin/login");
  const seasons = listSeasons();
  const query = await searchParams;
  const requestedSeasonId = typeof query?.saison === "string" ? query.saison : "";
  const season = seasons.find((item) => item.id === requestedSeasonId) ?? seasons[0] ?? null;
  const teams = season ? listSeasonTeams(season.id) : [];

  return <><AdminNavigation/><main className="container">
    <div className="inline admin-heading">
      <div><span className="eyebrow">Administration · {admin.username}</span><h1>Forfaits généraux</h1></div>
    </div>
    {!season ? <section className="panel section"><p>Créez d’abord une saison avant de gérer les forfaits généraux.</p><a className="button" href="/admin">Créer une saison</a></section> : <>
      <section className="panel section">
        <form method="get" className="inline">
          <label>Saison<select name="saison" defaultValue={season.id}>
            {seasons.map((item) => <option key={item.id} value={item.id}>{item.label} — {item.division}</option>)}
          </select></label>
          <button className="button secondary">Afficher</button>
        </form>
        <p className="muted">{season.label} · {season.division}</p>
      </section>
      <GeneralForfeitManagement key={season.id} season={season} teams={teams}/>
    </>}
  </main></>;
}
