import { describe, expect, it } from "vitest";
import type { ProgressV1 } from "./types";
import { parseProgress, parseProgressDetailed, stringifyProgress } from "./serialize";

function validProgress(): ProgressV1 {
  return {
    version: 1,
    parts: {
      FJ1: { correct: 2, wrong: 1, lastAt: "2026-09-23T10:00:00.000Z" },
    },
    sessions: [
      { topicId: "lower-limb-bones", mode: "find", finishedAt: "2026-09-23T10:00:00.000Z", correct: 1, total: 2 },
    ],
    activeDays: ["2026-09-22", "2026-09-23"],
    cards: {
      femur: { ease: 2.5, interval: 6, reps: 3, lapses: 0, due: "2026-09-30", lastAt: "2026-09-23T10:00:00.000Z" },
    },
    reviews: [
      { finishedAt: "2026-09-23T10:00:00.000Z", topicId: "lower-limb-bones", reviewed: 5, again: 1, fresh: 3 },
    ],
  };
}

describe("parseProgress", () => {
  it("parses a valid, well-formed JSON string into a ProgressV1", () => {
    const raw = JSON.stringify(validProgress());
    expect(parseProgress(raw)).toEqual(validProgress());
  });

  it("returns null for null input", () => {
    expect(parseProgress(null)).toBeNull();
  });

  it("returns null for malformed JSON", () => {
    expect(parseProgress("{")).toBeNull();
  });

  it("returns null for the empty string", () => {
    expect(parseProgress("")).toBeNull();
  });

  it("returns null when version is not 1", () => {
    expect(parseProgress(JSON.stringify({ ...validProgress(), version: 2 }))).toBeNull();
  });

  it("returns null when required fields are missing", () => {
    expect(parseProgress(JSON.stringify({ version: 1 }))).toBeNull();
  });

  it("returns null when parts entries are malformed", () => {
    const bad = { ...validProgress(), parts: { FJ1: { correct: "2", wrong: 1, lastAt: "x" } } };
    expect(parseProgress(JSON.stringify(bad))).toBeNull();
  });

  it("returns null when a session summary is malformed", () => {
    const bad = { ...validProgress(), sessions: [{ topicId: "t", mode: "find" }] };
    expect(parseProgress(JSON.stringify(bad))).toBeNull();
  });

  it("returns null when a session summary has an invalid mode", () => {
    const bad = {
      ...validProgress(),
      sessions: [{ topicId: "t", mode: "nope", finishedAt: "x", correct: 1, total: 1 }],
    };
    expect(parseProgress(JSON.stringify(bad))).toBeNull();
  });

  it("returns null when activeDays entries are not YYYY-MM-DD strings", () => {
    const bad = { ...validProgress(), activeDays: ["2026-9-23"] };
    expect(parseProgress(JSON.stringify(bad))).toBeNull();
  });

  it("parses old progress saved without cards/reviews, filling in empty defaults", () => {
    const legacy = {
      version: 1,
      parts: validProgress().parts,
      sessions: validProgress().sessions,
      activeDays: validProgress().activeDays,
    };
    const parsed = parseProgress(JSON.stringify(legacy));
    expect(parsed).toEqual({ ...legacy, cards: {}, reviews: [] });
  });

  it("reads a summary saved without fresh as 0 new cards", () => {
    const legacy = {
      ...validProgress(),
      reviews: [{ finishedAt: "2026-09-23T10:00:00.000Z", topicId: "lower-limb-bones", reviewed: 5, again: 1 }],
    };
    expect(parseProgress(JSON.stringify(legacy))?.reviews).toEqual([
      { finishedAt: "2026-09-23T10:00:00.000Z", topicId: "lower-limb-bones", reviewed: 5, again: 1, fresh: 0 },
    ]);
  });

  it("returns null for a plain array", () => {
    expect(parseProgress(JSON.stringify([1, 2, 3]))).toBeNull();
  });

  it("returns null for a JSON primitive", () => {
    expect(parseProgress(JSON.stringify("hello"))).toBeNull();
  });

  it("never throws on garbage input", () => {
    expect(() => parseProgress("not json at all {{{")).not.toThrow();
  });
});

