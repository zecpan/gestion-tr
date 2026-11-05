import Link from "next/link";
import LogoutButton from "./LogoutButton.jsx";

const managementLinks = [
  { href: "/admin", label: "Saisons" },
  { href: "/admin/joueurs", label: "Joueurs" },
  { href: "/admin/joueurs/historique", label: "Historique" },
  { href: "/admin/matchs", label: "Matchs" },
  { href: "/admin/coupes", label: "Coupe" },
  { href: "/admin/forfaits", label: "Forfaits" },
];

export default function AdminNavigation() {
  return <header className="site-header admin-site-header">
    <Link className="brand" href="/">TEAM ROQUETTE</Link>
    <nav className="admin-nav" aria-label="Navigation de gestion">
      {managementLinks.map((item) => <Link className="button secondary admin-nav-link" href={item.href} key={item.href}>
        {item.label}
      </Link>)}
      <LogoutButton/>
    </nav>
  </header>;
}
