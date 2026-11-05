import SiteHeader from "./components/SiteHeader.jsx";
import { listSeasons } from "../lib/seasons.js";

export default function PublicInfo({ title, intro }) {
  const seasons = listSeasons();
  return <><SiteHeader /><main className="container">
    <section className="hero"><span className="eyebrow">Team Roquette</span><h1>{title}</h1><p>{intro}</p></section>
    {seasons.length === 0 ? <section className="panel"><p>Aucune saison n’est encore publiée.</p></section> : <section className="grid">
      {seasons.map((season) => <article className="card" key={season.id}><h2>{season.label}</h2><p>{season.division}</p><p className="muted">Les résultats et classements de cette saison seront affichés ici.</p></article>)}
    </section>}
  </main></>;
}
