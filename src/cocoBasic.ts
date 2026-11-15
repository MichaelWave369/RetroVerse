/** RetroVerse educational CoCo BASIC subset, not a CoCo 3 ROM/6809 emulator. */
export interface CoCoState { program: Record<number,string>; variables: Record<string,number>; output: string[] }
export interface CoCoResult { state: CoCoState; message: string }
const BOOT = ["RETROVERSE / COLOR COMPUTER 3","1986 · BASIC LEARNING WORKBENCH","NOT AN ORIGINAL COCO ROM EMULATOR","TYPE HELP FOR COMMANDS","OK"];
const MAX_INPUT=240, MAX_SOURCE=500, MAX_OUTPUT=180;
export const cocoSampleProgram: Record<number,string> = {
  10:"CLS",20:'PRINT "WELCOME TO THE COCO 3"',30:'PRINT "1986 TO 2026 / RETROVERSE"',
  40:"LET X = 1",50:'PRINT "MEMORY LOOP ";X',60:"LET X = X + 1",
  70:"IF X <= 3 THEN 50",80:'PRINT "READY FOR ANOTHER ADVENTURE"',90:"END"
};
export function newCoCoState(): CoCoState {
  return {program:{},variables:{},output:[...BOOT]};
}
function append(lines:string[],...values:string[]) {
  lines.push(...values);
  if(lines.length>MAX_OUTPUT) lines.splice(0,lines.length-MAX_OUTPUT);
}
export function evalCoCoExpression(expression:string,variables:Record<string,number>):number {
  if(expression.length>MAX_INPUT) throw Error("EXPRESSION TOO LONG");
  const tokens:string[]=[], re=/\s*(\d+(?:\.\d+)?|[A-Z][A-Z0-9]*|[()+*/-])\s*/gy;
  const upper=expression.toUpperCase();
  let pos=0;
  while(pos<upper.length) {
    re.lastIndex=pos; const match=re.exec(upper);
    if(!match) throw Error("SYNTAX ERROR");
    tokens.push(match[1]); pos=re.lastIndex;
  }
  let index=0;
  function primary():number {
    const token=tokens[index++];
    if(!token) throw Error("SYNTAX ERROR");
    if(token==="+") return primary();
    if(token==="-") return -primary();
    if(token==="(") {
      const n=additive();
      if(tokens[index++]!==")") throw Error("SYNTAX ERROR");
      return n;
    }
    if(/^\d/.test(token)) return Number(token);
    if(/^[A-Z][A-Z0-9]*$/.test(token)) return variables[token]??0;
    throw Error("SYNTAX ERROR");
  }
  function multiplicative():number {
    let n=primary();
    while(tokens[index]==="*"||tokens[index]==="/") {
      const op=tokens[index++], rhs=primary();
      if(op==="/"&&rhs===0) throw Error("DIVISION BY ZERO");
      n=op==="*"?n*rhs:n/rhs;
    }
    return n;
  }
  function additive():number {
    let n=multiplicative();
    while(tokens[index]==="+"||tokens[index]==="-") {
      const op=tokens[index++], rhs=multiplicative();
      n=op==="+"?n+rhs:n-rhs;
    }
    return n;
  }
  if(!tokens.length) throw Error("SYNTAX ERROR");
  const result=additive();
  if(index!==tokens.length||!Number.isFinite(result)) throw Error("SYNTAX ERROR");
  return result;
}
function printValue(argument:string, variables:Record<string,number>):string {
  const parts:string[]=[];
  let part="", quoted=false;
  for(const char of argument) {
    if(char==='"') quoted=!quoted;
    if(char===";"&&!quoted) {parts.push(part.trim());part="";}
    else part+=char;
  }
  if(quoted) throw Error("SYNTAX ERROR");
  parts.push(part.trim());
  return parts.map(p=>!p?"":/^"[^"]*"$/.test(p)?p.slice(1,-1):String(evalCoCoExpression(p,variables))).join("");
}
type Action={jump?:number;end?:boolean};
function statement(raw:string,variables:Record<string,number>,output:string[]):Action {
  const line=raw.trim(), upper=line.toUpperCase();
  if(!line||upper==="REM"||upper.startsWith("REM ")||upper.startsWith("'")) return {};
  if(upper==="END"||upper==="STOP") return {end:true};
  if(upper==="CLS") {output.length=0;return {};}
  const p=/^(?:PRINT|\?)\s*(.*)$/i.exec(line);
  if(p) {append(output,printValue(p[1],variables));return {};}
  const assign=/^(?:LET\s+)?([A-Z][A-Z0-9]*)\s*=\s*(.+)$/i.exec(line);
  if(assign) {variables[assign[1].toUpperCase()]=evalCoCoExpression(assign[2],variables);return {};}
  const jump=/^GOTO\s+(\d+)$/i.exec(line);
  if(jump) return {jump:Number(jump[1])};
  const cond=/^IF\s+(.+?)\s*(<=|>=|<>|=|<|>)\s*(.+?)\s+THEN\s+(\d+)$/i.exec(line);
  if(cond) {
    const a=evalCoCoExpression(cond[1],variables), b=evalCoCoExpression(cond[3],variables);
    const op=cond[2], yes=op==="<"?a<b:op===">"?a>b:op==="=" ? a===b:op==="<>"?a!==b:op==="<="?a<=b:a>=b;
    return yes?{jump:Number(cond[4])}:{};
  }
  throw Error("UNSUPPORTED BASIC STATEMENT");
}
export function executeCoCoCommand(previous:CoCoState,typed:string):CoCoResult {
  const input=typed.trim();
  if(!input) return {state:previous,message:"READY"};
  if(input.length>MAX_INPUT) return {state:previous,message:"INPUT TOO LONG"};
  const program={...previous.program}, variables={...previous.variables}, output=[...previous.output];
  append(output,"> "+input);
  const state:CoCoState={program,variables,output};
  const numbered=/^(\d{1,5})(?:\s+(.*))?$/.exec(input);
  if(numbered) {
    const number=Number(numbered[1]), body=(numbered[2]??"").trim();
    if(number<1||number>63999) return {state,message:"BAD LINE NUMBER"};
    if(body&&!Object.hasOwn(program,number)&&Object.keys(program).length>=MAX_SOURCE) return {state,message:"PROGRAM FULL"};
    if(body) program[number]=body; else delete program[number];
    return {state,message:"STORED"};
  }
  try {
    const cmd=input.toUpperCase();
    if(cmd==="HELP") append(output,"COMMANDS: PRINT LET CLS LIST RUN NEW END","PROGRAM: 10 PRINT \"HELLO\" / 20 GOTO 10","IF X < 5 THEN 40 · REM · SAVE/LOAD .BAS","THIS IS A BASIC SUBSET, NOT COCO HARDWARE.");
    else if(cmd==="LIST") {
      const lines=Object.keys(program).map(Number).sort((a,b)=>a-b);
      append(output,...(lines.length?lines.map(n=>n+" "+program[n]):["NO PROGRAM IN MEMORY"]));
    } else if(cmd==="NEW") {
      state.program={};state.variables={};append(output,"PROGRAM CLEARED");
    } else if(cmd==="RUN") {
      state.variables={};
      const lines=Object.keys(program).map(Number).sort((a,b)=>a-b);
      const lookup=new Map(lines.map((n,i)=>[n,i]));
      let pc=0,steps=0;
      while(pc<lines.length) {
        if(++steps>1000) throw Error("BREAK: 1000-STEP SAFETY LIMIT");
        const line=lines[pc];
        try {
          const action=statement(program[line],state.variables,output);
          if(action.end) break;
          if(action.jump!==undefined) {
            const next=lookup.get(action.jump);
            if(next===undefined) throw Error("UNDEFINED LINE "+action.jump);
            pc=next;
          } else pc++;
        } catch(error) {throw Error((error instanceof Error?error.message:"ERROR")+" IN "+line);}
      }
      append(output,"OK");
    } else {statement(input,variables,output);append(output,"OK");}
    return {state,message:"READY"};
  } catch(error) {
    const message=error instanceof Error?error.message:"ERROR";
    append(output,"?"+message);
    return {state,message};
  }
}
export function exportCoCoProgram(program:CoCoState["program"]):string {
  return Object.keys(program).map(Number).sort((a,b)=>a-b).map(n=>n+" "+program[n]).join("\n")+"\n";
}
export function importCoCoProgram(source:string):Record<number,string> {
  if(source.length>65536) throw Error("BASIC FILE TOO LARGE (64K LIMIT)");
  const program:Record<number,string>={};
  for(const row of source.replace(/\r/g,"").split("\n")) {
    if(!row.trim()) continue;
    const entry=/^(\d{1,5})\s+(.+)$/.exec(row.trim());
    if(!entry||Number(entry[1])<1||Number(entry[1])>63999||entry[2].length>MAX_INPUT)
      throw Error("INVALID NUMBERED BASIC SOURCE LINE");
    program[Number(entry[1])]=entry[2];
    if(Object.keys(program).length>MAX_SOURCE) throw Error("PROGRAM FULL");
  }
  return program;
}
