"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function SeasonTeamForm({ season, teams }) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setBusy(true); setMessage(""); setError(false);
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    try {
      const response = await fetch(`/api/admin/seasons/${season.id}/teams`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: form.get("name") }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Ajout impossible.");
      setMessage(data.alreadyAdded ? "Cette équipe est déjà associée à la saison." : `${data.team.name} a été ajoutée à la saison.`);
      formElement.reset();
      router.refresh();
    } catch (err) { setError(true); setMessage(err.message || "Ajout impossible."); }
    finally { setBusy(false); }
  }

  return <div className="season-team-management">
    <form className="inline" onSubmit={submit}>
      <label>Ajouter une équipe<input name="name" placeholder="Nom de l’équipe" required maxLength={100}/></label>
      <button className="button secondary" disabled={busy}>{busy ? "Ajout…" : "Ajouter"}</button>
      {message && <span className={error ? "notice error" : "muted"} role="status">{message}</span>}
    </form>
    <p className="muted">Équipes de la saison : {teams.map((team) => team.name).join(", ") || "Team Roquette"}.</p>
  </div>;
}
