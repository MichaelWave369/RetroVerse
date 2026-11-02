import { mkdir, copyFile, stat, writeFile, readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

const root = fileURLToPath(new URL("../", import.meta.url));
const vendor = join(root, "public", "vendor");
await mkdir(vendor, { recursive: true });

const packageBuild = join(root, "node_modules", "v86", "build");
for (const file of ["v86.wasm", "v86-fallback.wasm"]) {
  try {
    await copyFile(join(packageBuild, file), join(vendor, file));
    console.log("Copied", file);
  } catch (error) {
    if (file === "v86-fallback.wasm" && error?.code === "ENOENT") {
      console.log("Optional WASM fallback is not supplied by this v86 package version.");
    } else {
      throw error;
    }
  }
}

// Pin firmware to a verified upstream commit, instead of following a moving branch.
// SeaBIOS and VGA BIOS are LGPL-licensed firmware; see THIRD_PARTY_NOTICES.md.
const upstream = "https://raw.githubusercontent.com/copy/v86/315b2b0b758703ef0e6cc7b4088d6068f83f3c20/bios/";
for (const [name, minSize] of [["seabios.bin", 100000], ["vgabios.bin", 30000]]) {
  const target = join(vendor, name);
  try {
    if ((await stat(target)).size >= minSize) {
      console.log("Using cached", name);
      continue;
    }
  } catch {
    // First build.
  }
  const response = await fetch(upstream + name);
  if (!response.ok) throw new Error("Could not download " + name + ": HTTP " + response.status);
  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.byteLength < minSize) throw new Error("Unexpectedly small firmware file: " + name);
  await writeFile(target, bytes);
  console.log("Downloaded", name, bytes.byteLength, "bytes");
}


// The runtime FreeDOS download previously failed in some browsers.
// Prepare it on the build runner instead and serve it from our own origin.
// Pin the exact archived upstream commit AND verify the file's Git blob SHA.
const sampleDir = join(root, "public", "media");
const sampleTarget = join(sampleDir, "freedos722.img");
const sampleUrl = "https://raw.githubusercontent.com/copy/images/db92d8fd4a53dbd73b8e0588bb4bd8fe37a1975a/freedos722.img";
const sampleSize = 737280;
const sampleGitBlob = "ec7a4cf9fc9a30adbc83c5b4755c637568a74d9a";

function validSample(bytes) {
  if (bytes.length !== sampleSize) return false;
  if (bytes[510] !== 0x55 || bytes[511] !== 0xaa) return false;
  const computed = createHash("sha1")
    .update("blob " + bytes.length + "\0")
    .update(bytes)
    .digest("hex");
  return computed === sampleGitBlob;
}

await mkdir(sampleDir, { recursive: true });
let cachedSample;
try { cachedSample = await readFile(sampleTarget); } catch { /* First build or cache miss. */ }
if (cachedSample && validSample(cachedSample)) {
  console.log("Using verified FreeDOS floppy", sampleTarget);
} else {
  const response = await fetch(sampleUrl, { signal: AbortSignal.timeout(25000) });
  if (!response.ok) throw new Error("Failed to fetch pinned FreeDOS boot floppy: HTTP " + response.status);
  const bytes = Buffer.from(await response.arrayBuffer());
  if (!validSample(bytes)) throw new Error("FreeDOS image failed 720 KiB boot-sector / pinned Git SHA verification");
  await writeFile(sampleTarget, bytes);
  console.log("Prepared verified FreeDOS floppy", bytes.length, "bytes");
}