/**
 * Испорченные cards/reviews не стоят результатов тестов: прогресс остаётся,
 * поля карточек обнуляются, а degraded поднимает обычное предупреждение с
 * копией исходной строки в backup (loadProgress).
 */
describe("parseProgressDetailed", () => {
  const malformedCards = {
    ...validProgress(),
    cards: { femur: { ease: "2.5", interval: 6, reps: 3, lapses: 0, due: "2026-09-30", lastAt: "x" } },
  };

  it("reports a valid save as not degraded", () => {
    expect(parseProgressDetailed(JSON.stringify(validProgress()))).toEqual({
      progress: validProgress(),
      degraded: false,
    });
  });

  it("keeps the quiz half of the save when cards entries are malformed", () => {
    const { progress, degraded } = parseProgressDetailed(JSON.stringify(malformedCards));
    expect(degraded).toBe(true);
    expect(progress).toEqual({ ...validProgress(), cards: {} });
  });

  it("keeps reviews when only cards are malformed", () => {
    expect(parseProgressDetailed(JSON.stringify(malformedCards)).progress?.reviews).toEqual(
      validProgress().reviews,
    );
  });

  it("substitutes an empty map when cards is null or an array", () => {
    for (const cards of [null, []]) {
      const { progress, degraded } = parseProgressDetailed(JSON.stringify({ ...validProgress(), cards }));
      expect(degraded).toBe(true);
      expect(progress).toMatchObject({ cards: {} });
    }
  });

  it("substitutes an empty map when a card's due is not a YYYY-MM-DD string", () => {
    const bad = {
      ...validProgress(),
      cards: {
        femur: { ease: 2.5, interval: 6, reps: 3, lapses: 0, due: "30-09-2026", lastAt: "2026-09-23T10:00:00.000Z" },
      },
    };
    const { progress, degraded } = parseProgressDetailed(JSON.stringify(bad));
    expect(degraded).toBe(true);
    expect(progress).toMatchObject({ cards: {}, parts: validProgress().parts });
  });

  it("substitutes an empty list when reviews entries are malformed", () => {
    const bad = { ...validProgress(), reviews: [{ finishedAt: "2026-09-23T10:00:00.000Z", topicId: "t" }] };
    const { progress, degraded } = parseProgressDetailed(JSON.stringify(bad));
    expect(degraded).toBe(true);
    expect(progress).toEqual({ ...validProgress(), reviews: [] });
  });

  it("rejects a non-number fresh", () => {
    const bad = {
      ...validProgress(),
      reviews: [{ finishedAt: "2026-09-23T10:00:00.000Z", topicId: "t", reviewed: 5, again: 1, fresh: "3" }],
    };
    const { progress, degraded } = parseProgressDetailed(JSON.stringify(bad));
    expect(degraded).toBe(true);
    expect(progress).toMatchObject({ reviews: [] });
  });

  it("is not degraded when cards/reviews are simply absent", () => {
    const legacy = {
      version: 1,
      parts: validProgress().parts,
      sessions: validProgress().sessions,
      activeDays: validProgress().activeDays,
    };
    expect(parseProgressDetailed(JSON.stringify(legacy))).toEqual({
      progress: { ...legacy, cards: {}, reviews: [] },
      degraded: false,
    });
  });

  it("is not degraded when the whole save is rejected", () => {
    expect(parseProgressDetailed("{")).toEqual({ progress: null, degraded: false });
    expect(parseProgressDetailed(JSON.stringify({ version: 2 }))).toEqual({ progress: null, degraded: false });
    expect(parseProgressDetailed(null)).toEqual({ progress: null, degraded: false });
  });
});

describe("stringifyProgress", () => {
  it("round-trips through parseProgress", () => {
    const p = validProgress();
    expect(parseProgress(stringifyProgress(p))).toEqual(p);
  });
});
