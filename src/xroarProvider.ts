/** Canonical XRoar resources. XRoar is GPL-3.0-or-later software by Ciaran Anscomb. */
export const XROAR_ONLINE_URL = "https://www.6809.org.uk/xroar/online/";
export const XROAR_HOME_URL = "https://www.6809.org.uk/xroar/";
export const XROAR_SOURCE_URL = "https://www.6809.org.uk/git/xroar.git";
export const XROAR_ONLINE_ABOUT_URL = "https://www.6809.org.uk/xroar/online/about.shtml";
export const XROAR_MANUAL_URL = "https://www.6809.org.uk/xroar/doc/xroar.shtml";

/**
 * XRoar manual's expected headerless Super Extended Color BASIC firmware.
 * Filenames/sizes are guidance only: no ROMs are included, downloaded or
 * passed by RetroVerse to another origin.
 */
export const COCO3_FIRMWARE = [
  { name: "coco3.rom", bytes: 32768, description: "NTSC CoCo 3 Super Extended Color BASIC" },
  { name: "coco3p.rom", bytes: 32768, description: "PAL CoCo 3 Super Extended Color BASIC" },
] as const;

export const COCO3_XROAR_PROFILE = "coco3";
