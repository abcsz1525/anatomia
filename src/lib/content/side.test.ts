import { describe, expect, it } from "vitest";
import { detectSide, stripSide } from "./side";

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

describe("stripSide", () => {
  it("removes the side word and normalises spacing/capitalisation", () => {
    expect(stripSide("Left femur")).toBe("Femur");
    expect(stripSide("Distal phalanx of right thumb")).toBe("Distal phalanx of thumb");
    expect(stripSide("Navicular bone of left foot")).toBe("Navicular bone of foot");
    expect(stripSide("Sternum")).toBe("Sternum");
  });
});
