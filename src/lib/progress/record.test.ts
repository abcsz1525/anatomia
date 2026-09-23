import { describe, expect, it } from "vitest";
import type { AnswerRecord, SessionResult } from "@/lib/quiz/types";
import { emptyProgress, recordSession } from "./record";
import { dayKey } from "./stats";
import type { ProgressV1 } from "./types";

function answer(partId: string, la: string, correct: boolean, attempts = 1): AnswerRecord {
  return { partId, la, ru: la, side: "left", correct, attempts };
}

/**
 * ISO timestamp built from local Date components (not a literal "...Z"
 * string), so fixtures and their expected dayKey()s stay in agreement
 * under any runner timezone.
 */
function localIso(y: number, m: number, d: number, h = 10, min = 0): string {
  return new Date(y, m - 1, d, h, min).toISOString();
}

function session(overrides: Partial<SessionResult> = {}): SessionResult {
  return {
    topicId: "lower-limb-bones",
    mode: "find",
    startedAt: localIso(2026, 9, 23, 10, 0),
    finishedAt: localIso(2026, 9, 23, 10, 5),
    answers: [answer("FJ1", "Femur", true), answer("TIB1", "Tibia", false)],
    ...overrides,
  };
}

describe("emptyProgress", () => {
  it("returns a fresh v1 progress object", () => {
    expect(emptyProgress()).toEqual({
      version: 1,
      parts: {},
      sessions: [],
      activeDays: [],
    });
  });
});

describe("recordSession", () => {
  it("increments correct/wrong per part and sets lastAt", () => {
    const p = emptyProgress();
    const r = session();
    const next = recordSession(p, r);

    expect(next.parts.FJ1).toEqual({ correct: 1, wrong: 0, lastAt: r.finishedAt });
    expect(next.parts.TIB1).toEqual({ correct: 0, wrong: 1, lastAt: r.finishedAt });
  });

  it("accumulates across multiple sessions for the same part", () => {
    const p = emptyProgress();
    const r1 = session();
    const after1 = recordSession(p, r1);
    const r2 = session({
      finishedAt: localIso(2026, 9, 24, 10, 5),
      answers: [answer("FJ1", "Femur", true), answer("TIB1", "Tibia", true)],
    });
    const after2 = recordSession(after1, r2);

    expect(after2.parts.FJ1).toEqual({ correct: 2, wrong: 0, lastAt: r2.finishedAt });
    expect(after2.parts.TIB1).toEqual({ correct: 1, wrong: 1, lastAt: r2.finishedAt });
  });

  it("pushes a session summary with correct/total counts", () => {
    const p = emptyProgress();
    const r = session();
    const next = recordSession(p, r);

    expect(next.sessions).toEqual([
      { topicId: "lower-limb-bones", mode: "find", finishedAt: r.finishedAt, correct: 1, total: 2 },
    ]);
  });

  it("adds the day once even with multiple answers the same day", () => {
    const p = emptyProgress();
    const r = session();
    const next = recordSession(p, r);

    expect(next.activeDays).toEqual([dayKey(r.finishedAt)]);
  });

  it("does not add a duplicate day for a second session on the same day", () => {
    const p = emptyProgress();
    const after1 = recordSession(p, session());
    const later = session({ finishedAt: localIso(2026, 9, 23, 18, 0) });
    const after2 = recordSession(after1, later);

    expect(after2.activeDays).toEqual([dayKey(later.finishedAt)]);
  });

  it("keeps activeDays sorted without duplicates across days", () => {
    const p = emptyProgress();
    const r24 = session({ finishedAt: localIso(2026, 9, 24, 10, 0) });
    const r22 = session({ finishedAt: localIso(2026, 9, 22, 10, 0) });
    const r23 = session({ finishedAt: localIso(2026, 9, 23, 10, 0) });
    const after1 = recordSession(p, r24);
    const after2 = recordSession(after1, r22);
    const after3 = recordSession(after2, r23);

    expect(after3.activeDays).toEqual(
      [r22, r23, r24].map((r) => dayKey(r.finishedAt)).sort(),
    );
  });

  it("is pure: does not mutate the input progress object", () => {
    const p: ProgressV1 = emptyProgress();
    const snapshot = JSON.parse(JSON.stringify(p));
    const r = session();
    const rSnapshot = JSON.parse(JSON.stringify(r));

    recordSession(p, r);

    expect(p).toEqual(snapshot);
    expect(r).toEqual(rSnapshot);
  });

  it("is pure: does not mutate a non-empty input progress object", () => {
    const p = recordSession(emptyProgress(), session());
    const snapshot = JSON.parse(JSON.stringify(p));
    const r2 = session({
      finishedAt: localIso(2026, 9, 24, 10, 0),
      answers: [answer("FJ1", "Femur", true)],
    });

    recordSession(p, r2);

    expect(p).toEqual(snapshot);
  });
});
