import type { V86Image, V86Options } from "v86";

export type MediaType = "floppy" | "harddisk" | "cdrom";
export type ProfileId = "freedos" | "dos330" | "dos500" | "dos622" | "custom";

export interface Profile {
  id: ProfileId;
  label: string;
  detail: string;
  needsOwnMedia: boolean;
}

export const profiles: Profile[] = [
  { id: "freedos", label: "FreeDOS demo", detail: "Bootable FreeDOS 720 KB floppy from the v86 demo", needsOwnMedia: false },
  { id: "dos330", label: "MS-DOS 3.30", detail: "Insert a legally obtained DOS 3.30 disk image", needsOwnMedia: true },
  { id: "dos500", label: "MS-DOS 5.0", detail: "Insert a legally obtained DOS 5.0 disk image", needsOwnMedia: true },
  { id: "dos622", label: "MS-DOS 6.22", detail: "Insert a legally obtained DOS 6.22 disk image", needsOwnMedia: true },
  { id: "custom", label: "Other PC boot media", detail: "Boot a compatible floppy, hard disk, or CD image", needsOwnMedia: true },
];

// The verified 720 KiB FreeDOS image is part of the static site build.
// No runtime cross-origin request or commercial DOS media required.
export const freeDosSamplePath = "media/freedos722.img";

export function mediaFromBuffer(buffer: ArrayBuffer): V86Image {
  return { buffer };
}

export function createOptions(params: {
  baseUrl: string;
  screenContainer: HTMLElement;
  profile: ProfileId;
  memoryMB: number;
  speaker: boolean;
  mediaType: MediaType;
  mediaBuffer?: ArrayBuffer;
}): V86Options {
  const { baseUrl, screenContainer, profile, memoryMB, speaker, mediaType, mediaBuffer } = params;
  const options: V86Options = {
    wasm_path: baseUrl + "vendor/v86.wasm",
    bios: { url: baseUrl + "vendor/seabios.bin" },
    vga_bios: { url: baseUrl + "vendor/vgabios.bin" },
    memory_size: memoryMB * 1024 * 1024,
    vga_memory_size: 4 * 1024 * 1024,
    screen_container: screenContainer,
    disable_speaker: !speaker,
    autostart: true,
    // Deliberately omit network relay: guests have no default external network connection.
  };

  if (profile === "freedos") {
    options.fda = { url: baseUrl + freeDosSamplePath };
  } else if (mediaBuffer) {
    options[mediaType === "floppy" ? "fda" : mediaType === "harddisk" ? "hda" : "cdrom"] =
      mediaFromBuffer(mediaBuffer);
  }

  return options;
}
