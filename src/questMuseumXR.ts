import { museumExhibit, museumWalkOrder, type MuseumStationId } from "./museumCollection";
import { CRT_CAPTURE_WIDTH, CRT_CAPTURE_HEIGHT, CRT_REFRESH_MS, paintLocalCRT, isLocalGuestStation } from "./questCRT";
import { questSelectAction } from "./questInteraction";
import {
  boxModel, hallShift, multiplyMat4, planeModel,
  QUEST_EXHIBIT_SPACING, questExhibitAt, questIndexOf,
  questMoveIndex, questPositionForIndex, questExhibitLabel,
} from "./questMuseumModel";

/**
 * Small native WebXR renderer. No CDN, outside 3D engine or proprietary media.
 * On Quest Browser, each exhibit uses native stereo WebGL2. Triggers first
 * inspect in VR and only a second trigger opens the existing 2D room.
 *
 * An already-running local v86 DOS/Win9x canvas may be shown read-only.
 * Cross-origin emulator frames and multiplayer remain out of scope.
 */
type XRReference = object;
type XRView = {
  projectionMatrix: Float32Array;
  transform: { inverse: { matrix: Float32Array } };
};
type XRFrame = {
  getViewerPose(space: XRReference): { views: readonly XRView[] } | null;
};
type XRInput = {
  handedness?: string;
  gamepad?: { axes: readonly number[] };
};
type XRLayer = {
  framebuffer: WebGLFramebuffer | null;
  getViewport(view: XRView): { x: number; y: number; width: number; height: number } | null;
};
type XRSessionLike = {
  renderState: { baseLayer?: XRLayer };
  inputSources: readonly XRInput[];
  requestReferenceSpace(name: "local-floor" | "local"): Promise<XRReference>;
  updateRenderState(state: { baseLayer: XRLayer; depthNear?: number; depthFar?: number }): void;
  requestAnimationFrame(cb: (time: number, frame: XRFrame) => void): number;
  addEventListener(type: string, handler: () => void): void;
  removeEventListener(type: string, handler: () => void): void;
  end(): Promise<void>;
};
type XRSystemLike = {
  isSessionSupported(mode: "immersive-vr"): Promise<boolean>;
  requestSession(mode: "immersive-vr", init: { optionalFeatures: string[] }): Promise<XRSessionLike>;
};
type XRLayerConstructor = new (
  session: XRSessionLike, gl: WebGL2RenderingContext,
  options?: { alpha?: boolean; depth?: boolean; antialias?: boolean },
) => XRLayer;

const XR_CONTEXT = { xrCompatible: true, antialias: true, depth: true, alpha: false };
const VERT_COLOR = `#version 300 es
precision highp float;
in vec3 aPosition;
uniform mat4 uVP;
uniform mat4 uModel;
void main() { gl_Position = uVP * uModel * vec4(aPosition, 1.0); }`;
const FRAG_COLOR = `#version 300 es
precision mediump float;
uniform vec3 uColor;
out vec4 outColor;
void main() { outColor = vec4(uColor, 1.0); }`;
const VERT_TEXTURE = `#version 300 es
precision highp float;
in vec3 aPosition;
in vec2 aUV;
out vec2 vUV;
uniform mat4 uVP;
uniform mat4 uModel;
void main() { vUV = aUV; gl_Position = uVP * uModel * vec4(aPosition, 1.0); }`;
const FRAG_TEXTURE = `#version 300 es
precision mediump float;
in vec2 vUV;
uniform sampler2D uTexture;
out vec4 outColor;
void main() { outColor = texture(uTexture, vUV); }`;

type DrawProgram = {
  program: WebGLProgram;
  position: number;
  uv: number;
  vp: WebGLUniformLocation | null;
  model: WebGLUniformLocation | null;
  color: WebGLUniformLocation | null;
  sampler: WebGLUniformLocation | null;
};

export type QuestXRController = {
  end(): Promise<void>;
};

function system(): XRSystemLike | undefined {
  return (navigator as Navigator & { xr?: XRSystemLike }).xr;
}

export async function questImmersiveSupported(): Promise<boolean> {
  if (!window.isSecureContext) return false;
  const xr = system();
  if (!xr) return false;
  try { return await xr.isSessionSupported("immersive-vr"); }
  catch { return false; }
}

function createShader(gl: WebGL2RenderingContext, type: number, source: string): WebGLShader {
  const shader = gl.createShader(type);
  if (!shader) throw new Error("Could not allocate VR shader.");
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const error = gl.getShaderInfoLog(shader) || "unknown GLSL error";
    gl.deleteShader(shader);
    throw new Error("VR shader compilation failed: " + error);
  }
  return shader;
}

