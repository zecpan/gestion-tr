"use client";
export default function LogoutButton() {
  async function logout() { await fetch("/api/admin/logout", { method: "POST" }); window.location.assign("/"); }
  return <button type="button" className="button secondary admin-nav-logout" onClick={logout}>Déconnexion</button>;
}
