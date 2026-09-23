import { describe, expect, it } from "vitest";
import type { Side } from "@/lib/content/types";
import type { QuizPart } from "./types";
import { generateSession, SESSION_LENGTH } from "./generate";

function part(id: string, la: string, side: Side, ru = la): QuizPart {
  return { id, la, ru, side, system: "skeletal", topic: "test-topic" };
}

// 5 distinct concepts (Femur has 2 meshes, one per side) — enough for both
// "find" and "name" (which needs >= 4 concepts).
const richParts: QuizPart[] = [
  part("FEM_L", "Femur", "left"),
  part("FEM_R", "Femur", "right"),
  part("TIB_L", "Tibia", "left"),
  part("HUM_L", "Humerus", "left"),
  part("RAD_L", "Radius", "left"),
  part("ULN_L", "Ulna", "left"),
];

// Only 3 distinct concepts — too few for "name" mode.
const sparseParts: QuizPart[] = [
  part("FEM_L", "Femur", "left"),
  part("TIB_L", "Tibia", "left"),
  part("HUM_L", "Humerus", "left"),
];

describe("generateSession — find mode", () => {
  it("produces SESSION_LENGTH questions by default", () => {
    const session = generateSession(richParts, "find", 7);
    expect(session.length).toBe(SESSION_LENGTH);
  });

  it("each question's accept list contains the target id", () => {
    const session = generateSession(richParts, "find", 7);
    for (const q of session) {
      expect(q.kind).toBe("find");
      if (q.kind === "find") expect(q.accept).toContain(q.target.id);
    }
  });

  it("does not throw when there are fewer than 4 concepts", () => {
    expect(() => generateSession(sparseParts, "find", 7)).not.toThrow();
  });

  it("never repeats the same la in two consecutive questions", () => {
    const session = generateSession(richParts, "find", 99, 30);
    for (let i = 1; i < session.length; i++) {
      expect(session[i].target.la).not.toBe(session[i - 1].target.la);
    }
  });

  it("is deterministic for a given seed and differs for another seed", () => {
    const a = generateSession(richParts, "find", 7);
    const b = generateSession(richParts, "find", 7);
    const c = generateSession(richParts, "find", 8);
    expect(a).toEqual(b);
    expect(a).not.toEqual(c);
  });
});

describe("generateSession — name mode", () => {
  it("throws when the topic has fewer than 4 concepts", () => {
    expect(() => generateSession(sparseParts, "name", 42)).toThrow(
      "topic has fewer than 4 concepts",
    );
  });

  it("produces 4 options with distinct la per question, correct at correctIndex", () => {
    const session = generateSession(richParts, "name", 42);
    expect(session.length).toBe(SESSION_LENGTH);
    for (const q of session) {
      expect(q.kind).toBe("name");
      if (q.kind !== "name") continue;
      expect(q.options.length).toBe(4);
      const las = q.options.map((o) => o.la);
      expect(new Set(las).size).toBe(4);
      expect(q.options[q.correctIndex].la).toBe(q.target.la);
    }
  });

  it("is deterministic for a given seed (seed 42 twice) and differs for seed 43", () => {
    const a = generateSession(richParts, "name", 42);
    const b = generateSession(richParts, "name", 42);
    const c = generateSession(richParts, "name", 43);
    expect(a).toEqual(b);
    expect(a).not.toEqual(c);
  });

  it("never repeats the same la in two consecutive questions", () => {
    const session = generateSession(richParts, "name", 5, 30);
    for (let i = 1; i < session.length; i++) {
      expect(session[i].target.la).not.toBe(session[i - 1].target.la);
    }
  });
});
