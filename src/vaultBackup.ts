/**
 * Portable RetroVerse .zip backups for user-owned .jsdos game bundles.
 *
 * This module contains only archive conversion and validation. It does NOT
 * connect to the network or to browser storage. Games are saved into and
 * restored from IndexedDB by the caller, on the user's device.
 */
import {
  BlobReader, BlobWriter, TextReader, TextWriter, ZipReader, ZipWriter,
} from "@zip.js/zip.js";
import { MAX_GAME_BYTES, MAX_TOTAL_BYTES, type VaultGame } from "./vault";

const FORMAT = "retroverse-dos-game-vault";
const VERSION = 1;
const MANIFEST = "retroverse-vault.json";
const MAX_ARCHIVE_BYTES = MAX_TOTAL_BYTES + 64 * 1024 * 1024;
const MAX_GAME_COUNT = 500;
const MAX_MANIFEST_BYTES = 256 * 1024;

interface ManifestGame {
  id: string;
  name: string;
  size: number;
}
interface VaultManifest {
  format: typeof FORMAT;
  version: typeof VERSION;
  exportedAt: string;
  games: ManifestGame[];
}
type Progress = (completed: number, total: number) => void;

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
function isValidName(name: unknown): name is string {
  return typeof name === "string" && name.length > 6 && name.length <= 240 &&
    name.toLowerCase().endsWith(".jsdos") && !/[/\\\u0000-\u001f]/u.test(name);
}
function validateGames(games: ManifestGame[]): void {
  if (!games.length || games.length > MAX_GAME_COUNT) {
    throw new Error("Backup must contain between 1 and 500 games.");
  }
  const seen = new Set<string>();
  let total = 0;
  for (const game of games) {
    if (!/^[a-zA-Z0-9_-]{10,64}$/u.test(game.id) || seen.has(game.id)) {
      throw new Error("Backup contains duplicate or invalid game IDs.");
    }
    if (!isValidName(game.name)) {
      throw new Error("Backup contains an invalid game filename.");
    }
    if (!Number.isSafeInteger(game.size) || game.size < 4 || game.size > MAX_GAME_BYTES) {
      throw new Error("Backup contains an invalid game size.");
    }
    seen.add(game.id);
    total += game.size;
  }
  if (total > MAX_TOTAL_BYTES) throw new Error("Backup is over the 512 MiB shelf limit.");
}
function parseManifest(value: unknown): VaultManifest {
  if (!isRecord(value) || value.format !== FORMAT || value.version !== VERSION ||
      typeof value.exportedAt !== "string" || !Array.isArray(value.games)) {
    throw new Error("This is not a compatible RetroVerse Game Vault backup.");
  }
  const games: ManifestGame[] = [];
  for (const entry of value.games) {
    if (!isRecord(entry)) throw new Error("Malformed game metadata in backup.");
    games.push({ id: entry.id as string, name: entry.name as string, size: entry.size as number });
  }
  validateGames(games);
  return {
    format: FORMAT,
    version: VERSION,
    exportedAt: value.exportedAt,
    games,
  };
}
function zipPath(id: string): string { return "games/" + id + ".jsdos"; }
function zipHeader(blob: Blob): Promise<Uint8Array> {
  return blob.slice(0, 4).arrayBuffer().then(buffer => new Uint8Array(buffer));
}
async function checkJsdosBlob(blob: Blob, expectedSize: number): Promise<void> {
  if (blob.size !== expectedSize) throw new Error("Game file size does not match the backup manifest.");
  const header = await zipHeader(blob);
  if (header[0] !== 0x50 || header[1] !== 0x4b ||
      !((header[2] === 3 && header[3] === 4) || (header[2] === 5 && header[3] === 6))) {
    throw new Error("A game in the backup is not a ZIP-compatible .jsdos bundle.");
  }
}

