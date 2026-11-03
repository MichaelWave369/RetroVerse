import test from "node:test";
import assert from "node:assert/strict";
import { C64_FILE_EXTENSIONS, C64_READY, C64_ROMS, validC64ProviderUrl } from "../src/c64Provider";

test("external Commodore 64 provider uses a pinned HTTPS domain", () => {
  assert.equal(validC64ProviderUrl(C64_READY.url), true);
  assert.equal(validC64ProviderUrl(C64_READY.guide), true);
  assert.equal(validC64ProviderUrl("https://evil.example/"), false);
  assert.equal(validC64ProviderUrl("https://c64ready.com.attacker.test"), false);
  assert.equal(validC64ProviderUrl("http://c64ready.com/"), false);
  assert.equal(validC64ProviderUrl("https://user@c64ready.com/"), false);
});

test("C64 ROM requirements distinguish copyrighted required and optional ROMs", () => {
  assert.deepEqual(C64_ROMS.filter(x => x.required).map(x=>[x.name,x.bytes]), [
    ["KERNAL",8192],["BASIC",8192],["CHARGEN",4096],
  ]);
  assert.deepEqual(C64_ROMS.filter(x=>!x.required).map(x=>[x.name,x.bytes]), [["1541 DOS",16384]]);
  assert.equal(C64_READY.license,"GPL-3.0-or-later");
});

test("external C64 media list includes common programs and floppy images",()=>{
  assert.ok(C64_FILE_EXTENSIONS.includes(".prg"));
  assert.ok(C64_FILE_EXTENSIONS.includes(".d64"));
  assert.ok(C64_FILE_EXTENSIONS.includes(".crt"));
  assert.ok(C64_FILE_EXTENSIONS.includes(".tap"));
});
