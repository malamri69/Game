import { describe, expect, it } from "vitest";
import { EVENT_CATALOG, getEvent } from "../src/game/events/catalog.js";
import { pickNextEvent } from "../src/game/events/selection.js";
import { SecureRng } from "../src/security/rng.js";

describe("event catalog", () => {
  it("ships at least 20 events (section 19)", () => {
    expect(EVENT_CATALOG.length).toBeGreaterThanOrEqual(20);
  });

  it("has unique ids", () => {
    const ids = EVENT_CATALOG.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("gives every event 2-3 choices, each forcing a real decision", () => {
    for (const event of EVENT_CATALOG) {
      expect(event.choices.length).toBeGreaterThanOrEqual(2);
      expect(event.choices.length).toBeLessThanOrEqual(3);
      for (const choice of event.choices) {
        expect(choice.effects.length).toBeGreaterThan(0);
      }
    }
  });

  it("has both ar and en text for every name/description/choice/effect", () => {
    for (const event of EVENT_CATALOG) {
      expect(event.name.ar).toBeTruthy();
      expect(event.name.en).toBeTruthy();
      expect(event.description.ar).toBeTruthy();
      expect(event.description.en).toBeTruthy();
      for (const choice of event.choices) {
        expect(choice.label.ar).toBeTruthy();
        expect(choice.label.en).toBeTruthy();
        for (const effect of choice.effects) {
          expect(effect.description.ar).toBeTruthy();
          expect(effect.description.en).toBeTruthy();
        }
      }
    }
  });

  it("getEvent throws for an unknown id", () => {
    expect(() => getEvent("nope")).toThrow();
  });
});

describe("pickNextEvent", () => {
  const rng = new SecureRng();

  it("never repeats an event already used this match while unused ones remain", () => {
    const used = new Set(EVENT_CATALOG.slice(0, EVENT_CATALOG.length - 1).map((e) => e.id));
    const picked = pickNextEvent(used, 1, rng);
    expect(used.has(picked.id)).toBe(false);
  });

  it("still returns a valid event once every event has been used", () => {
    const used = new Set(EVENT_CATALOG.map((e) => e.id));
    const picked = pickNextEvent(used, 1, rng);
    expect(EVENT_CATALOG.some((e) => e.id === picked.id)).toBe(true);
  });
});