function createProgram(gl: WebGL2RenderingContext, vertex: string, fragment: string): DrawProgram {
  const vs = createShader(gl, gl.VERTEX_SHADER, vertex);
  const fs = createShader(gl, gl.FRAGMENT_SHADER, fragment);
  const program = gl.createProgram();
  if (!program) throw new Error("Could not allocate VR shader program.");
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  gl.deleteShader(vs);
  gl.deleteShader(fs);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const error = gl.getProgramInfoLog(program) || "unknown link error";
    gl.deleteProgram(program);
    throw new Error("VR shader linking failed: " + error);
  }
  return {
    program,
    position: gl.getAttribLocation(program, "aPosition"),
    uv: gl.getAttribLocation(program, "aUV"),
    vp: gl.getUniformLocation(program, "uVP"),
    model: gl.getUniformLocation(program, "uModel"),
    color: gl.getUniformLocation(program, "uColor"),
    sampler: gl.getUniformLocation(program, "uTexture"),
  };
}

function cubeVertices(): Float32Array {
  const p: number[][] = [
    [-.5,-.5,-.5], [.5,-.5,-.5], [.5,.5,-.5], [-.5,.5,-.5],
    [-.5,-.5,.5], [.5,-.5,.5], [.5,.5,.5], [-.5,.5,.5],
  ];
  const sides = [
    [4,5,6,7], [1,0,3,2], [0,4,7,3],
    [5,1,2,6], [3,7,6,2], [0,1,5,4],
  ];
  const vertices: number[] = [];
  for (const [a,b,c,d] of sides) {
    for (const index of [a,b,c,a,c,d]) vertices.push(...p[index]);
  }
  return new Float32Array(vertices);
}

function makeLabelTexture(gl: WebGL2RenderingContext, i: number): WebGLTexture {
  const exhibit = museumExhibit(questExhibitAt(i));
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas text support is needed for museum plaques.");

  ctx.fillStyle = "#0d222a";
  ctx.fillRect(0,0,1024,512);
  ctx.fillStyle = exhibit.accent;
  ctx.fillRect(0,0,18,512);
  ctx.fillRect(20,18,984,3);
  ctx.fillRect(20,491,984,3);
  ctx.font = "26px monospace";
  ctx.fillStyle = "#afc5bb";
  ctx.fillText("Φ RETROVERSE / QUEST 3 VR MUSEUM",45,64);
  ctx.fillText("EXHIBIT " + String(i+1).padStart(2,"0") + " OF 09 · " + exhibit.period,45,110);
  ctx.font = "bold 61px sans-serif";
  const name = exhibit.name;
  // Fit very long names without clipping by using a maximum text width.
  ctx.fillStyle = "#f2fae5";
  ctx.fillText(name,45,218,930);
  ctx.fillStyle = exhibit.accent;
  ctx.font = "38px monospace";
  ctx.fillText(exhibit.family,45,290,930);
  ctx.fillStyle = "#a8c2b1";
  ctx.font = "26px monospace";
  ctx.fillText(exhibit.engine,45,352,930);
  ctx.fillStyle = "#d8f1be";
  ctx.font = "bold 26px monospace";
  ctx.fillText("LEFT STICK: NEXT / PREVIOUS ROOM",45,417,930);
  ctx.fillText("TRIGGER: INSPECT · AGAIN: OPEN 2D COMPUTER",45,462,930);

  const texture = gl.createTexture();
  if (!texture) throw new Error("Could not allocate museum exhibit texture.");
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
  gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,canvas);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
  return texture;
}

function hexRGB(hex: string): [number,number,number] {
  const value = parseInt(hex.slice(1),16);
  return [(value>>16&255)/255,(value>>8&255)/255,(value&255)/255];
}

