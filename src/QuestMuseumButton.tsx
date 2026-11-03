import { useEffect, useRef, useState } from "react";
import type { MuseumStationId } from "./museumCollection";
import {
  questImmersiveSupported, startQuestMuseumXR,
  type QuestXRController,
} from "./questMuseumXR";

interface Props {
  selected: MuseumStationId;
  onEnter: (id: MuseumStationId) => boolean;
}

/** Explicit action only: XR permission/session starts directly from a click. */
export default function QuestMuseumButton({ selected, onEnter }: Props) {
  const [supported, setSupported] = useState<"checking" | "yes" | "no">("checking");
  const [state, setState] = useState<"idle" | "requesting" | "active">("idle");
  const [message, setMessage] = useState("Quest Browser: open the museum in actual immersive VR.");
  const active = useRef<QuestXRController | null>(null);
  const mounted = useRef(true);
  const busy = useRef(false);

  useEffect(() => {
    mounted.current = true;
    void questImmersiveSupported().then(ok => {
      if (mounted.current) setSupported(ok ? "yes" : "no");
    });
    return () => {
      mounted.current = false;
      const controller = active.current;
      active.current = null;
      if (controller) void controller.end().catch(() => undefined);
    };
  }, []);

  function start() {
    if (supported !== "yes" || busy.current) return;
    busy.current = true;
    setState("requesting");
    setMessage("Requesting a native immersive VR session...");
    // startQuestMuseumXR invokes requestSession synchronously before
    // its first await. Do not insert an async permission-check here.
    void startQuestMuseumXR(
      selected,
      id => {
        if (!mounted.current) return;
        const accepted = onEnter(id);
        if (!accepted) setMessage("Close the current emulator before entering another station.");
      },
      status => { if (mounted.current) setMessage(status); },
      () => {
        active.current = null;
        busy.current = false;
        if (mounted.current) {
          setState("idle");
          setMessage("VR session ended. Re-enter whenever you're ready.");
        }
      },
    ).then(controller => {
      if (!mounted.current) {
        void controller.end().catch(() => undefined);
        return;
      }
      active.current = controller;
      setState("active");
    }).catch(error => {
      busy.current = false;
      if (!mounted.current) return;
      setState("idle");
      setMessage(error instanceof Error ? error.message : "Could not start WebXR immersive VR.");
    });
  }

  function stop() {
    if (!active.current) return;
    setMessage("Closing immersive VR...");
    void active.current.end().catch(error => {
      if (mounted.current) setMessage(error instanceof Error ? error.message : "VR exit failed.");
    });
  }

  return (
    <div className="quest-museum-entry">
      <button type="button" className="quest-enter-vr"
        disabled={supported !== "yes" || state === "requesting"}
        onClick={state === "active" ? stop : start}
        aria-label={state === "active" ? "Exit Quest immersive VR" : "Enter Quest 3 immersive VR museum"}>
        {state === "active" ? "■ EXIT QUEST VR" : state === "requesting" ? "◌ STARTING VR..." : "◈ ENTER QUEST 3 VR"}
      </button>
      <p className="quest-vr-status" role="status" aria-live="polite">
        {supported === "checking" ? "Checking for immersive WebXR support..." :
          supported === "no" ?
          "Immersive VR unavailable here. Open this HTTPS site inside Meta Quest Browser, or continue using the regular Time Hall." :
          message}
      </p>
      <p className="quest-vr-disclosure">
        Native stereo WebXR corridor · left thumbstick changes exhibit · trigger exits VR and opens its existing 2D emulator station.
        No emulator is running inside the 3D gallery yet. No shared multiplayer session.
      </p>
    </div>
  );
}
