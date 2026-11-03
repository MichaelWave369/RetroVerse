/**
 * External C64 READY service facts and documented ROM requirements.
 * The emulator and its optional media are not shipped by RetroVerse.
 */
export const C64_READY = {
  url: "https://c64ready.com/",
  guide: "https://c64ready.com/docs/getting-started",
  source: "https://github.com/mortyeriksen/c64ready",
  license: "GPL-3.0-or-later",
} as const;
export const C64_ROMS = [
  { name: "KERNAL", bytes: 8192, required: true },
  { name: "BASIC", bytes: 8192, required: true },
  { name: "CHARGEN", bytes: 4096, required: true },
  { name: "1541 DOS", bytes: 16384, required: false },
] as const;
export const C64_FILE_EXTENSIONS = [".prg", ".d64", ".d71", ".d81", ".g64", ".crt", ".tap", ".t64", ".sid"] as const;
export function validC64ProviderUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname === "c64ready.com" && url.username === "" &&
      url.password === "" && url.port === "";
  } catch {
    return false;
  }
}
