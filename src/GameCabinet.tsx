import { useEffect, useRef, useState } from "react";
import CommunityCatalog from "./CommunityCatalog";
import GameVault from "./GameVault";
import { loadJsDos, type JsDosPlayer } from "./jsdosRuntime";
import { bundleSaveKey, readChanges, writeChanges, deleteChanges } from "./saveChanges";
import { exportProgressArchive, importProgressArchive } from "./saveArchive";

// The arcade and Tandy station share one on-demand js-dos runtime.
const demoUrl = "https://v8.js-dos.com/bundles/digger.jsdos";
const MAX_BUNDLE_SIZE = 256 * 1024 * 1024;

type CabinetStatus = "idle" | "loading" | "ready" | "playing" | "error";

export default function GameCabinet() {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<CabinetStatus>("idle");
  const [message, setMessage] = useState("Select an upstream demo or load your own .jsdos bundle.");
  const [paused, setPaused] = useState(false);
  const [source, setSource] = useState("");
  const playerRef = useRef<JsDosPlayer | null>(null);
  const divRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const blobRef = useRef<string | null>(null);
  const generation = useRef(0);
  const progressInput = useRef<HTMLInputElement | null>(null);
  const [progressBusy, setProgressBusy] = useState(false);
  const [saveIdentity, setSaveIdentity] = useState<{ key: string; title: string } | null>(null);

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

  async function start(kind: "demo" | "file", chosenFile: File | null = file) {
    if (kind === "file" && !chosenFile) {
      setStatus("error");
      setMessage("Choose a .jsdos game bundle to launch.");
      return;
    }
    if (kind === "file" && chosenFile && chosenFile.size > MAX_BUNDLE_SIZE) {
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
      const [, key] = await Promise.all([
        loadJsDos(),
        kind === "file" && chosenFile ? bundleSaveKey(chosenFile) : Promise.resolve(null),
      ]);
      if (id !== generation.current || !divRef.current || !window.Dos) return;
      const bundleUrl = kind === "demo" ? demoUrl : URL.createObjectURL(chosenFile!);
      if (kind === "file") blobRef.current = bundleUrl;
      const label = kind === "demo" ? "Digger (upstream demonstration)" : chosenFile!.name;
      setSource(label);
      setSaveIdentity(key ? { key, title: label } : null);
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
        // The Digger demo deliberately keeps its existing upstream save key.
        // Owned .jsdos bundles use SHA-256 identity, so Blob URL changes and
        // portable vault restores do not lose their associated progress.
        fsChanges: key ? {
          local: true,
          urlToKey: async () => key,
          pull: (storageKey: string) => readChanges(storageKey),
          push: (storageKey: string, bytes: Uint8Array) => writeChanges(storageKey, bytes),
          delete: (storageKey: string) => deleteChanges(storageKey),
        } : { local: true },
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


  async function exportProgress() {
    if (!saveIdentity || progressBusy) return;
    setProgressBusy(true);
    let url: string | null = null;
    try {
      // Trigger js-dos to persist changes after the game has saved its own files.
      if (playerRef.current) await playerRef.current.save();
      const bytes = await readChanges(saveIdentity.key);
      if (!bytes) {
        setMessage("No saved game files found yet. Save inside the DOS game, then press SAVE and EXPORT PROGRESS.");
        return;
      }
      const archive = await exportProgressArchive(saveIdentity.key, saveIdentity.title, bytes);
      url = URL.createObjectURL(archive);
      const link = document.createElement("a");
      link.href = url;
      link.download = "retroverse-progress-" + saveIdentity.key.slice(-12) + ".zip";
      document.body.appendChild(link);
      link.click();
      link.remove();
      setMessage("Portable progress backup requested. Keep the ZIP and your original .jsdos game bundle together.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not export game progress.");
    } finally {
      if (url) {
        const objectUrl = url;
        window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60000);
      }
      setProgressBusy(false);
    }
  }

  async function restoreProgress(archive: File) {
    if (progressBusy || status === "loading") return;
    setProgressBusy(true);
    try {
      // When idle, match the current chosen file so progress cannot
      // accidentally bind to the previous game from this session.
      const identity = status === "playing" || status === "ready"
        ? saveIdentity
        : file
          ? { key: await bundleSaveKey(file), title: file.name }
          : saveIdentity;
      if (!identity) throw new Error("Select or launch an owned .jsdos game first. Demo progress uses separate storage.");
      const bytes = await importProgressArchive(archive, identity.key);
      if (!window.confirm("Restore saved progress for " + identity.title + "? This replaces that game's stored progress. The game will need restarting.")) {
        setMessage("Progress restore canceled. Your previous save is unchanged.");
        return;
      }
      // Existing player might overwrite imported changes during stop.
      // Stop FIRST, write verified bytes SECOND, then explicitly relaunch.
      if (playerRef.current) await stop();
      await writeChanges(identity.key, bytes);
      setSaveIdentity(identity);
      setMessage("Progress restored for " + identity.title + ". Start that same game again to load the imported files.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not restore progress.");
    } finally { setProgressBusy(false); }
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

                <div className="panel-divider" />
                <div className="form-label">03 / PORTABLE GAME PROGRESS</div>
                <p className="setting-hint">For your own .jsdos bundles. First save your game inside its DOS menus, then click SAVE above and EXPORT here. The ZIP contains game file-system changes, not a live emulator snapshot.</p>
                <div className="action-grid">
                  <button type="button" disabled={!saveIdentity || progressBusy || status === "loading"} onClick={() => void exportProgress()}>↓ EXPORT PROGRESS</button>
                  <button type="button" disabled={progressBusy || status === "loading" || (!saveIdentity && !file)} onClick={() => progressInput.current?.click()}>↑ RESTORE PROGRESS</button>
                </div>
                <input hidden type="file" accept=".zip,application/zip" ref={progressInput} onChange={e=>{
                  const backup=e.currentTarget.files?.[0];
                  e.currentTarget.value="";
                  if (backup) void restoreProgress(backup);
                }} />
                <p className="setting-hint">Restores only to the exact matching game bundle (SHA-256). A valid restore replaces that game's old progress and requires restarting it. Digger retains its upstream save behavior for compatibility.</p>
          <div className="arcade-info">
            <h4>BUILDING A GAME BUNDLE</h4>
            <p>A .jsdos file is a ZIP-compatible package with DOS game files and the required <code>.jsdos/dosbox.conf</code>. Make yours using the official <a href="https://js-dos.com/v7/build/docs/jsdos-bundle/" target="_blank" rel="noreferrer">bundle guide</a>.</p>
            <p>Only use game files you are authorized to run. The third-party js-dos player and emulator assets load from js-dos servers and carry their own GPL license.</p>
          </div>
          <div className="arcade-status" role="status" aria-live="polite">&gt; {message}</div>
        </aside>
      </div>
      <GameVault selectedFile={file} onPlay={(saved) => { setFile(saved); void start("file", saved); }} />
      <CommunityCatalog />
    </section>
  );
}
