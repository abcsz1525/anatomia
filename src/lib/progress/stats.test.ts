import { describe, expect, it } from "vitest";
import type { Side } from "@/lib/content/types";
import type { QuizPart } from "@/lib/quiz/types";
import type { ProgressV1 } from "./types";
import { dayKey, streakDays, topicMastery } from "./stats";

function part(id: string, la: string, side: Side = "left"): QuizPart {
  return { id, la, ru: la, side, system: "skeletal", topic: "lower-limb-bones" };
}

function progressWith(parts: ProgressV1["parts"]): ProgressV1 {
  return { version: 1, parts, sessions: [], activeDays: [] };
}

describe("dayKey", () => {
  it("extracts the UTC calendar day from an ISO timestamp", () => {
    expect(dayKey("2026-09-23T10:05:00.000Z")).toBe("2026-09-23");
  });

  it("uses the UTC day even when the local offset would shift the calendar date", () => {
    // 23:30 UTC on the 23rd is still the 23rd in UTC, regardless of local TZ.
    expect(dayKey("2026-09-23T23:30:00.000Z")).toBe("2026-09-23");
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
});
