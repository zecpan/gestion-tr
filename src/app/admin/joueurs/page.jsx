import { redirect } from "next/navigation";
import AdminNavigation from "../AdminNavigation.jsx";
import PlayerManagement from "../PlayerManagement.jsx";
import { getAdminSession } from "../../../lib/auth.js";
import { listSeasonPlayers, listAvailablePlayers } from "../../../lib/players.js";
import { listSeasons } from "../../../lib/seasons.js";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function AdminPlayersPage({ searchParams }) {
  const admin = await getAdminSession();
  if (!admin) redirect("/admin/login");
  const seasons = listSeasons();
  const query = await searchParams;
  const requestedSeasonId = typeof query?.saison === "string" ? query.saison : "";
  const season = seasons.find((item) => item.id === requestedSeasonId) ?? seasons[0] ?? null;
  const players = season ? listSeasonPlayers(season.id) : [];
  const availablePlayers = season ? listAvailablePlayers(season.id) : [];
  const isCurrentSeason = season?.id === seasons[0]?.id;

  return <><AdminNavigation/><main className="container">
    <div className="inline admin-heading">
      <div><span className="eyebrow">Administration · {admin.username}</span><h1>Gestion des joueurs</h1></div>
    </div>
    {seasons.length === 0
      ? <section className="panel section"><p>Créez d’abord une saison avant de gérer son effectif.</p><a className="button" href="/admin">Créer une saison</a></section>
      : <>
        <section className="panel player-season-panel">
          <div className="player-season-current">
            <span className="eyebrow">Saison sélectionnée</span>
            <strong>{season.label}</strong>
            <span className="muted">{season.division}</span>
          </div>
          <form method="get" className="inline player-season-form">
            <label>Changer de saison<select name="saison" defaultValue={season.id}>
              {seasons.map((item) => <option key={item.id} value={item.id}>{item.label} — {item.division}</option>)}
            </select></label>
            <button className="button secondary">Afficher l’effectif</button>
          </form>
        </section>
        <PlayerManagement key={`${season.id}:${availablePlayers.map((player) => player.id).join(",")}`} season={season} players={players} availablePlayers={availablePlayers} isCurrentSeason={isCurrentSeason}/>
      </>}
  </main></>;
}
