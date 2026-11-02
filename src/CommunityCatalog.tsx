import { useState } from "react";
import { dosClassics, otherCommunityFavorites } from "./dosClassics";

export default function CommunityCatalog() {
  const [search, setSearch] = useState("");
  const [showAll, setShowAll] = useState(false);

  const matching = dosClassics.filter((game) =>
    game.title.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase())
  );
  const visible = (showAll || search.trim()) ? matching : matching.slice(0, 12);

  return (
    <section className="classic-catalog" aria-label="Community DOS classics wishlist">
      <div className="section-head">
        <span>03 / COMMUNITY CLASSICS WISHLIST</span>
        <span className="section-note">THE GAMES PEOPLE REMEMBER</span>
      </div>
      <div className="classic-headline">
        <div>
          <div className="eyebrow">THE RETROVERSE HALL OF FAME</div>
          <h2>LEGENDS. <em>QUEUED.</em></h2>
          <p>Community recommendations, ranked by how often they were mentioned. This is a wishlist, <strong>not a playable game library</strong>. We will add properly licensed demos and bring-your-own-game support in future rungs.</p>
        </div>
        <div className="classic-metrics"><b>46</b><span>RANKED ENTRIES</span></div>
      </div>
      <label className="form-label" htmlFor="classic-search">FIND A CLASSIC</label>
      <input
        id="classic-search"
        className="classic-search"
        type="search"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder="Search Doom, Dune II, Jazz Jackrabbit..."
      />
      <div className="classic-list" aria-live="polite">
        {visible.map((game) => (
          <div className="classic-entry" key={game.title}>
            <span className="classic-rank">{String(game.rank).padStart(2, "0")}</span>
            <strong>{game.title}</strong>
            <span className="classic-votes">{game.mentions} MENTIONS</span>
            <span className="classic-unavailable">WISHLIST</span>
          </div>
        ))}
        {matching.length === 0 && <p className="classic-empty">No matching titles in this community tally.</p>}
      </div>
      {!showAll && !search.trim() && (
        <button className="classic-expand" type="button" onClick={() => setShowAll(true)}>
          SHOW ALL {dosClassics.length} ENTRIES ↓
        </button>
      )}
      {showAll && !search.trim() && (
        <button className="classic-expand" type="button" onClick={() => setShowAll(false)}>SHOW TOP 12 ↑</button>
      )}
      <div className="classic-footnote">
        <p><b>ADDITIONAL CULT FAVORITES:</b> {otherCommunityFavorites.join(" · ")}</p>
        <p>Source: owner-provided Facebook discussion tally (~994 usable recommendations). Equal mention counts share rank. "Another World / Flashback" is one combined entry in the original tally but names two different games. No game rights, compatibility, or downloads are implied.</p>
      </div>
    </section>
  );
}
