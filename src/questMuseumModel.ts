import { museumExhibit, museumWalkOrder, type MuseumStationId } from "./museumCollection";

/**
 * Lightweight, framework-independent model for an immersive museum corridor.
 * WebXR runtime is optional and only started with an explicit user gesture.
 */
export const QUEST_EXHIBIT_SPACING = 4;
export const QUEST_EXHIBIT_COUNT = museumWalkOrder.length;
export const QUEST_STICK_DEADZONE = 0.68;
export const QUEST_STICK_REPEAT_MS = 500;

export function questExhibitAt(index: number): MuseumStationId {
  if (!Number.isInteger(index) || index < 0 || index >= museumWalkOrder.length) {
    throw new Error("Invalid Quest museum exhibit index.");
  }
  return museumWalkOrder[index];
}

export function questIndexOf(id: MuseumStationId): number {
  const index = museumWalkOrder.indexOf(id);
  if (index < 0) throw new Error("Unknown Quest museum exhibit.");
  return index;
}

export function questMoveIndex(
  index: number,
  axis: number,
  elapsedSinceLastChange: number,
): number {
  if (!Number.isInteger(index) || index < 0 || index >= QUEST_EXHIBIT_COUNT ||
      !Number.isFinite(axis) || !Number.isFinite(elapsedSinceLastChange)) {
    throw new Error("Invalid Quest museum movement input.");
  }
  if (elapsedSinceLastChange < QUEST_STICK_REPEAT_MS ||
      Math.abs(axis) < QUEST_STICK_DEADZONE) return index;
  // Forward on standard XR gamepad sticks is negative Y.
  return Math.max(0, Math.min(QUEST_EXHIBIT_COUNT - 1, index + (axis < 0 ? 1 : -1)));
}

export function questPositionForIndex(index: number): number {
  questExhibitAt(index);
  return index * QUEST_EXHIBIT_SPACING;
}

export function questExhibitLabel(index: number): string {
  const exhibit = museumExhibit(questExhibitAt(index));
  return exhibit.name + " (" + exhibit.period + ")";
}

/** Column-major 4x4 matrix multiplication compatible with WebXR/WebGL. */
export function multiplyMat4(a: ArrayLike<number>, b: ArrayLike<number>): Float32Array {
  if (a.length !== 16 || b.length !== 16) throw new Error("Expected two 4x4 matrices.");
  const out = new Float32Array(16);
  for (let col = 0; col < 4; col++) {
    for (let row = 0; row < 4; row++) {
      let sum = 0;
      for (let k = 0; k < 4; k++) sum += a[k * 4 + row] * b[col * 4 + k];
      out[col * 4 + row] = sum;
    }
  }
  return out;
}

export function boxModel(
  x: number, y: number, z: number,
  width: number, height: number, depth: number,
): Float32Array {
  return new Float32Array([
    width,0,0,0,
    0,height,0,0,
    0,0,depth,0,
    x,y,z,1,
  ]);
}

export function planeModel(
  x: number, y: number, z: number,
  width: number, height: number,
): Float32Array {
  return boxModel(x,y,z,width,height,1);
}

export function hallShift(position: number, yOffset = 0): Float32Array {
  return boxModel(0,yOffset,position,1,1,1);
}
