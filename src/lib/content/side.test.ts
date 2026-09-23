import { describe, expect, it } from "vitest";
import { detectSide, sideFor, stripSide } from "./side";

describe("detectSide", () => {
  it("finds side anywhere in the name", () => {
    expect(detectSide("Left femur")).toBe("left");
    expect(detectSide("Distal phalanx of right thumb")).toBe("right");
    expect(detectSide("Humeral head of left pronator teres")).toBe("left");
    expect(detectSide("Abductor digiti minimi of right foot")).toBe("right");
  });
  it("returns empty for midline structures", () => {
    expect(detectSide("Body of sternum")).toBe("");
    expect(detectSide("Diaphragm")).toBe("");
    expect(detectSide("Lateral lumbar intertransversarius")).toBe(""); // 'lateral' is not a side
  });
});

describe("sideFor", () => {
  it("overrides the mislabeled FJ1469 pair regardless of manifest text", () => {
    expect(sideFor("FJ1469", "Left flexor pollicis brevis")).toBe("right");
    expect(sideFor("FJ1469M", "Right flexor pollicis brevis")).toBe("left");
  });
  it("falls back to detectSide for ids without an override", () => {
    expect(sideFor("FJ1254", "Left femur")).toBe("left");
  });
});

describe("stripSide", () => {
  it("removes the side word and normalises spacing/capitalisation", () => {
    expect(stripSide("Left femur")).toBe("Femur");
    expect(stripSide("Distal phalanx of right thumb")).toBe("Distal phalanx of thumb");
    expect(stripSide("Navicular bone of left foot")).toBe("Navicular bone of foot");
    expect(stripSide("Sternum")).toBe("Sternum");
  });
});
