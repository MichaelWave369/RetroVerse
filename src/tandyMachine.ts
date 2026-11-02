/**
 * Rung 8: DOSBox-compatible Tandy 1000 SL family profile.
 *
 * This is NOT a full chipset, BIOS or DeskMate ROM-level emulation of SL/2.
 * It uses DOSBox's Tandy graphics/PSG support in js-dos and its built-in DOS
 * shell, with no proprietary Microsoft/Tandy disks bundled.
 */
import { BlobReader, BlobWriter, ZipReader } from "@zip.js/zip.js";

export type TandyModel = "sl" | "sl2";
export type TandySpeed = "original" | "slow";
export interface TandyProgramPack {
  label: string;
  files: Array<{ path: string; contents: Uint8Array }>;
  programs: string[];
  compressedBytes: number;
  uncompressedBytes: number;
}

const MAX_ZIP = 64 * 1024 * 1024;
const MAX_UNPACKED = 64 * 1024 * 1024;
const MAX_ENTRY = 32 * 1024 * 1024;
const MAX_FILES = 400;
const PATH_MAX = 125;
// Deliberately limited to simple DOS 8.3 names to avoid accidental execution
// of shell special characters. Users can repackage their own archives.
const DOS_PART = /^[A-Za-z0-9_~!#$%&'()+@^{}-]{1,8}(?:\.[A-Za-z0-9_~!#$%&'()+@^{}-]{1,3})?$/;

function safePath(name: string): string {
  const norm = name.replace(/\\/g, "/");
  if (norm.length > PATH_MAX || norm.startsWith("/") || norm.endsWith("/") ||
      /[\u0000-\u001f:;]/.test(norm)) {
    throw new Error("Archive contains an unsupported or unsafe DOS filename.");
  }
  const parts = norm.split("/");
  if (parts.some(part => part === "." || part === ".." || !DOS_PART.test(part))) {
    throw new Error("Archive uses a non-DOS-8.3 filename or unsafe directory path: " + norm);
  }
  return parts.join("/").toUpperCase();
}

export async function readTandyZip(file: File): Promise<TandyProgramPack> {
  if (!file.name.toLowerCase().endsWith(".zip") || !file.size || file.size > MAX_ZIP) {
    throw new Error("Select a DOS program ZIP no larger than 64 MiB.");
  }
  const bytes = new Uint8Array(await file.slice(0, 4).arrayBuffer());
  if (bytes[0] !== 0x50 || bytes[1] !== 0x4b ||
      !((bytes[2] === 3 && bytes[3] === 4) || (bytes[2] === 5 && bytes[3] === 6))) {
    throw new Error("Selected file does not look like a ZIP archive.");
  }
  const reader = new ZipReader(new BlobReader(file), { useWebWorkers: false });
  try {
    const entries = await reader.getEntries();
    if (!entries.length || entries.length > MAX_FILES)
      throw new Error("ZIP must contain between 1 and 400 files or folders.");
    const fileEntries: { path: string; entry: (typeof entries)[number] }[] = [];
    const seen = new Set<string>();
    let uncompressedBytes = 0;
    for (const entry of entries) {
      if (entry.directory) continue;
      if (entry.filename.toLowerCase().startsWith(".jsdos/"))
        throw new Error("This is a .jsdos-style bundle. Use the regular DOS Game Cabinet for it.");
      const path = safePath(entry.filename);
      if (seen.has(path)) throw new Error("ZIP contains duplicate DOS filenames: " + path);
      seen.add(path);
      if (entry.uncompressedSize > MAX_ENTRY)
        throw new Error("Archive contains a game file larger than 32 MiB.");
      uncompressedBytes += entry.uncompressedSize;
      if (uncompressedBytes > MAX_UNPACKED)
        throw new Error("Expanded ZIP exceeds the 64 MiB DOS program limit.");
      fileEntries.push({ path, entry });
    }
    const programs = fileEntries.map(f => f.path)
      .filter(path => /\.(COM|EXE|BAT)$/.test(path))
      .sort();
    if (!programs.length)
      throw new Error("ZIP contains no .EXE, .COM or .BAT program to launch.");
    const files = [];
    for (const { path, entry } of fileEntries) {
      const blob = await entry.getData(new BlobWriter());
      if (blob.size !== entry.uncompressedSize || blob.size > MAX_ENTRY) {
        throw new Error("Archive extraction size mismatch.");
      }
      files.push({ path, contents: new Uint8Array(await blob.arrayBuffer()) });
    }
    return { label: file.name, files, programs, compressedBytes: file.size, uncompressedBytes };
  } finally {
    await reader.close();
  }
}

export function tandyDosboxConf(model: TandyModel, speed: TandySpeed, entrypoint: string | null): string {
  if (model !== "sl" && model !== "sl2") throw new Error("Unsupported Tandy profile.");
  if (speed !== "original" && speed !== "slow") throw new Error("Unsupported Tandy speed preset.");
  let run = "";
  if (entrypoint) {
    const safe = safePath(entrypoint);
    if (!/\.(COM|EXE|BAT)$/.test(safe)) throw new Error("Select a DOS executable.");
    const parts = safe.split("/");
    const executable = parts.pop()!;
    if (parts.length) run = "cd \\" + parts.join("\\") + "\n";
    run += executable + "\n";
  }
  // DOSBox cycle counts approximate speed. They do not emulate an exact
  // 4 MHz / 8 MHz 8086, nor Tandy's original memory/chipset mapping.
  const cycles = speed === "slow" ? 1400 : 2800;
  return [
    "[dosbox]", "machine=tandy", "memsize=1",
    "[cpu]", "core=normal", "cputype=auto", "cycles=fixed " + cycles,
    "[speaker]", "pcspeaker=true", "tandy=on",
    "[sblaster]", "sbtype=none",
    "[autoexec]",
    "@echo off",
    "mount c .", "c:", "cls",
    "echo ==========================================",
    "echo    RETROVERSE TANDY 1000 " + (model === "sl2" ? "SL/2" : "SL"),
    "echo ==========================================",
    "echo Tandy graphics and 3-voice sound profile.",
    "echo DOSBox-compatible software environment.",
    "echo This is not original Tandy ROM or DeskMate.",
    "echo.",
    ...(entrypoint ? ["echo Starting your DOS program...",run.trimEnd()] : [
      "echo C: drive ready. Type DIR or TYPE TANDY.TXT",
      "echo.",
    ]),
    "",
  ].join("\n");
}

export const WELCOME_FILE = {
  path: "TANDY.TXT",
  contents: new TextEncoder().encode([
    "RETROVERSE - TANDY 1000 SL FAMILY RECREATION",
    "",
    "Your DOSBox environment uses machine=tandy.",
    "Tandy graphics (TGA) and 3-voice audio are supported",
    "for compatible games. No commercial firmware is included.",
    "",
    "The original Tandy 1000 SL (1988) had an 8086,",
    "384 KB RAM, and a 5.25-inch floppy drive.",
    "The SL/2 (1989) had 512 KB and a 3.5-inch drive.",
    "Both shipped with Tandy DOS/DeskMate in ROM.",
    "",
    "This is a software compatibility profile, not a",
    "pixel-perfect emulation of the Tandy 1000 SL/2.",
    "",
    "Try DIR, VER, or upload a DOS game ZIP in RetroVerse.",
    "For .JSDOS game bundles, use the DOS GAME CABINET.",
    "",
  ].join("\r\n")),
};
