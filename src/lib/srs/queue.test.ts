import { describe, expect, it } from "vitest";
import type { Card, CardState } from "./types";
import { buildQueue } from "./queue";

function card(key: string): Card {
  return { key, la: key, ru: key, topic: "t" };
}

function state(due: string, overrides: Partial<CardState> = {}): CardState {
  return { ease: 2.5, interval: 1, reps: 1, lapses: 0, due, lastAt: "2026-09-20T10:00:00.000Z", ...overrides };
}

describe("buildQueue", () => {
  const today = "2026-09-23";

  it("puts due cards before new cards", () => {
    const deck = [card("new1"), card("due1")];
    const states = { due1: state("2026-09-22") };
    expect(buildQueue(deck, states, today, 5)).toEqual([card("due1"), card("new1")]);
  });

  it("sorts due cards by due date, then by key", () => {
    const deck = [card("b"), card("a"), card("c")];
    const states = {
      b: state("2026-09-20"),
      a: state("2026-09-19"),
      c: state("2026-09-19"),
    };
    expect(buildQueue(deck, states, today, 0).map((c) => c.key)).toEqual(["a", "c", "b"]);
  });

  it("excludes cards whose due date is in the future", () => {
    const deck = [card("future"), card("today")];
    const states = {
      future: state("2026-09-24"),
      today: state("2026-09-23"),
    };
    expect(buildQueue(deck, states, today, 0).map((c) => c.key)).toEqual(["today"]);
  });

  it("includes cards due exactly today", () => {
    const deck = [card("x")];
    const states = { x: state("2026-09-23") };
    expect(buildQueue(deck, states, today, 0).map((c) => c.key)).toEqual(["x"]);
  });

  it("takes new (stateless) cards in deck order, up to newLimit", () => {
    const deck = [card("n1"), card("n2"), card("n3")];
    expect(buildQueue(deck, {}, today, 2).map((c) => c.key)).toEqual(["n1", "n2"]);
  });

  it("takes no new cards when newLimit is 0", () => {
    const deck = [card("n1"), card("n2")];
    expect(buildQueue(deck, {}, today, 0)).toEqual([]);
  });

  it("caps the whole result at max (default 50)", () => {
    const deck = Array.from({ length: 60 }, (_, i) => card(`n${i}`));
    expect(buildQueue(deck, {}, today, 60)).toHaveLength(50);
  });

  it("caps the whole result at a custom max", () => {
    const deck = Array.from({ length: 10 }, (_, i) => card(`n${i}`));
    expect(buildQueue(deck, {}, today, 10, 3)).toHaveLength(3);
  });

  it("due cards count toward max before new cards are added", () => {
    const deck = [card("d1"), card("d2"), card("n1")];
    const states = { d1: state("2026-09-20"), d2: state("2026-09-21") };
    expect(buildQueue(deck, states, today, 5, 1).map((c) => c.key)).toEqual(["d1"]);
  });

  it("returns an empty queue for an empty deck", () => {
    expect(buildQueue([], {}, today, 5)).toEqual([]);
  });
});
