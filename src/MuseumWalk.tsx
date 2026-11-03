import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent } from "react";
import { createPortal } from "react-dom";
import { museumExhibit, museumWalkOrder, stepMuseum, type MuseumStationId } from "./museumCollection";

interface Props {
  activeStation: MuseumStationId;
  visited: readonly MuseumStationId[];
  onEnter: (id: MuseumStationId) => boolean;
  onClose: () => void;
  onResetVisits: () => void;
}

/** CSS perspective gallery; actual emulators stay in their original stations. */
export default function MuseumWalk({ activeStation, visited, onEnter, onClose, onResetVisits }: Props) {
  const [selected, setSelected] = useState<MuseumStationId>(activeStation);
  const dialog = useRef<HTMLDivElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButton.current?.focus({ preventScroll: true });
    return () => {
      document.body.style.overflow = previousOverflow;
      previous?.focus({ preventScroll: true });
    };
  }, []);

  const current = museumExhibit(selected);
  const before = museumExhibit(stepMuseum(selected, -1));
  const after = museumExhibit(stepMuseum(selected, 1));
  const position = museumWalkOrder.indexOf(selected) + 1;
  const visitedSet = new Set(visited);

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      onClose();
    } else if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      const target = event.target;
      if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement ||
          target instanceof HTMLSelectElement) return;
      event.preventDefault();
      setSelected(id => stepMuseum(id, event.key === "ArrowRight" ? 1 : -1));
    } else if (event.key === "Tab") {
      const controls = Array.from(dialog.current?.querySelectorAll<HTMLButtonElement>(
        "button:not(:disabled)"
      ) ?? []);
      if (!controls.length) return;
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
  }

  function resetVisits() {
    if (window.confirm("Clear all RetroVerse museum visit stamps stored in this browser?")) onResetVisits();
  }

  return createPortal(
    <div className="timehall-overlay" onMouseDown={event => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <div className="timehall-dialog" ref={dialog} role="dialog" aria-modal="true"
        aria-label="RetroVerse Time Hall interactive museum gallery" onKeyDown={handleKeyDown}
        style={{ "--hall-accent": current.accent } as CSSProperties}>
        <header className="timehall-header">
          <div className="timehall-signature">
            <span className="timehall-glyph" aria-hidden="true">Φ</span>
            <span><strong>THE TIME HALL</strong><small>RETROVERSE · LIVING COMPUTER MUSEUM</small></span>
          </div>
          <div className="timehall-header-actions">
            <span>{visitedSet.size} / {museumWalkOrder.length} EXHIBITS VISITED</span>
            <button className="timehall-close" type="button" ref={closeButton} onClick={onClose}
              aria-label="Close Time Hall and return to the computer">✕ CLOSE</button>
          </div>
        </header>

        <div className="timehall-body">
          <div className="timehall-upper">
            <div className="timehall-route-label">THE COMPUTING TIME CORRIDOR · EXHIBIT {String(position).padStart(2, "0")} / {String(museumWalkOrder.length).padStart(2, "0")}</div>
            <div className="timehall-era" aria-live="polite">
              <span className="timehall-era-rule" /><span>{current.period}</span><span className="timehall-era-rule" />
            </div>
          </div>

          <div className="timehall-scene" role="group" aria-label="Navigate through historical computer exhibits">
            <div className="timehall-ceiling" aria-hidden="true" />
            <div className="timehall-floor" aria-hidden="true" />
            <div className="timehall-vanish" aria-hidden="true" />
            <div className="timehall-wall timehall-wall--left" aria-hidden="true" />
            <div className="timehall-wall timehall-wall--right" aria-hidden="true" />
            <button type="button" className="timehall-side-door timehall-side-door--left"
              onClick={() => setSelected(before.id)} aria-label={"Previous exhibit: " + before.name}>
              <span>◀ PREVIOUS DOOR</span><strong>{before.name}</strong><small>{before.period}</small>
            </button>
            <div className="timehall-main-exhibit" key={current.id}>
              <div className="timehall-main-top"><span>ROOM {String(position).padStart(2, "0")}</span><span className="timehall-live-light" aria-hidden="true" /></div>
              <div className={"timehall-hardware timehall-hardware--" + current.id} aria-hidden="true">
                <div className="timehall-hardware-glow" />
                <div className="timehall-hardware-screen">
                  <span>{current.emblem}</span><small>{current.family}</small>
                </div>
                <div className="timehall-hardware-base" />
              </div>
              <span className="timehall-main-caption">{current.family}</span>
            </div>
            <button type="button" className="timehall-side-door timehall-side-door--right"
              onClick={() => setSelected(after.id)} aria-label={"Next exhibit: " + after.name}>
              <span>NEXT DOOR ▶</span><strong>{after.name}</strong><small>{after.period}</small>
            </button>
            <div className="timehall-floor-caption" aria-hidden="true">1981 · 1985 · 1990 · 1995 · BEYOND</div>
          </div>

          <div className="timehall-exhibit-details">
            <div className="timehall-plaque">
              <div className="timehall-plaque-label">
                <span>{current.period}</span>
                <span>{current.access === "local" ? "ON-DEVICE EMULATOR" :
                  current.access === "compatible" ? "COMPATIBILITY / USER MEDIA" : "EXTERNAL EMULATOR / PORTAL"}</span>
              </div>
              <h2>{current.name}</h2>
              <p>{current.plaque}</p>
              <div className="timehall-technology"><span>EMULATOR / PLATFORM</span><strong>{current.engine}</strong></div>
            </div>
            <div className="timehall-action-panel">
              {visitedSet.has(current.id) && <span className="timehall-visited">✓ EXHIBIT VISITED</span>}
              <button className="timehall-enter" type="button" onClick={() => onEnter(current.id)}>
                ENTER THIS COMPUTER <span aria-hidden="true">↗</span>
              </button>
              <div className="timehall-travel">
                <button type="button" onClick={() => setSelected(id => stepMuseum(id, -1))}>← PREV</button>
                <span>{position} / {museumWalkOrder.length}</span>
                <button type="button" onClick={() => setSelected(id => stepMuseum(id, 1))}>NEXT →</button>
              </div>
              <p>Explore each exhibit, then open its real emulator station. The gallery itself is a CSS-rendered hall, not an emulator or VR engine.</p>
            </div>
          </div>

          <div className="timehall-map">
            <div className="timehall-map-title"><strong>THE NINE EXHIBIT DOORS</strong><span>SELECT ANY ERA</span></div>
            <div className="timehall-map-track" role="group" aria-label="Chronological exhibit timeline">
              {museumWalkOrder.map((id, i) => {
                const exhibit = museumExhibit(id);
                return <button key={id} type="button"
                  className={"timehall-map-stop" + (id === selected ? " is-current" : "") +
                    (visitedSet.has(id) ? " is-visited" : "")}
                  onClick={() => setSelected(id)} aria-pressed={id === selected}
                  aria-label={exhibit.period + ": " + exhibit.name + (visitedSet.has(id) ? ", visited" : "")}
                  title={exhibit.description}>
                  <span>{i + 1}</span><strong>{exhibit.name}</strong><small>{exhibit.period}</small>
                </button>;
              })}
            </div>
          </div>
          <footer className="timehall-footer">
            <span>← → CHANGE EXHIBIT · TAB TO NAVIGATE · ESC TO RETURN · LOCAL VISIT STAMPS ONLY</span>
            <button type="button" onClick={resetVisits} disabled={visitedSet.size === 0}>RESET VISIT STAMPS</button>
          </footer>
        </div>
      </div>
    </div>,
    document.body
  );
}
