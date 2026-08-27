import { describe, expect, it } from "vitest";
import { redactEventForViewer, type ResolutionEvent } from "../src/game/resolution/types.js";

const publicHiddenActorEvent: ResolutionEvent = {
  round: 1,
  type: "attack_success",
  actorSeatId: "seat-traitor",
  targetSeatId: "seat-king",
  visibleTo: "all",
  actorVisible: false,
  description: { ar: "x", en: "y" }
};

const privateEvent: ResolutionEvent = {
  round: 1,
  type: "investigate_result",
  actorSeatId: "seat-investigator",
  targetSeatId: "seat-traitor",
  visibleTo: ["seat-investigator"],
  description: { ar: "x", en: "y" }
};

describe("redactEventForViewer", () => {
  it("hides the actor from third parties on a public actorVisible:false event", () => {
    const forBystander = redactEventForViewer(publicHiddenActorEvent, "seat-citizen");
    expect(forBystander).not.toBeNull();
    expect(forBystander!.actorSeatId).toBeUndefined();
  });

  it("still lets the actor see their own action", () => {
    const forActor = redactEventForViewer(publicHiddenActorEvent, "seat-traitor");
    expect(forActor!.actorSeatId).toBe("seat-traitor");
  });

  it("returns null for a viewer not in a private event's visibleTo list", () => {
    const forOutsider = redactEventForViewer(privateEvent, "seat-citizen");
    expect(forOutsider).toBeNull();
  });

  it("delivers a private event in full to a recipient", () => {
    const forRecipient = redactEventForViewer(privateEvent, "seat-investigator");
    expect(forRecipient).not.toBeNull();
    expect(forRecipient!.actorSeatId).toBe("seat-investigator");
    expect(forRecipient!.targetSeatId).toBe("seat-traitor");
  });
});
