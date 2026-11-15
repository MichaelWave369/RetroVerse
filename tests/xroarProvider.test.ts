import test from "node:test";
import assert from "node:assert/strict";
import { COCO3_FIRMWARE, COCO3_XROAR_PROFILE, XROAR_HOME_URL,
  XROAR_MANUAL_URL, XROAR_ONLINE_URL, XROAR_SOURCE_URL } from "../src/xroarProvider";

test("CoCo 3 real emulator provider is the verified official XRoar origin",()=>{
  assert.equal(XROAR_ONLINE_URL,"https://www.6809.org.uk/xroar/online/");
  assert.equal(XROAR_HOME_URL,"https://www.6809.org.uk/xroar/");
  assert.equal(XROAR_SOURCE_URL,"https://www.6809.org.uk/git/xroar.git");
  assert.equal(new URL(XROAR_MANUAL_URL).hostname,"www.6809.org.uk");
  assert.equal(COCO3_XROAR_PROFILE,"coco3");
});
test("published firmware metadata is descriptive, not included binaries",()=>{
  assert.deepEqual(COCO3_FIRMWARE.map(x=>[x.name,x.bytes]),
    [["coco3.rom",32768],["coco3p.rom",32768]]);
  assert.ok(COCO3_FIRMWARE.every(x=>x.description.includes("CoCo 3")));
});
