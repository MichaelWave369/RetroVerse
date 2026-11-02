export type MacId = "plus" | "quadra";
export interface MacPreset { id: MacId; name: string; machine: string; era: string; emulator: string; url: string; full: string; description: string; }
export const macPresets: MacPreset[] = [
  { id:"plus", name:"Macintosh Plus · System 6.0.8", machine:"Macintosh Plus", era:"1986–1991", emulator:"Mini vMac", url:"https://infinitemac.org/embed?disk=System+6.0.8&machine=Mac+Plus&auto_pause=true", full:"https://system6.app/", description:"The compact monochrome Macintosh: Finder, a one-button mouse, and the System 6 desktop." },
  { id:"quadra", name:"Quadra 650 · System 7.1", machine:"Quadra 650", era:"1990s", emulator:"Basilisk II", url:"https://infinitemac.org/embed?disk=System+7.1&infinite_hd=true&machine=Quadra+650&auto_pause=true", full:"https://system7.app/", description:"A later color Macintosh running System 7.1, supported by the official Infinite Mac embed." },
];
export const MAC_ORIGINS = ["https://infinitemac.org", "https://www.infinitemac.org"];
export const allowedMacOrigin = (origin: string) => MAC_ORIGINS.includes(origin);
