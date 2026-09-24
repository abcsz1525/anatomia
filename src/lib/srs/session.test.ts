import { describe, expect, it } from "vitest";
import { buildQueue } from "./queue";
import {
  MAX_REQUEUE,
  cardSides,
  deckCounts,
  deckNextDue,
  dueLabel,
  formatDay,
  gradeIntervals,
  initialCardsState,
  newShownToday,
  nextDue,
  parseDirection,
  parseNewLimit,
  reducer,
  remaining,
  sessionTally,
  type CardsState,
} from "./session";
import type { Card, CardState, ReviewSummary } from "./types";

const TODAY = "2026-09-24";
const NOW = "2026-09-24T10:00:00.000Z";

function card(key: string): Card {
  return { key, la: `${key} la`, ru: `${key} ru`, topic: "lower-limb-bones" };
}

function state(due: string, overrides: Partial<CardState> = {}): CardState {
  return { ease: 2.5, interval: 1, reps: 1, lapses: 0, due, lastAt: NOW, ...overrides };
}

function start(queue: Card[], base: Record<string, CardState> = {}): CardsState {
  return reducer(initialCardsState, {
    type: "start",
    topicId: "lower-limb-bones",
    queue,
    base,
    startedAt: NOW,
  });
}

/** Открыть обратную сторону и оценить — кнопки оценок есть только после «Показать». */
function grade(s: CardsState, g: "again" | "good" | "easy"): CardsState {
  return reducer(reducer(s, { type: "reveal" }), { type: "grade", grade: g, today: TODAY, now: NOW });
}

describe("reducer", () => {
  it("starts a review session at the first card, face down", () => {
    const s = start([card("a"), card("b")]);
    expect(s.phase).toBe("review");
    if (s.phase !== "review") return;
    expect(s.index).toBe(0);
    expect(s.revealed).toBe(false);
    expect(s.states).toEqual({});
    expect(remaining(s)).toBe(2);
  });

  it("reveals the back of the current card", () => {
    const s = reducer(start([card("a")]), { type: "reveal" });
    expect(s.phase === "review" && s.revealed).toBe(true);
  });

  it("ignores a grade while the card is still face down", () => {
    const s = start([card("a"), card("b")]);
    expect(reducer(s, { type: "grade", grade: "good", today: TODAY, now: NOW })).toBe(s);
  });

  it("advances to the next card face down after a grade", () => {
    const s = grade(start([card("a"), card("b")]), "good");
    expect(s.phase).toBe("review");
    if (s.phase !== "review") return;
    expect(s.index).toBe(1);
    expect(s.revealed).toBe(false);
    expect(remaining(s)).toBe(1);
  });

  it("stores the SM-2 result of the grade under the card key", () => {
    const s = grade(start([card("a"), card("b")]), "good");
    if (s.phase !== "review") throw new Error("expected review");
    expect(s.states.a).toEqual({
      ease: 2.5,
      interval: 1,
      reps: 1,
      lapses: 0,
      due: "2026-09-25",
      lastAt: NOW,
    });
  });

  it("grades against the stored state of the card when the session has none yet", () => {
    // reps: 1 → «Помню» даёт интервал 3, а не 1 как у новой карточки
    const s = grade(start([card("a"), card("b")], { a: state("2026-09-24") }), "good");
    if (s.phase !== "review") throw new Error("expected review");
    expect(s.states.a.interval).toBe(3);
  });

  it("keeps the result of the last grade of the session for a re-queued card", () => {
    let s = grade(start([card("a"), card("b")]), "again");
    s = grade(s, "good"); // b
    s = grade(s, "good"); // a снова
    if (s.phase !== "done") throw new Error("expected done");
    // again сбросил reps в 0 и ease до 2.3, следующий good — первый шаг заново
    expect(s.states.a).toMatchObject({ ease: 2.3, interval: 1, reps: 1, lapses: 1 });
  });

  it("re-queues a forgotten card at the end of the queue", () => {
    const s = grade(start([card("a"), card("b")]), "again");
    if (s.phase !== "review") throw new Error("expected review");
    expect(s.queue.map((c) => c.key)).toEqual(["a", "b", "a"]);
    expect(s.index).toBe(1);
    expect(remaining(s)).toBe(2);
  });

  it(`re-queues a card at most ${MAX_REQUEUE} times per session`, () => {
    let s = start([card("a")]);
    for (let i = 0; i < MAX_REQUEUE; i += 1) s = grade(s, "again");
    if (s.phase !== "review") throw new Error("expected review");
    expect(s.queue.map((c) => c.key)).toEqual(["a", "a", "a", "a"]);

    // четвёртое «Не помню» уже не возвращает карточку: она остаётся на завтра
    s = grade(s, "again");
    expect(s.phase).toBe("done");
  });

  it("finishes the session when the queue runs out", () => {
    let s = grade(start([card("a"), card("b")]), "again");
    s = grade(s, "easy"); // b
    s = grade(s, "good"); // a снова
    expect(s.phase).toBe("done");
    if (s.phase !== "done") return;
    expect(Object.keys(s.states).sort()).toEqual(["a", "b"]);
    expect(s.forgotten).toEqual(["a"]);
  });

  it("returns to setup on abort", () => {
    expect(reducer(start([card("a")]), { type: "abort" })).toEqual(initialCardsState);
  });
});

