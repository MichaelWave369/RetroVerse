/**
 * Check a downloaded Windows disk against the image produced by the running
 * v86 session. This verifies exact file contents, not only name or size.
 * Reads fixed-size slices to avoid loading multi-GB images into memory.
 *
 * This cannot prove the Windows guest flushed its own filesystem writes.
 * A separate guest reboot and file inspection is still necessary.
 */
export interface DiskComparisonResult {
  bytesChecked: number;
  chunksChecked: number;
}

export type DiskComparisonProgress = (bytesCompared: number, total: number) => void;
const DEFAULT_CHUNK_BYTES = 4 * 1024 * 1024;

export async function verifyWindowsDiskDownload(
  expected: File,
  downloaded: File,
  onProgress?: DiskComparisonProgress,
  signal?: AbortSignal,
  chunkBytes = DEFAULT_CHUNK_BYTES,
): Promise<DiskComparisonResult> {
  if (!(expected instanceof File) || !(downloaded instanceof File) ||
      !Number.isSafeInteger(expected.size) || expected.size <= 0) {
    throw new Error("Choose the downloaded updated .img to compare against this session's export.");
  }
  if (!Number.isSafeInteger(chunkBytes) || chunkBytes < 1 || chunkBytes > 16 * 1024 * 1024) {
    throw new Error("Invalid comparison chunk size.");
  }
  if (expected.size !== downloaded.size) {
    throw new Error("Downloaded disk size mismatch: expected " + expected.size.toLocaleString() +
      " bytes, got " + downloaded.size.toLocaleString() + " bytes. Don't use this backup.");
  }

  let chunksChecked = 0;
  onProgress?.(0, expected.size);
  for (let offset = 0; offset < expected.size; offset += chunkBytes) {
    if (signal?.aborted) throw new Error("Windows disk verification canceled.");
    const end = Math.min(expected.size, offset + chunkBytes);
    const [known, candidate] = await Promise.all([
      expected.slice(offset, end).arrayBuffer(),
      downloaded.slice(offset, end).arrayBuffer(),
    ]);
    const left = new Uint8Array(known);
    const right = new Uint8Array(candidate);
    if (left.length !== right.length || left.length !== end - offset) {
      throw new Error("The browser returned an incomplete disk chunk.");
    }
    for (let i = 0; i < left.length; i++) {
      if (left[i] !== right[i]) {
        throw new Error("Downloaded disk differs from export at byte " +
          (offset + i).toLocaleString() + ". Keep the emulator open and export again.");
      }
    }
    chunksChecked++;
    onProgress?.(end, expected.size);
  }
  if (signal?.aborted) throw new Error("Windows disk verification canceled.");
  return { bytesChecked: expected.size, chunksChecked };
}
