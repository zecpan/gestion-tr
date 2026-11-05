"use client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

function matchDateTone(value, today, scoreA, scoreB) {
  if (scoreA !== "" && scoreB !== "") return "scored";
  if (!value || !today) return "undated";
  return value > today ? "future" : value === today ? "today" : "past";
}

function MatchRow({ match, suggestionListId, today }) {
  const router = useRouter();
  const formId = `match-${match.id}`;
  const [teamA, setTeamA] = useState(match.teamA ?? "");
  const [teamB, setTeamB] = useState(match.teamB ?? "");
  const [matchDate, setMatchDate] = useState(match.matchDate ?? "");
  const [scoreA, setScoreA] = useState(match.scoreA ?? "");
  const [scoreB, setScoreB] = useState(match.scoreB ?? "");
  const [status, setStatus] = useState(match.status);
  const [forfeitingSide, setForfeitingSide] = useState(match.forfeitingSide ?? "A");
  const [message, setMessage] = useState("");
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);

  function changeStatus(value) {
    setStatus(value);
    if (value === "à venir") {
      setScoreA(""); setScoreB(""); setForfeitingSide("");
    } else if (value === "forfait") {
      setScoreA(""); setScoreB(""); setForfeitingSide((side) => side || "A");
    }
  }

  async function save(event) {
    event.preventDefault(); setBusy(true); setMessage(""); setError(false);
    try {
      const response = await fetch(`/api/admin/matches/${match.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ teamA, teamB, matchDate, scoreA, scoreB, status, forfeitingSide }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "La modification du match a échoué.");
      setTeamA(data.match.teamA ?? ""); setTeamB(data.match.teamB ?? "");
      setScoreA(data.match.scoreA ?? ""); setScoreB(data.match.scoreB ?? "");
      setForfeitingSide(data.match.forfeitingSide ?? "A");
      setMessage("Match enregistré.");
      router.refresh();
    } catch (err) { setError(true); setMessage(err.message); }
    finally { setBusy(false); }
  }

  return <tr className={`match-date-row match-date-row-${matchDateTone(matchDate, today, scoreA, scoreB)}${match.involvesRoquette ? " match-row-roquette" : ""}`}>
    <td><input form={formId} aria-label={`Équipe A du match ${match.slotNumber}`} list={suggestionListId} value={teamA} onChange={(event) => setTeamA(event.target.value)} maxLength={100} placeholder="Nom de l’équipe"/></td>
    <td><input form={formId} className="match-score-input" aria-label={`Score de l’équipe A du match ${match.slotNumber}`} type="number" min="0" step="1" value={scoreA} onChange={(event) => setScoreA(event.target.value)} disabled={status === "à venir" || status === "forfait"} required={status === "terminé"} placeholder="–"/></td>
    <td className="match-score-separator" aria-hidden="true">–</td>
    <td><input form={formId} className="match-score-input" aria-label={`Score de l’équipe B du match ${match.slotNumber}`} type="number" min="0" step="1" value={scoreB} onChange={(event) => setScoreB(event.target.value)} disabled={status === "à venir" || status === "forfait"} required={status === "terminé"} placeholder="–"/></td>
    <td><input form={formId} aria-label={`Équipe B du match ${match.slotNumber}`} list={suggestionListId} value={teamB} onChange={(event) => setTeamB(event.target.value)} maxLength={100} placeholder="Nom de l’équipe"/></td>
    <td><input form={formId} lang="fr-FR" aria-label={`Date du match ${match.slotNumber}`} type="date" value={matchDate} onChange={(event) => setMatchDate(event.target.value)} required={Boolean(teamA.trim() && teamB.trim())}/></td>
    <td><div className="match-table-status">
      <select form={formId} aria-label={`Statut du match ${match.slotNumber}`} value={status} onChange={(event) => changeStatus(event.target.value)}>
        <option value="à venir">À venir</option><option value="terminé">Terminé</option><option value="forfait">Forfait</option><option value="annulé">Annulé</option>
      </select>
      {status === "forfait" && <>
        <select form={formId} aria-label={`Équipe forfaitaire du match ${match.slotNumber}`} value={forfeitingSide} onChange={(event) => setForfeitingSide(event.target.value)}>
          <option value="A">A — {teamA || "à renseigner"}</option><option value="B">B — {teamB || "à renseigner"}</option>
        </select>
        <span className="match-table-note">Score 0–3 attribué automatiquement</span>
      </>}
    </div></td>
    <td><form id={formId} className="match-row-actions" onSubmit={save}>
      <button className="button" disabled={busy}>{busy ? "Enregistrement…" : "Enregistrer"}</button>
      {match.involvesRoquette && <a className="button secondary" href={`/admin/matchs/${match.id}/joueurs`} aria-label={`Saisir les joueurs du match ${match.slotNumber}`}>Saisir les joueurs</a>}
      {message && <span className={error ? "notice error" : "muted"} role="status">{message}</span>}
    </form></td>
  </tr>;
}

export default function MatchManagement({ season, roundNumber, matches, teams }) {
  const suggestionListId = `teams-${season.id}-${roundNumber}`;
  const [today, setToday] = useState("");
  useEffect(() => {
    const date = new Date();
    setToday([date.getFullYear(), String(date.getMonth() + 1).padStart(2, "0"), String(date.getDate()).padStart(2, "0")].join("-"));
  }, []);
  return <section className="panel section match-table-card">
    <div className="inline match-section-heading"><h2>Journée {roundNumber}</h2><span className="match-count">{matches.length} matchs</span></div>
    <p className="muted match-guidance">Saisissez les équipes et la date. Les scores sont requis pour un match terminé ; un forfait attribue automatiquement le score 0–3. Les rencontres annulées sont exclues des calculs.</p>
    <div className="match-date-legend" aria-label="Code couleur des dates de match">
      <span><i className="match-date-indicator match-date-indicator-future" aria-hidden="true"/>À venir sans score</span>
      <span><i className="match-date-indicator match-date-indicator-today" aria-hidden="true"/>Aujourd’hui sans score</span>
      <span><i className="match-date-indicator match-date-indicator-past" aria-hidden="true"/>Passé sans score</span>
      <span><i className="match-date-indicator match-date-indicator-scored" aria-hidden="true"/>Avec score</span>
    </div>
    <datalist id={suggestionListId}>{teams.map((team) => <option key={team.id} value={team.name}/>)}</datalist>
    {matches.length === 0 ? <p className="muted">Aucun match pour cette journée.</p> :
      <div className="table-wrap match-table-scroll">
        <table className="match-admin-table" aria-label={`Matchs de la journée ${roundNumber}`}>
          <thead><tr><th scope="col">Équipe A</th><th scope="col">Score A</th><th scope="col" aria-label="Séparateur des scores">–</th><th scope="col">Score B</th><th scope="col">Équipe B</th><th scope="col">Date</th><th scope="col">Statut</th><th scope="col">Actions</th></tr></thead>
          <tbody>{matches.map((match) => <MatchRow key={match.id} match={match} suggestionListId={suggestionListId} today={today}/>)}</tbody>
        </table>
      </div>}
  </section>;
}
