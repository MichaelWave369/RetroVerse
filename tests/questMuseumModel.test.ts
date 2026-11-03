import test from "node:test";
import assert from "node:assert/strict";
import {
  QUEST_EXHIBIT_COUNT, QUEST_EXHIBIT_SPACING, QUEST_STICK_DEADZONE,
  QUEST_STICK_REPEAT_MS, boxModel, hallShift, multiplyMat4, planeModel,
  questExhibitAt, questExhibitLabel, questIndexOf,
  questMoveIndex, questPositionForIndex,
} from "../src/questMuseumModel";
import { museumWalkOrder } from "../src/museumCollection";

test("all nine Time Hall doors have corresponding immersive XR gallery positions", () => {
  assert.equal(QUEST_EXHIBIT_COUNT,9);
  assert.equal(QUEST_EXHIBIT_SPACING,4);
  for(let i=0;i<museumWalkOrder.length;i++){
    assert.equal(questExhibitAt(i),museumWalkOrder[i]);
    assert.equal(questIndexOf(questExhibitAt(i)),i);
    assert.equal(questPositionForIndex(i),i*4);
    assert.ok(questExhibitLabel(i).length>4);
  }
  assert.throws(()=>questExhibitAt(-1),/Invalid Quest/);
  assert.throws(()=>questExhibitAt(9),/Invalid Quest/);
});

test("thumbstick advances exhibit rooms, reverses and clamps at corridor ends",()=>{
  assert.ok(QUEST_STICK_DEADZONE>=0.5);
  assert.ok(QUEST_STICK_REPEAT_MS>=400);
  assert.equal(questMoveIndex(0,-1,501),1);
  assert.equal(questMoveIndex(5,1,501),4);
  assert.equal(questMoveIndex(0,1,501),0);
  assert.equal(questMoveIndex(8,-1,501),8);
  assert.equal(questMoveIndex(4,-.2,501),4);
  assert.equal(questMoveIndex(4,-1,100),4);
  assert.throws(()=>questMoveIndex(1,Number.NaN,900),/Invalid Quest/);
  assert.throws(()=>questMoveIndex(-1,-1,900),/Invalid Quest/);
});

test("column-major matrix multiplication returns identity and translation correctly",()=>{
  const id=boxModel(0,0,0,1,1,1);
  const translate=boxModel(1,2,3,1,1,1);
  assert.deepEqual([...multiplyMat4(id,translate)],[...translate]);
  assert.deepEqual([...multiplyMat4(translate,id)],[...translate]);
  const sum=multiplyMat4(translate,boxModel(4,5,6,1,1,1));
  assert.deepEqual([sum[12],sum[13],sum[14]],[5,7,9]);
  assert.throws(()=>multiplyMat4([1,2],id),/4x4/);
});

test("VR camera movement and plaque models are finite and properly oriented",()=>{
  const shift=hallShift(16);
  assert.deepEqual([shift[12],shift[13],shift[14]],[0,0,16]);
  const fallback=hallShift(8,-1.55);
  assert.deepEqual([fallback[12],fallback[13],fallback[14]],[0,-1.5499999523162842,8]);
  const plaque=planeModel(0,1.5,-3,2.78,1.31);
  assert.deepEqual([plaque[12],plaque[13],plaque[14]],[0,1.5,-3]);
  assert.ok(plaque.every(Number.isFinite));
});
