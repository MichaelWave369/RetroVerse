import { useState } from "react";

type Access = "freeware" | "owned";
type Era = "all" | "freeware" | "owned";
interface Adventure {
  name: string;
  year: string;
  publisher: string;
  access: Access;
  detail: string;
}

const externalScummVM = "https://scummvm.kuendig.io/scummvm.html";
const externalLibrary = "https://scummvm.kuendig.io/games.html";
const officialFreeware = "https://www.scummvm.org/games/";

const adventures: Adventure[] = [
  {name:"Beneath a Steel Sky",year:"1994",publisher:"Revolution Software",access:"freeware",detail:"Cyberpunk adventure with political intrigue"},
  {name:"Flight of the Amazon Queen",year:"1995",publisher:"Interactive Binary Illusions",access:"freeware",detail:"Jungle mystery and classic comedy"},
  {name:"Lure of the Temptress",year:"1992",publisher:"Revolution Software",access:"freeware",detail:"Fantasy adventure with a living world"},
  {name:"Drascula: The Vampire Strikes Back",year:"1996",publisher:"Alcachofa Soft",access:"freeware",detail:"Offbeat vampire comedy"},
  {name:"DreamWeb",year:"1994",publisher:"Creative Reality",access:"freeware",detail:"Dark science-fiction point-and-click"},
  {name:"The Secret of Monkey Island",year:"1990",publisher:"Lucasfilm Games",access:"owned",detail:"Pirates, puzzles, and Guybrush Threepwood"},
  {name:"Monkey Island 2: LeChuck's Revenge",year:"1991",publisher:"LucasArts",access:"owned",detail:"The pirate sequel"},
  {name:"Day of the Tentacle",year:"1993",publisher:"LucasArts",access:"owned",detail:"Time-travel cartoon adventure"},
  {name:"Sam & Max Hit the Road",year:"1993",publisher:"LucasArts",access:"owned",detail:"Unhinged detective road trip"},
  {name:"Indiana Jones and the Fate of Atlantis",year:"1992",publisher:"LucasArts",access:"owned",detail:"Archaeological mystery"},
  {name:"King's Quest VI",year:"1992",publisher:"Sierra On-Line",access:"owned",detail:"Fairytale adventure"},
  {name:"Quest for Glory",year:"1989",publisher:"Sierra On-Line",access:"owned",detail:"Adventure-meets-RPG classic"},
  {name:"Police Quest",year:"1987",publisher:"Sierra On-Line",access:"owned",detail:"Procedural detective adventure"},
  {name:"Lands of Lore",year:"1993",publisher:"Westwood Studios",access:"owned",detail:"Fantasy RPG supported by ScummVM"},
];

