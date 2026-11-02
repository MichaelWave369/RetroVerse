import { useEffect, useRef, useState } from "react";

const loaderJs = "https://v8.js-dos.com/latest/js-dos.js";
const loaderCss = "https://v8.js-dos.com/latest/js-dos.css";
// This URL is the example bundle in the official js-dos integration documentation.
// Hosted by js-dos. RetroVerse does not mirror or redistribute this game.
const demoUrl = "https://v8.js-dos.com/bundles/digger.jsdos";
const MAX_BUNDLE_SIZE = 256 * 1024 * 1024;

interface Player {
  stop(): Promise<void>;
  setNoCloud(noCloud: boolean): void;
  setPaused(paused: boolean): void;
  setFullScreen(fullscreen: boolean): void;
  save(): Promise<boolean>;
}
declare global {
  interface Window {
    Dos?: (element: HTMLDivElement, options: Record<string, unknown>) => Player;
  }
}
let loaderPromise: Promise<void> | null = null;

function loadJsDos(): Promise<void> {
  if (window.Dos) return Promise.resolve();
  if (loaderPromise) return loaderPromise;
  loaderPromise = new Promise<void>((resolve, reject) => {
    if (!document.querySelector('link[data-retroverse-jsdos]')) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = loaderCss;
      link.dataset.retroverseJsdos = "true";
      document.head.appendChild(link);
    }
    const script = document.createElement("script");
    script.src = loaderJs;
    script.async = true;
    script.dataset.retroverseJsdos = "true";
    script.onload = () => window.Dos ? resolve() : reject(new Error("js-dos loaded without its player API"));
    script.onerror = () => reject(new Error("js-dos could not load from its official CDN. Check connectivity."));
    document.head.appendChild(script);
  }).catch((error) => {
    loaderPromise = null;
    document.querySelector('script[data-retroverse-jsdos]')?.remove();
    throw error;
  });
  return loaderPromise;
}

type CabinetStatus = "idle" | "loading" | "ready" | "playing" | "error";