/**
 * Сводка сессии с местным finishedAt: dayKey() считает местный день, поэтому
 * фикстура строится из компонентов даты, а не из литерала с "Z".
 */
function summary(y: number, m: number, d: number, fresh: number): ReviewSummary {
  return {
    finishedAt: new Date(y, m - 1, d, 10, 0).toISOString(),
    topicId: "lower-limb-bones",
    reviewed: fresh + 1,
    again: 0,
    fresh,
  };
}

describe("sessionTally", () => {
  it("is null before a session starts", () => {
    expect(sessionTally(initialCardsState)).toBeNull();
  });

  it("counts distinct cards graded and distinct cards forgotten", () => {
    let s = grade(start([card("a"), card("b")]), "again");
    s = grade(s, "good"); // b
    s = grade(s, "again"); // a снова — второй раз тот же ключ
    const tally = sessionTally(s);
    expect(tally).toMatchObject({ topicId: "lower-limb-bones", reviewed: 2, again: 1 });
  });

  it("includes the card graded by the move into the done phase", () => {
    const s = grade(start([card("a")]), "good");
    expect(s.phase).toBe("done");
    expect(sessionTally(s)).toMatchObject({ reviewed: 1, again: 0 });
  });

  it("counts as fresh only the cards without a state at the start of the session", () => {
    // a уже повторялась раньше, b видна впервые
    const s = grade(grade(start([card("a"), card("b")], { a: state("2026-09-24") }), "good"), "good");
    expect(sessionTally(s)).toMatchObject({ reviewed: 2, fresh: 1 });
  });

  it("counts a re-queued new card once", () => {
    let s = grade(start([card("a"), card("b")]), "again"); // a → в конец очереди
    s = grade(s, "good"); // b
    s = grade(s, "good"); // a снова
    expect(sessionTally(s)).toMatchObject({ reviewed: 2, fresh: 2 });
  });

  it("has no fresh cards when the whole queue came from saved states", () => {
    const base = { a: state("2026-09-24"), b: state("2026-09-24") };
    const s = grade(grade(start([card("a"), card("b")], base), "good"), "good");
    expect(sessionTally(s)).toMatchObject({ reviewed: 2, fresh: 0 });
  });
});

describe("newShownToday", () => {
  it("is 0 without any reviews", () => {
    expect(newShownToday([], TODAY)).toBe(0);
  });

  it("sums fresh over the summaries finished today", () => {
    expect(newShownToday([summary(2026, 9, 24, 5), summary(2026, 9, 24, 3)], TODAY)).toBe(8);
  });

  it("ignores summaries from other days", () => {
    const reviews = [summary(2026, 9, 23, 20), summary(2026, 9, 24, 4), summary(2026, 9, 25, 7)];
    expect(newShownToday(reviews, TODAY)).toBe(4);
  });
});

describe("deckNextDue", () => {
  const deck = [card("a"), card("b"), card("c")];

  it("is null when no card of the deck has a state", () => {
    expect(deckNextDue(deck, {}, TODAY)).toBeNull();
  });

  it("is the earliest due strictly after today", () => {
    const states = { a: state("2026-09-28"), b: state("2026-09-26"), c: state("2026-09-24") };
    expect(deckNextDue(deck, states, TODAY)).toBe("2026-09-26");
  });

  it("is null when every card of the deck is already due", () => {
    expect(deckNextDue(deck, { a: state("2026-09-24"), b: state("2026-09-20") }, TODAY)).toBeNull();
  });

  it("ignores states of cards outside the deck", () => {
    expect(deckNextDue([card("a")], { z: state("2026-09-25") }, TODAY)).toBeNull();
  });
});

