import { useState } from "react";

export default function AmigaRoom() {
  const [revision, setRevision] = useState(0);
  const url = import.meta.env.BASE_URL + "amiga/example.htm";
  return (
    <section className="amiga-room" aria-label="Classic Amiga computer">
      <div className="section-head"><span>02 / AMIGA COMPUTER ROOM</span><span className="section-note">RUNG 03 · SCRIPTED AMIGA EMULATOR</span></div>
      <div className="amiga-intro">
        <div>
          <div className="eyebrow">REAL EMULATION / BRING YOUR OWN ROM</div>
          <h2>THE <em>AMIGA</em> YEARS.</h2>
          <p>Boot a classic Commodore Amiga inside the browser. Choose A500, A1200 or another model, load your own Kickstart ROM and insert an ADF floppy disk. The authentic emulator below does the rest.</p>
          <p className="amiga-notice">Kickstart and Workbench were commercial software. RetroVerse does not distribute ROMs, Workbench disks or games. You need your own legally usable images to boot.</p>
        </div>
        <div className="amiga-plate" aria-hidden="true"><span>COMMODORE</span><b>AMIGA</b><span>A500 / A1200 / CLASSIC 16-BIT</span></div>
      </div>
      <div className="amiga-shell">
        <div className="amiga-toolbar">
          <span>Φ RETROVERSE · GPL-LICENSED SAE</span>
          <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
            <button type="button" onClick={() => setRevision(i => i + 1)}>↻ RESET STATION</button>
            <a href={url} target="_blank" rel="noreferrer">OPEN FULL PAGE ↗</a>
          </div>
        </div>
        <iframe className="amiga-iframe" title="Scripted Amiga Emulator, with user-supplied ROM and floppy controls" key={revision} src={url} allow="fullscreen" allowFullScreen loading="lazy" />
      </div>
      <div className="amiga-steps">
        <div><b>01 · SELECT MACHINE</b><p>Start with A500, or choose A1200 for later Amiga software.</p></div>
        <div><b>02 · KICKSTART ROM</b><p>Select a legal ROM file under the emulator's Kickstart controls. Required for boot.</p></div>
        <div><b>03 · FLOPPY DF0</b><p>Insert your own ADF floppy image. A second drive is available.</p></div>
        <div><b>04 · START</b><p>Press Start inside SAE. Use its pause, reset, mute and fullscreen controls.</p></div>
      </div>
      <p className="amiga-source">This first station preserves the original upstream emulator controls for compatibility. Complete GPL source code and license are served with the page. <a href="https://github.com/naTmeg/ScriptedAmigaEmulator" target="_blank" rel="noreferrer">Source</a> · <a href={import.meta.env.BASE_URL + "amiga/gpl.htm"} target="_blank" rel="noreferrer">License</a> · <a href={import.meta.env.BASE_URL + "amiga/SOURCE-PROVENANCE.txt"} target="_blank" rel="noreferrer">Revision</a>.</p>
    </section>
  );
}
