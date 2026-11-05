"use client";
import { useState } from "react";

export default function AdminLoginForm() {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(event) {
    event.preventDefault(); setBusy(true); setError("");
    try {
      const form = new FormData(event.currentTarget);
      const response = await fetch("/api/admin/login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ username: form.get("username"), password: form.get("password") }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Connexion impossible.");
      window.location.assign("/admin");
    } catch (err) { setError(err.message || "Connexion impossible."); }
    finally { setBusy(false); }
  }
  return <form className="form-grid" onSubmit={submit}>
    <label>Identifiant<input name="username" autoComplete="username" required maxLength={100} /></label>
    <label>Mot de passe<input name="password" type="password" autoComplete="current-password" required maxLength={256} /></label>
    {error && <div className="notice error" role="alert">{error}</div>}
    <button className="button" disabled={busy}>{busy ? "Connexion…" : "Se connecter"}</button>
  </form>;
}
