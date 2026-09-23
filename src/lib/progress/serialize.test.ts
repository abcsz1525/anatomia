import { describe, expect, it } from "vitest";
import type { ProgressV1 } from "./types";
import { parseProgress, stringifyProgress } from "./serialize";

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

describe("stringifyProgress", () => {
  it("round-trips through parseProgress", () => {
    const p = validProgress();
    expect(parseProgress(stringifyProgress(p))).toEqual(p);
  });
});
