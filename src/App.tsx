import { useEffect, useRef, useState } from "react";
import type { V86 } from "v86";
import { createOptions, profiles } from "./boot";
import GameCabinet from "./GameCabinet";
import AmigaRoom from "./AmigaRoom";
import AdventureRoom from "./AdventureRoom";
import TandyRoom from "./TandyRoom";
import MacintoshRoom from "./MacintoshRoom";
import type { MediaType, ProfileId } from "./boot";

type Status = "off" | "booting" | "running" | "paused" | "error";
type Station = "dos" | "cabinet" | "tandy" | "mac" | "amiga" | "adventures";

const MAX_LOCAL_MEDIA_BYTES = 256 * 1024 * 1024;

const stations: { id: Station; name: string; tag: string; description: string }[] = [
  { id: "dos", name: "IBM PC / DOS", tag: "PLAYABLE RUNG 01", description: "Boot authentic PC hardware in your browser." },
  { id: "cabinet", name: "DOS GAME CABINET", tag: "PLAYABLE RUNG 02", description: "Run your own DOS game bundles with js-dos." },
  { id: "tandy", name: "TANDY 1000 SL/2", tag: "TANDY-COMPATIBLE · RUNG 08", description: "Explore Tandy graphics and sound; load your 720 KB DOS floppies." },
  { id: "mac", name: "MACINTOSH 68K", tag: "OFFICIAL WEB EMBED · RUNG 09", description: "Boot a Macintosh Plus in a real independently hosted emulator." },
  { id: "amiga", name: "AMIGA WORKBENCH", tag: "RUNG 03 · ROM REQUIRED", description: "Real Amiga emulation using your Kickstart and ADF disks." },
  { id: "adventures", name: "SCUMM ADVENTURES", tag: "WEB PORTAL · RUNG 04", description: "Launch the real browser ScummVM demo and explore classic adventures." },
];

