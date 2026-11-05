export default function SiteHeader() {
  return <header className="site-header">
    <a className="brand" href="/">TEAM ROQUETTE</a>
    <nav className="nav" aria-label="Navigation principale">
      <a href="/resultats">Résultats</a>
      <a href="/classement-equipes">Classement équipes</a>
      <a href="/classement-joueurs">Classement joueurs</a>
      <a href="/statistiques-joueurs">Statistiques joueurs</a>
      <a href="/statistiques-equipe">Statistiques équipe</a>
      <a href="/admin">Administration</a>
    </nav>
  </header>;
}
