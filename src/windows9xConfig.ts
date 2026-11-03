import type { V86Image, V86Options } from "v86";

/**
 * Windows 9x guests run in the first-party v86 engine already shipped by
 * RetroVerse. Only visitor-selected raw images are attached to virtual drives.
 * No Microsoft operating system, installer, license key, or game is included.
 */
export type Windows9xVersion = "win95" | "win98";
export type Windows9xMediaRole = "harddisk" | "floppy" | "cdrom";
export interface LocalMediaDescription {
  name: string;
  size: number;
}
export interface Windows9xConfig {
  baseUrl: string;
  screenContainer: HTMLElement;
  version: Windows9xVersion;
  memoryMB: 32 | 64 | 128;
  hardDiskFile: File;
  floppyBuffer?: ArrayBuffer;
  cdromUrl?: string;
  cdromSize?: number;
}
export const WINDOWS9X_PROFILES: Record<Windows9xVersion, {
  label: string;
  year: number;
  edition: string;
  recommendedMemoryMB: 64 | 128;
  note: string;
}> = {
  win95: {
    label: "Windows 95",
    year: 1995,
    edition: "Windows 95 OSR2 recommended",
    recommendedMemoryMB: 64,
    note: "Classic Start menu and Chicago-era desktop. v86 recommends an OSR2-family guest setup.",
  },
  win98: {
    label: "Windows 98",
    year: 1998,
    edition: "Windows 98 Second Edition recommended",
    recommendedMemoryMB: 128,
    note: "Windows 98 SE, Internet Explorer era, and late 1990s hardware support. v86 recommends a 128 MB guest environment.",
  },
};
export const WINDOWS9X_V86_GUIDE = "https://github.com/copy/v86/blob/master/docs/windows-9x.md";
export const WINDOWS9X_DISK_LIMIT = 2 * 1024 * 1024 * 1024;
export const WINDOWS9X_CD_LIMIT = 900 * 1024 * 1024;
const FLOPPY_SIZES = new Set([368640, 737280, 1228800, 1474560, 2949120]);
const HDD_EXT = /\.(img|ima|raw|bin)$/i;
const FLOPPY_EXT = /\.(img|ima|vfd|bin)$/i;

export function validateWindows9xMedia(
  file: LocalMediaDescription,
  role: Windows9xMediaRole,
): string | null {
  if (!file || typeof file.name !== "string" || !Number.isSafeInteger(file.size) || file.size <= 0) {
    return "Choose a nonempty disk image with a valid filename.";
  }
  if (role === "harddisk") {
    if (!HDD_EXT.test(file.name))
      return "Choose a raw, preinstalled hard-disk .img, .ima, .raw or .bin, not a VHD/QCOW2 container.";
    if (file.size < 32 * 1024 * 1024 || file.size > WINDOWS9X_DISK_LIMIT)
      return "The raw Windows hard disk must be between 32 MiB and 2 GiB.";
    if (file.size % 512 !== 0)
      return "A raw hard disk must have a 512-byte-aligned capacity.";
  } else if (role === "floppy") {
    if (!FLOPPY_EXT.test(file.name) || !FLOPPY_SIZES.has(file.size))
      return "Choose a standard 360 KB, 720 KB, 1.2 MB, 1.44 MB or 2.88 MB raw floppy image.";
  } else if (role === "cdrom") {
    if (!/\.iso$/i.test(file.name) || file.size < 32768 || file.size > WINDOWS9X_CD_LIMIT)
      return "Choose a nonempty ISO CD image under 900 MiB.";
  } else {
    return "Unsupported virtual media role.";
  }
  return null;
}

export function buildWindows9xOptions(config: Windows9xConfig): V86Options {
  if (!WINDOWS9X_PROFILES[config.version]) throw new Error("Unknown Windows 9x guest profile.");
  if (![32, 64, 128].includes(config.memoryMB)) throw new Error("Unsupported Windows guest RAM size.");
  if (!(config.hardDiskFile instanceof File)) throw new Error("The hard disk must be a locally selected File.");
  const diskError = validateWindows9xMedia(config.hardDiskFile, "harddisk");
  if (diskError) throw new Error(diskError);
  if (config.cdromUrl && (!config.cdromUrl.startsWith("blob:") ||
      !config.cdromSize ||
      validateWindows9xMedia({ name: "cd.iso", size: config.cdromSize }, "cdrom"))) {
    throw new Error("The optional CD-ROM must be a local ISO.");
  }
  return {
    wasm_path: config.baseUrl + "vendor/v86.wasm",
    bios: { url: config.baseUrl + "vendor/seabios.bin" },
    vga_bios: { url: config.baseUrl + "vendor/vgabios.bin" },
    memory_size: config.memoryMB * 1024 * 1024,
    vga_memory_size: 8 * 1024 * 1024,
    screen_container: config.screenContainer,
    autostart: true,
    disable_speaker: false,
    bootmenu: true,
    // Prefer v86's AsyncFileBuffer, not an HTTP/XHR Blob URL.
    // It reads File slices on demand AND tracks modified 256-byte sectors.
    // v86's pinned runtime accepts this shape even though V86Image types
    // haven't yet declared File-backed async buffers.
    hda: { buffer: config.hardDiskFile, async: true } as unknown as V86Image,
    ...(config.floppyBuffer ? { fda: { buffer: config.floppyBuffer } } : {}),
    ...(config.cdromUrl && config.cdromSize
      ? { cdrom: { url: config.cdromUrl, async: true as const, size: config.cdromSize } }
      : {}),
    // No network relay or public guest networking configured.
  };
}
