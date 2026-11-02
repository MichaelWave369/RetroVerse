import test from "node:test";
import assert from "node:assert/strict";
import { BlobReader, BlobWriter, TextReader, TextWriter, ZipReader, ZipWriter } from "@zip.js/zip.js";
import { exportProgressArchive, importProgressArchive } from "../src/saveArchive";

const KEY_A = "retroverse-dos-sha256-" + "a".repeat(64);
const KEY_B = "retroverse-dos-sha256-" + "b".repeat(64);
const payload = new Uint8Array([0x50,0x4b,0x03,0x04,11,22,33,44,55,66]);

test("portable DOS save roundtrip preserves exact game file-system delta bytes", async () => {
  const zip = await exportProgressArchive(KEY_A, "Commander Keen.jsdos", payload);
  assert.ok(zip.size > 100);
  const data = await importProgressArchive(zip, KEY_A);
  assert.deepEqual([...data], [...payload]);
});

test("saved progress refuses different game bundle identity", async () => {
  const zip = await exportProgressArchive(KEY_A, "Commander Keen.jsdos", payload);
  await assert.rejects(() => importProgressArchive(zip, KEY_B), /different game bundle/i);
});

test("invalid identities and empty save data are rejected", async () => {
  await assert.rejects(() => exportProgressArchive("garbage", "Keen", payload), /identity/i);
  await assert.rejects(() => exportProgressArchive(KEY_A, "Keen", new Uint8Array()), /empty/i);
  await assert.rejects(() => importProgressArchive(new Blob([new Uint8Array([80,75,3,4])]), KEY_A), /backup/i);
});

test("unrecognized ZIPs cannot be imported as game progress", async () => {
  const writer = new ZipWriter(new BlobWriter("application/zip"), {useWebWorkers:false});
  await writer.add("other.txt", new TextReader("unrelated"));
  const unrelated = await writer.close();
  await assert.rejects(() => importProgressArchive(unrelated, KEY_A), /exactly two files/i);
});

test("save backups reject tampering even when game identity matches", async () => {
  const goodZip = await exportProgressArchive(KEY_A, "Keen.jsdos", payload);
  const reader = new ZipReader(new BlobReader(goodZip), { useWebWorkers:false });
  const entries = await reader.getEntries();
  const rawManifest = await entries.find(e=>e.filename==="retroverse-progress.json")!.getData(new TextWriter());
  await reader.close();

  const writer = new ZipWriter(new BlobWriter("application/zip"), {useWebWorkers:false});
  await writer.add("retroverse-progress.json",new TextReader(rawManifest));
  await writer.add("fs-changes.bin",new BlobReader(new Blob([new Uint8Array([0x50,0x4b,0x03,0x04,99,22,33,44,55,66])])));
  const corrupted = await writer.close();
  await assert.rejects(() => importProgressArchive(corrupted,KEY_A), /checksum/i);
});

test("unexpected extra ZIP members are rejected", async () => {
  const goodZip = await exportProgressArchive(KEY_A, "Keen.jsdos", payload);
  const reader = new ZipReader(new BlobReader(goodZip), {useWebWorkers:false});
  const entries = await reader.getEntries();
  const manifest = await entries.find(e=>e.filename==="retroverse-progress.json")!.getData(new TextWriter());
  const game = await entries.find(e=>e.filename==="fs-changes.bin")!.getData(new BlobWriter());
  await reader.close();
  const writer = new ZipWriter(new BlobWriter("application/zip"), {useWebWorkers:false});
  await writer.add("retroverse-progress.json",new TextReader(manifest));
  await writer.add("fs-changes.bin",new BlobReader(game));
  await writer.add("extra.bin",new BlobReader(new Blob(["oops"])));
  const tampered = await writer.close();
  await assert.rejects(() => importProgressArchive(tampered, KEY_A), /exactly two files/i);
});
