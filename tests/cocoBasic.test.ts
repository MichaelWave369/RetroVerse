import test from "node:test";
import assert from "node:assert/strict";
import { newCoCoState, executeCoCoCommand, evalCoCoExpression, exportCoCoProgram, importCoCoProgram, cocoSampleProgram } from "../src/cocoBasic";

test("CoCo workbench clearly labels itself as a simulation",()=>{
  assert.match(newCoCoState().output.join(" "),/NOT AN ORIGINAL COCO ROM EMULATOR/);
});
test("numeric BASIC expressions are parsed safely",()=>{
  assert.equal(evalCoCoExpression("2+3*4",{}),14);
  assert.equal(evalCoCoExpression("(2+3)*4",{}),20);
  assert.equal(evalCoCoExpression("X+2",{X:5}),7);
  assert.throws(()=>evalCoCoExpression("2**3",{}),/SYNTAX/);
  assert.throws(()=>evalCoCoExpression("4/0",{}),/DIVISION/);
  assert.throws(()=>evalCoCoExpression("process.exit()",{}),/SYNTAX/);
});
test("numbered lines are stored, listed, and deleted",()=>{
  let state=newCoCoState();
  state=executeCoCoCommand(state,'20 PRINT "SECOND"').state;
  state=executeCoCoCommand(state,'10 PRINT "FIRST"').state;
  state=executeCoCoCommand(state,"LIST").state;
  assert.ok(state.output.join("\n").includes('10 PRINT "FIRST"\n20 PRINT "SECOND"'));
  state=executeCoCoCommand(state,"10").state;
  assert.equal(state.program[10],undefined);
});
test("sample program runs a finite IF/GOTO loop",()=>{
  const out=executeCoCoCommand({...newCoCoState(),program:{...cocoSampleProgram}},"RUN");
  const text=out.state.output.join("\n");
  assert.match(text,/MEMORY LOOP 1/);
  assert.match(text,/MEMORY LOOP 2/);
  assert.match(text,/MEMORY LOOP 3/);
  assert.equal(out.state.variables.X,4);
  assert.equal(out.message,"READY");
});
test("runaway loops and undefined lines produce bounded diagnostics",()=>{
  assert.match(executeCoCoCommand({...newCoCoState(),program:{10:"GOTO 10"}},"RUN").message,/1000-STEP/);
  assert.match(executeCoCoCommand({...newCoCoState(),program:{10:"GOTO 99"}},"RUN").message,/UNDEFINED LINE/);
});
test("import and export BASIC source without executing the file",()=>{
  assert.deepEqual(importCoCoProgram(exportCoCoProgram(cocoSampleProgram)),cocoSampleProgram);
  assert.throws(()=>importCoCoProgram("console.log('nope')"),/INVALID/);
  assert.throws(()=>importCoCoProgram("a".repeat(65537)),/TOO LARGE/);
});
