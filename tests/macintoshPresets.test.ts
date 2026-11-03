import test from "node:test";
import assert from "node:assert/strict";
import { macPresets, allowedMacOrigin } from "../src/macintoshPresets";
test("Macintosh presets use the supported Infinite Mac embed service", () => {
  assert.equal(macPresets.length, 2);
  assert.match(macPresets[0].name, /Macintosh Plus/);
  assert.match(macPresets[0].url, /System\+6\.0\.8/);
  assert.match(macPresets[1].url, /System\+7\.1/);
  for (const preset of macPresets) {
    const url = new URL(preset.url);
    assert.equal(url.origin, "https://infinitemac.org");
    assert.equal(url.pathname, "/embed");
    assert.equal(url.searchParams.get("auto_pause"), "true");
    assert.equal(new URL(preset.full).protocol, "https:");
  }
});
test("only trusted Infinite Mac frame origins can send status messages", () => {
  assert.equal(allowedMacOrigin("https://infinitemac.org"), true);
  assert.equal(allowedMacOrigin("https://www.infinitemac.org"), true);
  assert.equal(allowedMacOrigin("https://infinitemac.org.attacker.test"), false);
  assert.equal(allowedMacOrigin("http://infinitemac.org"), false);
});
