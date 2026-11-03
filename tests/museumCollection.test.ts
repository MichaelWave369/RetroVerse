import test from "node:test";
import assert from "node:assert/strict";
import {
  museumExhibits, museumExhibit, museumWalkOrder,
  parseMuseumVisits, stepMuseum,
} from "../src/museumCollection";

const stationIds = [
  "dos", "xt", "cabinet", "tandy", "win9x", "mac", "c64", "amiga", "adventures"
];

test("Time Hall and compact tabs have exactly the original nine unique machines", () => {
  assert.equal(museumExhibits.length,9);
  assert.deepEqual(new Set(museumExhibits.map(x=>x.id)),new Set(stationIds));
  assert.equal(new Set(museumWalkOrder).size,9);
  assert.deepEqual(new Set(museumWalkOrder),new Set(stationIds));
  for(const exhibit of museumExhibits) {
    assert.ok(exhibit.name.trim());
    assert.ok(exhibit.tag.trim());
    assert.ok(exhibit.description.trim());
    assert.ok(exhibit.plaque.trim());
    assert.ok(exhibit.engine.trim());
    assert.match(exhibit.accent,/^#[0-9a-f]{6}$/i);
    assert.equal(museumExhibit(exhibit.id).id,exhibit.id);
  }
});

test("historical route is chronological and uses known original eras", () => {
  const years=museumWalkOrder.map(id=>museumExhibit(id).year);
  assert.deepEqual(years,[...years].sort((a,b)=>a-b));
  assert.equal(museumWalkOrder[0],"xt");
  assert.equal(museumWalkOrder[museumWalkOrder.length-1],"win9x");
  assert.equal(museumExhibit("tandy").year,1988);
  assert.equal(museumExhibit("c64").year,1982);
  assert.equal(museumExhibit("amiga").year,1985);
});

test("arrow navigation moves in both directions and wraps after last door",()=>{
  const first=museumWalkOrder[0], last=museumWalkOrder[museumWalkOrder.length-1];
  assert.equal(stepMuseum(last,1),first);
  assert.equal(stepMuseum(first,-1),last);
  assert.equal(stepMuseum(stepMuseum(first,1),-1),first);
  assert.equal(stepMuseum(first,museumWalkOrder.length),first);
  assert.throws(()=>stepMuseum(first,0.5),/Invalid museum/);
});

test("visit stamps load only valid IDs and discard duplicates or corrupt storage",()=>{
  assert.deepEqual(parseMuseumVisits(null),[]);
  assert.deepEqual(parseMuseumVisits("not-json"),[]);
  assert.deepEqual(parseMuseumVisits(JSON.stringify(["c64","c64","tandy","bogus",null,42,"dos"])),["c64","tandy","dos"]);
  assert.deepEqual(parseMuseumVisits(JSON.stringify({id:"mac"})),[]);
  assert.deepEqual(parseMuseumVisits("x".repeat(5000)),[]);
});

test("remote and compatible exhibits honestly identify their host or limitation",()=>{
  assert.equal(museumExhibit("dos").access,"local");
  assert.equal(museumExhibit("win9x").access,"local");
  assert.equal(museumExhibit("xt").access,"external");
  assert.equal(museumExhibit("mac").access,"external");
  assert.equal(museumExhibit("c64").access,"external");
  assert.equal(museumExhibit("tandy").access,"compatible");
  assert.match(museumExhibit("tandy").plaque,/not an exact Tandy/i);
});
