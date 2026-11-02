import { useEffect, useRef, useState } from "react";
import { allowedMacOrigin, macPresets, type MacId } from "./macintoshPresets";

/** Real third-party Infinite Mac iframe, not a bundled first-party emulator. */
export default function MacintoshRoom() {
  const [chosen,setChosen]=useState<MacId>("plus");
  const [powered,setPowered]=useState(false);
  const [generation,setGeneration]=useState(0);
  const [phase,setPhase]=useState<"off"|"starting"|"running"|"error">("off");
  const [message,setMessage]=useState("Choose a Macintosh and power on.");
  const screen=useRef<HTMLIFrameElement|null>(null);
  const current=macPresets.find(p=>p.id===chosen) ?? macPresets[0];
  useEffect(()=>{
    if(!powered)return;
    const onMessage=(event:MessageEvent)=>{
      if(!allowedMacOrigin(event.origin)||event.source!==screen.current?.contentWindow)return;
      if(!event.data||typeof event.data!=="object")return;
      if(event.data.type==="emulator_loaded"){setPhase("running");setMessage("Macintosh guest is running. Click the screen to use the mouse and keyboard.");}
      if(event.data.type==="emulator_exited"){setPowered(false);setPhase("off");setMessage("Guest computer has exited.");}
      if(event.data.type==="emulator_error"){setPhase("error");setMessage(String(event.data.error || "Emulator reported an error. Try the full-page link."));}
    };
    window.addEventListener("message",onMessage);
    return()=>window.removeEventListener("message",onMessage);
  },[powered,generation]);
  const start=()=>{setPowered(true);setPhase("starting");setMessage("Opening Infinite Mac. The emulator and system files load from an external provider.");};
  const off=()=>{setPowered(false);setPhase("off");setMessage("Macintosh station powered off. Any saved data remains under the provider's control.");};
  const restart=()=>{setGeneration(n=>n+1);setPhase("starting");setMessage("Restarting Macintosh session...");};
  return <section className="mac-room" aria-label="68k Macintosh museum room">
    <div className="section-head"><span>02 / THE CLASSIC MACINTOSH ROOM</span><span className="section-note">RUNG 09 · REAL 68K EMULATION · EXTERNAL PROVIDER</span></div>
    <div className="mac-intro">
      <div><div className="eyebrow">ONE MOUSE · ONE DESKTOP · INFINITE POSSIBILITIES</div>
        <h2>THE <em>MACINTOSH</em> YEARS.</h2>
        <p>The Macintosh Plus and the System 6 desktop, running in a genuine <a href="https://infinitemac.org" target="_blank" rel="noopener noreferrer">Infinite Mac</a> emulator. Or switch to a later Quadra to explore the color System 7 era.</p>
        <p className="mac-disclaimer">This is an officially supported third-party embed, not a RetroVerse-hosted Macintosh emulator. We do not bundle Apple ROMs, OS disks or commercial applications. The remote provider controls system downloads and storage.</p>
      </div>
      <div className="mac-art" aria-hidden="true"><div className="mac-art-screen"><span>WELCOME TO</span><b>⌘</b><small>MACINTOSH</small></div><span className="mac-art-drive"/><strong>Macintosh Plus</strong></div>
    </div>
    <div className="mac-layout">
      <div className="mac-crt">
        <div className="mac-crt-head"><span>Φ RETROVERSE · COMPACT MAC</span><span>{phase==="running"?"● ONLINE":phase==="starting"?"◌ BOOTING":"○ STANDBY"}</span></div>
        <div className="mac-crt-screen">
          {powered ? <iframe key={chosen+generation} ref={screen} src={current.url} title={"Infinite Mac emulator: "+current.name} allow="cross-origin-isolated; fullscreen" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" onLoad={()=>setMessage(prev=>prev.startsWith("Opening")?"Emulator frame loaded. Waiting for guest startup...":prev)}/> :
          <div className="mac-standby"><span aria-hidden="true">⌘</span><strong>WELCOME TO MACINTOSH.</strong><p>Power on to start the actual classic Macintosh emulator.</p><small>EXTERNAL SYSTEM · NO APPLE MEDIA HOSTED HERE</small></div>}
        </div>
        <div className="mac-crt-foot"><span>{current.emulator} / {current.machine}</span><div>
          <button type="button" disabled={!powered} onClick={restart}>↻ RESTART</button>
          <button type="button" onClick={powered?off:start}>{powered?"■ POWER OFF":"⏻ POWER ON"}</button>
        </div></div>
      </div>
      <aside className="mac-controls">
        <div className="panel-head"><span>MAC CONTROL DECK</span><span className={"status-pill"+(phase==="running"?" status-running":"")}><i/>{phase.toUpperCase()}</span></div>
        <label htmlFor="mac-choice" className="form-label">MACHINE PRESET</label>
        <select id="mac-choice" value={chosen} disabled={powered} onChange={e=>setChosen(e.target.value as MacId)}>
          {macPresets.map(model=><option key={model.id} value={model.id}>{model.name}</option>)}
        </select>
        <p className="setting-hint">{current.description}</p>
        <p className="mac-spec">HARDWARE: {current.machine}<br/>ERA: {current.era}<br/>ENGINE: {current.emulator}</p>
        <div className="panel-divider"/>
        <button type="button" className="primary-action" onClick={powered?off:start}>{powered?"■ CLOSE MAC SESSION":"▶ START CLASSIC MAC"}</button>
        <a className="mac-link" href={current.full} target="_blank" rel="noopener noreferrer">OPEN FULL-SCREEN EXPERIENCE ↗</a>
        <a className="mac-link secondary" href="https://infinitemac.org/embed" target="_blank" rel="noopener noreferrer">CUSTOMIZE YOUR OWN MAC ↗</a>
        <p className="setting-hint">If the embed stays blank or slow, use the full-page option. Cross-origin isolation can affect performance on GitHub Pages. Both options contact Infinite Mac.</p>
        <div className="status-log" role="status" aria-live="polite"><span className="log-prompt">&gt;</span> {message}</div>
      </aside>
    </div>
    <div className="mac-history">
      <div className="section-head"><span>03 / WHY THE MAC MATTERED</span><span className="section-note">FROM TEXT COMMANDS TO THE DESKTOP METAPHOR</span></div>
      <div className="mac-history-grid">
        <div><b>01 · THE COMPACT MAC</b><h3>512 × 342</h3><p>A small monochrome screen, a one-button mouse, and menus instead of DOS commands.</p></div>
        <div><b>02 · SYSTEM 6</b><h3>THE FINDER.</h3><p>Windows, folders, icons, Control Panel and the Trash. A different world from the Tandy.</p></div>
        <div><b>03 · SYSTEM 7</b><h3>COLOR ERA.</h3><p>Later Macintosh hardware, with broader application support and desktop features.</p></div>
      </div>
      <p className="mac-footnote">Infinite Mac is operated independently of RetroVerse. <a href="https://infinitemac.org/embed-docs" target="_blank" rel="noopener noreferrer">Official embedding documentation</a> · <a href="https://github.com/mihaip/infinite-mac" target="_blank" rel="noopener noreferrer">Upstream source</a>. This integration is an external emulator experience rather than a fully independent first-party runtime.</p>
    </div>
  </section>;
}
