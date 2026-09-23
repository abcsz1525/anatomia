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
  it("pins the LAD's 'right anterior branch … of left coronary artery' meshes to the left", () => {
    const en = "First right anterior branch of anterior interventricular branch of left coronary artery";
    expect(detectSide(en)).toBe("right"); // first match wins without the override
    for (const id of ["FJ2632", "FJ2641", "FJ2645", "FJ2646", "FJ2647"]) expect(sideFor(id, en)).toBe("left");
  });
  it("treats the unpaired 'Posterior vein of left ventricle' meshes as sideless", () => {
    const en = "Posterior vein of left ventricle";
    expect(detectSide(en)).toBe("left"); // 'left' names the chamber, not the side
    for (const id of ["FJ2701", "FJ2702", "FJ2706", "FJ2707", "FJ2708", "FJ2709", "FJ2710", "FJ2711", "FJ2712", "FJ2713"])
      expect(sideFor(id, en)).toBe("");
  });
  it("pins the mislabeled 'Right fibular vein' FJ2190 (left-thigh perforating veins) to the left", () => {
    expect(sideFor("FJ2190", "Right fibular vein")).toBe("left");
  });
  it("swaps the mislabeled superior colliculus brachia", () => {
    expect(sideFor("FJ1735", "Brachium of left superior colliculus")).toBe("right");
    expect(sideFor("FJ1736", "Brachium of right superior colliculus")).toBe("left");
  });
  it("swaps the mislabeled middle pharyngeal constrictors", () => {
    expect(sideFor("FJ2742", "Right middle pharyngeal constrictor")).toBe("left");
    expect(sideFor("FJ2754", "Left middle pharyngeal constrictor")).toBe("right");
  });
  it("treats heart chambers, walls, cusps and papillary muscles as sideless (the word names the chamber)", () => {
    expect(detectSide("Cavity of left ventricle")).toBe("left");
    for (const [id, en] of [
      ["FJ2422", "Cavity of left ventricle"], ["FJ2423", "Cavity of right ventricle"],
      ["FJ2424", "Cavity of right atrium"], ["FJ2425", "Cavity of left atrium"],
      ["FJ2438", "Wall of left atrium"], ["FJ2439", "Wall of right atrium"],
      ["FJ2417", "Left anterior cusp of pulmonary valve"], ["FJ2434", "Right anterior cusp of pulmonary valve"],
      ["FJ2427", "Posterior cusp of pulmonary valve"], ["FJ2426", "Left posterior cusp of aortic valve"],
      ["FJ2431", "Right posterior cusp of aortic valve"], ["FJ2435", "Anterior cusp of aortic valve"],
      ["FJ2418", "Anterolateral head of lateral papillary muscle of left ventricle"],
      ["FJ2419", "Anterior papillary muscle of right ventricle"], ["FJ2429", "Lateral papillary muscle of left ventricle"],
      ["FJ2430", "Posterior papillary muscle of right ventricle"], ["FJ2437", "Septal papillary muscle of right ventricle"],
    ]) expect(sideFor(id, en), id).toBe("");
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