export default function AdventureRoom() {
  const [embedded, setEmbedded] = useState(false);
  const [filter, setFilter] = useState<Era>("all");
  const [query, setQuery] = useState("");
  const listed = adventures.filter(game =>
    (filter === "all" || game.access === filter) &&
    (game.name.toLowerCase().includes(query.toLowerCase()) ||
     game.detail.toLowerCase().includes(query.toLowerCase()) ||
     game.publisher.toLowerCase().includes(query.toLowerCase()))
  );

  return (
    <section className="adventure-room" aria-label="Point-and-click adventure room">
      <div className="section-head"><span>02 / THE ADVENTURE WING</span><span className="section-note">RUNG 04 · SCUMMVM WEB PORTAL</span></div>
      <div className="adventure-intro">
        <div>
          <div className="eyebrow">NO QUARTER REQUIRED · PUZZLES INCLUDED</div>
          <h2>POINT. CLICK.<br/><em>GET LOST.</em></h2>
          <p>Step through the portal to classic graphic adventures powered by ScummVM's real browser engine. Explore official freeware releases, playable demos, and the games you already own.</p>
        </div>
        <div className="adventure-sign" aria-hidden="true">
          <span>WELCOME TO</span><b>THE<br/>ADVENTURE<br/>WING</b><small>PLEASE DO NOT FEED THE TENTACLES</small>
        </div>
      </div>

      <div className="adventure-launch">
        <div className="adventure-monitor">
          {embedded ? (
            <iframe
              title="Third-party ScummVM WebAssembly player, hosted on scummvm.kuendig.io"
              src={externalScummVM}
              allow="fullscreen; gamepad; autoplay"
              allowFullScreen
              referrerPolicy="strict-origin-when-cross-origin"
            />
          ) : (
            <div className="adventure-idle">
              <span className="adventure-glyph" aria-hidden="true">◇</span>
              <strong>AN ADVENTURE AWAITS.</strong>
              <small>LIVE WEB PLAYER HOSTED BY THE SCUMMVM DEMO PROJECT</small>
              <p>Launch the separate browser player, or try displaying it here. No fake gameplay and no commercial game downloads.</p>
            </div>
          )}
          <div className="adventure-scan" aria-hidden="true" />
        </div>
        <div className="adventure-console">
          <div className="panel-head"><span>ADVENTURE TERMINAL</span><span className="status-pill"><i /> WEB PORTAL</span></div>
          <p>ScummVM replaces original game executables with compatible modern interpreters. This station connects to the independent <strong>ScummVM Web Demo</strong>, not a RetroVerse-hosted ScummVM build.</p>
          <a className="adventure-main-link" href={externalScummVM} target="_blank" rel="noopener noreferrer">▶ LAUNCH SCUMMVM WEB PLAYER ↗</a>
          <a className="adventure-alt-link" href={externalLibrary} target="_blank" rel="noopener noreferrer">▤ BROWSE LIVE DEMOS ↗</a>
          <button className="adventure-embed" type="button" aria-pressed={embedded} onClick={()=>setEmbedded(v=>!v)}>
            {embedded ? "■ CLOSE EMBEDDED PLAYER" : "▣ TRY EMBEDDED PLAYER (EXPERIMENTAL)"}
          </button>
          <p className="setting-hint">The embedded player may be blocked by the provider's security policies or browser privacy settings. Use the external launch button if it remains blank or cannot receive input.</p>
          <div className="panel-divider"/>
          <div className="form-label">YOUR DATA, YOUR CHOICE</div>
          <p>Opening or embedding the player sends requests to the third-party demo operator. Any game imports, cloud sign-ins, and saves are controlled by that service and its policies, not RetroVerse. Please only use game data you own or are authorized to use.</p>
          <div className="status-log">&gt; Adventure portal available. Separate ScummVM WebAssembly service. No games bundled in RetroVerse.</div>
        </div>
      </div>

      <div className="adventure-library">
        <div className="section-head"><span>03 / ADVENTURE INDEX</span><span className="section-note">REFERENCE CATALOG · NOT AN INCLUDED GAME LIBRARY</span></div>
        <div className="adventure-library-intro">
          <h3>THE CLASSIC CASE FILES.</h3>
          <p>These titles are milestones of adventure gaming. Freeware titles are available from ScummVM's official download page; other games require their original data files. Entries below do <strong>not</strong> imply every title is preloaded in the web demo.</p>
        </div>
        <div className="adventure-filters">
          <label htmlFor="adventure-search" className="form-label">FIND AN ADVENTURE</label>
          <input id="adventure-search" type="search" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Monkey Island, Drascula, Sierra, cyberpunk..." />
          <div className="adventure-filter-buttons" role="group" aria-label="Filter by access">
            <button type="button" aria-pressed={filter==="all"} onClick={()=>setFilter("all")}>ALL</button>
            <button type="button" aria-pressed={filter==="freeware"} onClick={()=>setFilter("freeware")}>OFFICIAL FREEWARE</button>
            <button type="button" aria-pressed={filter==="owned"} onClick={()=>setFilter("owned")}>BRING YOUR OWN</button>
          </div>
        </div>
        <div className="adventure-game-list">
          {listed.map(game => (
            <div className="adventure-game" key={game.name}>
              <div className="adventure-game-head"><strong>{game.name}</strong><span className={game.access==="freeware"?"freeware":"owned"}>{game.access==="freeware"?"FREEWARE":"OWNED DATA"}</span></div>
              <div className="adventure-game-meta">{game.year} · {game.publisher}</div>
              <p>{game.detail}</p>
            </div>
          ))}
          {listed.length===0 && <div className="adventure-empty">No cases match your search.</div>}
        </div>
        <div className="adventure-bottom">
          <div><strong>OFFICIAL FREEWARE ARCHIVE</strong><p>For permitted downloads and source information, use ScummVM's own games archive. License terms still apply to each game.</p></div>
          <a href={officialFreeware} target="_blank" rel="noopener noreferrer">EXPLORE FREEWARE ↗</a>
        </div>
      </div>
      <p className="adventure-credit">Third-party WebAssembly player: <a href="https://github.com/chkuendig/scummvm-demo" target="_blank" rel="noopener noreferrer">chkuendig/scummvm-demo</a>. Game engine: <a href="https://www.scummvm.org" target="_blank" rel="noopener noreferrer">ScummVM</a> (GPL). This Rung 4 portal does not redistribute the interpreter or games; self-hosting is a later milestone.</p>
    </section>
  );
}
