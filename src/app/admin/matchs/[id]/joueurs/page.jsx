import { notFound, redirect } from "next/navigation";
import AdminNavigation from "../../../AdminNavigation.jsx";
import MatchPlayerStatsManagement from "../../../MatchPlayerStatsManagement.jsx";
import { getAdminSession } from "../../../../../lib/auth.js";
import { getMatchPlayerRoster } from "../../../../../lib/match-stats.js";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function AdminMatchPlayersPage({ params }) {
  const admin = await getAdminSession();
  if (!admin) redirect("/admin/login");
  const { id } = await params;
  const data = getMatchPlayerRoster(id);
  if (!data) notFound();
  const { match } = data;

  return <><AdminNavigation/><main className="container">
    <div className="inline admin-heading">
      <div><span className="eyebrow">Administration · {admin.username}</span><h1>Statistiques du match</h1></div>
      <a className="button secondary" href={match.type === "cup" ? `/admin/coupes?saison=${match.seasonId}` : `/admin/matchs?saison=${match.seasonId}&journee=${match.roundNumber}`}>Retour aux matchs</a>
    </div>
    <MatchPlayerStatsManagement initialData={data}/>
  </main></>;
}
