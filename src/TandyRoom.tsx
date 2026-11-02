import { useEffect, useRef, useState } from "react";
import { loadJsDos, type JsDosPlayer } from "./jsdosRuntime";
import {
  readTandyZip, readTandyFloppy, tandyDosboxConf, WELCOME_FILE,
  type TandyModel, type TandySpeed, type TandyProgramPack,
} from "./tandyMachine";

type State = "off" | "loading" | "ready" | "running" | "paused" | "error";
const archiveUrl = "https://archive.org/details/Tandy1000SL2Disks";
const disks = ["DOS33_1000SL2.img","DeskMate1_1000SL2.img","DeskMate2_1000SL2.img","DeskMate3_1000SL2.img"];

export default function TandyRoom({ onGoToPc }: { onGoToPc: () => void }) {
  const [model, setModel] = useState<TandyModel>("sl2");
  const [speed, setSpeed] = useState<TandySpeed>("original");
  const [state, setState] = useState<State>("off");
  const [message, setMessage] = useState("Turn the power on to explore DOS with Tandy-compatible graphics and audio.");
  const [pack, setPack] = useState<TandyProgramPack | null>(null);
  const [executable, setExecutable] = useState("");
  const [reading, setReading] = useState(false);
  const [filesLoaded, setFilesLoaded] = useState(0);
  const playerRef = useRef<JsDosPlayer | null>(null);
  const screenRef = useRef<HTMLDivElement | null>(null);
  const pickerRef = useRef<HTMLInputElement | null>(null);
  const generation = useRef(0);
  const on = state === "ready" || state === "running" || state === "paused" || state === "loading";
  const active = state === "ready" || state === "running" || state === "paused";

  useEffect(() => () => {
    generation.current++;
    const old = playerRef.current;
    playerRef.current = null;
    if (old) void old.stop().catch(() => undefined);
  }, []);

  async function dispose() {
    const old = playerRef.current;
    playerRef.current = null;
    if (old) {
      try { await old.stop(); } catch { /* Stopped already. */ }
    }
    screenRef.current?.replaceChildren();
  }

  async function stop() {
    ++generation.current;
    await dispose();
    setState("off");
    setMessage("Tandy-compatible session powered off. This temporary workstation doesn't persist its DOS file changes.");
  }

  async function loadMedia(file: File) {
    if (reading || on) return;
    setReading(true);
    setMessage("Reading your local historical media, without uploading it...");
    try {
      const next = file.name.toLowerCase().endsWith(".img")
        ? await readTandyFloppy(file)
        : await readTandyZip(file);
      setPack(next);
      setExecutable(next.programs[0] ?? "");
      setFilesLoaded(next.files.length);
      setMessage("Loaded " + next.files.length + " DOS files from " + file.name + ". Press POWER ON to inspect or run a supported program.");
    } catch (error) {
      setPack(null);
      setExecutable("");
      setFilesLoaded(0);
      setMessage(error instanceof Error ? error.message : "This disk image could not be read.");
    } finally { setReading(false); }
  }

  async function start() {
    if (on || reading || !screenRef.current) return;
    const id = ++generation.current;
    setState("loading");
    setMessage("Powering up the Tandy-compatible DOSBox environment...");
    try {
      await loadJsDos();
      if (id !== generation.current || !screenRef.current || !window.Dos) return;
      const program = executable || null;
      const config = tandyDosboxConf(model, speed, program);
      const player = window.Dos(screenRef.current, {
        dosboxConf: config,
        initFs: [WELCOME_FILE, ...(pack?.files ?? [])],
        theme: "dark",
        renderAspect: "4/3",
        renderBackend: "canvas",
        imageRendering: "pixelated",
        autoStart: true,
        noCursor: false,
        startIpxServer: false,
        // This historical station is deliberately ephemeral.
        fsChanges: { local: false },
        onEvent: (event: string) => {
          if (id !== generation.current) return;
          if (event === "emu-ready") {
            setState("ready");
            setMessage("DOSBox initialized. Tandy-compatible mode selected.");
          } else if (event === "ci-ready") {
            setState("running");
            setMessage("DOS workstation running. Click the screen to type. TANDY.TXT explains the compatibility limits.");
          }
        },
      });
      player.setNoCloud(true);
      playerRef.current = player;
      setState("ready");
      setMessage("DOSBox player initialized. Waiting for DOS to start...");
    } catch (error) {
      if (id !== generation.current) return;
      await dispose();
      setState("error");
      setMessage(error instanceof Error ? error.message : "Tandy-compatible emulator startup failed.");
    }
  }

  function togglePause() {
    const player = playerRef.current;
    if (!player) return;
    try {
      const paused = state !== "paused";
      player.setPaused(paused);
      setState(paused ? "paused" : "running");
      setMessage(paused ? "Tandy session paused." : "Tandy session resumed.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not change emulation state.");
    }
  }

  return (
    <section className="tandy-room" aria-label="Tandy 1000 SL and SL/2 compatible station">
      <div className="section-head"><span>02 / THE RADIO SHACK COMPUTER ROOM</span><span className="section-note">RUNG 08 · TANDY 1000 SL FAMILY</span></div>
      <div className="tandy-head">
        <div>
          <div className="eyebrow">A FIRST COMPUTER. A FIRST PORTAL.</div>
          <h2>THE <em>TANDY</em> YEARS.</h2>
          <p>Go back to the 1988–1989 Tandy 1000 SL family. Try DOS software using Tandy graphics and three-voice sound compatibility, or inspect files from one of your own 720 KB floppy images.</p>
          <p className="tandy-caveat">This is an honest DOSBox-compatible recreation. It does not emulate the SL/2 motherboard, boot its internal MS-DOS/DeskMate ROM, reproduce the exact 4/8 MHz 8086 timing, or guarantee original DeskMate will run.</p>
        </div>
        <div className="tandy-plate" aria-hidden="true">
          <small>RADIO SHACK</small><b>TRS-80<br/>TANDY</b><strong>1000 SL/2</strong><span>1989 · 8086 CLASS</span>
        </div>
      </div>
      <div className="tandy-layout">
        <div className="tandy-screen-outer">
          <div className="tandy-monitor-head"><span>TANDY 1000 SERIES</span><span>3-VOICE AUDIO / TGA</span></div>
          <div className="tandy-screen">
            <div className="tandy-player" ref={screenRef} />
            {(state === "off" || state === "loading" || state === "error") && (
              <div className="tandy-splash"><span aria-hidden="true">▥</span><strong>{state === "loading" ? "INITIALIZING TANDY..." : state === "error" ? "BOOT ERROR" : "NO SIGNAL"}</strong><small>{state === "off" ? "PRESS POWER TO BEGIN" : state.toUpperCase()}</small></div>
            )}
          </div>
          <div className="tandy-monitor-foot"><span>Φ RETROVERSE / PERSONAL COMPUTER HISTORY</span><div>
            <button type="button" disabled={!active} onClick={togglePause}>{state === "paused" ? "▶ RESUME" : "Ⅱ PAUSE"}</button>
            <button type="button" disabled={!active} onClick={() => playerRef.current?.setFullScreen(true)}>⛶ FULLSCREEN</button>
            <button type="button" disabled={state === "loading"} onClick={() => void (on ? stop() : start())}>{on ? "■ POWER OFF" : "⏻ POWER ON"}</button>
          </div></div>
        </div>
        <aside className="tandy-console">
          <div className="panel-head"><span>MACHINE CONTROLS</span><span className={"status-pill" + (active ? " status-running" : "")}><i />{state.toUpperCase()}</span></div>
          <label htmlFor="tandy-model" className="form-label">MACHINE PROFILE</label>
          <select id="tandy-model" value={model} disabled={on} onChange={e => setModel(e.target.value as TandyModel)}>
            <option value="sl2">Tandy 1000 SL/2 (1989)</option>
            <option value="sl">Tandy 1000 SL (1988)</option>
          </select>
          <p className="setting-hint">{model === "sl2" ? "Reference: 512 KB RAM, 720 KB 3.5-inch drive, 8086 4/8 MHz." : "Reference: 384 KB RAM, 360 KB 5.25-inch drive, 8086 4/8 MHz."} DOSBox uses an approximate 1 MB memory setting.</p>
          <label htmlFor="tandy-speed" className="form-label">APPROXIMATE DOS SPEED</label>
          <select id="tandy-speed" value={speed} disabled={on} onChange={e => setSpeed(e.target.value as TandySpeed)}>
            <option value="original">Normal (faster compatibility)</option>
            <option value="slow">Slow (older game compatibility)</option>
          </select>
          <p className="setting-hint">Cycle presets are approximate, not calibrated to a real 8086.</p>
          <div className="panel-divider" />
          <div className="form-label">YOUR FLOPPY / DOS SOFTWARE</div>
          <button type="button" className="file-button" disabled={on || reading} onClick={() => pickerRef.current?.click()}>▤ {reading ? "READING MEDIA..." : pack ? "CHANGE LOCAL MEDIA..." : "OPEN .IMG OR .ZIP..."}</button>
          <input hidden type="file" accept=".img,.zip" ref={pickerRef} onChange={e => {
            const next = e.currentTarget.files?.[0];
            e.currentTarget.value = "";
            if (next) void loadMedia(next);
          }} />
          <p className="setting-hint">Supports a single 720 KB FAT12 .img or a DOS program .zip. Reads files on your device into a temporary DOSBox C: drive. Not a raw ROM/floppy boot and not a multiple-disk installer.</p>
          {pack && (
            <div className="tandy-loaded">
              <strong>{pack.label}</strong><small>{filesLoaded} files extracted · {(pack.uncompressedBytes / 1024).toFixed(0)} KiB of data</small>
              {pack.programs.length ? (
                <><label htmlFor="tandy-run" className="form-label">OPTIONAL DOS PROGRAM TO RUN</label>
                <select id="tandy-run" disabled={on} value={executable} onChange={e => setExecutable(e.target.value)}>
                  <option value="">DOS prompt only</option>
                  {pack.programs.map(p => <option key={p} value={p}>{p}</option>)}
                </select></>
              ) : <p className="setting-hint">No executable found. Open DOS prompt and inspect the files with DIR. DeskMate may need multiple floppies and Tandy ROM services.</p>}
            </div>
          )}
          <div className="panel-divider" />
          <button type="button" className="primary-action" disabled={state === "loading" || reading} onClick={() => void (on ? stop() : start())}>{on ? "■ POWER OFF" : "⏻ POWER ON"}</button>
          <div className="status-log" role="status" aria-live="polite"><span className="log-prompt">&gt;</span>{message}</div>
        </aside>
      </div>
      <div className="tandy-archive">
        <div className="section-head"><span>03 / ORIGINAL SL/2 DISK ARCHIVE</span><span className="section-note">REFERENCE COLLECTION · NO COPYRIGHTED DISKS BUNDLED</span></div>
        <div className="tandy-archive-intro">
          <div><h3>THE ORIGINAL FOUR FLOPPIES.</h3>
            <p>A community-preserved collection at Internet Archive lists the MS-DOS 3.3 disk and the three DeskMate disks for the Tandy 1000 SL/2. These are **external reference links**, not included downloads or a license grant. The uploader's “Public Domain” tag does not itself prove rights to proprietary Microsoft/Tandy software.</p>
          </div>
          <a href={archiveUrl} target="_blank" rel="noopener noreferrer">VIEW ARCHIVE ↗</a>
        </div>
        <div className="tandy-floppies">{disks.map((name, i) => (
          <div className="tandy-floppy" key={name}><span className="tandy-floppy-art" aria-hidden="true"><i /></span><div><small>DISK {String(i+1).padStart(2,"0")} · 720 KB</small><strong>{name}</strong><span>{i===0?"Tandy MS-DOS 3.3 software":"DeskMate application media"}</span></div></div>
        ))}</div>
        <p className="tandy-archive-note">The real SL/2 also included MS-DOS and DeskMate features in internal ROM. To try raw floppy booting in our more generic x86 computer, use the IBM PC/DOS station with your own IMG, but it will not become a faithful Tandy SL/2.</p>
        <button type="button" className="tandy-dos-link" onClick={onGoToPc}>OPEN IBM PC / DOS DISK LAB ↗</button>
      </div>
    </section>
  );
}
