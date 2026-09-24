import { describe, expect, it } from "vitest";
import { cardKey, review } from "./sm2";

describe("cardKey", () => {
  it("lower-cases and trims la", () => {
    expect(cardKey("  Femur  ")).toBe("femur");
  });

  it("produces the same key for both sides and all meshes of one structure", () => {
    expect(cardKey("Deltoideus")).toBe(cardKey(" DELTOIDEUS ".toLowerCase()));
    expect(cardKey("Flexor digitorum superficialis")).toBe(cardKey("flexor digitorum superficialis"));
  });
});

describe("review", () => {
  const today = "2026-09-23";

  it("starts a new card at ease 2.5", () => {
    const state = review(undefined, "good", today, "2026-09-23T10:00:00.000Z");
    expect(state.ease).toBe(2.5);
  });

  it("walks the good chain: 1, 3, 8, 20, 50", () => {
    let state = review(undefined, "good", today, "2026-09-23T10:00:00.000Z");
    expect(state.interval).toBe(1);
    expect(state.reps).toBe(1);

    state = review(state, "good", today, "2026-09-23T10:00:00.000Z");
    expect(state.interval).toBe(3);
    expect(state.reps).toBe(2);

    state = review(state, "good", today, "2026-09-23T10:00:00.000Z");
    expect(state.interval).toBe(8); // round(3 * 2.5)
    expect(state.reps).toBe(3);

    state = review(state, "good", today, "2026-09-23T10:00:00.000Z");
    expect(state.interval).toBe(20); // round(8 * 2.5)
    expect(state.reps).toBe(4);

    state = review(state, "good", today, "2026-09-23T10:00:00.000Z");
    expect(state.interval).toBe(50); // round(20 * 2.5)
    expect(state.reps).toBe(5);
  });

  it("good leaves ease unchanged", () => {
    const state = review(undefined, "good", today, "2026-09-23T10:00:00.000Z");
    expect(state.ease).toBe(2.5);
  });

  it("good sets due to today + interval as a dayKey", () => {
    const state = review(undefined, "good", today, "2026-09-23T10:00:00.000Z");
    expect(state.due).toBe("2026-09-24");
  });

  it("good sets due correctly across a month boundary", () => {
    let state = review(undefined, "good", "2026-09-29", "2026-09-29T10:00:00.000Z"); // interval 1
    state = review(state, "good", "2026-09-30", "2026-09-30T10:00:00.000Z"); // interval 3 -> due Oct 3
    expect(state.due).toBe("2026-10-03");
  });

  it("again resets interval and reps, and increments lapses", () => {
    let state = review(undefined, "good", today, "2026-09-23T10:00:00.000Z");
    state = review(state, "good", today, "2026-09-23T10:00:00.000Z");
    expect(state.reps).toBe(2);

    state = review(state, "again", today, "2026-09-23T10:00:00.000Z");
    expect(state.interval).toBe(1);
    expect(state.reps).toBe(0);
    expect(state.lapses).toBe(1);
    expect(state.due).toBe("2026-09-24");
  });

  it("again lowers ease by 0.2, floored at 1.3", () => {
    const state = review(undefined, "again", today, "2026-09-23T10:00:00.000Z");
    expect(state.ease).toBe(2.3);
  });

  it("again never lowers ease below 1.3", () => {
    let state: ReturnType<typeof review> | undefined = undefined;
    for (let i = 0; i < 10; i += 1) {
      state = review(state, "again", today, "2026-09-23T10:00:00.000Z");
    }
    expect(state!.ease).toBe(1.3);
  });

  it("again increments lapses on repeated failures", () => {
    let state = review(undefined, "again", today, "2026-09-23T10:00:00.000Z");
    state = review(state, "again", today, "2026-09-23T10:00:00.000Z");
    expect(state.lapses).toBe(2);
  });

  it("carries a lowered ease from again through good and into the next easy", () => {
    let state = review(undefined, "again", today, "2026-09-23T10:00:00.000Z");
    expect(state.ease).toBe(2.3);

    state = review(state, "good", today, "2026-09-23T10:00:00.000Z"); // reps 0 -> 1, interval 1
    state = review(state, "good", today, "2026-09-23T10:00:00.000Z"); // reps 1 -> 2, interval 3
    expect(state.ease).toBe(2.3);

    // reps is now 2, so this good interval is round(prevInterval * ease) = round(3 * 2.3) = 7:
    // the lowered ease from "again" (not the default 2.5) feeds the calculation.
    state = review(state, "good", today, "2026-09-23T10:00:00.000Z");
    expect(state.ease).toBe(2.3);
    expect(state.interval).toBe(7);

    state = review(state, "easy", today, "2026-09-23T10:00:00.000Z");
    expect(state.ease).toBe(2.45); // 2.3 + 0.15, rounded to 2 decimals
  });

  it("easy gives 4 days for a new card, unlike good", () => {
    const easy = review(undefined, "easy", today, "2026-09-23T10:00:00.000Z");
    const good = review(undefined, "good", today, "2026-09-23T10:00:00.000Z");
    expect(easy.interval).toBe(4);
    expect(easy.due).toBe("2026-09-27");
    expect(good.interval).toBe(1);
    expect(easy.reps).toBe(1);
  });

  it("easy gives 4 days again after a lapse has reset reps", () => {
    let state = review(undefined, "good", today, "2026-09-23T10:00:00.000Z"); // reps 1
    state = review(state, "again", today, "2026-09-23T10:00:00.000Z"); // reps 0
    state = review(state, "easy", today, "2026-09-23T10:00:00.000Z");
    expect(state.interval).toBe(4);
  });

  it("easy multiplies the good interval by 1.3", () => {
    let state = review(undefined, "good", today, "2026-09-23T10:00:00.000Z"); // interval 1, reps 1
    state = review(state, "good", today, "2026-09-23T10:00:00.000Z"); // interval 3, reps 2
    // next good interval would be round(3*2.5)=8; easy = round(8*1.3)=10
    state = review(state, "easy", today, "2026-09-23T10:00:00.000Z");
    expect(state.interval).toBe(10);
    expect(state.reps).toBe(3);
  });

  it("easy increases ease by 0.15, capped at 2.5", () => {
    const state = review(undefined, "easy", today, "2026-09-23T10:00:00.000Z");
    // starts at 2.5, +0.15 would exceed cap
    expect(state.ease).toBe(2.5);
  });

  it("easy ease cap: repeated easy grades never exceed 2.5", () => {
    let state: ReturnType<typeof review> | undefined = undefined;
    for (let i = 0; i < 5; i += 1) {
      state = review(state, "easy", today, "2026-09-23T10:00:00.000Z");
    }
    expect(state!.ease).toBe(2.5);
  });

  it("records lastAt from the now parameter", () => {
    const state = review(undefined, "good", today, "2026-09-23T12:34:56.000Z");
    expect(state.lastAt).toBe("2026-09-23T12:34:56.000Z");
  });

  it("defaults now to the current ISO timestamp when omitted", () => {
    const before = Date.now();
    const state = review(undefined, "good", today);
    const after = Date.now();
    const lastAtMs = new Date(state.lastAt).getTime();
    expect(lastAtMs).toBeGreaterThanOrEqual(before);
    expect(lastAtMs).toBeLessThanOrEqual(after);
  });
});
