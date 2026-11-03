/** Verified original IBM 5150/5160 configurations hosted by the PCjs project. */
export type PcXtId = "xt-cga" | "xt-mda" | "pc-cga" | "pc-mda";

export interface PcXtPreset {
  id: PcXtId;
  name: string;
  year: number;
  cpu: string;
  ram: string;
  display: "CGA color" | "MDA monochrome";
  storage: string;
  url: string;
  description: string;
}

export const PCXT_PRESETS: readonly PcXtPreset[] = [
  {
    id: "xt-cga",
    name: "IBM PC XT (5160) · CGA",
    year: 1983,
    cpu: "Intel 8088 · 4.77 MHz",
    ram: "256 KB",
    display: "CGA color",
    storage: "10 MB hard disk + floppies",
    url: "https://www.pcjs.org/machines/pcx86/ibm/5160/cga/",
    description: "The 1983 XT with a real hard disk and Color Graphics Adapter. The official PCjs configuration includes its own machine and disk controls.",
  },
  {
    id: "xt-mda",
    name: "IBM PC XT (5160) · MDA",
    year: 1983,
    cpu: "Intel 8088 · 4.77 MHz",
    ram: "256 KB",
    display: "MDA monochrome",
    storage: "10 MB hard disk + floppies",
    url: "https://www.pcjs.org/machines/pcx86/ibm/5160/mda/",
    description: "The original XT in crisp 80-column monochrome text, modeled through the Monochrome Display Adapter.",
  },
  {
    id: "pc-cga",
    name: "IBM PC (5150) · CGA",
    year: 1981,
    cpu: "Intel 8088 · 4.77 MHz",
    ram: "64 KB",
    display: "CGA color",
    storage: "Dual floppy drives",
    url: "https://www.pcjs.org/machines/pcx86/ibm/5150/cga/",
    description: "Return to the original 1981 IBM PC, with two floppy drives and early Color Graphics Adapter output.",
  },
  {
    id: "pc-mda",
    name: "IBM PC (5150) · MDA",
    year: 1981,
    cpu: "Intel 8088 · 4.77 MHz",
    ram: "64 KB",
    display: "MDA monochrome",
    storage: "Dual floppy drives",
    url: "https://www.pcjs.org/machines/pcx86/ibm/5150/mda/",
    description: "The first IBM PC in its monochrome office-computing configuration.",
  },
] as const;

export const PCJS_SOURCE = "https://github.com/jeffpar/pcjs";
export const PCJS_LICENSE_NOTICE = "PCjs © 2012–2026 Jeff Parsons";

export function isOfficialPcjsMachineUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      url.host === "www.pcjs.org" &&
      url.username === "" &&
      url.password === "" &&
      url.search === "" &&
      url.hash === "" &&
      PCXT_PRESETS.some(preset => preset.url === url.href)
    );
  } catch {
    return false;
  }
}
