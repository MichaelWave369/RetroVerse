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
const DOS_PART = /^[A-Za-z0-9_$~-]{1,8}(?:\.[A-Za-z0-9_$~-]{1,3})?$/;

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


/**
 * Extract files from a 720 KiB FAT12 floppy into DOSBox's virtual drive.
 * Does not reproduce the original Tandy ROM boot, BIOS or a real floppy drive.
 */
export async function readTandyFloppy(file: File): Promise<TandyProgramPack> {
  if (!file.name.toLowerCase().endsWith(".img") || file.size !== 737280)
    throw new Error("Choose an uncompressed 720 KB Tandy .img floppy image.");
  const bytes = new Uint8Array(await file.arrayBuffer());
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const u16 = (n: number) => view.getUint16(n, true);
  const bps = u16(11), spc = bytes[13], reserved = u16(14);
  const fatCount = bytes[16], rootEntries = u16(17);
  const totalSectors = u16(19), fatSectors = u16(22);
  if (bps !== 512 || spc < 1 || spc > 8 || (spc & (spc - 1)) ||
      reserved < 1 || reserved > 16 || fatCount < 1 || fatCount > 3 ||
      rootEntries < 16 || rootEntries > 256 || totalSectors !== 1440 ||
      fatSectors < 1 || fatSectors > 16 ||
      bytes[510] !== 0x55 || bytes[511] !== 0xaa) {
    throw new Error("Not a supported 720 KB FAT12 DOS floppy image.");
  }
  const fatStart = reserved * bps;
  const rootStart = (reserved + fatCount * fatSectors) * bps;
  const rootSize = rootEntries * 32;
  const dataStart = rootStart + Math.ceil(rootSize / bps) * bps;
  const clusterBytes = bps * spc;
  const maxCluster = Math.floor((bytes.length - dataStart) / clusterBytes) + 1;
  if (rootStart + rootSize > bytes.length || dataStart >= bytes.length || maxCluster < 2)
    throw new Error("Invalid floppy layout.");
  const fatNext = (cluster: number) => {
    const pos = fatStart + Math.floor(cluster * 3 / 2);
    if (pos + 1 >= fatStart + fatSectors * bps) throw new Error("FAT12 entry outside table.");
    const word = bytes[pos] | bytes[pos + 1] << 8;
    return (cluster & 1) ? word >> 4 : word & 0xfff;
  };
  function clusters(start: number): number[] {
    const found: number[] = [];
    const seen = new Set<number>();
    let cluster = start;
    while (cluster >= 2 && cluster <= maxCluster && !seen.has(cluster)) {
      seen.add(cluster);
      found.push(cluster);
      const next = fatNext(cluster);
      if (next >= 0xff8) return found;
      if (next < 2 || next >= 0xff0) break;
      cluster = next;
      if (found.length > 1440) break;
    }
    throw new Error("Floppy has a damaged or cyclic FAT12 cluster chain.");
  }
  function bytesFor(first: number, size: number, wholeDirectory = false): Uint8Array {
    if (size === 0 && !wholeDirectory) return new Uint8Array(0);
    if (size > 737280) throw new Error("Floppy file exceeds the whole disk.");
    const chain = clusters(first);
    const total = chain.length * clusterBytes;
    if (!wholeDirectory && total < size) throw new Error("FAT12 file chain shorter than file size.");
    const output = new Uint8Array(wholeDirectory ? total : size);
    let used = 0;
    for (const index of chain) {
      if (used >= output.length) break;
      const offset = dataStart + (index - 2) * clusterBytes;
      if (offset + clusterBytes > bytes.length) throw new Error("FAT12 cluster outside disk.");
      const length = Math.min(clusterBytes, output.length - used);
      output.set(bytes.subarray(offset, offset + length), used);
      used += length;
    }
    return output;
  }
  const files: TandyProgramPack["files"] = [];
  const visited = new Set<number>();
  const decoder = new TextDecoder("ascii");
  function parseDir(data: Uint8Array, prefix: string, depth: number): void {
    if (depth > 4) throw new Error("Floppy directory nesting too deep.");
    for (let i = 0; i + 32 <= data.length; i += 32) {
      if (data[i] === 0) break;
      if (data[i] === 0xe5) continue;
      const attr = data[i + 11];
      if (attr === 0x0f || (attr & 0x08)) continue;
      const base = decoder.decode(data.subarray(i, i + 8)).trim();
      const ext = decoder.decode(data.subarray(i + 8, i + 11)).trim();
      if (base === "." || base === "..") continue;
      const path = safePath(prefix + base + (ext ? "." + ext : ""));
      const first = data[i + 26] | data[i + 27] << 8;
      const size = (data[i + 28] | data[i + 29] << 8 |
        data[i + 30] << 16 | data[i + 31] << 24) >>> 0;
      if ((attr & 0x10) !== 0) {
        if (first < 2 || visited.has(first)) throw new Error("Invalid FAT12 subdirectory.");
        visited.add(first);
        parseDir(bytesFor(first, 0, true), path + "/", depth + 1);
      } else {
        if (files.length >= 300) throw new Error("Too many files in this floppy image.");
        files.push({ path, contents: bytesFor(first, size) });
      }
    }
  }
  parseDir(bytes.subarray(rootStart, rootStart + rootSize), "", 0);
  if (!files.length) throw new Error("No readable files found on this Tandy floppy.");
  const programs = files.map(f => f.path).filter(p => /\.(COM|EXE|BAT)$/.test(p)).sort();
  return {
    label: file.name,
    files,
    programs,
    compressedBytes: file.size,
    uncompressedBytes: files.reduce((sum, entry) => sum + entry.contents.byteLength, 0),
  };
}
