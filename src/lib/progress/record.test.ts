import { describe, expect, it } from "vitest";
import type { AnswerRecord, SessionResult } from "@/lib/quiz/types";
import type { CardState, ReviewSummary } from "@/lib/srs/types";
import { emptyProgress, normalizeActiveDays, recordReview, recordSession } from "./record";
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

function cardState(overrides: Partial<CardState> = {}): CardState {
  return {
    ease: 2.5,
    interval: 6,
    reps: 3,
    lapses: 0,
    due: "2026-09-30",
    lastAt: localIso(2026, 9, 23, 10, 0),
    ...overrides,
  };
}

function reviewSummary(overrides: Partial<ReviewSummary> = {}): ReviewSummary {
  return {
    finishedAt: localIso(2026, 9, 23, 10, 5),
    topicId: "lower-limb-bones",
    reviewed: 5,
    again: 1,
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
      cards: {},
      reviews: [],
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

  it("preserves existing cards and reviews untouched", () => {
    const existingCard = cardState();
    const existingReview = reviewSummary();
    const p: ProgressV1 = {
      ...emptyProgress(),
      cards: { femur: existingCard },
      reviews: [existingReview],
    };

    const next = recordSession(p, session());

    expect(next.cards).toEqual({ femur: existingCard });
    expect(next.reviews).toEqual([existingReview]);
  });
});

describe("recordReview", () => {
  it("merges new card states over existing ones, leaving untouched keys alone", () => {
    const femur = cardState({ interval: 1, due: "2026-09-24" });
    const tibia = cardState({ interval: 6, due: "2026-09-29" });
    const p: ProgressV1 = { ...emptyProgress(), cards: { femur, tibia } };
    const updatedFemur = cardState({ interval: 6, due: "2026-09-29" });

    const next = recordReview(p, reviewSummary(), { femur: updatedFemur });

    expect(next.cards.femur).toEqual(updatedFemur);
    expect(next.cards.tibia).toEqual(tibia);
  });

  it("appends the review summary to reviews", () => {
    const p = emptyProgress();
    const summary = reviewSummary();

    const next = recordReview(p, summary, {});

    expect(next.reviews).toEqual([summary]);
  });

  it("accumulates review summaries across calls", () => {
    const p = emptyProgress();
    const first = reviewSummary({ finishedAt: localIso(2026, 9, 22, 10, 0) });
    const second = reviewSummary({ finishedAt: localIso(2026, 9, 23, 10, 0) });

    const after1 = recordReview(p, first, {});
    const after2 = recordReview(after1, second, {});

    expect(after2.reviews).toEqual([first, second]);
  });

  it("recomputes activeDays from sessions union reviews, including a reviews-only day", () => {
    const p = recordSession(emptyProgress(), session()); // adds the session's day
    const summary = reviewSummary({ finishedAt: localIso(2026, 9, 25, 10, 0) }); // a day with no session

    const next = recordReview(p, summary, {});

    expect(next.activeDays).toEqual(
      [dayKey(session().finishedAt), dayKey(summary.finishedAt)].sort(),
    );
  });

  it("adds a reviews-only active day even when there are no sessions at all", () => {
    const p = emptyProgress();
    const summary = reviewSummary();

    const next = recordReview(p, summary, {});

    expect(next.activeDays).toEqual([dayKey(summary.finishedAt)]);
  });

  it("does not add a duplicate day when a review lands on an existing session day", () => {
    const p = recordSession(emptyProgress(), session());
    const summary = reviewSummary({ finishedAt: localIso(2026, 9, 23, 20, 0) }); // same day as session()

    const next = recordReview(p, summary, {});

    expect(next.activeDays).toEqual([dayKey(session().finishedAt)]);
  });

  it("is pure: does not mutate the input progress object", () => {
    const p: ProgressV1 = { ...emptyProgress(), cards: { femur: cardState() } };
    const snapshot = JSON.parse(JSON.stringify(p));

    recordReview(p, reviewSummary(), { femur: cardState({ interval: 10 }) });

    expect(p).toEqual(snapshot);
  });
});

describe("normalizeActiveDays", () => {
  it("recomputes activeDays from sessions using the current (local) dayKey", () => {
    const finishedAt = localIso(2026, 9, 23, 10, 5);
    const p: ProgressV1 = {
      ...emptyProgress(),
      sessions: [{ topicId: "lower-limb-bones", mode: "find", finishedAt, correct: 1, total: 2 }],
      // stale key, e.g. as written by the old UTC-based dayKey()
      activeDays: ["1999-01-01"],
    };

    const next = normalizeActiveDays(p);

    expect(next.activeDays).toEqual([dayKey(finishedAt)]);
  });

  it("dedupes and sorts activeDays across sessions on different days", () => {
    const sessions = [
      { topicId: "t", mode: "find" as const, finishedAt: localIso(2026, 9, 24, 10, 0), correct: 1, total: 1 },
      { topicId: "t", mode: "find" as const, finishedAt: localIso(2026, 9, 22, 10, 0), correct: 1, total: 1 },
      { topicId: "t", mode: "find" as const, finishedAt: localIso(2026, 9, 22, 18, 0), correct: 1, total: 1 },
    ];
    const p: ProgressV1 = { ...emptyProgress(), sessions };

    const next = normalizeActiveDays(p);

    expect(next.activeDays).toEqual(
      [dayKey(sessions[1].finishedAt), dayKey(sessions[0].finishedAt)],
    );
  });

  it("includes reviews-only days", () => {
    const finishedAt = localIso(2026, 9, 23, 10, 5);
    const p: ProgressV1 = {
      ...emptyProgress(),
      reviews: [{ finishedAt, topicId: "lower-limb-bones", reviewed: 3, again: 0 }],
    };

    const next = normalizeActiveDays(p);

    expect(next.activeDays).toEqual([dayKey(finishedAt)]);
  });

  it("dedupes and sorts activeDays across sessions and reviews together", () => {
    const sessionFinishedAt = localIso(2026, 9, 24, 10, 0);
    const reviewOnlyDay = localIso(2026, 9, 22, 10, 0);
    const reviewSameDayAsSession = localIso(2026, 9, 24, 18, 0);
    const p: ProgressV1 = {
      ...emptyProgress(),
      sessions: [{ topicId: "t", mode: "find", finishedAt: sessionFinishedAt, correct: 1, total: 1 }],
      reviews: [
        { finishedAt: reviewOnlyDay, topicId: "t", reviewed: 2, again: 0 },
        { finishedAt: reviewSameDayAsSession, topicId: "t", reviewed: 2, again: 0 },
      ],
    };

    const next = normalizeActiveDays(p);

    expect(next.activeDays).toEqual(
      [dayKey(reviewOnlyDay), dayKey(sessionFinishedAt)].sort(),
    );
  });

  it("returns empty activeDays when there are no sessions", () => {
    expect(normalizeActiveDays(emptyProgress()).activeDays).toEqual([]);
  });

  it("is pure: does not mutate the input progress object", () => {
    const p = recordSession(emptyProgress(), session());
    const snapshot = JSON.parse(JSON.stringify(p));

    normalizeActiveDays(p);

    expect(p).toEqual(snapshot);
  });
});