describe("parseDirection", () => {
  it("defaults to la→ru for missing or unknown values", () => {
    expect(parseDirection(null)).toBe("la-ru");
    expect(parseDirection("")).toBe("la-ru");
    expect(parseDirection("ru")).toBe("la-ru");
  });

  it("reads both stored directions", () => {
    expect(parseDirection("la-ru")).toBe("la-ru");
    expect(parseDirection("ru-la")).toBe("ru-la");
  });
});

describe("nextDue", () => {
  it("is null without any states", () => {
    expect(nextDue({})).toBeNull();
  });

  it("is the earliest due date across the states", () => {
    expect(nextDue({ a: state("2026-09-28"), b: state("2026-09-25"), c: state("2026-10-01") })).toBe("2026-09-25");
  });
});

describe("deckCounts", () => {
  const deck = [card("a"), card("b"), card("c"), card("d")];

  it("counts cards with a state due today or earlier, and new cards up to the limit", () => {
    const states = { a: state("2026-09-23"), b: state("2026-09-30") };
    expect(deckCounts(deck, states, TODAY, 20)).toEqual({ due: 1, fresh: 2 });
  });

  it("caps the new-card count at the limit", () => {
    expect(deckCounts(deck, {}, TODAY, 3)).toEqual({ due: 0, fresh: 3 });
  });

  it("matches the size of the queue the same inputs build", () => {
    // очередь короче потолка max=50, поэтому счётчики совпадают с её длиной
    const states = { a: state("2026-09-24"), b: state("2026-09-30") };
    const { due, fresh } = deckCounts(deck, states, TODAY, 1);
    expect(due + fresh).toBe(buildQueue(deck, states, TODAY, 1).length);
    expect(due + fresh).toBe(2);
  });
});

describe("gradeIntervals", () => {
  it("gives the next interval of each grade for a new card: «Легко» is 4 days, not 1", () => {
    expect(gradeIntervals(undefined, TODAY)).toEqual({ again: 1, good: 1, easy: 4 });
  });

  it("gives 1/3/4 days for a card seen once", () => {
    expect(gradeIntervals(state("2026-09-24"), TODAY)).toEqual({ again: 1, good: 3, easy: 4 });
  });
});

describe("parseNewLimit", () => {
  it("defaults to 20 for missing or unreadable values", () => {
    expect(parseNewLimit(null)).toBe(20);
    expect(parseNewLimit("")).toBe(20);
    expect(parseNewLimit("много")).toBe(20);
  });

  it("clamps to 1…100 and drops the fractional part", () => {
    expect(parseNewLimit("0")).toBe(1);
    expect(parseNewLimit("-5")).toBe(1);
    expect(parseNewLimit("1000")).toBe(100);
    expect(parseNewLimit("7.9")).toBe(7);
    expect(parseNewLimit("42")).toBe(42);
  });
});

describe("formatDay", () => {
  it("prints a day key as DD.MM.YYYY", () => {
    expect(formatDay("2026-09-25")).toBe("25.09.2026");
  });

  it("returns an unparseable key unchanged", () => {
    expect(formatDay("завтра")).toBe("завтра");
  });
});

describe("dueLabel", () => {
  it("says «сегодня» while the next card is due today or earlier", () => {
    expect(dueLabel(TODAY, TODAY)).toBe("сегодня");
    expect(dueLabel("2026-09-23", TODAY)).toBe("сегодня");
  });

  it("prints a future date as DD.MM.YYYY", () => {
    expect(dueLabel("2026-09-25", TODAY)).toBe("25.09.2026");
  });

  it("is «—» without a next card", () => {
    expect(dueLabel(null, TODAY)).toBe("—");
  });
});

describe("cardSides", () => {
  it("shows Latin first in the la→ru direction", () => {
    expect(cardSides(card("a"), "la-ru")).toEqual({ front: "a la", back: "a ru", frontLatin: true });
  });

  it("shows Russian first in the ru→la direction", () => {
    expect(cardSides(card("a"), "ru-la")).toEqual({ front: "a ru", back: "a la", frontLatin: false });
  });
});
