import type { MuseumStationId } from "./museumCollection";

/**
 * Local-only guest CRT mirror for WebXR. Only same-page v86 DOS/Windows video
 * surfaces are eligible. No iframe capture, screen-sharing API, remote media,
 * or cross-origin canvas access is attempted.
 */
export type LocalGuestStation = "dos" | "win9x";
export const CRT_REFRESH_MS = 350;
export const CRT_CAPTURE_WIDTH = 640;
export const CRT_CAPTURE_HEIGHT = 480;

export function isLocalGuestStation(id: MuseumStationId | null): id is LocalGuestStation {
  return id === "dos" || id === "win9x";
}

export function normalizeCRTText(text: string, columns = 80, rows = 25): string[] {
  if (!Number.isSafeInteger(columns) || !Number.isSafeInteger(rows) ||
      columns < 1 || columns > 160 || rows < 1 || rows > 60) {
    throw new Error("Invalid local CRT text dimensions.");
  }
  // Strip control characters and bound both dimensions. Never use innerHTML.
  return text.replace(/\r\n?/g, "\n")
    .replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g, "")
    .split("\n").slice(0, rows)
    .map(row => row.slice(0, columns));
}

function sourceSelector(station: LocalGuestStation): string {
  return station === "dos"
    ? ".crt-screen .screen-container"
    : ".win9x-v86-screen";
}

/**
 * Paints a bounded local preview into an existing 2D canvas.
 * Returns false if the guest is not rendering video. A caller should show
 * its historical exhibit texture instead, never a fabricated live image.
 */
export function paintLocalCRT(
  output: HTMLCanvasElement,
  station: LocalGuestStation,
  root: ParentNode = document,
): boolean {
  const container = root.querySelector(sourceSelector(station));
  if (!container) return false;
  const source = container.querySelector("canvas");
  const textNode = container.querySelector<HTMLElement>(".v86-text");
  const hasCanvas = source instanceof HTMLCanvasElement &&
    source.width >= 64 && source.height >= 64 && source.style.display !== "none";
  const rawText = textNode?.innerText || textNode?.textContent || "";
  const lines = hasCanvas ? [] : normalizeCRTText(rawText);
  if (!hasCanvas && !lines.some(line => line.trim().length > 0)) return false;

  output.width = CRT_CAPTURE_WIDTH;
  output.height = CRT_CAPTURE_HEIGHT;
  const ctx = output.getContext("2d", { alpha: false });
  if (!ctx) return false;
  ctx.fillStyle = "#0c1d1e";
  ctx.fillRect(0, 0, output.width, output.height);
  ctx.fillStyle = "#d7f1b2";
  ctx.font = "20px monospace";
  ctx.fillText("LIVE LOCAL " + (station === "dos" ? "DOS" : "WIN9X") + " CRT · VIEW ONLY", 20, 29);
  ctx.fillStyle = "#122e29";
  ctx.fillRect(16, 46, 608, 372);
  try {
    if (hasCanvas && source) {
      const scale = Math.min(600 / source.width, 364 / source.height);
      const w = source.width * scale;
      const h = source.height * scale;
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(source, 320 - w / 2, 50 + (364 - h) / 2, w, h);
    } else {
      ctx.fillStyle = "#a6e3a1";
      ctx.font = "15px monospace";
      const fontHeight = 14;
      const actual = lines.slice(0, 25);
      for (let i = 0; i < actual.length; i++) {
        // 80 characters should fit in the 608-pixel display at 9px font.
        ctx.fillText(actual[i], 22, 65 + i * fontHeight, 598);
      }
    }
  } catch {
    // If this ever becomes a tainted source in a browser, refuse to surface it.
    ctx.clearRect(0, 0, output.width, output.height);
    return false;
  }
  ctx.fillStyle = "#94baa1";
  ctx.font = "16px monospace";
  ctx.fillText("PREVIEW ONLY · EXIT VR TO OPERATE THIS COMPUTER", 20, 451);
  return true;
}
