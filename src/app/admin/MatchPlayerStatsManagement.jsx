"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

function comparePlayers(a, b) {
  if (a.isFake !== b.isFake) return a.isFake ? 1 : -1;
  if (a.presence !== b.presence) return a.presence ? -1 : 1;
  return (a.lastName ?? "").localeCompare(b.lastName ?? "", "fr-FR") ||
    (a.firstName ?? "").localeCompare(b.firstName ?? "", "fr-FR");
}

function orderPlayers(players) {
  return [...players].sort(comparePlayers);
}

function formatMatchDate(value) {
  if (!value) return "Date à renseigner";
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
}

function PlayerStatRow({ player, onChange, goalsLocked }) {
  const editable = player.isFake || (player.isActive && player.status === "actif");
  const update = (field, value) => onChange(player.playerId, { ...player, [field]: value });
  return <tr className={player.isPriority && !player.isFake ? "priority-player" : ""}>
    <th scope="row">{player.isFake ? "CSC" : `${player.firstName} ${player.lastName}`}
      {player.isPriority && !player.isFake && <span className="priority-badge">Prioritaire arbitre</span>}
      {!editable && !player.isFake && <span className="muted">Inactif — historique</span>}
    </th>
    <td><input aria-label={`Présence de ${player.firstName || "CSC"}`} type="checkbox" checked={player.presence} disabled={!editable || player.isFake} onChange={(event) => {
      const presence = event.target.checked;
      onChange(player.playerId, { ...player, presence, ...(presence ? {} : { assists: 0 }) });
    }}/></td>
    <td><input aria-label={`Buts de ${player.firstName || "CSC"}`} type="number" min="0" step="1" value={player.goals} disabled={!editable || goalsLocked} onChange={(event) => update("goals", Number(event.target.value))}/></td>
    <td><input aria-label={`Passes de ${player.firstName || "CSC"}`} type="number" min="0" step="1" value={player.assists} disabled={!editable || !player.presence || player.isFake} onChange={(event) => update("assists", Number(event.target.value))}/></td>
    <td><input aria-label={`Paiement arbitre de ${player.firstName || "CSC"}`} type="checkbox" checked={player.refereePayment} disabled={!editable || player.isFake} onChange={(event) => update("refereePayment", event.target.checked)}/></td>
    <td><input aria-label={`MOM de ${player.firstName || "CSC"}`} type="checkbox" checked={player.mom} disabled={!editable || player.isFake} onChange={(event) => update("mom", event.target.checked)}/></td>
  </tr>;
}

export default function MatchPlayerStatsManagement({ initialData }) {
  const router = useRouter();
  const [players, setPlayers] = useState(() => orderPlayers(initialData.players));
  const [message, setMessage] = useState("");
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);
  const { match } = initialData;
  const cancelled = match.status === "annulé";

  function updatePlayer(playerId, updated) {
    setPlayers((current) => orderPlayers(current.map((player) => player.playerId === playerId ? updated : player)));
  }

  async function save(event) {
    event.preventDefault(); setBusy(true); setMessage(""); setError(false);
    try {
      const response = await fetch(`/api/admin/matches/${match.id}/stats`, {
        method: "PATCH", headers: { "content-type": "application/json" },
        body: JSON.stringify({ players: players.map(({ playerId, presence, goals, assists, refereePayment, mom }) => ({ playerId, presence, goals, assists, refereePayment, mom })) }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "L’enregistrement a échoué.");
      setPlayers(orderPlayers(data.stats.players)); setMessage("Statistiques enregistrées."); router.refresh();
    } catch (err) { setError(true); setMessage(err.message); }
    finally { setBusy(false); }
  }

  return <>
    <section className="panel section">
      <div className="match-meta"><span className="match-round">{match.type === "cup" ? match.phase : `Journée ${match.roundNumber} · match ${match.slotNumber}`}</span><span className="match-status">{match.status}</span></div>
      <h2>{match.teamA || "Équipe à renseigner"} {match.scoreA !== null && match.scoreB !== null ? `${match.scoreA}–${match.scoreB}` : "—"} {match.teamB || "Équipe à renseigner"}</h2>
      <p className="muted">{formatMatchDate(match.matchDate)} · Saison {match.seasonLabel}</p>
      <p className="muted">Plusieurs joueurs peuvent payer l’arbitre pour un match, même s’ils sont absents. La priorité reste donnée à ceux qui n’ont encore payé aucun match de la saison.</p>
      {cancelled && <p className="notice error">Un match annulé ne peut pas recevoir de statistiques de joueurs.</p>}
      {match.status === "forfait" && <p className="muted">La saisie des statistiques reste autorisée pour un match forfaitaire.</p>}
      {match.generalForfeitGoalsLocked && <p className="notice">Les buts sont verrouillés selon les règles du forfait général.</p>}
    </section>
    {players.length === 0 ? <section className="panel"><p>Aucun joueur n’est disponible dans l’effectif de cette saison.</p></section> :
      <form onSubmit={save}>
        <section className="panel table-wrap">
          <table className="match-player-table"><thead><tr><th>Joueur</th><th>Présent</th><th>Buts</th><th>Passes</th><th>Paiement arbitre</th><th>MOM</th></tr></thead>
            <tbody>{players.map((player) => <PlayerStatRow key={player.playerId} player={player} goalsLocked={match.generalForfeitGoalsLocked} onChange={updatePlayer}/>)}</tbody>
          </table>
        </section>
        <div className="inline section"><button className="button" disabled={busy || cancelled}>{busy ? "Enregistrement…" : "Enregistrer les statistiques"}</button>
          {message && <span className={error ? "notice error" : "muted"} role="status">{message}</span>}
        </div>
      </form>}
  </>;
}
