import { useEffect, useRef, useState } from "react";
import { cocoSampleProgram, executeCoCoCommand, exportCoCoProgram, importCoCoProgram, newCoCoState, type CoCoState } from "./cocoBasic";
import { COCO3_FIRMWARE, XROAR_HOME_URL, XROAR_MANUAL_URL, XROAR_ONLINE_URL, XROAR_SOURCE_URL } from "./xroarProvider";

const keyboardRows = ["1234567890","QWERTYUIOP","ASDFGHJKL","ZXCVBNM"];
/** Nostalgia station, explicitly NOT original 6809/ROM emulation. */
export default function CoCo3Room() {
  const [powered,setPowered]=useState(false);
  const [inlineXRoar,setInlineXRoar]=useState(false);
  const [machine,setMachine]=useState<CoCoState>(()=>newCoCoState());
  const [input,setInput]=useState("");
  const [notice,setNotice]=useState("Power on to open the local BASIC workbench.");
  const [cartridge,setCartridge]=useState<{name:string;bytes:number}|null>(null);
  const terminal=useRef<HTMLDivElement>(null);
  const keyboard=useRef<HTMLInputElement>(null);
  const basicPicker=useRef<HTMLInputElement>(null);
  const romPicker=useRef<HTMLInputElement>(null);

  useEffect(()=>{ terminal.current?.scrollTo({top:terminal.current.scrollHeight,behavior:"instant"}); },[machine.output]);

  function start() {
    setMachine(newCoCoState());setInput("");setPowered(true);
    setNotice("BASIC ready. Type a command or use the keys below.");
    requestAnimationFrame(()=>keyboard.current?.focus());
  }
  function stop() {
    setPowered(false);setInput("");
    setNotice("Powered off. Export any program you want to keep before the next boot.");
  }
  function submit(value:string) {
    if(!powered)return;
    const result=executeCoCoCommand(machine,value);
    setMachine(result.state);setInput("");
    setNotice(result.message==="READY"||result.message==="STORED"?"BASIC ready.":result.message);
    requestAnimationFrame(()=>keyboard.current?.focus());
  }
  function keyPress(key:string) {
    if(!powered)return;
    if(key==="ENTER"){submit(input);return;}
    if(key==="DEL")setInput(value=>value.slice(0,-1));
    else setInput(value=>(value+(key==="SPACE"?" ":key)).slice(0,240));
    keyboard.current?.focus();
  }
  function loadSample(){
    if(!powered)return;
    setMachine(prev=>({...prev,program:{...cocoSampleProgram},
      output:[...prev.output,"SAMPLE PROGRAM LOADED. TYPE LIST OR RUN.","OK"].slice(-180)}));
    setNotice("Sample ready. LIST shows the code; RUN starts it.");
    keyboard.current?.focus();
  }
  function saveBasic(){
    if(!powered)return;
    const blob=new Blob([exportCoCoProgram(machine.program)],{type:"text/plain;charset=utf-8"});
    const url=URL.createObjectURL(blob),link=document.createElement("a");
    link.href=url;link.download="retroverse-coco3-program.bas";
    document.body.appendChild(link);link.click();link.remove();
    window.setTimeout(()=>URL.revokeObjectURL(url),1500);
    setNotice("Plain text BASIC program exported.");
  }
  async function loadBasic(file:File){
    if(!powered)return;
    try{
      if(file.size>65536)throw Error("BASIC source must be 64KB or smaller.");
      const program=importCoCoProgram(await file.text());
      setMachine(prev=>({...prev,program,variables:{},
        output:[...prev.output,"LOADED "+Object.keys(program).length+" BASIC LINES FROM "+file.name,"OK"].slice(-180)}));
      setNotice("BASIC imported locally. Type LIST or RUN.");
    }catch(error){setNotice(error instanceof Error?error.message:"Cannot read BASIC file.");}
  }
  function inspectRom(file:File){
    if(file.size>2097152){setNotice("ROM inspection limit: 2MB.");return;}
    setCartridge({name:file.name,bytes:file.size});
    setNotice("ROM identified locally, NOT executed or uploaded. Use a full CoCo emulator with authorized firmware to run it.");
  }

  return <section className="coco-room" aria-label="TRS-80 Color Computer 3 museum exhibit">
    <div className="coco-heading">
      <div><p className="coco-kicker">RETROVERSE / 1986 / FIRST COMPUTER</p>
        <h2>TRS-80 <span>COLOR COMPUTER 3</span></h2>
        <p>The CoCo 3 came first. Before the Tandy 1000 SL/2, there was the CRT, a cartridge slot, and the magic of making a computer respond to BASIC.</p>
      </div>
      <div className="coco-specs"><strong>RADIO SHACK / TANDY</strong><span>1986</span><span>MOTOROLA 6809E</span><span>128 KB BASE RAM</span></div>
    </div>
    <section className="coco-xroar" aria-label="Real CoCo 3 hardware emulator">
      <div className="coco-xroar-heading">
        <div>
          <span className="coco-xroar-eyebrow">REAL 6809 HARDWARE EMULATION · OFFICIAL PROVIDER</span>
          <h3>RUN A REAL COCO 3 IN YOUR BROWSER</h3>
          <p>XRoar Online runs a real WebAssembly CoCo 3 emulator. It is hosted by XRoar's developer, independently of RetroVerse. Your files are selected inside XRoar, not sent to RetroVerse.</p>
        </div>
        <div className="coco-xroar-actions">
          <a href={XROAR_ONLINE_URL} target="_blank" rel="noopener noreferrer">OPEN XROAR ONLINE ↗</a>
          <button type="button" onClick={()=>setInlineXRoar(current=>!current)} aria-expanded={inlineXRoar}
            aria-controls="retroverse-coco-xroar-frame">{inlineXRoar?"CLOSE EXPERIMENTAL FRAME":"TRY IN-PAGE VIEW"}</button>
        </div>
      </div>
      <p className="coco-xroar-guide">Inside XRoar: select <strong>Hardware → Machine → CoCo 3</strong>, provide authorized firmware (usually <code>{COCO3_FIRMWARE[0].name}</code>, {COCO3_FIRMWARE[0].bytes.toLocaleString()} bytes), then load your own CoCo game using XRoar's media controls. The disk controller may need its own ROM. Silpheed is not bundled.</p>
      {inlineXRoar && <div id="retroverse-coco-xroar-frame" className="coco-xroar-embed">
        <div className="coco-xroar-embed-note">EXPERIMENTAL EXTERNAL FRAME · If the provider blocks embedding, use the full-page launch instead. CoCo keyboard and browser focus can work better full-page.</div>
        <iframe title="Official XRoar Online real CoCo emulator (third-party website)"
          src={XROAR_ONLINE_URL} allow="fullscreen; gamepad" allowFullScreen referrerPolicy="no-referrer" />
        <a href={XROAR_ONLINE_URL} target="_blank" rel="noopener noreferrer">OPEN FULL-PAGE FALLBACK ↗</a>
      </div>}
    </section>
    <div className="coco-layout">
      <div className="coco-machine">
        <div className="coco-monitor">
          <div className="coco-monitor-top"><span>COLOR COMPUTER 3</span><span className={"coco-led"+(powered?" lit":"")} aria-label={powered?"Power on":"Power off"}/></div>
          <div className="coco-crt">
            {powered?<div className="coco-terminal" ref={terminal} role="log" aria-live="polite" aria-label="BASIC output">
              {machine.output.map((row,index)=><div key={index}>{row||"\u00a0"}</div>)}
            </div>:<div className="coco-idle"><span>Φ</span><strong>NO SIGNAL</strong><small>PRESS POWER TO BEGIN</small></div>}
            <div className="coco-scanlines" aria-hidden="true"/>
          </div>
          <div className="coco-monitor-footer"><span>AN 8-BIT MEMORY / A MODERN BROWSER</span>
            <button type="button" onClick={powered?stop:start} aria-label={powered?"Power off BASIC workbench":"Power on BASIC workbench"}>{powered?"⏻ OFF":"⏻ POWER"}</button>
          </div>
        </div>
        <form className="coco-command" onSubmit={event=>{event.preventDefault();submit(input);}}>
          <label htmlFor="coco-input">BASIC COMMAND LINE</label>
          <div><span aria-hidden="true">&gt;</span><input id="coco-input" ref={keyboard} type="text" value={input} disabled={!powered}
            maxLength={240} autoComplete="off" spellCheck={false} onChange={event=>setInput(event.target.value.slice(0,240))}
            placeholder={powered?'PRINT "HELLO"':"Power on first"}/>
            <button type="submit" disabled={!powered}>ENTER ↵</button></div>
        </form>
        <div className="coco-keys" aria-label="On-screen CoCo inspired keyboard">
          {keyboardRows.map((keys,index)=><div className="coco-keyrow" key={index}>
            {Array.from(keys).map(key=><button type="button" key={key} disabled={!powered} onClick={()=>keyPress(key)}>{key}</button>)}
          </div>)}
          <div className="coco-keyrow coco-keyrow-special">{["SPACE",'"',";","=","+","-","*","/","(",")","DEL","ENTER"].map(key=>
            <button type="button" key={key} disabled={!powered} onClick={()=>keyPress(key)}>{key}</button>)}</div>
        </div>
        <p className="coco-notice" role="status" aria-live="polite">{notice}</p>
      </div>
      <aside className="coco-sidebar">
        <div className="coco-panel">
          <h3>THE BASIC WORKBENCH</h3>
          <p>This is a browser-local <strong>BASIC learning simulation</strong>, not a 6809 emulator, original Extended Color BASIC ROM, or commercial game player.</p>
          <div className="coco-actions">
            <button type="button" disabled={!powered} onClick={loadSample}>LOAD SAMPLE PROGRAM</button>
            <button type="button" disabled={!powered} onClick={()=>submit("RUN")}>RUN PROGRAM</button>
            <button type="button" disabled={!powered} onClick={()=>submit("LIST")}>LIST PROGRAM</button>
            <button type="button" disabled={!powered} onClick={saveBasic}>SAVE .BAS</button>
            <button type="button" disabled={!powered} onClick={()=>basicPicker.current?.click()}>OPEN .BAS</button>
            <input hidden ref={basicPicker} type="file" accept=".bas,.txt,text/plain" onChange={event=>{const file=event.target.files?.[0];if(file)void loadBasic(file);event.target.value="";}}/>
          </div>
          <p className="coco-fineprint">Supports numbered lines, PRINT, arithmetic, variables, IF…THEN line, GOTO, REM, CLS, RUN, LIST, NEW, END. No original CoCo graphics modes or hardware instructions.</p>
        </div>
        <div className="coco-panel coco-memory">
          <h3>SILPHEED / THE MEMORY THAT STARTED IT</h3>
          <p><strong>Silpheed</strong> reached the CoCo 3 in 1988. This exhibit honors that game without bundling its copyrighted program or pretending to run it.</p>
          <div className="coco-cartridge"><div aria-hidden="true">▣</div><span>COCO 3<br/>CARTRIDGE BAY</span></div>
          <button className="coco-inspect" type="button" onClick={()=>romPicker.current?.click()}>INSPECT MY OWN ROM</button>
          <input hidden ref={romPicker} type="file" accept=".rom,.ccc,.bin" onChange={event=>{const file=event.target.files?.[0];if(file)inspectRom(file);event.target.value="";}}/>
          <p className="coco-fineprint">{cartridge?cartridge.name+" · "+cartridge.bytes.toLocaleString()+" bytes · inspected, not executed":"Bring your own authorized ROM. File name/size inspection only."}</p>
        </div>
        <div className="coco-panel">
          <h3>BUILD FROM THE ACTUAL XROAR SOURCE</h3>
          <p>XRoar is GPLv3-or-later, by Ciaran Anscomb. Its official source supports Emscripten/WebAssembly builds. A reproducible build guide is included in RetroVerse.</p>
          <a className="coco-external" href={XROAR_HOME_URL} target="_blank" rel="noopener noreferrer">OFFICIAL XROAR PROJECT ↗</a>
          <a className="coco-external coco-external-secondary" href={XROAR_MANUAL_URL} target="_blank" rel="noopener noreferrer">READ XROAR MANUAL ↗</a>
          <p className="coco-fineprint">Upstream Git source: <code>{XROAR_SOURCE_URL}</code>. The hosted frame is the developer's website; RetroVerse has not compiled or shipped an XRoar WASM binary.</p>
        </div>
      </aside>
    </div>
  </section>;
}
