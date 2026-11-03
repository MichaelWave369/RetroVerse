import test from "node:test";
import assert from "node:assert/strict";
import {
  CRT_REFRESH_MS, CRT_CAPTURE_WIDTH, CRT_CAPTURE_HEIGHT,
  isLocalGuestStation, normalizeCRTText,
} from "../src/questCRT";
import { QUEST_INSPECT_TIMEOUT_MS, questSelectAction } from "../src/questInteraction";
import { museumWalkOrder } from "../src/museumCollection";

test("only local in-page v86 stations are eligible for XR screen previews",()=>{
  assert.equal(isLocalGuestStation("dos"),true);
  assert.equal(isLocalGuestStation("win9x"),true);
  for(const id of museumWalkOrder.filter(id=>id!=="dos"&&id!=="win9x")) {
    assert.equal(isLocalGuestStation(id),false);
  }
  assert.equal(isLocalGuestStation(null),false);
  assert.equal(CRT_CAPTURE_WIDTH,640);
  assert.equal(CRT_CAPTURE_HEIGHT,480);
  assert.ok(CRT_REFRESH_MS>=250);
});

test("text-only DOS CRT capture preserves bounded lines and strips control bytes",()=>{
  assert.deepEqual(normalizeCRTText("C:\\\\>DIR\r\nHELLO\u0000\u0007 WORLD\nREADY",10,3),[
    "C:\\\\>DIR","HELLO WORL","READY"
  ]);
  assert.deepEqual(normalizeCRTText("X".repeat(120),80,25),["X".repeat(80)]);
  assert.equal(normalizeCRTText(Array.from({length:50},(_,i)=>String(i)).join("\n")).length,25);
  assert.throws(()=>normalizeCRTText("abc",1000,25),/Invalid local CRT/i);
  assert.throws(()=>normalizeCRTText("abc",80,0),/Invalid local CRT/i);
});

test("first VR trigger inspects without launching a browser station",()=>{
  assert.equal(questSelectAction(null,0,0),"inspect");
  assert.equal(questSelectAction(4,5,0),"inspect");
  assert.equal(questSelectAction(0,0,0),"enter");
  assert.equal(questSelectAction(0,0,QUEST_INSPECT_TIMEOUT_MS),"enter");
});

test("VR inspection expires and must be rearmed after moving exhibits",()=>{
  assert.ok(QUEST_INSPECT_TIMEOUT_MS>=5000);
  assert.equal(questSelectAction(5,5,QUEST_INSPECT_TIMEOUT_MS+1),"inspect");
  assert.equal(questSelectAction(5,6,300),"inspect");
  assert.equal(questSelectAction(5,5,-1),"inspect");
  assert.throws(()=>questSelectAction(5,-1,100),/Invalid Quest/i);
  assert.throws(()=>questSelectAction(5,5,Number.NaN),/Invalid Quest/i);
});