function downloadBuffer(buffer: ArrayBuffer, fileName: string) {
  const url = URL.createObjectURL(new Blob([buffer], { type: "application/octet-stream" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1500);
}

export default function App() {
  const [station, setStation] = useState<Station>("dos");
  const [profile, setProfile] = useState<ProfileId>("freedos");
  const [mediaType, setMediaType] = useState<MediaType>("floppy");
  const [bootFile, setBootFile] = useState<File | null>(null);
  const [memoryMB, setMemoryMB] = useState(32);
  const [speaker, setSpeaker] = useState(true);
  const [status, setStatus] = useState<Status>("off");
  const [statusMessage, setStatusMessage] = useState("Standby. Press power to boot a real computer.");
  const [progress, setProgress] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [mediaLabel, setMediaLabel] = useState("No removable media inserted");

  const machine = useRef<V86 | null>(null);
  const screen = useRef<HTMLDivElement | null>(null);
  const bootPicker = useRef<HTMLInputElement | null>(null);
  const floppyPicker = useRef<HTMLInputElement | null>(null);
  const cdPicker = useRef<HTMLInputElement | null>(null);
  const statePicker = useRef<HTMLInputElement | null>(null);
  const session = useRef(0);

  const on = status === "booting" || status === "running" || status === "paused";
  const canUse = status === "running" || status === "paused";
  const selectedProfile = profiles.find((entry) => entry.id === profile) ?? profiles[0];

  useEffect(() => {
    return () => {
      session.current += 1;
      const old = machine.current;
      machine.current = null;
      if (old) void old.destroy().catch(() => undefined);
    };
  }, []);

  async function shutdown() {
    session.current += 1;
    const old = machine.current;
    machine.current = null;
    setStatus("off");
    setProgress(null);
    setStatusMessage("Power off. Your computer is ready for another boot.");
    if (old) {
      try {
        await old.destroy();
      } catch {
        // A partially initialized machine may already have released its resources.
      }
    }
  }

  async function start() {
    if (machine.current && status === "error") await shutdown();
    if (!screen.current) return;
    if (selectedProfile.needsOwnMedia && !bootFile) {
      setStatus("error");
      setStatusMessage("Choose your own licensed boot image before powering on.");
      return;
    }
    if (bootFile && bootFile.size > MAX_LOCAL_MEDIA_BYTES) {
      setStatus("error");
      setStatusMessage("This first release limits local images to 256 MiB. Choose a smaller image.");
      return;
    }

    const id = ++session.current;
    setStatus("booting");
    setProgress(null);
    setStatusMessage("Loading emulated x86 hardware and BIOS...");
    try {
      const module = await import("v86");
      const imageBuffer = selectedProfile.needsOwnMedia ? await bootFile?.arrayBuffer() : undefined;
      if (id !== session.current || !screen.current) return;

      // The screen adapter writes directly to this stable DOM node.
      const instance = new module.V86(
        createOptions({
          baseUrl: import.meta.env.BASE_URL,
          screenContainer: screen.current,
          profile,
          memoryMB,
          speaker,
          mediaType,
          mediaBuffer: imageBuffer,
        })
      );
      machine.current = instance;

      instance.add_listener("emulator-ready", () => {
        if (id === session.current) setStatusMessage("Firmware loaded. Starting the guest...");
      });
      instance.add_listener("emulator-started", () => {
        if (id !== session.current) return;
        setStatus("running");
        setProgress(null);
        setStatusMessage("PC running. Click inside the CRT to type.");
      });
      instance.add_listener("emulator-stopped", () => {
        if (id !== session.current) return;
        setStatus("paused");
        setStatusMessage("Emulation paused. Your machine state is still in memory.");
      });
      instance.add_listener("download-progress", (event) => {
        if (id !== session.current) return;
        setStatusMessage("Loading " + (event.file_name || "machine assets") + "...");
        if (event.lengthComputable && event.total > 0) {
          setProgress(Math.max(0, Math.min(100, Math.round(event.loaded / event.total * 100))));
        }
      });
      instance.add_listener("download-error", (event) => {
        if (id !== session.current) return;
        setStatus("error");
        setProgress(null);
        setStatusMessage("Could not download " + (event.file_name || "boot image") + ". Check network access or use your own boot disk.");
      });
    } catch (error) {
      if (id !== session.current) return;
      setStatus("error");
      setProgress(null);
      setStatusMessage(error instanceof Error ? error.message : "Unable to start the emulator.");
    }
  }

  async function toggleRun() {
    const vm = machine.current;
    if (!vm) return;
    try {
      if (status === "running") await vm.stop();
      else await vm.run();
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Failed to change run state.");
    }
  }

  async function insertMedia(file: File, kind: "floppy" | "cdrom") {
    const vm = machine.current;
    if (!vm) return;
    if (file.size > MAX_LOCAL_MEDIA_BYTES) {
      setStatusMessage("Media too large: 256 MiB per local image in this release.");
      return;
    }
    setBusy(true);
    try {
      const buffer = await file.arrayBuffer();
      if (kind === "floppy") await vm.set_fda({ buffer });
      else await vm.set_cdrom({ buffer });
      setMediaLabel(file.name + " inserted into " + (kind === "floppy" ? "A:" : "CD-ROM"));
      setStatusMessage("Inserted " + file.name + ". The guest OS can now access it.");
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Could not insert image.");
    } finally {
      setBusy(false);
    }
  }

  async function saveState() {
    if (!machine.current) return;
    setBusy(true);
    try {
      const state = await machine.current.save_state();
      downloadBuffer(state, "retroverse-v86-state.bin");
      setStatusMessage("Snapshot downloaded. Keep the original boot disk for restoration.");
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Could not save emulator state.");
    } finally {
      setBusy(false);
    }
  }

  async function restoreState(file: File) {
    if (!machine.current) return;
    setBusy(true);
    try {
      await machine.current.restore_state(await file.arrayBuffer());
      setStatusMessage("Snapshot restored. State files require the same boot media and v86 version.");
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Snapshot is incompatible with this machine.");
    } finally {
      setBusy(false);
    }
  }

  function chooseStation(next: Station) {
    if (on) {
      setStatusMessage("Turn off the DOS PC before entering another museum room.");
      return;
    }
    setStation(next);
  }

  return (
    <div className="app">
      <header className="topbar">
        <a className="brand" href={import.meta.env.BASE_URL} aria-label="RetroVerse home">
          <span className="brand-symbol">Φ</span>
          <span><b>RETRO<span className="brand-accent">VERSE</span></b><small>A Φ369 LABS EXPERIENCE</small></span>
        </a>
        <div className="topbar-right"><span className="topbar-led" /> THE PAST IS STILL RUNNING <span className="release">v0.1.0</span></div>
      </header>

      <main>
        <section className="hero">
          <div className="eyebrow"><span className="small-square" /> THE LIVING COMPUTER MUSEUM <span className="hero-rule" /> EST. 2026</div>
          <h1>YOUR TICKET<br />TO <em>YESTERDAY.</em></h1>
          <p>Real machines. Real boot sequences. Real memories. Step inside decades of computing history, powered entirely by your browser.</p>
          <div className="hero-stats"><span><b>06</b> MUSEUM STATIONS</span><span><b>05</b> EMULATOR EXPERIENCES</span><span><b>100%</b> BROWSER-BASED</span></div>
        </section>

        <section className="museum" aria-label="Computer stations">
          <div className="section-head"><span>01 / CHOOSE A MACHINE</span><span className="section-note">MORE COMPUTERS COMING SOON</span></div>
          <div className="stations">
            {stations.map((item, index) => (
              <button
                className={"station" + (station === item.id ? " selected" : "")}
                type="button"
                key={item.id}
                onClick={() => chooseStation(item.id)}
                aria-pressed={station === item.id}
              >
                <span className="station-number">0{index + 1} / 0{stations.length}</span>
                <span className={"station-icon " + item.id} aria-hidden="true">{item.id === "dos" ? "▣" : item.id === "cabinet" ? "◈" : item.id === "tandy" ? "▥" : item.id === "mac" ? "◉" : item.id === "amiga" ? "⌘" : "▤"}</span>
                <strong>{item.name}</strong>
                <span className="station-description">{item.description}</span>
                <span className={"station-tag" + ((item.id === "dos" || item.id === "cabinet" || item.id === "tandy" || item.id === "mac" || item.id === "amiga" || item.id === "adventures") ? " ready" : "")}>{item.tag}</span>
              </button>
            ))}
          </div>
        </section>

        {station === "dos" ? (
          <section className="lab" aria-label="IBM PC emulator">
            <div className="section-head"><span>02 / THE MACHINE ROOM</span><span className="section-note">IBM PC COMPATIBLE / REAL X86 EMULATION</span></div>
            <div className="lab-layout">
              <div className="desktop">
                <div className="monitor">
                  <div className="monitor-housing">
                    <div className="monitor-label"><span>RETROVERSE™ 386</span><span className="display-badge">VGA DISPLAY</span></div>
                    <div className="crt-bezel">
                      <div className={"crt-screen " + (status === "running" ? "alive" : "")}>
                        <div className="screen-container" ref={screen} tabIndex={0} aria-label="Emulated DOS computer screen. Click to focus keyboard.">
                          <div className="v86-text" />
                          <canvas style={{ display: "none" }} />
                        </div>
                        {status !== "running" && status !== "paused" && (
                          <div className="screen-cover">
                            <span className="screen-logo">Φ</span>
                            <strong>{status === "booting" ? "INITIALIZING..." : status === "error" ? "BOOT ERROR" : "NO SIGNAL"}</strong>
                            <small>{status === "off" ? "PRESS POWER TO START" : status === "booting" ? "BIOS / MEMORY / BOOT DEVICE" : status === "error" ? "CHECK STATUS BELOW" : ""}</small>
                            {status === "booting" && <div className="boot-progress"><div style={{ width: progress === null ? "45%" : progress + "%" }} /></div>}
                          </div>
                        )}
                        <div className="crt-scanlines" aria-hidden="true" />
                      </div>
                    </div>
                    <div className="monitor-footer"><span className="monitor-maker">Φ RETRO COMPUTER SYSTEMS</span><span className={"power-led" + (on ? " lit" : "")} /><button type="button" className={"physical-power" + (on ? " active" : "")} onClick={() => void (on ? shutdown() : start())} aria-label={on ? "Power off machine" : "Power on machine"} disabled={busy}>⏻</button></div>
                  </div>
                  <div className="monitor-neck" /><div className="monitor-base" />
                </div>
                <div className="desk-objects" aria-hidden="true"><div className="keyboard-shape">{Array.from({ length: 35 }, (_, i) => <i key={i} />)}</div><div className="mouse-shape" /></div>
                <div className="computer-hint">CLICK INSIDE THE SCREEN TO USE YOUR KEYBOARD. CLICK OUTSIDE TO USE THE SITE.</div>
              </div>

              <aside className="control-panel">
                <div className="panel-head"><span>CONTROL DECK</span><span className={"status-pill status-" + status}><i /> {status.toUpperCase()}</span></div>
                <label className="form-label" htmlFor="profile">OPERATING SYSTEM</label>
                <select id="profile" value={profile} disabled={on} onChange={(e) => { setProfile(e.target.value as ProfileId); setBootFile(null); }}>
                  {profiles.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
                </select>
                <p className="setting-hint">{selectedProfile.detail}</p>
                {selectedProfile.needsOwnMedia && (
                  <div className="file-group">
                    <label className="form-label" htmlFor="media-kind">BOOT DEVICE</label>
                    <select id="media-kind" disabled={on} value={mediaType} onChange={(e) => setMediaType(e.target.value as MediaType)}>
                      <option value="floppy">Floppy drive A:</option>
                      <option value="harddisk">Primary hard disk C:</option>
                      <option value="cdrom">CD-ROM boot</option>
                    </select>
                    <button className="file-button" disabled={on} onClick={() => bootPicker.current?.click()} type="button">▤ {bootFile ? bootFile.name : "CHOOSE BOOT DISK IMAGE..."}</button>
                    <input ref={bootPicker} hidden type="file" accept=".img,.ima,.vfd,.iso,.bin,.vhd,.raw" onChange={(e) => setBootFile(e.target.files?.[0] ?? null)} />
                    <p className="setting-hint">Your own authorized disk image. Loaded locally, never uploaded. Maximum 256 MiB.</p>
                  </div>
                )}
                <div className="settings-row">
                  <div><label className="form-label" htmlFor="memory">SYSTEM RAM</label><select id="memory" disabled={on} value={memoryMB} onChange={(e) => setMemoryMB(Number(e.target.value))}><option value={16}>16 MB</option><option value={32}>32 MB</option><option value={64}>64 MB</option><option value={128}>128 MB</option></select></div>
                  <div><label className="form-label" htmlFor="audio">PC SPEAKER</label><select id="audio" disabled={on} value={speaker ? "on" : "off"} onChange={(e) => setSpeaker(e.target.value === "on")}><option value="on">Enabled</option><option value="off">Muted</option></select></div>
                </div>
                <div className="control-actions">
                  <button className={"primary-action" + (on ? " danger" : "")} type="button" onClick={() => void (on ? shutdown() : start())} disabled={busy}>{on ? "■ POWER OFF" : "⏻ POWER ON"}</button>
                  <div className="action-grid">
                    <button type="button" disabled={!canUse || busy} onClick={() => void toggleRun()}>{status === "paused" ? "▶ RESUME" : "Ⅱ PAUSE"}</button>
                    <button type="button" disabled={!canUse || busy} onClick={() => machine.current?.restart()}>↻ REBOOT</button>
                    <button type="button" disabled={!canUse || busy} onClick={() => machine.current?.keyboard_send_scancodes([0x1d, 0x38, 0x53, 0xd3, 0xb8, 0x9d])}>CTRL+ALT+DEL</button>
                    <button type="button" disabled={!canUse || busy} onClick={() => machine.current?.screen_go_fullscreen()}>⛶ FULLSCREEN</button>
                  </div>
                </div>
                <div className="panel-divider" />
                <div className="form-label">VIRTUAL DRIVES</div>
                <div className="media-summary"><span>◉</span><span>{mediaLabel}</span></div>
                <div className="action-grid">
                  <button type="button" disabled={!canUse || busy} onClick={() => floppyPicker.current?.click()}>+ INSERT FLOPPY</button>
                  <button type="button" disabled={!canUse || busy} onClick={() => cdPicker.current?.click()}>+ INSERT CD</button>
                  <button type="button" disabled={!canUse || busy} onClick={() => { machine.current?.eject_fda(); setMediaLabel("Floppy drive A: empty"); }}>EJECT FLOPPY</button>
                  <button type="button" disabled={!canUse || busy} onClick={() => { machine.current?.eject_cdrom(); setMediaLabel("CD-ROM drive empty"); }}>EJECT CD</button>
                </div>
                <input ref={floppyPicker} hidden type="file" accept=".img,.ima,.vfd,.bin" onChange={(e) => { const file = e.target.files?.[0]; if (file) void insertMedia(file, "floppy"); e.target.value = ""; }} />
                <input ref={cdPicker} hidden type="file" accept=".iso,.img,.bin" onChange={(e) => { const file = e.target.files?.[0]; if (file) void insertMedia(file, "cdrom"); e.target.value = ""; }} />
                <div className="panel-divider" />
                <div className="form-label">SAVE & RESTORE</div>
                <div className="action-grid">
                  <button type="button" disabled={!canUse || busy} onClick={() => void saveState()}>↓ SAVE STATE</button>
                  <button type="button" disabled={!canUse || busy} onClick={() => statePicker.current?.click()}>↑ LOAD STATE</button>
                </div>
                <input ref={statePicker} hidden type="file" accept=".bin,.state" onChange={(e) => { const file = e.target.files?.[0]; if (file) void restoreState(file); e.target.value = ""; }} />
                <p className="setting-hint">Snapshots need the same v86 build and original boot disk. Exported disk changes are not included in a state-only file.</p>
                <div className="status-log" role="status" aria-live="polite"><span className="log-prompt">&gt;</span> {statusMessage}</div>
              </aside>
            </div>
          </section>
        ) : station === "cabinet" ? (
          <GameCabinet />
        ) : station === "tandy" ? (
          <TandyRoom onGoToPc={() => chooseStation("dos")} />
        ) : station === "mac" ? (
          <MacintoshRoom />
        ) : station === "amiga" ? (
          <AmigaRoom />
        ) : (
          <AdventureRoom />
        )}

        <section className="disclaimer">
          <span className="disclaimer-mark">✳</span>
          <div><strong>REAL EMULATION. RESPECTFUL PRESERVATION.</strong><p>RetroVerse does not include Microsoft DOS, Tandy DeskMate ROMs, Apple Macintosh firmware/system images, Amiga Kickstart or commercial games. Open-source firmware and a FreeDOS sample power the first station. Tandy compatibility uses DOSBox rather than original SL/2 firmware. Import only media you are authorized to use; local images stay on your device. No guest networking is enabled by default.</p></div>
        </section>
      </main>
      <footer><span>Φ369 LABS / ENTER THE FIELD</span><span><a href="https://github.com/MichaelWave369/RetroVerse" target="_blank" rel="noreferrer">SOURCE ON GITHUB ↗</a> &nbsp; · &nbsp; OPEN SOURCE · LOCAL FIRST</span></footer>
    </div>
  );
}
