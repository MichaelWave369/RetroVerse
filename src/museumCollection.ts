/**
 * Canonical RetroVerse museum inventory. The compact machine tabs and the
 * optional Time Hall share the same nine station IDs.
 */
export type MuseumStationId =
  | "dos" | "xt" | "cabinet" | "tandy" | "win9x"
  | "mac" | "c64" | "amiga" | "adventures";

export type MuseumExhibit = {
  id: MuseumStationId;
  name: string;
  tag: string;
  description: string;
  year: number;
  period: string;
  family: string;
  engine: string;
  access: "local" | "external" | "compatible";
  emblem: string;
  plaque: string;
  accent: string;
};

export const museumExhibits: readonly MuseumExhibit[] = [
  {
    id: "dos", name: "IBM PC / DOS", tag: "PLAYABLE RUNG 01",
    description: "Boot a real DOS environment using your own media or the FreeDOS demo.",
    year: 1990, period: "1990s DOS", family: "PC COMPATIBLE",
    engine: "v86 · local WebAssembly", access: "local", emblem: "C:\\>",
    plaque: "Explore DOS, command prompts and floppy-based computing. This station uses a later x86-compatible v86 computer, rather than an original 8088 IBM motherboard.",
    accent: "#b5ec8a",
  },
  {
    id: "xt", name: "IBM PC / XT", tag: "PCJS HARDWARE · RUNG 11",
    description: "Visit original 1981 IBM 5150 and 1983 XT 5160 hardware.",
    year: 1981, period: "1981–1983", family: "IBM PC / 8088",
    engine: "PCjs · external provider", access: "external", emblem: "IBM",
    plaque: "Compare the original IBM PC with its hard-disk XT successor, using the independent PCjs hardware emulator. Choose CGA color or MDA monochrome.",
    accent: "#a7d5ee",
  },
  {
    id: "cabinet", name: "DOS GAME CABINET", tag: "PLAYABLE RUNG 02",
    description: "Launch owned DOS games and manage your portable game shelf.",
    year: 1991, period: "1990s GAMING", family: "DOS GAMING",
    engine: "js-dos · external runtime", access: "external", emblem: "PLAY",
    plaque: "An arcade shelf for DOS classics. Load a game bundle you have the rights to use, and back up your game library and supported save files.",
    accent: "#f4bb8d",
  },
  {
    id: "tandy", name: "TANDY 1000 SL/2", tag: "TANDY-COMPATIBLE · RUNG 08",
    description: "Experience Tandy-compatible graphics and three-voice sound.",
    year: 1988, period: "1988–1989", family: "TANDY 1000 SL",
    engine: "DOSBox Tandy profile", access: "compatible", emblem: "TANDY",
    plaque: "A tribute to the 1988–89 Tandy 1000 SL family. Load your own 720 KB DOS disk files, and hear compatible Tandy sound. This is not an exact Tandy ROM/chipset emulator.",
    accent: "#e3cda8",
  },
  {
    id: "win9x", name: "WINDOWS 95 / 98", tag: "LOCAL V86 · RUNG 12",
    description: "Boot your own preinstalled Windows 9x raw hard disk.",
    year: 1995, period: "1995–1998", family: "WINDOWS 9X",
    engine: "v86 · local WebAssembly", access: "local", emblem: "95",
    plaque: "From the Start menu to the late-90s desktop. Bring your own authorized Windows disk, export an updated image, and verify the downloaded copy.",
    accent: "#8de9de",
  },
  {
    id: "mac", name: "MACINTOSH 68K", tag: "OFFICIAL WEB EMBED · RUNG 09",
    description: "Explore Macintosh Plus System 6 and color System 7.",
    year: 1986, period: "1986–1990s", family: "MACINTOSH 68K",
    engine: "Infinite Mac · external provider", access: "external", emblem: "⌘",
    plaque: "A one-button mouse, crisp monochrome Finder and the later color Macintosh desktop. The real emulator is independently hosted by Infinite Mac.",
    accent: "#e1e2d8",
  },
  {
    id: "c64", name: "COMMODORE 64", tag: "REMOTE C64 READY · RUNG 10",
    description: "Find Commodore BASIC, VIC-II color and SID music.",
    year: 1982, period: "1982", family: "COMMODORE 64",
    engine: "C64 READY · external provider", access: "external", emblem: "64",
    plaque: "A blinking BASIC V2 prompt, sprites, and three-voice SID sound. The C64 READY emulator runs on a separate site and requires authorized firmware.",
    accent: "#adb9fc",
  },
  {
    id: "amiga", name: "AMIGA WORKBENCH", tag: "RUNG 03 · ROM REQUIRED",
    description: "Open the Amiga world using your own Kickstart and ADF files.",
    year: 1985, period: "1985", family: "COMMODORE AMIGA",
    engine: "SAE · browser emulator", access: "compatible", emblem: "A500",
    plaque: "Stereo audio, animation, multitasking, and a creative machine well ahead of its era. Supply legitimate Kickstart and floppy images in the Amiga room.",
    accent: "#e6b9f7",
  },
  {
    id: "adventures", name: "SCUMM ADVENTURES", tag: "WEB PORTAL · RUNG 04",
    description: "Explore classic point-and-click adventures and ScummVM.",
    year: 1987, period: "1987 ONWARD", family: "POINT & CLICK",
    engine: "ScummVM · external player", access: "external", emblem: "LOOK",
    plaque: "The rise of graphic storytelling, clickable verbs, puzzles, and unforgettable computer adventures. Choose public-domain or properly licensed games.",
    accent: "#f0d18b",
  },
];

export const museumWalkOrder: readonly MuseumStationId[] = museumExhibits
  .slice()
  .sort((a, b) => a.year - b.year || a.name.localeCompare(b.name))
  .map(exhibit => exhibit.id);

export function museumExhibit(id: MuseumStationId): MuseumExhibit {
  const exhibit = museumExhibits.find(entry => entry.id === id);
  if (!exhibit) throw new Error("Unknown museum exhibit: " + id);
  return exhibit;
}

export function stepMuseum(current: MuseumStationId, delta: number): MuseumStationId {
  const index = museumWalkOrder.indexOf(current);
  if (index < 0 || !Number.isSafeInteger(delta)) throw new Error("Invalid museum route position.");
  return museumWalkOrder[((index + delta) % museumWalkOrder.length + museumWalkOrder.length) % museumWalkOrder.length];
}

export function parseMuseumVisits(saved: string | null): MuseumStationId[] {
  if (!saved || saved.length > 4096) return [];
  try {
    const decoded: unknown = JSON.parse(saved);
    if (!Array.isArray(decoded)) return [];
    const validIds = new Set<MuseumStationId>(museumWalkOrder);
    return [...new Set(decoded.filter((item): item is MuseumStationId =>
      typeof item === "string" && validIds.has(item as MuseumStationId)
    ))];
  } catch {
    return [];
  }
}