/** Create a single portable archive without re-compressing already zipped games. */
export async function exportVaultBackup(
  games: VaultGame[],
  load: (id: string) => Promise<File>,
  progress?: Progress,
): Promise<Blob> {
  const entries: ManifestGame[] = games.map(game => ({
    id: game.id, name: game.name, size: game.size,
  }));
  validateGames(entries);
  const archiveWriter = new ZipWriter(new BlobWriter("application/zip"), { useWebWorkers: false });
  try {
    for (let i = 0; i < entries.length; i++) {
      const game = entries[i];
      const file = await load(game.id);
      await checkJsdosBlob(file, game.size);
      await archiveWriter.add(zipPath(game.id), new BlobReader(file), { level: 0 });
      progress?.(i + 1, entries.length);
    }
    const manifest: VaultManifest = {
      format: FORMAT,
      version: VERSION,
      exportedAt: new Date().toISOString(),
      games: entries,
    };
    await archiveWriter.add(MANIFEST, new TextReader(JSON.stringify(manifest, null, 2)), { level: 0 });
    return await archiveWriter.close();
  } catch (error) {
    try { await archiveWriter.close(); } catch { /* Already closed or failed. */ }
    throw error;
  }
}

/**
 * Restore game bundles into a caller-owned shelf. Existing entries are not
 * deleted; each import creates new local IDs. A failed import may leave
 * previously restored games in the shelf, which the UI must disclose.
 */
export async function importVaultBackup(
  archive: Blob,
  save: (game: File) => Promise<void>,
  progress?: Progress,
): Promise<number> {
  if (archive.size < 50 || archive.size > MAX_ARCHIVE_BYTES) {
    throw new Error("Backup must be a nonempty ZIP file smaller than 576 MiB.");
  }
  const reader = new ZipReader(new BlobReader(archive), { useWebWorkers: false });
  let imported = 0;
  try {
    const entries = await reader.getEntries();
    if (entries.length > MAX_GAME_COUNT + 1) {
      throw new Error("Unexpected number of files in this backup.");
    }
    const manifestEntry = entries.find(entry => entry.filename === MANIFEST);
    if (!manifestEntry || manifestEntry.directory || !("getData" in manifestEntry) ||
        (manifestEntry.uncompressedSize ?? 0) > MAX_MANIFEST_BYTES) {
      throw new Error("Backup has no valid RetroVerse manifest.");
    }
    const manifestText = await manifestEntry.getData(new TextWriter());
    if (manifestText.length > MAX_MANIFEST_BYTES) throw new Error("Backup manifest is too large.");
    let manifestUnknown: unknown;
    try { manifestUnknown = JSON.parse(manifestText); }
    catch { throw new Error("Backup manifest is not valid JSON."); }
    const manifest = parseManifest(manifestUnknown);
    if (entries.length !== manifest.games.length + 1) {
      throw new Error("Backup includes unexpected files.");
    }
    for (const entry of entries) {
      if (entry.directory) throw new Error("Backup contains unsupported folders.");
      if (entry.filename === MANIFEST) continue;
      const expected = manifest.games.find(game => zipPath(game.id) === entry.filename);
      if (!expected || entry.uncompressedSize !== expected.size) {
        throw new Error("Backup contains an unrecognized or oversized game.");
      }
    }
    for (const game of manifest.games) {
      const entry = entries.find(item => item.filename === zipPath(game.id));
      if (!entry || !("getData" in entry)) throw new Error("Missing game data in backup.");
      const blob = await entry.getData(new BlobWriter("application/zip"));
      await checkJsdosBlob(blob, game.size);
      try {
        await save(new File([blob], game.name, { type: "application/zip" }));
      } catch (error) {
        const reason = error instanceof Error ? error.message : "Browser storage failure";
        throw new Error("Restore stopped after " + imported + " games. " + reason);
      }
      imported++;
      progress?.(imported, manifest.games.length);
    }
    return imported;
  } finally {
    await reader.close();
  }
}