export default function GameCabinet() {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<CabinetStatus>("idle");
  const [message, setMessage] = useState("Select an upstream demo or load your own .jsdos bundle.");
  const [paused, setPaused] = useState(false);
  const [source, setSource] = useState("");
  const playerRef = useRef<Player | null>(null);
  const divRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const blobRef = useRef<string | null>(null);
  const generation = useRef(0);

  async function dispose() {
    const old = playerRef.current;
    playerRef.current = null;
    if (old) {
      try { await old.stop(); } catch { /* Already stopped. */ }
    }
    if (blobRef.current) {
      URL.revokeObjectURL(blobRef.current);
      blobRef.current = null;
    }
    divRef.current?.replaceChildren();
  }

  useEffect(() => () => {
    generation.current++;
    const old = playerRef.current;
    playerRef.current = null;
    if (old) void old.stop().catch(() => undefined);
    if (blobRef.current) URL.revokeObjectURL(blobRef.current);
  }, []);

  async function start(kind: "demo" | "file") {
    if (kind === "file" && !file) {
      setStatus("error");
      setMessage("Choose a .jsdos game bundle to launch.");
      return;
    }
    if (kind === "file" && file && file.size > MAX_BUNDLE_SIZE) {
      setStatus("error");
      setMessage("Bundle exceeds the 256 MiB limit for this first game cabinet.");
      return;
    }
    const id = ++generation.current;
    setStatus("loading");
    setMessage("Preparing DOSBox and game media...");
    setPaused(false);
    await dispose();
    if (id !== generation.current) return;
    try {
      await loadJsDos();
      if (id !== generation.current || !divRef.current || !window.Dos) return;
      const bundleUrl = kind === "demo" ? demoUrl : URL.createObjectURL(file!);
      if (kind === "file") blobRef.current = bundleUrl;
      const label = kind === "demo" ? "Digger (upstream demonstration)" : file!.name;
      setSource(label);
      // External emulator assets are from the js-dos CDN, not from our repo.
      const player = window.Dos(divRef.current, {
        url: bundleUrl,
        theme: "dark",
        renderAspect: "4/3",
        renderBackend: "canvas",
        imageRendering: "pixelated",
        autoStart: true,
        noCursor: false,
        autoSave: true,
        fsChanges: { local: true },
        startIpxServer: false,
        onEvent: (event: string) => {
          if (id !== generation.current) return;
          if (event === "emu-ready") {
            setStatus("ready");
            setMessage("Emulator loaded. Launch the game using the player controls.");
          } else if (event === "ci-ready") {
            setStatus("playing");
            setMessage(label + " is running. Click inside the player to use your keyboard.");
          }
        },
      });
      player.setNoCloud(true);
      playerRef.current = player;
      setStatus("ready");
      setMessage("Game player initialized. Waiting for the DOSBox guest to start...");
    } catch (error) {
      if (id !== generation.current) return;
      await dispose();
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Could not start the game player.");
    }
  }

  async function stop() {
    ++generation.current;
    await dispose();
    setStatus("idle");
    setPaused(false);
    setSource("");
    setMessage("Cabinet stopped. Choose another bundle or open the demo.");
  }

  function togglePause() {
    if (!playerRef.current) return;
    playerRef.current.setPaused(!paused);
    setPaused(!paused);
    setMessage(!paused ? "Game paused." : "Game resumed.");
  }

  async function save() {
    if (!playerRef.current) return;
    try {
      const saved = await playerRef.current.save();
      setMessage(saved ? "Saved game file-system changes locally." : "No file-system changes were saved.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Save failed.");
    }
  }

  const active = status === "ready" || status === "playing";
  return (
    <section className="cabinet-room" aria-label="DOS game cabinet">
      <div className="section-head"><span>02 / THE DOS GAME CABINET</span><span className="section-note">REAL DOSBOX EMULATION / JS-DOS</span></div>
      <div className="cabinet-layout">
        <div className="arcade-display">
          <div className="arcade-top"><span>Φ RETROVERSE ARCADE</span><span>{source || "NO CARTRIDGE"}</span></div>
          <div className="arcade-screen">
            <div className="game-player" ref={divRef} />
            {(status === "idle" || status === "error" || status === "loading") && (
              <div className="arcade-idle">
                <span className="arcade-idle-symbol" aria-hidden="true">◈</span>
                <h3>{status === "loading" ? "LOADING DOSBOX..." : status === "error" ? "LOAD ERROR" : "INSERT GAME"}</h3>
                <p>{status === "loading" ? "The js-dos runtime and game bundle are being prepared." : "Choose the upstream sample or a legally usable .jsdos bundle to play a real DOS game."}</p>
                <small>{status === "idle" ? "AWAITING GAME MEDIA" : status.toUpperCase()}</small>
              </div>
            )}
          </div>
          <div className="arcade-footer">
            <span>{active ? (paused ? "PAUSED" : "PLAYER ACTIVE") : "DOS GAME MODULE"}</span>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              <button className="arcade-button" disabled={!active} onClick={togglePause} type="button">{paused ? "▶ RESUME" : "Ⅱ PAUSE"}</button>
              <button className="arcade-button" disabled={!active} onClick={() => playerRef.current?.setFullScreen(true)} type="button">⛶ FULLSCREEN</button>
              <button className="arcade-button" disabled={!active} onClick={() => void save()} type="button">↓ SAVE</button>
              <button className="arcade-button" disabled={!active && status !== "loading"} onClick={() => void stop()} type="button">■ STOP</button>
            </div>
          </div>
        </div>
        <aside className="arcade-panel">
          <div className="panel-head"><span>GAME SELECTION</span><span className={"status-pill" + (active ? " status-running" : "")}><i /> {status.toUpperCase()}</span></div>
          <h3>THE GAME CABINET.</h3>
          <p>Bring your own DOS game bundle, or try the demonstration linked directly from the official js-dos project.</p>
          <div className="form-label">01 / UPSTREAM SAMPLE</div>
          <button type="button" className="primary-action" disabled={status === "loading"} onClick={() => void start("demo")}>▶ PLAY DIGGER DEMO</button>
          <p className="setting-hint">Downloads and launches the example game from js-dos's upstream server. It is not bundled or redistributed by RetroVerse.</p>
          <div className="panel-divider" />
          <div className="form-label">02 / YOUR GAME COLLECTION</div>
          <button type="button" className="file-button" onClick={() => inputRef.current?.click()}>▤ SELECT LOCAL .JSDOS BUNDLE</button>
          <input ref={inputRef} hidden type="file" accept=".jsdos" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          {file && <div className="arcade-file-label">READY TO LOAD<strong>{file.name} ({(file.size / (1024 * 1024)).toFixed(1)} MiB)</strong></div>}
          <button type="button" className="primary-action" disabled={!file || status === "loading"} onClick={() => void start("file")}>▶ BOOT MY GAME</button>
          <p className="setting-hint">Accepts .jsdos archives (up to 256 MiB). Your own bundle is read via a local browser Blob URL; this app does not upload it to a RetroVerse server.</p>
          <div className="arcade-info">
            <h4>BUILDING A GAME BUNDLE</h4>
            <p>A .jsdos file is a ZIP-compatible package with DOS game files and the required <code>.jsdos/dosbox.conf</code>. Make yours using the official <a href="https://js-dos.com/v7/build/docs/jsdos-bundle/" target="_blank" rel="noreferrer">bundle guide</a>.</p>
            <p>Only use game files you are authorized to run. The third-party js-dos player and emulator assets load from js-dos servers and carry their own GPL license.</p>
          </div>
          <div className="arcade-status" role="status" aria-live="polite">&gt; {message}</div>
        </aside>
      </div>
    </section>
  );
}