export async function startQuestMuseumXR(
  initial: MuseumStationId,
  onEnter: (id: MuseumStationId) => void,
  onStatus: (status: string) => void,
  onEnd: () => void,
  activeGuest: MuseumStationId | null = null,
): Promise<QuestXRController> {
  const xr = system();
  if (!xr || !window.isSecureContext) throw new Error("Immersive WebXR requires a supported HTTPS headset browser.");
  // IMPORTANT: requestSession starts immediately from the caller's click.
  // Do not await capability checks or other promises before this call.
  const session = await xr.requestSession("immersive-vr", {
    optionalFeatures: ["local-floor"],
  });
  let ended = false;
  let entering = false;
  let canvas: HTMLCanvasElement | null = null;
  let gl: WebGL2RenderingContext | null = null;
  let colorProgram: DrawProgram | null = null;
  let textureProgram: DrawProgram | null = null;
  let cubeVbo: WebGLBuffer | null = null;
  let quadVbo: WebGLBuffer | null = null;
  const textures: WebGLTexture[] = [];
  let liveTexture: WebGLTexture | null = null;
  let liveCanvas: HTMLCanvasElement | null = null;
  let liveReady = false;
  let lastLiveRefresh = -Infinity;

  let selectedIndex = questIndexOf(initial);
  let targetZ = questPositionForIndex(selectedIndex);
  let currentZ = targetZ;
  let lastTick = 0;
  let lastStickChange = -10000;
  let localFloor = true;
  let inspectionIndex: number | null = null;
  let inspectedAt = -Infinity;

  const onSelect = () => {
    if (ended || entering) return;
    const now = performance.now();
    const action = questSelectAction(inspectionIndex, selectedIndex, now - inspectedAt);
    if (action === "inspect") {
      inspectionIndex = selectedIndex;
      inspectedAt = now;
      onStatus("Inspecting " + questExhibitLabel(selectedIndex) +
        " · Press trigger AGAIN within 10 seconds to exit VR and open its browser station.");
      return;
    }
    entering = true;
    const destination = questExhibitAt(selectedIndex);
    onStatus("Leaving VR to open " + questExhibitLabel(selectedIndex) + "...");
    void session.end().then(() => onEnter(destination)).catch(() => onEnter(destination));
  };

  const onSessionEnd = () => {
    if (ended) return;
    ended = true;
    session.removeEventListener("select", onSelect);
    session.removeEventListener("end", onSessionEnd);
    if (gl) {
      for (const texture of textures) gl.deleteTexture(texture);
      if (liveTexture) gl.deleteTexture(liveTexture);
      if (cubeVbo) gl.deleteBuffer(cubeVbo);
      if (quadVbo) gl.deleteBuffer(quadVbo);
      if (colorProgram) gl.deleteProgram(colorProgram.program);
      if (textureProgram) gl.deleteProgram(textureProgram.program);
    }
    canvas?.remove();
    onEnd();
  };
  session.addEventListener("end", onSessionEnd);
  session.addEventListener("select", onSelect);

  try {
    canvas = document.createElement("canvas");
    canvas.width = 16; canvas.height = 16;
    canvas.setAttribute("aria-hidden","true");
    canvas.style.display = "none";
    document.body.appendChild(canvas);
    gl = canvas.getContext("webgl2", XR_CONTEXT as WebGLContextAttributes);
    if (!gl) throw new Error("Your browser could not create the WebGL2 context required for WebXR.");
    const renderer = gl;
    const makeCompatible = (renderer as WebGL2RenderingContext & {
      makeXRCompatible?: () => Promise<void>
    }).makeXRCompatible;
    if (typeof makeCompatible !== "function")
      throw new Error("WebGL2 makeXRCompatible is unavailable.");
    await makeCompatible.call(renderer);
    const layerClass = (window as Window & { XRWebGLLayer?: XRLayerConstructor }).XRWebGLLayer;
    if (!layerClass) throw new Error("XRWebGLLayer is unavailable in this browser.");
    const baseLayer = new layerClass(session, renderer, { alpha: false, depth: true, antialias: true });
    session.updateRenderState({ baseLayer, depthNear: 0.08, depthFar: 65 });

    let refSpace: XRReference;
    try { refSpace = await session.requestReferenceSpace("local-floor"); }
    catch {
      localFloor = false;
      refSpace = await session.requestReferenceSpace("local");
    }

    colorProgram = createProgram(renderer,VERT_COLOR,FRAG_COLOR);
    textureProgram = createProgram(renderer,VERT_TEXTURE,FRAG_TEXTURE);
    cubeVbo = renderer.createBuffer();
    quadVbo = renderer.createBuffer();
    if (!cubeVbo || !quadVbo) throw new Error("Unable to create museum geometry buffers.");
    renderer.bindBuffer(renderer.ARRAY_BUFFER,cubeVbo);
    renderer.bufferData(renderer.ARRAY_BUFFER,cubeVertices(),renderer.STATIC_DRAW);
    // x, y, z, u, v  (two triangles) - texture faces viewer (+Z).
    renderer.bindBuffer(renderer.ARRAY_BUFFER,quadVbo);
    renderer.bufferData(renderer.ARRAY_BUFFER,new Float32Array([
      -.5,-.5,0,0,0, .5,-.5,0,1,0, .5,.5,0,1,1,
      -.5,-.5,0,0,0, .5,.5,0,1,1, -.5,.5,0,0,1,
    ]),renderer.STATIC_DRAW);
    for (let i=0;i<museumWalkOrder.length;i++) textures.push(makeLabelTexture(renderer,i));
    if (isLocalGuestStation(activeGuest)) {
      liveCanvas = document.createElement("canvas");
      liveCanvas.width = CRT_CAPTURE_WIDTH;
      liveCanvas.height = CRT_CAPTURE_HEIGHT;
      liveTexture = renderer.createTexture();
      if (!liveTexture) throw new Error("Unable to allocate local CRT preview texture.");
      renderer.bindTexture(renderer.TEXTURE_2D,liveTexture);
      renderer.texParameteri(renderer.TEXTURE_2D,renderer.TEXTURE_MIN_FILTER,renderer.LINEAR);
      renderer.texParameteri(renderer.TEXTURE_2D,renderer.TEXTURE_MAG_FILTER,renderer.LINEAR);
      renderer.texParameteri(renderer.TEXTURE_2D,renderer.TEXTURE_WRAP_S,renderer.CLAMP_TO_EDGE);
      renderer.texParameteri(renderer.TEXTURE_2D,renderer.TEXTURE_WRAP_T,renderer.CLAMP_TO_EDGE);
      renderer.texImage2D(renderer.TEXTURE_2D,0,renderer.RGBA,CRT_CAPTURE_WIDTH,CRT_CAPTURE_HEIGHT,0,renderer.RGBA,renderer.UNSIGNED_BYTE,null);
    }
    renderer.enable(renderer.DEPTH_TEST);
    renderer.depthFunc(renderer.LEQUAL);
    renderer.disable(renderer.CULL_FACE);

    const cp = colorProgram;
    const tp = textureProgram;
    const cv = cubeVbo;
    const qv = quadVbo;
    function drawBox(vp: Float32Array, x:number,y:number,z:number,w:number,h:number,d:number,hex:string) {
      renderer.useProgram(cp.program);
      renderer.bindBuffer(renderer.ARRAY_BUFFER,cv);
      renderer.enableVertexAttribArray(cp.position);
      renderer.vertexAttribPointer(cp.position,3,renderer.FLOAT,false,0,0);
      renderer.uniformMatrix4fv(cp.vp,false,vp);
      renderer.uniformMatrix4fv(cp.model,false,boxModel(x,y,z,w,h,d));
      renderer.uniform3fv(cp.color,hexRGB(hex));
      renderer.drawArrays(renderer.TRIANGLES,0,36);
    }
    function drawPlaque(vp: Float32Array,index:number,x:number,y:number,z:number,w:number,h:number,overrideTexture?:WebGLTexture) {
      renderer.useProgram(tp.program);
      renderer.bindBuffer(renderer.ARRAY_BUFFER,qv);
      renderer.enableVertexAttribArray(tp.position);
      renderer.vertexAttribPointer(tp.position,3,renderer.FLOAT,false,20,0);
      renderer.enableVertexAttribArray(tp.uv);
      renderer.vertexAttribPointer(tp.uv,2,renderer.FLOAT,false,20,12);
      renderer.uniformMatrix4fv(tp.vp,false,vp);
      renderer.uniformMatrix4fv(tp.model,false,planeModel(x,y,z,w,h));
      renderer.activeTexture(renderer.TEXTURE0);
      renderer.bindTexture(renderer.TEXTURE_2D,
        overrideTexture ?? textures[index]);
      renderer.uniform1i(tp.sampler,0);
      renderer.drawArrays(renderer.TRIANGLES,0,6);
    }
    function drawHall(vp: Float32Array) {
      drawBox(vp,0,-.08,-22,7,.16,52,"#243b32"); // floor
      drawBox(vp,0,3.65,-22,7,.12,52,"#1a2f33"); // ceiling
      drawBox(vp,-3.6,1.7,-22,.18,3.6,52,"#1b3233");
      drawBox(vp,3.6,1.7,-22,.18,3.6,52,"#1b3233");
      // Limit geometry to nearby exhibits for Quest mobile GPU efficiency.
      for (let i=Math.max(0,selectedIndex-2);i<=Math.min(museumWalkOrder.length-1,selectedIndex+2);i++) {
        const z = -3.45 - QUEST_EXHIBIT_SPACING * i;
        const selected = i === selectedIndex;
        const exhibit = museumExhibit(questExhibitAt(i));
        const accent = exhibit.accent;
        // Architectural bays and subtle guide lights to each gallery exhibit.
        drawBox(vp,-3.20,1.75,z,.26,3.45,.35,"#45685c");
        drawBox(vp,3.20,1.75,z,.26,3.45,.35,"#45685c");
        drawBox(vp,0,3.35,z,6.6,.13,.16,selected?accent:"#3a6052");
        drawBox(vp,0,.04,z,5.1,.05,.12,selected?accent:"#456a58");
        drawBox(vp,0,.40,z-.12,2.35,.8,1.12,selected?"#3e6751":"#2e4844");
        drawBox(vp,0,1.55,z-.18,2.98,1.52,.15,selected?accent:"#6f8e79");
        drawPlaque(vp,i,0,1.57,z-.07,2.78,1.31);
        if (i === selectedIndex && liveReady && liveTexture && activeGuest === questExhibitAt(i)) {
          drawBox(vp,2.05,1.60,z-.10,1.70,1.24,.12,"#b8cf9f");
          drawPlaque(vp,i,2.05,1.60,z-.018,1.58,1.11,liveTexture);
        }
      }
      if (inspectionIndex === selectedIndex) {
        // A closer, larger readable plaque: trigger again to open the 2D station.
        const inspectZ = -1.98 - QUEST_EXHIBIT_SPACING * selectedIndex;
        drawBox(vp,0,1.55,inspectZ-.10,3.10,1.66,.09,"#b9d8aa");
        drawPlaque(vp,selectedIndex,0,1.55,inspectZ,2.95,1.48);
      }
    }

    const tick = (time: number, frame: XRFrame) => {
      if (ended) return;
      session.requestAnimationFrame(tick);
      const delta=Math.min(0.05,Math.max(0,(time-lastTick)/1000));
      lastTick=time;
      for (const source of session.inputSources) {
        const axes=source.gamepad?.axes;
        if (!axes || axes.length < 2) continue;
        const stickY=axes.length >=4 ? axes[3] : axes[1];
        if (Math.abs(stickY) > 0.68 && time-lastStickChange >= 500) {
          const next=questMoveIndex(selectedIndex,stickY,time-lastStickChange);
          if (next !== selectedIndex) {
            inspectionIndex = null;
            liveReady = false;
            selectedIndex=next;
            targetZ=questPositionForIndex(selectedIndex);
            onStatus("VR exhibit " + questExhibitLabel(selectedIndex));
            lastStickChange=time;
          }
          break; // Only one controller moves the route per tick.
        }
      }
      currentZ += (targetZ-currentZ)*Math.min(1,delta*5);
      if (inspectionIndex !== null && time - inspectedAt > 10000) inspectionIndex = null;
      if (isLocalGuestStation(activeGuest) && liveCanvas && liveTexture &&
          questExhibitAt(selectedIndex) === activeGuest &&
          time - lastLiveRefresh >= CRT_REFRESH_MS) {
        lastLiveRefresh = time;
        liveReady = paintLocalCRT(liveCanvas,activeGuest);
        if (liveReady) {
          renderer.bindTexture(renderer.TEXTURE_2D,liveTexture);
          renderer.pixelStorei(renderer.UNPACK_FLIP_Y_WEBGL,1);
          renderer.texSubImage2D(renderer.TEXTURE_2D,0,0,0,renderer.RGBA,renderer.UNSIGNED_BYTE,liveCanvas);
        }
      }
      const pose=frame.getViewerPose(refSpace);
      const layer=session.renderState.baseLayer;
      if (!pose || !layer) return;
      renderer.bindFramebuffer(renderer.FRAMEBUFFER,layer.framebuffer);
      renderer.enable(renderer.SCISSOR_TEST);
      for (const view of pose.views) {
        const viewport=layer.getViewport(view);
        if (!viewport) continue;
        renderer.viewport(viewport.x,viewport.y,viewport.width,viewport.height);
        renderer.scissor(viewport.x,viewport.y,viewport.width,viewport.height);
        renderer.clearColor(.035,.065,.072,1);
        renderer.clear(renderer.COLOR_BUFFER_BIT|renderer.DEPTH_BUFFER_BIT);
        const viewProjection=multiplyMat4(view.projectionMatrix,view.transform.inverse.matrix);
        const positioned=multiplyMat4(viewProjection,hallShift(currentZ,localFloor?0:-1.55));
        drawHall(positioned);
      }
      renderer.disable(renderer.SCISSOR_TEST);
    };
    if (!ended) {
      onStatus("VR active · Left stick: change exhibit · Trigger: inspect · Trigger again: open 2D station · Quest menu: exit");
      session.requestAnimationFrame(tick);
    }
    return { end: () => ended ? Promise.resolve() : session.end() };
  } catch (error) {
    try { await session.end(); } catch { onSessionEnd(); }
    throw error;
  }
}
