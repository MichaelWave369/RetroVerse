/**
 * One controller trigger INSPECTS the current exhibit in VR; a second
 * intentional trigger within the armed window opens its normal browser room.
 * This prevents an accidental trigger from throwing a visitor out of VR.
 */
export const QUEST_INSPECT_TIMEOUT_MS = 10000;
export type QuestSelectAction = "inspect" | "enter";

export function questSelectAction(
  inspectedExhibitIndex: number | null,
  currentExhibitIndex: number,
  elapsedSinceInspection: number,
): QuestSelectAction {
  if (!Number.isInteger(currentExhibitIndex) || currentExhibitIndex < 0 ||
      !Number.isFinite(elapsedSinceInspection)) {
    throw new Error("Invalid Quest exhibit inspection state.");
  }
  if (inspectedExhibitIndex === currentExhibitIndex &&
      elapsedSinceInspection >= 0 &&
      elapsedSinceInspection <= QUEST_INSPECT_TIMEOUT_MS) return "enter";
  return "inspect";
}
