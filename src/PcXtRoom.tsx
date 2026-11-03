import { useState } from "react";
import {
  PCXT_PRESETS, PCJS_SOURCE, PCJS_LICENSE_NOTICE, type PcXtId,
} from "./pcxtPresets";

/**
 * Rung 11: real original-8088 IBM hardware configurations from PCjs.
 * The website/emulator/media are independently hosted, and the optional
 * iframe may be disallowed by browser security policies. No machine ROMs
 * or IBM software are shipped by RetroVerse in this rung.
 */
export default function PcXtRoom() {
  const [choice, setChoice] = useState<PcXtId>("xt-cga");
  const [embedded, setEmbedded] = useState(false);
  const [revision, setRevision] = useState(0);
  const [frameLoaded, setFrameLoaded] = useState(false);
  const [message, setMessage] = useState("Choose your original 8088 PC. Full-page PCjs is the recommended way to play.");
  const model = PCXT_PRESETS.find(p => p.id === choice) ?? PCXT_PRESETS[0];

  function close() {
    setEmbedded(false);
    setFrameLoaded(false);
    setMessage("Embedded PCjs page closed. Saves and disk operations belong to the PCjs service.");
  }
  function open() {
    setEmbedded(true);
    setFrameLoaded(false);
    setMessage("Loading PCjs. If the frame is blocked, launch the full-page machine instead.");
  }

  return (
    <section className="pcxt-room" aria-label="Original IBM PC and XT hardware emulation">
      <div className="section-head">
        <span>02 / ORIGINAL IBM PC & XT · 8088</span>
        <span className="section-note">RUNG 11 · PCJS · REAL HISTORICAL HARDWARE PROFILES</span>
      </div>
      <div className="pcxt-layout">
        <div className="pcxt-machine">
          <div className="pcxt-bezel-head">
            <span>Φ RETROVERSE / IBM COMPATIBLE HISTORY</span>
            <span>{embedded ? frameLoaded ? "REMOTE PAGE LOADED" : "CONNECTING" : "STANDBY"}</span>
          </div>
          <div className="pcxt-screen">
            {embedded ? (
              <iframe
                key={choice + ":" + revision}
                title={"Official PCjs remote IBM computer: " + model.name}
                src={model.url}
                referrerPolicy="strict-origin-when-cross-origin"
                allow="fullscreen"
                allowFullScreen
                onLoad={() => {
                  setFrameLoaded(true);
                  setMessage("PCjs webpage loaded. This does not confirm the 8088 has booted. If the emulator is not visible or cannot receive input, use OPEN FULL-PCJS MACHINE.");
                }}
              />
            ) : (
              <div className="pcxt-display-off">
                <div className="pcxt-display-content">
                  <small>Φ RETROVERSE · IBM PC HISTORY</small>
                  <strong>PC / XT</strong>
                  <span>INTEL 8088 · 4.77 MHz</span>
                  <span>{model.name}</span>
                  <span className="pcxt-prompt">&gt; AWAITING POWER</span>
                  <em>DECORATIVE PREVIEW, NOT LIVE EMULATOR OUTPUT</em>
                </div>
              </div>
            )}
          </div>
          <div className="pcxt-bezel-footer">
            <span>ORIGINAL PCJS 8088 EMULATION · EXTERNAL PROVIDER</span>
            <div>
              <button type="button" onClick={embedded ? close : open}>
                {embedded ? "■ CLOSE EMBED" : "▣ TRY EMBED"}
              </button>
              <button type="button" disabled={!embedded} onClick={() => { setRevision(r => r + 1); setFrameLoaded(false); setMessage("Reloading the PCjs page..."); }}>↻ RELOAD</button>
            </div>
          </div>
        </div>
        <aside className="pcxt-panel">
          <div className="panel-head"><span>HARDWARE SELECTOR</span><span className="status-pill"><i /> 8088 ERA</span></div>
          <label htmlFor="pcxt-model" className="form-label">ORIGINAL MACHINE</label>
          <select id="pcxt-model" value={choice} onChange={e => {
            setChoice(e.target.value as PcXtId);
            setEmbedded(false);
            setFrameLoaded(false);
            setMessage("Machine selected. Open its original PCjs emulation in a full tab or use the optional embed.");
          }}>
            {PCXT_PRESETS.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <div className="pcxt-spec-grid">
            <span>MODEL YEAR</span><strong>{model.year}</strong>
            <span>PROCESSOR</span><strong>{model.cpu}</strong>
            <span>MEMORY</span><strong>{model.ram}</strong>
            <span>VIDEO</span><strong>{model.display}</strong>
            <span>STORAGE</span><strong>{model.storage}</strong>
          </div>
          <p className="setting-hint">{model.description}</p>
          <div className="panel-divider" />
          <a className="pcxt-primary-link" href={model.url} target="_blank" rel="noopener noreferrer">
            ▶ OPEN FULL PCJS MACHINE ↗
          </a>
          <p className="setting-hint">Recommended for reliable keyboard input, machine boot, virtual drive controls and disk selection. This opens the official PCjs site.</p>
          <button className="pcxt-secondary-button" type="button" onClick={embedded ? close : open}>
            {embedded ? "■ CLOSE REMOTE EMBED" : "▣ TRY INLINE EMULATOR (EXPERIMENTAL)"}
          </button>
          <p className="setting-hint">PCjs may prevent third-party embedding via browser security settings. If the screen remains blank, the full-page link is the supported fallback.</p>
          <div className="status-log" role="status" aria-live="polite"><span className="log-prompt">&gt;</span> {message}</div>
        </aside>
      </div>

      <div className="pcxt-history">
        <div className="section-head">
          <span>03 / THE FIRST IBM GENERATIONS</span>
          <span className="section-note">1981 PC 5150 → 1983 PC XT 5160</span>
        </div>
        <div className="pcxt-history-grid">
          <div><b>01 / IBM 5150</b><h3>TWO FLOPPY DRIVES.</h3><p>The first IBM Personal Computer, based on Intel's 8088. Our PCjs 5150 presets use 64 KB configurations with CGA or monochrome display.</p></div>
          <div><b>02 / IBM 5160</b><h3>THE HARD-DISK XT.</h3><p>The 1983 PC XT added a built-in hard disk. PCjs models the 256 KB / 10 MB configuration with period-correct display options.</p></div>
          <div><b>03 / MONO OR COLOR</b><h3>MDA vs CGA.</h3><p>Compare sharp monochrome text with early IBM graphics modes. PCjs simulates the original display hardware rather than v86's later PC platform.</p></div>
        </div>
        <p className="pcxt-attribution">
          <a href={PCJS_SOURCE} target="_blank" rel="noopener noreferrer">{PCJS_LICENSE_NOTICE}</a>, MIT-licensed emulator. Copyright credit retained as requested by the upstream project. Emulation, BIOS, disk images, media selection, imports, and saves are managed by <a href="https://www.pcjs.org/" target="_blank" rel="noopener noreferrer">PCjs.org</a>, not RetroVerse. No IBM, Microsoft, or other proprietary ROM/software images are bundled or mirrored here. Use authorized media and observe the provider's own license notices.
        </p>
      </div>
    </section>
  );
}
