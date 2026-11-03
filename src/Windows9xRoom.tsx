import { useEffect, useRef, useState } from "react";
import type { V86 } from "v86";
import {
  buildWindows9xOptions, validateWindows9xMedia, WINDOWS9X_PROFILES,
  WINDOWS9X_V86_GUIDE, type Windows9xMediaRole, type Windows9xVersion,
} from "./windows9xConfig";
import { exportUpdatedWindows9xDisk } from "./windows9xDiskExport";
import { verifyWindowsDiskDownload } from "./windows9xVerify";

type Status = "off" | "booting" | "running" | "paused" | "error";

interface Props {
  onSessionChange: (active: boolean) => void;
}

export default function Windows9xRoom({ onSessionChange }: Props) {
  const [version, setVersion] = useState<Windows9xVersion>("win95");
  const [memoryMB, setMemoryMB] = useState<32 | 64 | 128>(64);
  const [hardDisk, setHardDisk] = useState<File | null>(null);
  const [floppy, setFloppy] = useState<File | null>(null);
  const [cdrom, setCdrom] = useState<File | null>(null);
  const [status, setStatus] = useState<Status>("off");
  const [message, setMessage] = useState("Choose your own bootable raw Windows 9x disk image, then power on.");
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [exportAvailable, setExportAvailable] = useState(false);
  const [verifiedImage, setVerifiedImage] = useState<File | null>(null);
  const [verifyProgress, setVerifyProgress] = useState<number | null>(null);

  const guest = useRef<V86 | null>(null);
  const screen = useRef<HTMLDivElement | null>(null);
  const diskPicker = useRef<HTMLInputElement | null>(null);
  const floppyPicker = useRef<HTMLInputElement | null>(null);
  const cdPicker = useRef<HTMLInputElement | null>(null);
  const verifyPicker = useRef<HTMLInputElement | null>(null);
  const lastExport = useRef<File | null>(null);
  const generation = useRef(0);
  const localUrls = useRef<string[]>([]);

  const on = status === "booting" || status === "running" || status === "paused";
  const canControl = status === "running" || status === "paused";
  const profile = WINDOWS9X_PROFILES[version];

  useEffect(() => {
    return () => {
      generation.current++;
      const old = guest.current;
      guest.current = null;
      if (old) void old.destroy().catch(() => undefined);
      for (const url of localUrls.current) URL.revokeObjectURL(url);
      localUrls.current = [];
      onSessionChange(false);
    };
  }, [onSessionChange]);

  function keepLocalUrl(file: File): string {
    const url = URL.createObjectURL(file);
    localUrls.current.push(url);
    return url;
  }

  async function shutdown(force = false) {
    if (!force && guest.current && !window.confirm(
      "Power off Windows? Export the UPDATED HARD DISK first if you want to keep changes made inside Windows. Continue powering off?"
    )) return;
    const id = ++generation.current;
    const old = guest.current;
    guest.current = null;
    setBusy(true);
    try {
      if (old) await old.destroy();
    } catch {
      // A partially started emulator may already have released its resources.
    } finally {
      if (id === generation.current) {
        for (const url of localUrls.current) URL.revokeObjectURL(url);
        localUrls.current = [];
        setStatus("off");
        setProgress(null);
        setBusy(false);
        setMessage("PC powered off. The original source image is unchanged. Only an updated image you explicitly downloaded can preserve guest disk writes.");
        onSessionChange(false);
      }
    }
  }

  async function chooseMedia(file: File, role: Windows9xMediaRole) {
    const error = validateWindows9xMedia(file, role);
    if (error) {
      setMessage(error);
      return;
    }
    if (role === "harddisk") {
      if (on) { setMessage("Power off before changing the Windows hard disk."); return; }
      lastExport.current = null;
      setExportAvailable(false);
      setVerifiedImage(null);
      setVerifyProgress(null);
      setHardDisk(file);
      setMessage("Selected " + file.name + ". v86 will read slices locally, tracking changed disk sectors for optional export.");
      return;
    }
    if (role === "floppy") {
      setFloppy(file);
      if (guest.current && canControl) {
        setBusy(true);
        try {
          await guest.current.set_fda({ buffer: await file.arrayBuffer() });
          setMessage("Inserted floppy A: " + file.name + ".");
        } catch (err) {
          setMessage(err instanceof Error ? err.message : "Unable to insert floppy.");
        } finally { setBusy(false); }
      } else setMessage("Selected floppy: " + file.name + ".");
      return;
    }
    setCdrom(file);
    if (guest.current && canControl) {
      setBusy(true);
      const url = keepLocalUrl(file);
      try {
        await guest.current.set_cdrom({ url, async: true, size: file.size });
        setMessage("Inserted CD-ROM: " + file.name + ".");
      } catch (err) {
        setMessage(err instanceof Error ? err.message : "Unable to insert ISO.");
      } finally { setBusy(false); }
    } else {
      setMessage("Selected CD-ROM: " + file.name + ".");
    }
  }

  async function powerOn() {
    if (on || busy) return;
    if (!hardDisk) {
      setMessage("Choose a bootable Windows 95 or 98 raw hard-disk image first. We cannot provide Microsoft installation media.");
      return;
    }
    const err = validateWindows9xMedia(hardDisk, "harddisk");
    if (err) { setMessage(err); return; }
    const id = ++generation.current;
    lastExport.current = null;
    setExportAvailable(false);
    setVerifiedImage(null);
    setVerifyProgress(null);
    setStatus("booting");
    setBusy(true);
    setProgress(null);
    setMessage("Loading the local v86 engine and Windows-compatible PC BIOS...");
    try {
      const mod = await import("v86");
      const floppyBuffer = floppy ? await floppy.arrayBuffer() : undefined;
      if (id !== generation.current || !screen.current) return;
      const cdUrl = cdrom ? keepLocalUrl(cdrom) : undefined;
      const vm = new mod.V86(buildWindows9xOptions({
        baseUrl: import.meta.env.BASE_URL,
        screenContainer: screen.current,
        version, memoryMB, hardDiskFile: hardDisk,
        floppyBuffer, cdromUrl: cdUrl, cdromSize: cdrom?.size,
      }));
      guest.current = vm;
      onSessionChange(true);
      vm.add_listener("emulator-ready", () => {
        if (id === generation.current) setMessage("Firmware ready. Windows 9x guest boot is in progress...");
      });
      vm.add_listener("emulator-started", () => {
        if (id !== generation.current) return;
        setStatus("running");
        setProgress(null);
        setMessage("Emulated PC started. Windows might take several minutes to boot. This event does not confirm the desktop loaded.");
      });
      vm.add_listener("emulator-stopped", () => {
        if (id !== generation.current) return;
        setStatus("paused");
        setMessage("Machine paused. Your changes live in this temporary session.");
      });
      vm.add_listener("download-progress", e => {
        if (id !== generation.current) return;
        if (e.lengthComputable && e.total > 0) setProgress(Math.round(e.loaded / e.total * 100));
        setMessage("Loading " + (e.file_name || "Windows machine asset") + "...");
      });
      vm.add_listener("download-error", e => {
        if (id !== generation.current) return;
        setStatus("error");
        setMessage("Disk or firmware read failed: " + (e.file_name || "unknown file") +
          ". Check the image integrity and try updated Chrome/Edge.");
      });
      setBusy(false);
    } catch (error) {
      if (id !== generation.current) return;
      setStatus("error");
      setProgress(null);
      setBusy(false);
      setMessage(error instanceof Error ? error.message : "Could not initialize Windows 9x emulator.");
      // Release partial machine resources and local object URLs without
      // overwriting the useful error displayed above.
      const old = guest.current;
      guest.current = null;
      if (old) void old.destroy().catch(() => undefined);
      for (const url of localUrls.current) URL.revokeObjectURL(url);
      localUrls.current = [];
      onSessionChange(false);
    }
  }

  async function pause() {
    if (!guest.current) return;
    try {
      if (status === "running") {
        await guest.current.stop();
        setStatus("paused");
        setMessage("Windows PC paused.");
      } else if (status === "paused") {
        await guest.current.run();
        setStatus("running");
        setMessage("Windows PC resumed.");
      }
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Pause/resume failed.");
    }
  }


  async function downloadUpdatedDisk() {
    if (!hardDisk || !guest.current || !canControl || busy) return;
    if (!window.confirm(
      "Have you saved your files and shut down Windows inside the guest? " +
      "RetroVerse will pause v86 and export an updated FULL disk image. " +
      "The original image stays unchanged. Continue?"
    )) return;
    setBusy(true);
    let downloadUrl: string | null = null;
    try {
      const vm = guest.current;
      if (vm.is_running()) await vm.stop();
      setStatus("paused");
      setMessage("Assembling a new virtual hard-disk image from original sectors and guest writes...");
      const result = exportUpdatedWindows9xDisk(vm, hardDisk, true);
      lastExport.current = result.file;
      setExportAvailable(true);
      setVerifiedImage(null);
      setVerifyProgress(null);
      downloadUrl = URL.createObjectURL(result.file);
      const anchor = document.createElement("a");
      anchor.href = downloadUrl;
      anchor.download = result.file.name;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      setMessage(
        "Updated disk download requested (" + result.modifiedBlocks.toLocaleString() +
        " modified 256-byte sectors). VERIFY the full-size downloaded image before powering off. " +
        "Now use VERIFY DOWNLOADED IMAGE to check the actual downloaded bytes against the exported disk before restarting."
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to export updated Windows hard disk.");
    } finally {
      setBusy(false);
      if (downloadUrl) {
        const url = downloadUrl;
        // Large disk downloads can be slow to initialize; avoid early release.
        window.setTimeout(() => URL.revokeObjectURL(url), 120000);
      }
    }
  }



  async function verifyDownloadedImage(file: File) {
    const expected = lastExport.current;
    if (!expected || busy || !exportAvailable) {
      setMessage("Export an updated Windows disk from this session before verifying it.");
      return;
    }
    setBusy(true);
    setVerifiedImage(null);
    setVerifyProgress(0);
    try {
      const result = await verifyWindowsDiskDownload(expected, file, (compared, total) => {
        setVerifyProgress(Math.floor(compared / total * 100));
      });
      setVerifiedImage(file);
      setVerifyProgress(100);
      setMessage(
        "VERIFIED: Downloaded image matches the exported file byte for byte (" +
        result.bytesChecked.toLocaleString() + " bytes, " + result.chunksChecked +
        " chunks). Power off the guest, choose USE VERIFIED DISK, then boot it to check your files inside Windows."
      );
    } catch (error) {
      setVerifiedImage(null);
      setMessage(error instanceof Error ? error.message : "Unable to verify downloaded disk.");
    } finally {
      setBusy(false);
    }
  }

  function useVerifiedImage() {
    if (on || busy || !verifiedImage) {
      setMessage("Power off the virtual PC before selecting a verified image.");
      return;
    }
    const selected = verifiedImage;
    setHardDisk(selected);
    lastExport.current = null;
    setVerifiedImage(null);
    setExportAvailable(false);
    setVerifyProgress(null);
    setMessage("Verified updated image selected as your new boot disk: " +
      selected.name + ". Power on to verify Windows starts and your saved files exist.");
  }

  function changeVersion(next: Windows9xVersion) {
    if (on) return;
    setVersion(next);
    setMemoryMB(WINDOWS9X_PROFILES[next].recommendedMemoryMB);
    setMessage("Selected " + WINDOWS9X_PROFILES[next].label + ". A matching legally owned, preinstalled raw disk image is required.");
  }

  return (
    <section className="win9x-room" aria-label="Windows 95 and Windows 98 v86 emulator">
      <div className="section-head">
        <span>02 / WINDOWS 9X COMPUTER LAB</span>
        <span className="section-note">RUNG 12 · REAL LOCAL V86 EMULATOR · NO WINDOWS INCLUDED</span>
      </div>
      <div className="win9x-layout">
        <div className="win9x-monitor">
          <div className="win9x-monitor-head">
            <span>Φ RETROVERSE · 1995–1998 PERSONAL COMPUTER</span>
            <span>{status.toUpperCase()}</span>
          </div>
          <div className="win9x-crt">
            <div className="screen-container win9x-v86-screen" ref={screen} tabIndex={0}
              aria-label="Windows 9x emulated PC screen. Click to control mouse and keyboard.">
              <div className="v86-text" />
              <canvas style={{ display: "none" }} />
            </div>
            {status !== "running" && status !== "paused" && (
              <div className="win9x-standby">
                <div className="win9x-demo-logo"><span>▦</span> WINDOWS <strong>{version === "win95" ? "95" : "98"}</strong></div>
                <p>{status === "booting" ? "LOADING VIRTUAL HARDWARE..." : status === "error" ? "BOOT ERROR · SEE STATUS" : "POWER OFF · SELECT YOUR OWN WINDOWS DISK"}</p>
                <small>DECORATIVE STANDBY SCREEN. NOT GUEST SOFTWARE.</small>
                {status === "booting" && <div className="boot-progress"><div style={{ width: progress === null ? "45%" : progress + "%" }} /></div>}
              </div>
            )}
            <div className="crt-scanlines" aria-hidden="true" />
          </div>
          <div className="win9x-monitor-footer">
            <span>V86 / LOCAL RAW HARD DISK / NO EXTERNAL GUEST NETWORK</span>
            <div>
              <button type="button" disabled={!canControl || busy} onClick={() => void pause()}>
                {status === "paused" ? "▶ RESUME" : "Ⅱ PAUSE"}
              </button>
              <button type="button" disabled={!canControl || busy} onClick={() => guest.current?.restart()}>↻ REBOOT</button>
              <button type="button" disabled={!canControl || busy} onClick={() => guest.current?.screen_go_fullscreen()}>⛶ FULLSCREEN</button>
            </div>
          </div>
          <div className="win9x-bottom-note">Click the CRT for keyboard and mouse. After saving inside Windows, export an updated hard-disk image to preserve guest files between sessions.</div>
        </div>
        <aside className="win9x-panel">
          <div className="panel-head"><span>WINDOWS MACHINE DECK</span><span className={"status-pill status-" + status}><i /> {status.toUpperCase()}</span></div>
          <label htmlFor="win9x-version" className="form-label">WINDOWS GENERATION</label>
          <select id="win9x-version" disabled={on || busy} value={version} onChange={e => changeVersion(e.target.value as Windows9xVersion)}>
            <option value="win95">Windows 95 (1995)</option>
            <option value="win98">Windows 98 (1998)</option>
          </select>
          <p className="setting-hint">{profile.note}</p>
          <label htmlFor="win9x-memory" className="form-label">VIRTUAL RAM</label>
          <select id="win9x-memory" value={memoryMB} disabled={on || busy} onChange={e => setMemoryMB(Number(e.target.value) as 32 | 64 | 128)}>
            <option value={32}>32 MiB</option><option value={64}>64 MiB</option><option value={128}>128 MiB</option>
          </select>
          <div className="panel-divider" />
          <label className="form-label" htmlFor="win9x-hd">OWN BOOTABLE WINDOWS HARD DISK (REQUIRED)</label>
          <button className="file-button" type="button" disabled={on || busy} id="win9x-hd" onClick={() => diskPicker.current?.click()}>
            ▤ {hardDisk ? hardDisk.name : "SELECT .IMG / .RAW DISK IMAGE..."}
          </button>
          <input ref={diskPicker} hidden type="file" accept=".img,.ima,.raw,.bin" onChange={e=>{
            const file=e.currentTarget.files?.[0];e.currentTarget.value="";if(file)void chooseMedia(file,"harddisk");
          }}/>
          <p className="setting-hint">Choose your own preinstalled 32 MiB to 2 GiB raw disk (not VHD/QCOW2). v86 reads local file slices and tracks modified sectors without overwriting the original.</p>
          <div className="win9x-media-grid">
            <div><span className="form-label">OPTIONAL BOOT FLOPPY</span>
              <button className="file-button" type="button" disabled={busy} onClick={() => floppyPicker.current?.click()}>
                {floppy ? floppy.name : "+ ADD FLOPPY"}
              </button>
              <input ref={floppyPicker} hidden type="file" accept=".img,.ima,.vfd,.bin" onChange={e=>{
                const file=e.currentTarget.files?.[0];e.currentTarget.value="";if(file)void chooseMedia(file,"floppy");
              }}/></div>
            <div><span className="form-label">OPTIONAL INSTALL CD</span>
              <button className="file-button" type="button" disabled={busy} onClick={() => cdPicker.current?.click()}>
                {cdrom ? cdrom.name : "+ ADD ISO"}
              </button>
              <input ref={cdPicker} hidden type="file" accept=".iso" onChange={e=>{
                const file=e.currentTarget.files?.[0];e.currentTarget.value="";if(file)void chooseMedia(file,"cdrom");
              }}/></div>
          </div>
          <p className="setting-hint">Additional floppy and ISO images can be inserted while the machine runs. Windows Setup may require manual CD drivers, partitioning and lengthy installation; preinstalled guest disks are recommended.</p>
          <div className="panel-divider" />
          <button className={"primary-action" + (on ? " danger" : "")} type="button" disabled={busy}
            onClick={() => void (on ? shutdown() : powerOn())}>{on ? "■ POWER OFF" : "⏻ POWER ON WINDOWS PC"}</button>
          <div className="win9x-disk-export">
            <label className="form-label">KEEP YOUR WINDOWS FILES</label>
            <button className="primary-action" type="button" disabled={!canControl || busy || !hardDisk}
              onClick={() => void downloadUpdatedDisk()}>↓ EXPORT UPDATED HARD DISK (.IMG)</button>
            <p className="setting-hint">Inside Windows: save your files and shut down the guest, then export here. The VM pauses during export. Downloading a full 32 MiB–2 GiB disk may take time. Verify the browser download completes before closing this station. To resume later, select the exported .img as your boot disk.</p>
            <p className="setting-hint">This uses a guarded, internal v86 file-backed-disk export API. If the installed engine cannot provide modified sectors, it reports an error instead of creating a misleading backup. Browser testing with real Windows media remains required.</p>

            <div className="win9x-verify-tools">
              <label className="form-label">VERIFY THE ACTUAL DOWNLOADED IMAGE</label>
              <button className="file-button" type="button" disabled={!exportAvailable || busy}
                onClick={() => verifyPicker.current?.click()}>✓ SELECT DOWNLOADED .IMG TO VERIFY</button>
              <input ref={verifyPicker} hidden type="file" accept=".img,.ima,.raw,.bin" onChange={e=>{
                const selected=e.currentTarget.files?.[0];
                e.currentTarget.value="";
                if(selected)void verifyDownloadedImage(selected);
              }}/>
              {verifyProgress !== null && <p className="setting-hint" role="status">Verified comparison progress: {verifyProgress}%</p>}
              {verifiedImage && <button className="file-button win9x-verified-action"
                disabled={on || busy} type="button" onClick={useVerifiedImage}>
                ✓ USE VERIFIED DISK ON NEXT BOOT {on ? "(POWER OFF FIRST)" : ""}
              </button>}
              <p className="setting-hint">Read the completed browser download back into RetroVerse for an exact byte-by-byte comparison. For a 2 GiB disk this reads both images in 4 MiB chunks and may take time. This does not prove the Windows guest flushed its data; boot and inspect the files after verification.</p>
            </div>

          </div>
          <div className="win9x-quick-actions">
            <button type="button" disabled={!canControl || busy}
              onClick={() => guest.current?.keyboard_send_scancodes([0x1d,0x38,0x53,0xd3,0xb8,0x9d])}>CTRL+ALT+DEL</button>
            <a href={WINDOWS9X_V86_GUIDE} target="_blank" rel="noopener noreferrer">V86 WINDOWS 9X GUIDE ↗</a>
          </div>
          <div className="status-log" role="status" aria-live="polite"><span className="log-prompt">&gt;</span> {message}</div>
        </aside>
      </div>
      <div className="win9x-notes">
        <div><strong>REAL EMULATION, NOT A SIMULATED WINDOWS UI.</strong><p>RetroVerse's existing v86 WebAssembly core runs the PC locally. The green CI build cannot prove your individual Windows image boots or that all drivers work. Chrome and Edge are recommended for very large local images.</p></div>
        <div><strong>BRING YOUR OWN LEGAL MEDIA.</strong><p>No Microsoft Windows binaries, serial keys, installation CDs or commercial software are provided or hosted. Use a Windows 95 OSR2 or Windows 98 SE image you are entitled to use.</p></div>
        <div><strong>EXPORT YOUR UPDATED DISK.</strong><p>The original .img file is never overwritten. Export a new disk, read the completed download back for exact byte comparison, then boot the verified image and check your files. The export uses an internal v86 API and still requires real Windows browser testing.</p></div>
      </div>
    </section>
  );
}
