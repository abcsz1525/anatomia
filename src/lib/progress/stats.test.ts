import { describe, expect, it } from "vitest";
import type { Side } from "@/lib/content/types";
import type { QuizPart } from "@/lib/quiz/types";
import type { Card, CardState } from "@/lib/srs/types";
import type { ProgressV1 } from "./types";
import { addDays, cardMastery, dayKey, streakDays, topicMastery } from "./stats";

function part(id: string, la: string, side: Side = "left"): QuizPart {
  return { id, la, ru: la, side, system: "skeletal", topic: "lower-limb-bones" };
}

function progressWith(parts: ProgressV1["parts"]): ProgressV1 {
  return { version: 1, parts, sessions: [], activeDays: [], cards: {}, reviews: [] };
}

function progressWithCards(cards: Record<string, CardState>): ProgressV1 {
  return { version: 1, parts: {}, sessions: [], activeDays: [], cards, reviews: [] };
}

function deckCard(key: string): Card {
  return { key, la: key, ru: key, topic: "lower-limb-bones" };
}

function cardState(overrides: Partial<CardState> = {}): CardState {
  return {
    ease: 2.5,
    interval: 7,
    reps: 3,
    lapses: 0,
    due: "2026-09-30",
    lastAt: "2026-09-23T10:00:00.000Z",
    ...overrides,
  };
}

describe("dayKey", () => {
  // dayKey is local-calendar-day, not UTC, so inputs are built from local
  // Date components (not literal "...Z" strings) — that's the only way an
  // assertion about the resulting key stays true under any runner TZ.
  it("extracts the local calendar day from an ISO timestamp", () => {
    expect(dayKey(new Date(2026, 8, 23, 1, 0).toISOString())).toBe("2026-09-23");
  });

  it("uses the local day near the end of the day too", () => {
    expect(dayKey(new Date(2026, 8, 23, 23, 30).toISOString())).toBe("2026-09-23");
  });
});

describe("topicMastery", () => {
  it("counts total as distinct la among the given parts", () => {
    const parts = [part("FJ1", "Femur"), part("FJ1b", "Femur"), part("TIB1", "Tibia")];
    const p = progressWith({});
    expect(topicMastery(p, parts).total).toBe(2);
  });

  it("marks la as known when the sum of correct across its ids is >= 2", () => {
    const parts = [part("FJ1", "Femur"), part("FJ1b", "Femur")];
    const p = progressWith({
      FJ1: { correct: 1, wrong: 0, lastAt: "2026-09-23T10:00:00.000Z" },
      FJ1b: { correct: 1, wrong: 0, lastAt: "2026-09-23T10:00:00.000Z" },
    });
    const result = topicMastery(p, parts);
    expect(result.known).toBe(1);
    expect(result.total).toBe(1);
  });

  it("does not count la as known when the sum of correct is below 2", () => {
    const parts = [part("FJ1", "Femur"), part("TIB1", "Tibia")];
    const p = progressWith({
      FJ1: { correct: 1, wrong: 0, lastAt: "2026-09-23T10:00:00.000Z" },
      TIB1: { correct: 0, wrong: 3, lastAt: "2026-09-23T10:00:00.000Z" },
    });
    const result = topicMastery(p, parts);
    expect(result.known).toBe(0);
    expect(result.total).toBe(2);
  });

  it("handles parts with no progress recorded at all", () => {
    const parts = [part("FJ1", "Femur")];
    const p = progressWith({});
    expect(topicMastery(p, parts)).toEqual({ known: 0, total: 1 });
  });
});

describe("streakDays", () => {
  const days = ["2026-09-21", "2026-09-22", "2026-09-23"];

  it("counts consecutive days ending today", () => {
    expect(streakDays(days, "2026-09-23")).toBe(3);
  });

  it("counts consecutive days ending yesterday", () => {
    expect(streakDays(days, "2026-09-24")).toBe(3);
  });

  it("is 0 when the gap is more than a day", () => {
    expect(streakDays(days, "2026-09-26")).toBe(0);
  });

  it("normalises unsorted, duplicate input", () => {
    const messy = ["2026-09-23", "2026-09-21", "2026-09-22", "2026-09-22", "2026-09-23"];
    expect(streakDays(messy, "2026-09-23")).toBe(3);
  });

  it("stops counting at the first gap", () => {
    const withGap = ["2026-09-19", "2026-09-22", "2026-09-23"];
    expect(streakDays(withGap, "2026-09-23")).toBe(2);
  });

  it("is 0 for an empty activeDays list", () => {
    expect(streakDays([], "2026-09-23")).toBe(0);
  });

  it("counts a streak across a month boundary", () => {
    expect(streakDays(["2026-08-31", "2026-09-01"], "2026-09-01")).toBe(2);
  });

  it("counts a streak across a year boundary", () => {
    expect(streakDays(["2025-12-31", "2026-01-01"], "2026-01-01")).toBe(2);
  });
});

describe("addDays", () => {
  it("adds days within a month", () => {
    expect(addDays("2026-09-20", 3)).toBe("2026-09-23");
  });

  it("rolls over a month boundary", () => {
    expect(addDays("2026-09-28", 5)).toBe("2026-10-03");
  });

  it("rolls over a year boundary", () => {
    expect(addDays("2025-12-30", 5)).toBe("2026-01-04");
  });

  it("supports negative n", () => {
    expect(addDays("2026-09-01", -1)).toBe("2026-08-31");
  });

  it("supports negative n across a year boundary", () => {
    expect(addDays("2026-01-01", -1)).toBe("2025-12-31");
  });

  it("returns 0 days unchanged", () => {
    expect(addDays("2026-09-23", 0)).toBe("2026-09-23");
  });

  it("returns an invalid key unchanged", () => {
    expect(addDays("not-a-date", 3)).toBe("not-a-date");
  });

  it("is DST-safe via the local-date constructor idiom", () => {
    // 2026-03-08 is the US DST spring-forward day; local-date arithmetic
    // must still land on the correct calendar day regardless.
    expect(addDays("2026-03-07", 1)).toBe("2026-03-08");
    expect(addDays("2026-03-08", 1)).toBe("2026-03-09");
  });
});

describe("cardMastery", () => {
  it("counts total as the deck size", () => {
    const deck = [deckCard("femur"), deckCard("tibia")];
    expect(cardMastery(progressWithCards({}), deck).total).toBe(2);
  });

  it("counts a card as learned when interval is exactly 7", () => {
    const deck = [deckCard("femur")];
    const p = progressWithCards({ femur: cardState({ interval: 7 }) });
    expect(cardMastery(p, deck).learned).toBe(1);
  });

  it("does not count a card as learned when interval is 6", () => {
    const deck = [deckCard("femur")];
    const p = progressWithCards({ femur: cardState({ interval: 6 }) });
    expect(cardMastery(p, deck).learned).toBe(0);
  });

  it("counts a card as learned when interval is above 7", () => {
    const deck = [deckCard("femur")];
    const p = progressWithCards({ femur: cardState({ interval: 20 }) });
    expect(cardMastery(p, deck).learned).toBe(1);
  });

  it("treats a missing card state as not learned", () => {
    const deck = [deckCard("femur"), deckCard("tibia")];
    const p = progressWithCards({ femur: cardState({ interval: 10 }) });
    const result = cardMastery(p, deck);
    expect(result.learned).toBe(1);
    expect(result.total).toBe(2);
  });

  it("returns zero for an empty deck", () => {
    expect(cardMastery(progressWithCards({}), [])).toEqual({ learned: 0, total: 0 });
  });
});
