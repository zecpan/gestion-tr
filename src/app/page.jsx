import SiteHeader from "./components/SiteHeader.jsx";
import { listSeasons } from "../lib/seasons.js";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default function HomePage() {
  const seasons = listSeasons();
  return <>
    <SiteHeader />
    <main className="container">
      <section className="hero">
        <span className="eyebrow">Club · Saison après saison</span>
        <h1>Team Roquette</h1>
        <p>Retrouvez les résultats, classements et statistiques de l’équipe. Sur les pages publiques, les joueurs sont identifiés par leur prénom et l’initiale de leur nom.</p>
        <div className="inline">
          <a className="button" href="/resultats">Voir les résultats</a>
          <a className="button secondary" href="/classement-equipes">Consulter les classements</a>
          <a className="button secondary" href="/statistiques-joueurs">Statistiques joueurs</a>
          <a className="button secondary" href="/statistiques-equipe">Historique équipe</a>
        </div>
      </section>
      <section className="section">
        <h2>Saisons disponibles</h2>
        {seasons.length === 0 ? <div className="panel"><p>Aucune saison n’est encore disponible. Les saisons seront publiées après leur création par l’administrateur.</p></div> :
          <div className="grid">{seasons.map((season) => <article className="card" key={season.id}>
            <h2>{season.label}</h2><p>{season.division}</p>
            <a className="button secondary" href={`/resultats?saison=${encodeURIComponent(season.id)}`}>Consulter les matchs</a>
          </article>)}</div>}
      </section>
    </main>
    <footer className="footer">Team Roquette · Informations sportives publiques</footer>
  </>;
}
