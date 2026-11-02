import { useEffect, useMemo, useState } from "react";
import { listGames, storeGame, loadGame, removeGame, MAX_GAME_BYTES, MAX_TOTAL_BYTES, type VaultGame } from "./vault";

interface Props { selectedFile: File | null; onPlay(file: File): void; }
const mib = (n: number) => (n / 1048576).toFixed(1) + " MiB";

export default function GameVault({ selectedFile, onPlay }: Props) {
  const [items, setItems] = useState<VaultGame[]>([]);
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState(false);
  const [available, setAvailable] = useState(true);
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
      <p className="vault-warning"><strong>KEEP A BACKUP.</strong> Clearing site data, private browsing, storage eviction or switching devices can erase the shelf. This is unencrypted browser origin storage, accessible to code running on the same origin. Game saves are managed separately by js-dos, whose runtime currently loads from its CDN. Your game bundles are not uploaded to a RetroVerse server.</p>
    </section>
  );
}
