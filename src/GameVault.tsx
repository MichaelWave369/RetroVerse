import { useEffect, useMemo, useRef, useState } from "react";
import { listGames, storeGame, loadGame, removeGame, MAX_GAME_BYTES, MAX_TOTAL_BYTES, type VaultGame } from "./vault";
import { exportVaultBackup, importVaultBackup } from "./vaultBackup";

interface Props { selectedFile: File | null; onPlay(file: File): void; }
const mib = (n: number) => (n / 1048576).toFixed(1) + " MiB";

export default function GameVault({ selectedFile, onPlay }: Props) {
  const [items, setItems] = useState<VaultGame[]>([]);
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState(false);
  const [available, setAvailable] = useState(true);
  const restoreInput = useRef<HTMLInputElement | null>(null);
  const [message, setMessage] = useState("Your game files stay in this browser, not on a RetroVerse server.");

  useEffect(() => {
    let cancelled = false;
    void listGames().then((games) => { if (!cancelled) setItems(games); })
      .catch((error: unknown) => {
        if (cancelled) return;
        setAvailable(false);
        setMessage(error instanceof Error ? error.message : "Browser game shelf unavailable.");
      });
    return () => { cancelled = true; };
  }, []);

  const visible = useMemo(() =>
    items.filter((item) => item.name.toLowerCase().includes(search.trim().toLowerCase())),
    [items, search]
  );
  const used = items.reduce((total, item) => total + item.size, 0);
  const refresh = async () => setItems(await listGames());

  async function add() {
    if (!selectedFile || busy) return;
    setBusy(true);
    try {
      const game = await storeGame(selectedFile);
      await refresh();
      setMessage(game.name + " saved to this browser's game shelf.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not save game.");
    } finally { setBusy(false); }
  }

  async function play(id: string) {
    if (busy) return;
    setBusy(true);
    try {
      const file = await loadGame(id);
      onPlay(file);
      setMessage("Launching " + file.name + " from your local shelf.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to launch saved game.");
    } finally { setBusy(false); }
  }

  async function exportBundle(id: string) {
    if (busy) return;
    setBusy(true);
    let url: string | undefined;
    try {
      const file = await loadGame(id);
      url = URL.createObjectURL(file);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = file.name;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      setMessage("Requested download of " + file.name + ". Keep backups outside browser storage.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to export game.");
    } finally {
      if (url) {
        const revokeUrl = url;
        window.setTimeout(() => URL.revokeObjectURL(revokeUrl), 60000);
      }
      setBusy(false);
    }
  }


  async function downloadBackup() {
    if (busy || !items.length) return;
    setBusy(true);
    setMessage("Preparing your portable ZIP backup locally...");
    let objectUrl: string | undefined;
    try {
      const archive = await exportVaultBackup(items, loadGame, (current, total) => {
        setMessage("Backing up game " + current + " of " + total + "...");
      });
      objectUrl = URL.createObjectURL(archive);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = "retroverse-vault-" + new Date().toISOString().slice(0, 10) + ".zip";
      document.body.appendChild(link);
      link.click();
      link.remove();
      setMessage("ZIP backup requested for " + items.length + " games. Verify the download and store it safely.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Backup failed.");
    } finally {
      if (objectUrl) {
        const localUrl = objectUrl;
        window.setTimeout(() => URL.revokeObjectURL(localUrl), 60000);
      }
      setBusy(false);
    }
  }

  async function restoreBackup(file: File) {
    if (busy) return;
    setBusy(true);
    setMessage("Checking the RetroVerse archive before restoring...");
    try {
      const restored = await importVaultBackup(file, async game => {
        await storeGame(game);
      }, (current, total) => {
        setMessage("Restoring game " + current + " of " + total + "...");
      });
      await refresh();
      setMessage("Restored " + restored + " games to this browser shelf. Existing games were left intact.");
    } catch (error) {
      try { await refresh(); } catch { /* Preserve original restore error. */ }
      setMessage(error instanceof Error ? error.message : "Restore failed. No existing games were deleted.");
    } finally {
      setBusy(false);
    }
  }

  async function erase(id: string) {
    const game = items.find((item) => item.id === id);
    if (!game || busy) return;
    if (!window.confirm("Delete " + game.name + " from this browser shelf? Export a backup first if needed.")) return;
    setBusy(true);
    try {
      await removeGame(id);
      await refresh();
      setMessage(game.name + " removed from shelf. Your source file is untouched.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to remove game.");
    } finally { setBusy(false); }
  }

  return (
    <section className="game-vault" aria-label="Personal DOS game shelf">
      <div className="section-head"><span>03 / PERSONAL GAME SHELF</span><span className="section-note">BROWSER-LOCAL · INDEXEDDB</span></div>
      <div className="vault-heading">
        <div><div className="eyebrow">COLLECT · PLAY · PRESERVE</div>
          <h2>YOUR <em>GAME VAULT.</em></h2>
          <p>Keep your own .jsdos bundles in this browser and relaunch them without importing them every time. No account, server storage or subscription.</p>
        </div>
        <div className="vault-count"><b>{items.length}</b><span>GAMES ON SHELF</span></div>
      </div>
      <div className="vault-toolbar">
        <div><span className="form-label">LOCAL STORAGE</span><strong>{mib(used)} / {mib(MAX_TOTAL_BYTES)}</strong>
          <p>{mib(MAX_GAME_BYTES)} maximum per file. Browser storage limits may be lower.</p></div>
        <button type="button" disabled={!available || !selectedFile || busy} onClick={() => void add()}>
          + SAVE SELECTED .JSDOS BUNDLE
        </button>
      </div>

      <div className="vault-backup">
        <div>
          <span className="form-label">RUNG 06 / PORTABLE COLLECTION BACKUPS</span>
          <strong>TAKE YOUR GAMES WITH YOU.</strong>
          <p>Back up the entire game shelf to one portable .zip archive, then restore on another device or browser. All packaging and importing runs locally. Restoring adds copies and does not erase your existing games.</p>
          <p className="vault-backup-limit">The backup contains your .jsdos game bundles, but <b>not</b> js-dos save games, emulator states, or Amiga media.</p>
        </div>
        <div className="vault-backup-buttons">
          <button type="button" disabled={!available || !items.length || busy} onClick={() => void downloadBackup()}>↓ BACK UP ENTIRE SHELF</button>
          <button type="button" disabled={!available || busy} onClick={() => restoreInput.current?.click()}>↑ RESTORE BACKUP ZIP</button>
          <input ref={restoreInput} hidden type="file" accept=".zip,application/zip" onChange={event => {
            const archive = event.currentTarget.files?.[0];
            event.currentTarget.value = "";
            if (archive) void restoreBackup(archive);
          }} />
        </div>
      </div>

      <label className="form-label" htmlFor="vault-search">FIND YOUR GAME</label>
      <input className="vault-search" type="search" id="vault-search" placeholder="Search saved games..." value={search} onChange={e => setSearch(e.target.value)} />
      <div className="vault-list">
        {!items.length && <p className="vault-empty">THE SHELF IS EMPTY. SELECT A LOCAL .JSDOS FILE ABOVE, THEN SAVE IT HERE.</p>}
        {!!items.length && !visible.length && <p className="vault-empty">NO MATCHING GAMES.</p>}
        {visible.map(game => (
          <div className="vault-game" key={game.id}>
            <div className="vault-game-info"><span aria-hidden="true">▣</span><div><strong>{game.name}</strong><small>{mib(game.size)} · SAVED {new Date(game.addedAt).toLocaleDateString()}</small></div></div>
            <div className="vault-game-actions">
              <button type="button" disabled={busy} onClick={() => void play(game.id)}>▶ PLAY</button>
              <button type="button" disabled={busy} onClick={() => void exportBundle(game.id)}>↓ EXPORT</button>
              <button type="button" disabled={busy} className="vault-delete" onClick={() => void erase(game.id)}>REMOVE</button>
            </div>
          </div>
        ))}
      </div>
      <div className="vault-status" role="status" aria-live="polite">&gt; {message}</div>
      <p className="vault-warning"><strong>KEEP A BACKUP.</strong> Clearing site data, private browsing, storage eviction or switching devices can erase the shelf. This is unencrypted browser origin storage, accessible to code running on the same origin. Game saves are managed separately by js-dos and are not included in ZIP backups. Its runtime currently loads from its CDN. Your game bundles are not uploaded to a RetroVerse server.</p>
    </section>
  );
}
