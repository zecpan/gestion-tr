"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

async function sendJson(url, method, body) {
  const response = await fetch(url, {
    method,
    headers: { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "La modification a échoué.");
  return data;
}

function PlayerRow({ seasonId, player, isCurrentSeason }) {
  const router = useRouter();
  const [firstName, setFirstName] = useState(player.firstName);
  const [lastName, setLastName] = useState(player.lastName);
  const [jerseyNumber, setJerseyNumber] = useState(player.jerseyNumber ?? "");
  const [message, setMessage] = useState("");
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);

  async function save(event) {
    event.preventDefault();
    setBusy(true); setMessage(""); setError(false);
    try {
      await sendJson(`/api/admin/players/${player.id}`, "PATCH", {
        seasonId, firstName, lastName, jerseyNumber, status: player.status,
      });
      setMessage("Fiche enregistrée.");
      router.refresh();
    } catch (err) { setError(true); setMessage(err.message); }
    finally { setBusy(false); }
  }

  async function setRosterActive(active) {
    setBusy(true); setMessage(""); setError(false);
    try {
      if (active) {
        await sendJson(`/api/admin/seasons/${seasonId}/players`, "POST", { playerId: player.id, jerseyNumber });
      } else {
        await sendJson(`/api/admin/seasons/${seasonId}/players/${player.id}`, "DELETE");
      }
      setMessage(active && player.status === "retraité" && isCurrentSeason
        ? "Joueur réactivé et ajouté à l’effectif."
        : active ? "Joueur ajouté à l’effectif." : "Joueur retiré de l’effectif.");
      router.refresh();
    } catch (err) { setError(true); setMessage(err.message); }
    finally { setBusy(false); }
  }

  const activeInRoster = player.isActive;
  return <tr>
    <td><input className="jersey-number-input" aria-label={`Maillot de ${player.firstName} ${player.lastName}`} value={jerseyNumber} onChange={(event) => setJerseyNumber(event.target.value)} maxLength={10}/></td>
    <td><div className="player-fields"><input aria-label="Prénom" value={firstName} onChange={(event) => setFirstName(event.target.value)} maxLength={100}/><input aria-label="Nom" value={lastName} onChange={(event) => setLastName(event.target.value)} maxLength={100}/></div></td>
    <td><span className={`player-status ${player.status === "retraité" ? "player-status-retired" : "player-status-active"}`}>{player.status === "retraité" ? "Retraité" : "Actif"}</span></td>
    <td>{player.appearances}</td><td>{player.goals}</td><td>{player.assists}</td><td>{player.mom}</td><td>{player.refereePayments}</td>
    <td><div className="player-actions">
      <button className="button secondary" type="button" disabled={busy} onClick={save}>{busy ? "…" : "Enregistrer"}</button>
      {activeInRoster
        ? <button className="button danger" type="button" disabled={busy} onClick={() => setRosterActive(false)}>Retirer</button>
        : <button className="button secondary" type="button" disabled={busy} onClick={() => setRosterActive(true)}>Ajouter</button>}
      {message && <span className={error ? "notice error" : "muted"} role="status">{message}</span>}
    </div></td>
  </tr>;
}

export default function PlayerManagement({ season, players, availablePlayers, isCurrentSeason }) {
  const router = useRouter();
  const [createMessage, setCreateMessage] = useState("");
  const [createError, setCreateError] = useState(false);
  const [addMessage, setAddMessage] = useState("");
  const [addError, setAddError] = useState(false);
  const [busy, setBusy] = useState(false);
  const [selectedPlayerId, setSelectedPlayerId] = useState(availablePlayers[0]?.id ?? "");
  const [jerseyNumber, setJerseyNumber] = useState(availablePlayers[0]?.jerseyNumber ?? "");

  async function createPlayer(event) {
    event.preventDefault(); setBusy(true); setCreateMessage(""); setCreateError(false);
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    try {
      await sendJson("/api/admin/players", "POST", {
        seasonId: season.id,
        firstName: form.get("firstName"),
        lastName: form.get("lastName"),
        jerseyNumber: form.get("jerseyNumber"),
      });
      formElement.reset();
      setCreateMessage(isCurrentSeason
        ? "Joueur créé et ajouté à l’effectif actif."
        : "Joueur créé dans l’effectif historique ; son statut global reste retraité.");
      router.refresh();
    } catch (err) { setCreateError(true); setCreateMessage(err.message); }
    finally { setBusy(false); }
  }

  async function addPlayer(event) {
    event.preventDefault(); setBusy(true); setAddMessage(""); setAddError(false);
    try {
      const selectedPlayer = availablePlayers.find((player) => player.id === selectedPlayerId);
      await sendJson(`/api/admin/seasons/${season.id}/players`, "POST", { playerId: selectedPlayerId, jerseyNumber });
      setAddMessage(selectedPlayer?.status === "retraité" && isCurrentSeason
        ? "Joueur réactivé et ajouté à l’effectif."
        : "Joueur ajouté à l’effectif.");
      router.refresh();
    } catch (err) { setAddError(true); setAddMessage(err.message); }
    finally { setBusy(false); }
  }

  function changeAvailablePlayer(playerId) {
    setSelectedPlayerId(playerId);
    setJerseyNumber(availablePlayers.find((player) => player.id === playerId)?.jerseyNumber ?? "");
  }

  return <>
    <div className="player-tools-grid">
      <section className="panel player-tool-card">
        <h2>Créer un joueur</h2>
        <p className="muted">Le joueur rejoint cette saison. Son statut global est actif si elle est la plus récente, retraité sinon.</p>
        <form className="form-grid player-create-form" onSubmit={createPlayer}>
          <label>Prénom<input name="firstName" required maxLength={100}/></label>
          <label>Nom<input name="lastName" required maxLength={100}/></label>
          <label>Numéro de maillot (facultatif)<input className="jersey-number-input" name="jerseyNumber" maxLength={10}/></label>
          <button className="button" disabled={busy}>{busy ? "Création…" : "Créer le joueur"}</button>
          {createMessage && <div className={`notice${createError ? " error" : ""}`} role="status">{createMessage}</div>}
        </form>
      </section>

      <section className="panel player-tool-card">
        <h2>Ajouter un joueur existant</h2>
        <p className="muted">Choisissez un joueur non inscrit dans cette saison. Un joueur retraité n’est réactivé que s’il rejoint la saison la plus récente.</p>
        {availablePlayers.length === 0 ? <p>Aucun joueur existant à ajouter.</p> : <form className="form-grid player-add-form" onSubmit={addPlayer}>
          <label>Joueur<select value={selectedPlayerId} onChange={(event) => changeAvailablePlayer(event.target.value)}>
            {availablePlayers.map((player) => <option key={player.id} value={player.id}>{player.firstName} {player.lastName}{player.status === "retraité" ? " — Retraité" : ""}</option>)}
          </select></label>
          <label>Numéro de maillot (facultatif)<input className="jersey-number-input" value={jerseyNumber} onChange={(event) => setJerseyNumber(event.target.value)} maxLength={10}/></label>
          <button className="button" disabled={busy || !selectedPlayerId}>{busy ? "Ajout…" : "Ajouter à l’effectif"}</button>
          {addMessage && <div className={`notice${addError ? " error" : ""}`} role="status">{addMessage}</div>}
        </form>}
      </section>
    </div>

    <section className="section player-roster-section">
      <div className="inline player-roster-heading">
        <div>
          <h2>Effectif et fiches — {season.label}</h2>
          <p className="muted">Le statut actuel suit l’effectif de la saison la plus récente. Les joueurs retirés restent conservés dans l’historique.</p>
        </div>
        <span className="player-count">{players.length} {players.length === 1 ? "joueur" : "joueurs"}</span>
      </div>
      {players.length === 0
        ? <div className="panel"><p>Aucun joueur n’est encore associé à cette saison.</p></div>
        : <div className="panel table-wrap"><table className="players-table"><thead><tr>
          <th>Maillot</th><th>Prénom / nom</th><th>Statut</th><th>Présences</th><th>Buts</th><th>Passes</th><th>MOM</th><th>Arbitre</th><th>Gestion</th>
        </tr></thead><tbody>{players.map((player) => <PlayerRow key={player.id} seasonId={season.id} player={player} isCurrentSeason={isCurrentSeason}/>)}</tbody></table></div>}
    </section>
  </>;
}
