import test from "node:test";
import assert from "node:assert/strict";
import { PCXT_PRESETS, PCJS_SOURCE, PCJS_LICENSE_NOTICE, isOfficialPcjsMachineUrl } from "../src/pcxtPresets";

test("PCjs models include exactly four IBM 5150/5160 original 8088 configurations", () => {
  assert.equal(PCXT_PRESETS.length, 4);
  assert.deepEqual(PCXT_PRESETS.map(p => p.id), ["xt-cga", "xt-mda", "pc-cga", "pc-mda"]);
  assert.equal(PCXT_PRESETS.filter(p => p.year === 1981).length, 2);
  assert.equal(PCXT_PRESETS.filter(p => p.year === 1983).length, 2);
  for (const preset of PCXT_PRESETS) {
    assert.match(preset.cpu, /8088.*4\.77/);
    assert.ok(isOfficialPcjsMachineUrl(preset.url));
  }
});

test("IBMs have historically grounded RAM, disk and display options", () => {
  for (const preset of PCXT_PRESETS) {
    if (preset.year === 1981) {
      assert.equal(preset.ram, "64 KB");
      assert.match(preset.storage, /Dual floppy/);
    } else {
      assert.equal(preset.ram, "256 KB");
      assert.match(preset.storage, /10 MB/);
    }
  }
  assert.deepEqual(new Set(PCXT_PRESETS.map(p => p.display)), new Set(["CGA color", "MDA monochrome"]));
});

test("PCjs external URLs are exact allowlisted HTTPS machine destinations", () => {
  assert.equal(isOfficialPcjsMachineUrl(PCXT_PRESETS[0].url), true);
  assert.equal(isOfficialPcjsMachineUrl("https://pcjs.org/machines/pcx86/ibm/5160/cga/"), false);
  assert.equal(isOfficialPcjsMachineUrl("https://www.pcjs.org.evil.test/machines/pcx86/ibm/5160/cga/"), false);
  assert.equal(isOfficialPcjsMachineUrl("http://www.pcjs.org/machines/pcx86/ibm/5160/cga/"), false);
  assert.equal(isOfficialPcjsMachineUrl("https://www.pcjs.org/machines/pcx86/ibm/5160/cga/?redirect=elsewhere"), false);
  assert.equal(isOfficialPcjsMachineUrl("https://user@www.pcjs.org/machines/pcx86/ibm/5160/cga/"), false);
  assert.match(PCJS_SOURCE, /github\.com\/jeffpar\/pcjs/);
  assert.match(PCJS_LICENSE_NOTICE, /2012.*2026.*Jeff Parsons/);
});
