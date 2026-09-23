import { describe, expect, it } from "vitest";
import type { Side } from "@/lib/content/types";
import type { FindQuestion, NameQuestion, QuizPart } from "./types";
import { acceptIds, checkFind, checkName } from "./check";

function part(id: string, la: string, side: Side, ru = la): QuizPart {
  return { id, la, ru, side, system: "skeletal", topic: "lower-limb-bones" };
}

// Femur left has two meshes in the model (FJ1, FJ1b); Femur right is a
// distinct mesh that must not be accepted for the left target.
const parts: QuizPart[] = [
  part("FJ1", "Femur", "left"),
  part("FJ1b", "Femur", "left"),
  part("FJ2", "Femur", "right"),
  part("TIB1", "Tibia", "left"),
];

describe("acceptIds", () => {
  it("returns all ids with the same la and side", () => {
    const target = parts[0]; // FJ1, Femur left
    expect(acceptIds(target, parts).sort()).toEqual(["FJ1", "FJ1b"]);
  });

  it("does not include the mirrored (other side) mesh", () => {
    const ids = acceptIds(parts[0], parts);
    expect(ids).not.toContain("FJ2");
  });

  it("matches empty side only with empty side", () => {
    const noSideA = part("A", "Aorta", "");
    const noSideB = part("B", "Aorta", "");
    const withSide = part("C", "Aorta", "left");
    const list = [noSideA, noSideB, withSide];
    expect(acceptIds(noSideA, list).sort()).toEqual(["A", "B"]);
  });
});

describe("checkFind", () => {
  const q: FindQuestion = {
    kind: "find",
    target: parts[0],
    accept: acceptIds(parts[0], parts),
    attemptsLeft: 3,
  };

  it("is true when the clicked id is in the accept list", () => {
    expect(checkFind(q, "FJ1b")).toBe(true);
  });

  it("is false when the clicked id is not in the accept list", () => {
    expect(checkFind(q, "FJ2")).toBe(false);
  });
});

describe("checkName", () => {
  const q: NameQuestion = {
    kind: "name",
    target: parts[0],
    options: [
      { la: "Tibia", ru: "Большеберцовая кость" },
      { la: "Femur", ru: "Бедренная кость" },
    ],
    correctIndex: 1,
  };

  it("is true when optionIndex matches correctIndex", () => {
    expect(checkName(q, 1)).toBe(true);
  });

  it("is false otherwise", () => {
    expect(checkName(q, 0)).toBe(false);
  });
});
