/**
 * Export a guest-modified Windows 9x hard disk without copying its entire
 * base image into memory. This depends on the pinned v86 engine's internal
 * AsyncFileBuffer.get_as_file implementation.
 *
 * IMPORTANT: v86 exposes no stable public hard-disk image export method.
 * This helper rejects unrecognized internal shapes and mismatched base files.
 * It must only be called after v86.stop() has completed.
 */
export interface DiskExportResult {
  file: File;
  modifiedBlocks: number;
}

type FileBackedDisk = {
  file?: File;
  byteLength?: number;
  get_as_file?: (name: string) => File;
  block_cache_is_write?: Set<number>;
};
type V86Internal = {
  v86?: {
    cpu?: {
      devices?: {
        ide?: {
          primary?: {
            master?: {
              buffer?: FileBackedDisk;
            };
          };
        };
      };
    };
  };
};

export function updatedDiskFilename(original: string): string {
  const stem = original.replace(/\.(img|ima|raw|bin)$/i, "");
  return (stem.slice(0, 140) || "windows9x") + "-retroverse-updated.img";
}

export function exportUpdatedWindows9xDisk(
  engine: unknown,
  source: File,
  isPaused: boolean,
): DiskExportResult {
  if (!isPaused) throw new Error("Pause Windows before exporting its updated hard disk.");
  if (!(source instanceof File) || !source.size)
    throw new Error("Select the original Windows hard disk before exporting.");

  // This path matches the v86 browser IDE implementation. Guard every field:
  // an upstream change must produce a clear error, not a fake backup.
  const internal = engine as V86Internal | null;
  const disk = internal?.v86?.cpu?.devices?.ide?.primary?.master?.buffer;
  if (!disk || typeof disk.get_as_file !== "function" ||
      !(disk.file instanceof File) ||
      disk.file !== source ||
      disk.byteLength !== source.size) {
    throw new Error(
      "This v86 build does not expose a compatible file-backed hard disk. " +
      "No updated image was exported. Keep the emulator open and preserve your original disk."
    );
  }
  const edits = disk.block_cache_is_write;
  if (!(edits instanceof Set)) {
    throw new Error("This v86 disk backend cannot verify modified sectors. Export aborted.");
  }
  const maxBlocks = Math.ceil(source.size / 256);
  if (edits.size > maxBlocks ||
      [...edits].some(index => !Number.isSafeInteger(index) || index < 0 || index >= maxBlocks)) {
    throw new Error("Disk write tracking returned an invalid block count or sector index.");
  }

  const file = disk.get_as_file(updatedDiskFilename(source.name));
  if (!(file instanceof File) || file.size !== source.size ||
      !file.name.endsWith(".img")) {
    throw new Error("Updated hard disk output failed validation. No download was started.");
  }
  return { file, modifiedBlocks: edits.size };
}
