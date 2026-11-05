"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

function CupMatchRow({ match }) {
  const router = useRouter();
  const [opponentName, setOpponentName] = useState(match.opponentName);
  const [phase, setPhase] = useState(match.phase);
  const [matchDate, setMatchDate] = useState(match.matchDate);
  const [scoreA, setScoreA] = useState(match.scoreA ?? "");
  const [scoreB, setScoreB] = useState(match.scoreB ?? "");
  const [status, setStatus] = useState(match.status);
  const [forfeitingSide, setForfeitingSide] = useState(match.forfeitingSide ?? "");
  const [message, setMessage] = useState("");
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);

  function changeStatus(value) {
    setStatus(value);
    if (value === "à venir") { setScoreA(""); setScoreB(""); setForfeitingSide(""); }
    else if (value === "forfait") { setScoreA(""); setScoreB(""); setForfeitingSide((side) => side || "B"); }
  }

  async function save(event) {
    event.preventDefault(); setBusy(true); setMessage(""); setError(false);
    try {
      const response = await fetch(`/api/admin/cup-matches/${match.id}`, {
        method: "PATCH", headers: { "content-type": "application/json" },
        body: JSON.stringify({ opponentName, phase, matchDate, scoreA, scoreB, status, forfeitingSide }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "La modification du match a échoué.");
      setScoreA(data.match.scoreA ?? ""); setScoreB(data.match.scoreB ?? "");
      setForfeitingSide(data.match.forfeitingSide ?? ""); setMessage("Match enregistré.");
      router.refresh();
    } catch (err) { setError(true); setMessage(err.message); }
    finally { setBusy(false); }
  }

  return <article className="panel match-admin-card match-roquette">
    <div className="inline match-admin-heading"><h3>{phase || "Match de coupe"} · {opponentName}</h3><span className="match-round">Team Roquette</span></div>
    <form className="match-form" onSubmit={save}>
      <div className="match-team-fields">
        <label>Adversaire<input value={opponentName} onChange={(event) => setOpponentName(event.target.value)} maxLength={100} required/></label>
        <span className="versus">·</span>
        <label>Phase de coupe<input value={phase} onChange={(event) => setPhase(event.target.value)} maxLength={100} required placeholder="Ex. Demi-finale"/></label>
      </div>
      <div className="match-detail-fields">
        <label>Date<input lang="fr-FR" type="date" value={matchDate} onChange={(event) => setMatchDate(event.target.value)} required/></label>
        <label>Statut<select value={status} onChange={(event) => changeStatus(event.target.value)}>
          <option value="à venir">À venir</option><option value="terminé">Terminé</option><option value="forfait">Forfait</option><option value="annulé">Annulé</option>
        </select></label>
        {status === "forfait" ? <label>Équipe forfaitaire<select value={forfeitingSide} onChange={(event) => setForfeitingSide(event.target.value)} required>
          <option value="">Sélectionner</option><option value="A">Team Roquette</option><option value="B">{opponentName || "Adversaire"}</option>
        </select></label> : <div className="score-fields">
          <label>Score Team Roquette<input type="number" min="0" step="1" value={scoreA} onChange={(event) => setScoreA(event.target.value)} disabled={status === "à venir"} required={status === "terminé"}/></label>
          <span>–</span>
          <label>Score adverse<input type="number" min="0" step="1" value={scoreB} onChange={(event) => setScoreB(event.target.value)} disabled={status === "à venir"} required={status === "terminé"}/></label>
        </div>}
      </div>
      {status === "forfait" && <p className="muted forfeit-note">Le score 0–3 sera attribué automatiquement à l’équipe forfaitaire.</p>}
      <div className="inline">
        <button className="button" disabled={busy}>{busy ? "Enregistrement…" : "Enregistrer le match"}</button>
        <a className="button secondary" href={`/admin/matchs/${match.id}/joueurs`}>Saisir les joueurs</a>
        {message && <span className={error ? "notice error" : "muted"} role="status">{message}</span>}
      </div>
    </form>
  </article>;
}

export default function CupManagement({ season, matches }) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);

  async function createMatch(event) {
    event.preventDefault(); setBusy(true); setMessage(""); setError(false);
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    try {
      const response = await fetch(`/api/admin/seasons/${season.id}/cup-matches`, {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ opponentName: form.get("opponentName"), phase: form.get("phase"), matchDate: form.get("matchDate") }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "La création du match a échoué.");
      formElement.reset(); setMessage("Match de coupe ajouté."); router.refresh();
    } catch (err) { setError(true); setMessage(err.message); }
    finally { setBusy(false); }
  }

  return <>
    <section className="panel section">
      <h2>Ajouter un match de coupe</h2>
      <p className="muted">Team Roquette est affichée comme équipe A. Les scores, statuts et participations des joueurs suivent les mêmes règles que pour la saison régulière.</p>
      <form className="form-grid player-create-form" onSubmit={createMatch}>
        <label>Adversaire<input name="opponentName" required maxLength={100}/></label>
        <label>Phase<input name="phase" required maxLength={100} placeholder="Ex. Quart de finale"/></label>
        <label>Date<input lang="fr-FR" name="matchDate" type="date" required/></label>
        <button className="button" disabled={busy}>{busy ? "Ajout…" : "Ajouter le match"}</button>
        {message && <div className={`notice${error ? " error" : ""}`} role="status">{message}</div>}
      </form>
    </section>
    <section className="section">
      <h2>Matchs de coupe — {season.label}</h2>
      {matches.length === 0 ? <div className="panel"><p>Aucun match de coupe enregistré pour cette saison.</p></div> :
        <div className="stack">{matches.map((match) => <CupMatchRow key={match.id} match={match}/>)}</div>}
    </section>
  </>;
}
