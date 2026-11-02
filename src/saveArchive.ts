/**
 * Standalone, portable DOS file-system-change archives (.rvsave.zip).
 * Distinct from the Rung 6 game-bundle backup format.
 *
 * This module intentionally has no local storage or network access.
 */
import { BlobReader, BlobWriter, TextReader, TextWriter, ZipReader, ZipWriter } from "@zip.js/zip.js";
import { MAX_PROGRESS_BYTES, PROGRESS_KEY_RE } from "./saveChanges";

const FORMAT = "retroverse-dos-progress";
const VERSION = 1;
const MANIFEST = "retroverse-progress.json";
const PAYLOAD = "fs-changes.bin";
const MAX_ARCHIVE_BYTES = MAX_PROGRESS_BYTES + 1024 * 1024;
interface Manifest {
  format: typeof FORMAT;
  version: typeof VERSION;
  bundleKey: string;
  gameTitle: string;
  byteLength: number;
  sha256: string;
  exportedAt: string;
}
function validTitle(s: unknown): s is string {
  return typeof s === "string" && s.length > 0 && s.length < 256 &&
    !/[\u0000-\u001f]/u.test(s);
}
async function sha256(bytes: Uint8Array): Promise<string> {
  const result = await crypto.subtle.digest("SHA-256", new Uint8Array(bytes));
  return Array.from(new Uint8Array(result), b => b.toString(16).padStart(2, "0")).join("");
}
function checkPayload(data: Uint8Array): void {
  if (!(data instanceof Uint8Array) || data.length < 1 || data.length > MAX_PROGRESS_BYTES) {
    throw new Error("Progress payload is empty or exceeds 64 MiB.");
  }
}

export async function exportProgressArchive(bundleKey: string, gameTitle: string, data: Uint8Array): Promise<Blob> {
  if (!PROGRESS_KEY_RE.test(bundleKey)) throw new Error("Invalid bundle identity.");
  if (!validTitle(gameTitle)) throw new Error("Invalid game title.");
  checkPayload(data);
  const manifest: Manifest = {
    format: FORMAT, version: VERSION, bundleKey, gameTitle,
    byteLength: data.length,
    sha256: await sha256(data),
    exportedAt: new Date().toISOString(),
  };
  const writer = new ZipWriter(new BlobWriter("application/zip"), { useWebWorkers: false });
  try {
    await writer.add(MANIFEST, new TextReader(JSON.stringify(manifest)), { level: 0 });
    await writer.add(PAYLOAD, new BlobReader(new Blob([new Uint8Array(data)])), { level: 0 });
    return await writer.close();
  } catch (error) {
    try { await writer.close(); } catch { /* Release resources if necessary. */ }
    throw error;
  }
}

/**
 * Returns validated save data, but never writes it.
 * The caller must stop an active emulator BEFORE replacing its saved changes.
 * Saves are intentionally bound to an identical game bundle SHA-256.
 */
export async function importProgressArchive(archive: Blob, expectedBundleKey: string): Promise<Uint8Array> {
  if (!PROGRESS_KEY_RE.test(expectedBundleKey)) throw new Error("No valid game bundle selected.");
  if (archive.size < 50 || archive.size > MAX_ARCHIVE_BYTES)
    throw new Error("Progress backup must be a ZIP smaller than 65 MiB.");
  const reader = new ZipReader(new BlobReader(archive), { useWebWorkers: false });
  try {
    const entries = await reader.getEntries();
    if (entries.length !== 2) throw new Error("Progress backup must contain exactly two files.");
    const manifestEntry = entries.find(e => e.filename === MANIFEST);
    const dataEntry = entries.find(e => e.filename === PAYLOAD);
    if (!manifestEntry || !dataEntry || manifestEntry.directory || dataEntry.directory) {
      throw new Error("This file is not a RetroVerse progress backup.");
    }
    if (manifestEntry.uncompressedSize > 4096 || dataEntry.uncompressedSize > MAX_PROGRESS_BYTES) {
      throw new Error("Progress backup entries exceed size limits.");
    }
    const manifestText = await manifestEntry.getData(new TextWriter());
    if (manifestText.length > 4096) throw new Error("Progress backup manifest is oversized.");
    let obj: unknown;
    try { obj = JSON.parse(manifestText); }
    catch { throw new Error("Progress backup manifest is invalid JSON."); }
    if (!obj || typeof obj !== "object" || Array.isArray(obj)) {
      throw new Error("Progress backup manifest is invalid.");
    }
    const m = obj as Record<string, unknown>;
    if (m.format !== FORMAT || m.version !== VERSION ||
        typeof m.bundleKey !== "string" || !PROGRESS_KEY_RE.test(m.bundleKey) ||
        !validTitle(m.gameTitle) || typeof m.exportedAt !== "string" ||
        !Number.isSafeInteger(m.byteLength) || typeof m.byteLength !== "number" ||
        m.byteLength < 1 || m.byteLength > MAX_PROGRESS_BYTES ||
        typeof m.sha256 !== "string" || !/^[a-f0-9]{64}$/.test(m.sha256)) {
      throw new Error("Unsupported or malformed RetroVerse progress backup.");
    }
    if (m.bundleKey !== expectedBundleKey) {
      throw new Error("This save belongs to a different game bundle. Load the matching .jsdos file.");
    }
    if (dataEntry.uncompressedSize !== m.byteLength) throw new Error("Progress payload size mismatch.");
    const payload = new Uint8Array(await (await dataEntry.getData(new BlobWriter())).arrayBuffer());
    checkPayload(payload);
    if (payload.length !== m.byteLength || await sha256(payload) !== m.sha256) {
      throw new Error("Progress backup checksum mismatch or corrupted file.");
    }
    return payload;
  } finally { await reader.close(); }
}
