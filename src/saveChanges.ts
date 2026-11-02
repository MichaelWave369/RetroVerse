/**
 * RetroVerse owns only per-game DOS file-system deltas in this database.
 * The original game bundle and DOSBox-X quick-state snapshots are not here.
 *
 * The SHA-256 bundle key survives Blob URL changes and Game Vault ZIP restores.
 * No game data or save delta is uploaded to a RetroVerse server.
 */
const NAME = "retroverse-owned-game-progress";
const VERSION = 1;
const STORE = "changes";
export const MAX_PROGRESS_BYTES = 64 * 1024 * 1024;
export const PROGRESS_KEY_RE = /^retroverse-dos-sha256-[0-9a-f]{64}$/;

interface SavedRecord {
  key: string;
  data: Uint8Array;
  savedAt: number;
}

function validateKey(key: string) {
  if (!PROGRESS_KEY_RE.test(key)) throw new Error("Invalid DOS game identity.");
}

export async function bundleSaveKey(file: File): Promise<string> {
  if (!file.name.toLowerCase().endsWith(".jsdos")) throw new Error("Select a .jsdos game bundle.");
  if (!file.size) throw new Error("Game bundle is empty.");
  if (!crypto.subtle) throw new Error("Secure browser context required for local SHA-256 checks.");
  const digest = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
  const hex = Array.from(new Uint8Array(digest), x => x.toString(16).padStart(2, "0")).join("");
  return "retroverse-dos-sha256-" + hex;
}

function open(): Promise<IDBDatabase> {
  if (!("indexedDB" in window)) return Promise.reject(new Error("Browser IndexedDB unavailable."));
  return new Promise((resolve, reject) => {
    let req: IDBOpenDBRequest;
    try { req = indexedDB.open(NAME, VERSION); }
    catch (error) { reject(error); return; }
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: "key" });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error("Cannot open game-progress storage."));
    req.onblocked = () => reject(new Error("Close other RetroVerse tabs to access game-progress storage."));
  });
}

function transactionEnd(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("Game-progress storage failed."));
    tx.onabort = () => reject(tx.error ?? new Error("Game-progress transaction aborted."));
  });
}

export async function readChanges(key: string): Promise<Uint8Array | null> {
  validateKey(key);
  const db = await open();
  try {
    const tx = db.transaction(STORE, "readonly");
    const done = transactionEnd(tx);
    const record = await new Promise<SavedRecord | undefined>((resolve, reject) => {
      const req = tx.objectStore(STORE).get(key);
      req.onsuccess = () => resolve(req.result as SavedRecord | undefined);
      req.onerror = () => reject(req.error ?? new Error("Cannot load game progress."));
    });
    await done;
    if (!record) return null;
    if (!(record.data instanceof Uint8Array) || record.data.byteLength > MAX_PROGRESS_BYTES) {
      throw new Error("Stored game progress is corrupted or too large.");
    }
    return new Uint8Array(record.data);
  } finally { db.close(); }
}

export async function writeChanges(key: string, changes: Uint8Array): Promise<void> {
  validateKey(key);
  if (!(changes instanceof Uint8Array) || changes.byteLength < 1 || changes.byteLength > MAX_PROGRESS_BYTES) {
    throw new Error("DOS progress must be between 1 byte and 64 MiB.");
  }
  const db = await open();
  try {
    const tx = db.transaction(STORE, "readwrite");
    const done = transactionEnd(tx);
    tx.objectStore(STORE).put({ key, data: new Uint8Array(changes), savedAt: Date.now() } satisfies SavedRecord);
    await done;
  } catch (error) {
    if (error instanceof DOMException && error.name === "QuotaExceededError") {
      throw new Error("Browser storage quota exceeded while saving game progress.");
    }
    throw error;
  } finally { db.close(); }
}

export async function deleteChanges(key: string): Promise<void> {
  validateKey(key);
  const db = await open();
  try {
    const tx = db.transaction(STORE, "readwrite");
    const done = transactionEnd(tx);
    tx.objectStore(STORE).delete(key);
    await done;
  } finally { db.close(); }
}
