import { mkdir, copyFile, stat, writeFile } from "node:fs/promises";
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
