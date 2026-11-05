import SiteHeader from "../../components/SiteHeader.jsx";
import AdminLoginForm from "./AdminLoginForm.jsx";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export default function AdminLoginPage() { return <><SiteHeader/><main className="container"><section className="panel" style={{maxWidth:580,margin:"0 auto"}}><span className="eyebrow">Espace privé</span><h1>Connexion administrateur</h1><p>La gestion des données est réservée à l’administrateur.</p><AdminLoginForm/></section></main></>; }
