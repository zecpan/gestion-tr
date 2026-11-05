"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function SeasonCreateForm() {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const [busy, setBusy] = useState(false);
  async function submit(event) {
    event.preventDefault(); setBusy(true); setMessage("");
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    try {
      const response = await fetch("/api/admin/seasons", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ label: form.get("label"), division: form.get("division") }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Création impossible.");
      setIsError(false);
      setMessage(`Saison ${data.season.label} créée avec 26 journées et 182 matchs vides. ${data.copiedPlayers} joueur(s) actif(s) repris.`);
      formElement.reset();
      router.refresh();
    } catch (err) { setIsError(true); setMessage(err.message || "Création impossible."); }
    finally { setBusy(false); }
  }
  return <form className="form-grid" onSubmit={submit}>
    <label>Saison<input name="label" placeholder="2025-2026" pattern="[0-9]{4}-[0-9]{4}" required maxLength={9}/></label>
    <label>Division<input name="division" placeholder="Nom de la division" required maxLength={100}/></label>
    {message && <div className={`notice${isError ? " error" : ""}`} role="status">{message}</div>}
    <button className="button" disabled={busy}>{busy ? "Création…" : "Créer la saison"}</button>
    <p className="muted">La création prépare 26 journées de 7 matchs vides. Les joueurs actifs de la saison précédente sont recopiés.</p>
  </form>;
}
