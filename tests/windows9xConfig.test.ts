import test from "node:test";
import assert from "node:assert/strict";
import {
  validateWindows9xMedia, buildWindows9xOptions,
  WINDOWS9X_PROFILES, WINDOWS9X_V86_GUIDE,
  WINDOWS9X_DISK_LIMIT, type Windows9xConfig,
} from "../src/windows9xConfig";

const MiB = 1024 * 1024;

test("Windows 9x profiles describe historically supported OS editions and guest RAM", () => {
  assert.deepEqual(Object.keys(WINDOWS9X_PROFILES), ["win95", "win98"]);
  assert.equal(WINDOWS9X_PROFILES.win95.recommendedMemoryMB, 64);
  assert.equal(WINDOWS9X_PROFILES.win98.recommendedMemoryMB, 128);
  assert.match(WINDOWS9X_PROFILES.win95.edition, /OSR2/);
  assert.match(WINDOWS9X_PROFILES.win98.edition, /Second Edition/);
  assert.match(WINDOWS9X_V86_GUIDE, /copy\/v86\/blob\/master\/docs\/windows-9x\.md/);
});

test("only suitably sized sector-aligned raw hard disk files can boot Windows", () => {
  for (const name of ["Win95.img", "WIN98.IMA", "windows.raw", "drive.bin"]) {
    assert.equal(validateWindows9xMedia({ name, size: 512 * MiB }, "harddisk"), null);
  }
  for (const name of ["Windows.vhd", "Windows.qcow2", "install.iso", "system.zip"]) {
    assert.match(validateWindows9xMedia({ name, size: 256 * MiB }, "harddisk") ?? "", /raw|VHD/i);
  }
  assert.match(validateWindows9xMedia({ name: "tiny.img", size: 1 * MiB }, "harddisk") ?? "", /between/i);
  assert.match(validateWindows9xMedia({ name: "huge.img", size: WINDOWS9X_DISK_LIMIT + 512 }, "harddisk") ?? "", /between/i);
  assert.match(validateWindows9xMedia({ name: "unaligned.img", size: 256 * MiB + 1 }, "harddisk") ?? "", /512/i);
});

test("optional vintage floppy drives require real supported capacities", () => {
  for (const size of [368640, 737280, 1228800, 1474560, 2949120]) {
    assert.equal(validateWindows9xMedia({ name: "BOOT.IMA", size }, "floppy"), null);
  }
  assert.match(validateWindows9xMedia({ name: "boot.iso", size: 1474560 }, "floppy") ?? "", /standard/i);
  assert.match(validateWindows9xMedia({ name: "bad.img", size: 123456 }, "floppy") ?? "", /standard/i);
});

test("CD image validation requires a user-provided ISO under 900 MiB", () => {
  assert.equal(validateWindows9xMedia({ name: "WIN98.iso", size: 600 * MiB }, "cdrom"), null);
  assert.match(validateWindows9xMedia({ name: "setup.zip", size: 600 * MiB }, "cdrom") ?? "", /ISO/i);
  assert.match(validateWindows9xMedia({ name: "oversized.iso", size: 950 * MiB }, "cdrom") ?? "", /900/i);
  assert.match(validateWindows9xMedia({ name: "empty.iso", size: 0 }, "cdrom") ?? "", /nonempty/i);
});

function config(): Windows9xConfig {
  return {
    baseUrl: "/RetroVerse/",
    screenContainer: {} as HTMLElement,
    version: "win95",
    memoryMB: 64,
    hardDiskUrl: "blob:https://michaelwave369.github.io/test-uuid",
    hardDiskSize: 256 * MiB,
  };
}

test("Windows 95 v86 boots from a local demand-paged disk with no guest networking", () => {
  const options = buildWindows9xOptions(config());
  assert.equal(options.wasm_path, "/RetroVerse/vendor/v86.wasm");
  assert.deepEqual(options.hda, {
    url: "blob:https://michaelwave369.github.io/test-uuid",
    async: true,
    size: 256 * MiB,
  });
  assert.deepEqual(options.bios, { url: "/RetroVerse/vendor/seabios.bin" });
  assert.deepEqual(options.vga_bios, { url: "/RetroVerse/vendor/vgabios.bin" });
  assert.equal(options.memory_size, 64 * MiB);
  assert.equal(options.bootmenu, true);
  assert.equal(options.network_relay_url, undefined);
  assert.equal(options.cdrom, undefined);
});

test("optional boot floppy and ISO use the right virtual device types", () => {
  const c = config();
  c.floppyBuffer = new ArrayBuffer(1474560);
  c.cdromUrl = "blob:https://michaelwave369.github.io/iso";
  c.cdromSize = 650 * MiB;
  const options = buildWindows9xOptions(c);
  assert.equal((options.fda as { buffer: ArrayBuffer }).buffer, c.floppyBuffer);
  assert.deepEqual(options.cdrom, { url: c.cdromUrl, async: true, size: c.cdromSize });
});

test("unsafe or unsupported Windows virtual machine configurations fail closed", () => {
  const c = config();
  c.hardDiskUrl = "https://external.example/windows95.img";
  assert.throws(() => buildWindows9xOptions(c), /local/i);
  c.hardDiskUrl = "blob:https://michaelwave369.github.io/test";
  c.memoryMB = 4096 as 64;
  assert.throws(() => buildWindows9xOptions(c), /RAM/i);
  c.memoryMB = 64;
  c.cdromUrl = "https://untrusted.example/windows.iso";
  c.cdromSize = 400 * MiB;
  assert.throws(() => buildWindows9xOptions(c), /local ISO/i);
});
