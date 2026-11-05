import { redirect } from "next/navigation";
import AdminNavigation from "../AdminNavigation.jsx";
import CupManagement from "../CupManagement.jsx";
import { getAdminSession } from "../../../lib/auth.js";
import { listCupMatches } from "../../../lib/cup-matches.js";
import { listSeasons } from "../../../lib/seasons.js";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function AdminCupsPage({ searchParams }) {
  const admin = await getAdminSession();
  if (!admin) redirect("/admin/login");
  const seasons = listSeasons();
  const query = await searchParams;
  const requestedSeasonId = typeof query?.saison === "string" ? query.saison : "";
  const season = seasons.find((item) => item.id === requestedSeasonId) ?? seasons[0] ?? null;
  const matches = season ? listCupMatches(season.id) : [];

  return <><AdminNavigation/><main className="container">
    <div className="inline admin-heading">
      <div><span className="eyebrow">Administration · {admin.username}</span><h1>Gestion de la coupe</h1></div>
    </div>
    {!season ? <section className="panel section"><p>Créez d’abord une saison avant d’ajouter des matchs de coupe.</p><a className="button" href="/admin">Créer une saison</a></section> : <>
      <section className="panel section">
        <form method="get" className="inline">
          <label>Saison<select name="saison" defaultValue={season.id}>
            {seasons.map((item) => <option key={item.id} value={item.id}>{item.label} — {item.division}</option>)}
          </select></label>
          <button className="button secondary">Afficher</button>
        </form>
        <p className="muted">{season.label} · {season.division}</p>
      </section>
      <CupManagement key={season.id} season={season} matches={matches}/>
    </>}
  </main></>;
}
