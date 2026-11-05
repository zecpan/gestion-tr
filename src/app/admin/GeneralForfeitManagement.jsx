"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

function TeamRow({ season, team }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState(false);

  async function declareForfeit() {
    if (!window.confirm(`Confirmer la déclaration du forfait général de ${team.name} pour ${season.label} ? Les scores concernés seront recalculés et les buts historiques de Team Roquette préservés. Vérifiez les informations avant de confirmer.`)) return;
    setBusy(true); setMessage(""); setError(false);
    try {
      const response = await fetch(`/api/admin/seasons/${season.id}/general-forfeits`, {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ teamId: team.id }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "La déclaration a échoué.");
      setMessage(data.alreadyDeclared ? "Forfait général déjà déclaré." : `Forfait général déclaré ; ${data.updatedMatches} match(s) mis à jour.`);
      router.refresh();
    } catch (err) { setError(true); setMessage(err.message); }
    finally { setBusy(false); }
  }

  return <article className="panel inline team-forfeit-row">
    <div><h3>{team.name}{team.isRoquette && <span className="match-round">Team Roquette</span>}</h3>
      <p className="muted">{team.forfaitGeneral ? "Forfait général déclaré pour cette saison." : "Aucun forfait général déclaré."}</p>
    </div>
    {team.forfaitGeneral
      ? <strong className="forfeit-general-badge">Forfait général</strong>
      : <button className="button danger" type="button" disabled={busy} onClick={declareForfeit}>{busy ? "Traitement…" : "Déclarer le forfait général"}</button>}
    {message && <span className={error ? "notice error" : "muted"} role="status">{message}</span>}
  </article>;
}

export default function GeneralForfeitManagement({ season, teams }) {
  return <section className="section">
    <h2>Équipes — {season.label}</h2>
    <p className="muted">La déclaration met les matchs concernés à 3–0, conserve les scores réellement joués de Team Roquette pour ses statistiques, et crédite CSC de trois buts dans les matchs à venir contre Team Roquette.</p>
    {teams.length === 0 ? <div className="panel"><p>Aucune équipe n’est encore renseignée pour cette saison.</p></div> :
      <div className="stack">{teams.map((team) => <TeamRow key={team.id} season={season} team={team}/>)}</div>}
  </section>;
}
