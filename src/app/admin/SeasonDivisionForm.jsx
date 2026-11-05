"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function SeasonDivisionForm({ season }) {
  const router = useRouter();
  const [label, setLabel] = useState(season.label);
  const [division, setDivision] = useState(season.division);
  const [message, setMessage] = useState("");
  const [error, setError] = useState(false);
  async function submit(event) {
    event.preventDefault(); setMessage(""); setError(false);
    const response = await fetch(`/api/admin/seasons/${season.id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ label, division }) });
    const data = await response.json();
    if (!response.ok) { setError(true); setMessage(data.error || "Modification impossible."); return; }
    setMessage("Saison mise à jour.");
    router.refresh();
  }
  return <form className="inline" onSubmit={submit}>
    <label>Libellé saison<input value={label} onChange={(e) => setLabel(e.target.value)} pattern="[0-9]{4}-[0-9]{4}" required maxLength={9}/></label>
    <label>Division<input value={division} onChange={(e) => setDivision(e.target.value)} required maxLength={100}/></label>
    <button className="button secondary">Enregistrer</button>
    {message && <span className={error ? "notice error" : "muted"} role="status">{message}</span>}
  </form>;
}
