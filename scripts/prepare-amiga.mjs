// Build-time, pinned original GPL SAE source and example UI.
// No Amiga ROMs, games or proprietary operating-system images are fetched.
import { mkdir, stat, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

const root = fileURLToPath(new URL("../", import.meta.url));
const dest = join(root, "public", "amiga");
const revision = "8ebce7b8beb9ebe243e5ea7b5150b3f16f665303";
const upstream = "https://raw.githubusercontent.com/naTmeg/ScriptedAmigaEmulator/" + revision + "/";
const modules = [
  "amiga", "audio", "audio_worklet", "autoconf", "blitter", "cia", "config",
  "copper", "cpu", "custom", "disassembler", "disk", "dms", "dongle",
  "events", "expansion", "filesys", "gayle", "hardfile", "ide", "input",
  "m68k", "memory", "playfield", "prototypes", "roms", "rtc", "serpar",
  "utils", "video"
];
const paths = [
  ...modules.map(name => "sae/" + name + ".js"),
  "example.htm", "example.js", "example.css", "gpl.htm", "readme.htm"
];
await mkdir(dest, { recursive: true });

async function prepare(path) {
  const target = join(dest, path);
  try {
    if ((await stat(target)).size > 100) return;
  } catch { /* Cache not present. */ }
  const response = await fetch(upstream + path, { signal: AbortSignal.timeout(30000) });
  if (!response.ok) throw new Error("SAE download failed: " + path + " HTTP " + response.status);
  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.length < 100) throw new Error("SAE source truncated: " + path);
  await mkdir(join(target, ".."), { recursive: true });
  await writeFile(target, bytes);
  console.log("Prepared SAE", path);
}
for (let i = 0; i < paths.length; i += 6)
  await Promise.all(paths.slice(i, i + 6).map(prepare));

await writeFile(join(dest, "SOURCE-PROVENANCE.txt"),
  "Scripted Amiga Emulator (SAE)\n" +
  "Source: https://github.com/naTmeg/ScriptedAmigaEmulator\n" +
  "Revision: " + revision + "\n" +
  "License: GPL-2.0-or-later (gpl.htm)\n" +
  "Complete original JavaScript sources and example UI are distributed in this folder.\n" +
  "No Kickstart ROMs or copyrighted games are supplied.\n"
);
console.log("SAE standalone emulator prepared.");
