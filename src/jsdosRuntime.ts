/**
 * Shared js-dos v8 runtime loader for RetroVerse's DOS Game Cabinet and
 * historically-inspired Tandy station. Keeps a single script/style instance.
 * js-dos stays GPL-licensed and is fetched from its official CDN on demand.
 */
const scriptUrl = "https://v8.js-dos.com/latest/js-dos.js";
const styleUrl = "https://v8.js-dos.com/latest/js-dos.css";

export interface JsDosPlayer {
  stop(): Promise<void>;
  setNoCloud(noCloud: boolean): void;
  setPaused(paused: boolean): void;
  setFullScreen(fullscreen: boolean): void;
  save(): Promise<boolean>;
}

declare global {
  interface Window {
    Dos?: (element: HTMLDivElement, options: Record<string, unknown>) => JsDosPlayer;
  }
}

let pending: Promise<void> | null = null;

export function loadJsDos(): Promise<void> {
  if (window.Dos) return Promise.resolve();
  if (pending) return pending;
  pending = new Promise<void>((resolve, reject) => {
    if (!document.querySelector('link[data-retroverse-jsdos]')) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = styleUrl;
      link.dataset.retroverseJsdos = "true";
      document.head.appendChild(link);
    }
    const script = document.createElement("script");
    script.src = scriptUrl;
    script.async = true;
    script.dataset.retroverseJsdos = "true";
    script.onload = () => window.Dos ? resolve() : reject(new Error("js-dos loaded without a player API."));
    script.onerror = () => reject(new Error("Could not load js-dos from its official CDN. Check network access."));
    document.head.appendChild(script);
  }).catch((error: unknown) => {
    pending = null;
    document.querySelector('script[data-retroverse-jsdos]')?.remove();
    throw error;
  });
  return pending;
}
