import { useState } from "react";
import { C64_FILE_EXTENSIONS, C64_READY, C64_ROMS } from "./c64Provider";

/**
 * This room is a gateway to the genuine C64 READY emulator.
 * The first-party RetroVerse site never downloads or hosts copyrighted ROMs.
 * The provider's SharedArrayBuffer requirements may break third-party iframes,
 * so a full-page player is the supported fallback.
 */
export default function C64Room() {
  const [embedded, setEmbedded] = useState(false);
  const [revision, setRevision] = useState(0);
  const [frameLoaded, setFrameLoaded] = useState(false);
  const [message, setMessage] = useState("The 6510 is waiting. Open the full player for the most reliable experience.");

  function openEmbed() {
    setEmbedded(true);
    setFrameLoaded(false);
    setMessage("Connecting to C64 READY. If this frame stays blank, open the emulator in its own tab.");
  }
  function closeEmbed() {
    setEmbedded(false);
    setFrameLoaded(false);
    setMessage("Embedded session closed. ROMs, media, and saves are managed by C64 READY on its own website.");
  }
  return (
    <section className="c64-room" aria-label="Commodore 64 browser museum station">
      <div className="section-head">
        <span>02 / THE COMMODORE 64 COMPUTER</span>
        <span className="section-note">RUNG 10 · 6510 · VIC-II · SID · EXTERNAL EMULATOR</span>
      </div>
      <div className="c64-lab">
        <div className="c64-screen-shell">
          <div className="c64-screen-top">
            <span><i className="c64-led" /> Φ RETROVERSE / COMMODORE 64</span>
            <span>{embedded ? frameLoaded ? "REMOTE FRAME LOADED" : "LOADING REMOTE FRAME" : "OFFLINE / STANDBY"}</span>
          </div>
          <div className="c64-crt">
            {embedded ? (
              <iframe
                key={revision}
                title="C64 READY third-party Commodore 64 emulator (ROMs required)"
                src={C64_READY.url}
                referrerPolicy="strict-origin-when-cross-origin"
                allow="cross-origin-isolated; fullscreen; gamepad; autoplay"
                allowFullScreen
                onLoad={() => {
                  setFrameLoaded(true);
                  setMessage("The external page loaded. This does not confirm ROM setup or guest boot. If the screen is blank or errors, use OPEN FULL PLAYER.");
                }}
              />
            ) : (
              <div className="c64-idle">
                <div className="c64-basic">
                  <p>**** COMMODORE 64 MUSEUM ****</p>
                  <p>64K RAM SYSTEM · SID AUDIO</p>
                  <p>READY.</p>
                  <span aria-hidden="true">█</span>
                </div>
                <div className="c64-idle-notice">THIS IS A DECORATIVE PREVIEW, NOT EMULATOR OUTPUT.</div>
              </div>
            )}
          </div>
          <div className="c64-monitor-footer">
            <span>REAL GUEST EMULATION ON C64 READY · GPL-3.0-OR-LATER</span>
            <div>
              <button type="button" onClick={() => embedded ? closeEmbed() : openEmbed()}>
                {embedded ? "■ CLOSE EMBED" : "▣ TRY EMBED"}
              </button>
              <button type="button" disabled={!embedded} onClick={() => { setRevision(x => x + 1); setFrameLoaded(false); setMessage("Reloading the external C64 frame..."); }}>↻ RELOAD</button>
            </div>
          </div>
        </div>
        <aside className="c64-console">
          <div className="panel-head"><span>COMMODORE CONTROL DECK</span><span className="status-pill"><i /> REMOTE PLAYER</span></div>
          <div className="form-label">PLAY THE REAL C64</div>
          <a className="c64-primary" href={C64_READY.url} target="_blank" rel="noopener noreferrer">▶ OPEN FULL C64 PLAYER ↗</a>
          <p className="setting-hint">Recommended. The emulator uses cross-origin isolation and SharedArrayBuffer for its audio engine, which might not work inside RetroVerse's embedded frame.</p>
          <button className="c64-secondary" type="button" onClick={() => embedded ? closeEmbed() : openEmbed()}>
            {embedded ? "■ CLOSE EMBEDDED PLAYER" : "▣ TRY EMBEDDED C64 (EXPERIMENTAL)"}
          </button>
          <div className="panel-divider" />
          <div className="form-label">YOUR OWN ROMS REQUIRED</div>
          <p className="c64-explainer">The Commodore firmware is still copyrighted. Bring your own authorized ROM images; C64 READY asks for them in its setup screen and stores them in the browser.</p>
          <div className="c64-roms">
            {C64_ROMS.map(rom => (
              <div key={rom.name}><strong>{rom.name}</strong><span>{(rom.bytes / 1024).toFixed(0)} KiB · {rom.required ? "REQUIRED" : "OPTIONAL"}</span></div>
            ))}
          </div>
          <a className="c64-guide" href={C64_READY.guide} target="_blank" rel="noopener noreferrer">VIEW ROM SETUP & PLAYER GUIDE ↗</a>
          <div className="status-log" role="status" aria-live="polite"><span className="log-prompt">&gt;</span> {message}</div>
        </aside>
      </div>
      <div className="c64-information">
        <div className="section-head"><span>03 / INSIDE THE BREADBIN</span><span className="section-note">1982 · HOME COMPUTING & 8-BIT MUSIC</span></div>
        <div className="c64-facts">
          <div><b>01 · CPU</b><strong>MOS 6510</strong><p>A 1 MHz-class 8-bit CPU with 64 KiB of RAM. Boot the original Commodore BASIC V2 environment after supplying firmware.</p></div>
          <div><b>02 · VIDEO</b><strong>VIC-II</strong><p>Sprites, raster effects, and the iconic blue BASIC screen. Explore programs and demos using legitimate copies.</p></div>
          <div><b>03 · SOUND</b><strong>SID 6581</strong><p>The three-voice synthesizer that defined a generation of chiptunes and game soundtracks.</p></div>
        </div>
        <p className="c64-media-hint">The provider accepts user-supplied media such as {C64_FILE_EXTENSIONS.join(", ")}. Disks, programs, save states, and ROMs are handled in C64 READY's interface, not uploaded to a RetroVerse backend. Save-state portability follows the provider's own documentation.</p>
        <p className="c64-license-note">This is a separately hosted emulator operated by the independent C64 READY project, not a first-party RetroVerse C64 core. Source: <a href={C64_READY.source} target="_blank" rel="noopener noreferrer">C64 READY on GitHub</a>. Its code is {C64_READY.license}; its ROMs and game data are not bundled by RetroVerse.</p>
      </div>
    </section>
  );
}
