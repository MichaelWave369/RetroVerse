import test from "node:test";
import assert from "node:assert/strict";
import { BlobReader, BlobWriter, TextReader, ZipWriter } from "@zip.js/zip.js";
import { exportVaultBackup, importVaultBackup } from "../src/vaultBackup";
import type { VaultGame } from "../src/vault";

function makeBundle(name: string, tag: number): File {
  // A minimal ZIP-compatible header. This tests the backup layer, NOT js-dos.
  return new File([new Uint8Array([0x50, 0x4b, 0x03, 0x04, tag, 1, 2, 3])], name, { type: "application/zip" });
}
function makeGame(id: string, name: string, file: File): VaultGame {
  return { id, name, size: file.size, addedAt: 1 };
}
const games = [
  ["11111111-1111-4111-8111-111111111111", "Digger.jsdos", makeBundle("Digger.jsdos", 11)],
  ["22222222-2222-4222-8222-222222222222", "Test Game.jsdos", makeBundle("Test Game.jsdos", 22)],
] as const;

test("roundtrip: backup and restore two user game bundles", async () => {
  const all = games.map(([id, name, file]) => makeGame(id, name, file));
  const source = new Map(games.map(([id, , file]) => [id, file]));
  const exportProgress: string[] = [];
  const zipped = await exportVaultBackup(all, async id => {
    const file = source.get(id);
    assert.ok(file);
    return file;
  }, (count, total) => exportProgress.push(count + "/" + total));
  assert.ok(zipped.size > 100);
  assert.deepEqual(exportProgress, ["1/2", "2/2"]);
  const imported: File[] = [];
  const count = await importVaultBackup(zipped, async f => { imported.push(f); });
  assert.equal(count, 2);
  assert.deepEqual(imported.map(f => f.name), ["Digger.jsdos", "Test Game.jsdos"]);
  assert.deepEqual(Array.from(new Uint8Array(await imported[1].arrayBuffer())), [80, 75, 3, 4, 22, 1, 2, 3]);
});

test("rejects a modified game whose size differs from metadata", async () => {
  const entry = makeGame(games[0][0], "Digger.jsdos", games[0][2]);
  await assert.rejects(() => exportVaultBackup([entry], async () => makeBundle("Wrong.jsdos", 6).slice(0, 4) as File), /size/i);
});

test("rejects duplicate IDs and invalid bundle metadata", async () => {
  const entry = makeGame(games[0][0], "Digger.jsdos", games[0][2]);
  await assert.rejects(() => exportVaultBackup([entry, entry], async () => games[0][2]), /duplicate/i);
  await assert.rejects(() => exportVaultBackup([{...entry, name:"../evil.jsdos"}], async () => games[0][2]), /filename/i);
});

test("rejects ZIP files without our versioned manifest", async () => {
  const zip = new ZipWriter(new BlobWriter("application/zip"), { useWebWorkers: false });
  await zip.add("stranger.txt", new TextReader("not a vault"));
  const blob = await zip.close();
  await assert.rejects(() => importVaultBackup(blob, async () => {}), /manifest/i);
});

test("reports partial restore accurately if browser storage fills", async () => {
  const entries = games.map(([id, name, file]) => makeGame(id, name, file));
  const files = new Map(games.map(([id, , file]) => [id, file]));
  const backup = await exportVaultBackup(entries, async id => files.get(id)!);
  let written = 0;
  await assert.rejects(() => importVaultBackup(backup, async () => {
    written++;
    if (written === 2) throw new Error("QuotaExceededError");
  }), /after 1 games.*QuotaExceededError/i);
});
