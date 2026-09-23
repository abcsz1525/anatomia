import { describe, expect, it } from "vitest";
import { mulberry32, shuffle } from "./random";

describe("mulberry32", () => {
  it("produces the same sequence for the same seed", () => {
    const a = mulberry32(1);
    const b = mulberry32(1);
    const seqA = Array.from({ length: 5 }, () => a());
    const seqB = Array.from({ length: 5 }, () => b());
    expect(seqA).toEqual(seqB);
  });

  it("produces values in [0, 1)", () => {
    const rng = mulberry32(12345);
    for (let i = 0; i < 200; i++) {
      const v = rng();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it("differs for different seeds", () => {
    const seqA = Array.from({ length: 5 }, mulberry32(1));
    const seqB = Array.from({ length: 5 }, mulberry32(2));
    expect(seqA).not.toEqual(seqB);
  });
});

describe("shuffle", () => {
  it("does not mutate the input array", () => {
    const input = [1, 2, 3, 4, 5];
    const snapshot = [...input];
    shuffle(input, mulberry32(1));
    expect(input).toEqual(snapshot);
  });

  it("returns a new array (not the same reference)", () => {
    const input = [1, 2, 3];
    expect(shuffle(input, mulberry32(1))).not.toBe(input);
  });

  it("preserves the multiset of elements", () => {
    const input = [1, 2, 3, 4, 5, 5];
    const result = shuffle(input, mulberry32(7));
    expect(result.length).toBe(input.length);
    expect([...result].sort()).toEqual([...input].sort());
  });

  it("is deterministic for a given rng seed", () => {
    const a = shuffle([1, 2, 3, 4, 5], mulberry32(42));
    const b = shuffle([1, 2, 3, 4, 5], mulberry32(42));
    expect(a).toEqual(b);
  });
});
