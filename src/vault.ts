/** Browser-local DOS game shelf. No RetroVerse server or cloud sync. */
export interface VaultGame {
  id: string;
  name: string;
  size: number;
  addedAt: number;
}
const DB_NAME = "retroverse-personal-game-shelf";
const DB_VERSION = 1;
const META = "metadata";
const DATA = "bundles";
export const MAX_GAME_BYTES = 128 * 1024 * 1024;
export const MAX_TOTAL_BYTES = 512 * 1024 * 1024;

function open(): Promise<IDBDatabase> {
  if (!("indexedDB" in window)) return Promise.reject(new Error("This browser does not support IndexedDB."));
  return new Promise((resolve, reject) => {
    let req: IDBOpenDBRequest;
    try { req = indexedDB.open(DB_NAME, DB_VERSION); }
    catch (error) { reject(error); return; }
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(META)) db.createObjectStore(META, { keyPath: "id" });
      if (!db.objectStoreNames.contains(DATA)) db.createObjectStore(DATA);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error("Could not open personal game shelf."));
    req.onblocked = () => reject(new Error("Close other RetroVerse tabs to unlock the game shelf."));
  });
}

function result<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error("Browser storage request failed."));
  });
}

function completed(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("Shelf transaction failed."));
    tx.onabort = () => reject(tx.error ?? new Error("Browser could not save this game."));
  });
}

export async function listGames(): Promise<VaultGame[]> {
  const db = await open();
  try {
    const tx = db.transaction(META, "readonly");
    const done = completed(tx);
    const entries = await result(tx.objectStore(META).getAll() as IDBRequest<VaultGame[]>);
    await done;
    return entries.sort((a,b) => b.addedAt - a.addedAt);
  } finally { db.close(); }
}

export async function storeGame(file: File): Promise<VaultGame> {
  if (!file.name.toLowerCase().endsWith(".jsdos")) throw new Error("Only .jsdos bundles are supported.");
  if (!file.size || file.size > MAX_GAME_BYTES) throw new Error("Bundle must be nonempty and no larger than 128 MiB.");
  const head = new Uint8Array(await file.slice(0,4).arrayBuffer());
  const validZip = head[0] === 0x50 && head[1] === 0x4b &&
    ((head[2] === 3 && head[3] === 4) || (head[2] === 5 && head[3] === 6));
  if (!validZip) throw new Error("File is not a ZIP-compatible .jsdos bundle.");
  const used = (await listGames()).reduce((sum, game) => sum + game.size, 0);
  if (used + file.size > MAX_TOTAL_BYTES) throw new Error("Shelf is limited to 512 MiB. Export or remove games first.");
  const meta: VaultGame = { id: crypto.randomUUID(), name: file.name, size: file.size, addedAt: Date.now() };
  const db = await open();
  try {
    const tx = db.transaction([META, DATA], "readwrite");
    const done = completed(tx);
    tx.objectStore(META).put(meta);
    tx.objectStore(DATA).put(file, meta.id);
    await done;
    return meta;
  } catch (error) {
    if (error instanceof DOMException && error.name === "QuotaExceededError")
      throw new Error("Browser storage quota exceeded. Remove an older game or free device space.");
    throw error;
  } finally { db.close(); }
}

export async function loadGame(id: string): Promise<File> {
  const db = await open();
  try {
    const tx = db.transaction([META, DATA], "readonly");
    const done = completed(tx);
    const metaPromise = result(tx.objectStore(META).get(id) as IDBRequest<VaultGame | undefined>);
    const blobPromise = result(tx.objectStore(DATA).get(id) as IDBRequest<Blob | undefined>);
    const [meta, blob] = await Promise.all([metaPromise, blobPromise]);
    await done;
    if (!meta || !blob) throw new Error("Game missing from this browser's local library.");
    return new File([blob], meta.name, { type: "application/zip" });
  } finally { db.close(); }
}

export async function removeGame(id: string): Promise<void> {
  const db = await open();
  try {
    const tx = db.transaction([META, DATA], "readwrite");
    const done = completed(tx);
    tx.objectStore(META).delete(id);
    tx.objectStore(DATA).delete(id);
    await done;
  } finally { db.close(); }
}
