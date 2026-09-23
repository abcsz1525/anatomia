import { describe, expect, it } from "vitest";
import { LATIN_SIDE, detectSide, sideFor, stripSide } from "./side";

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

describe("LATIN_SIDE", () => {
  it("matches the Latin side word in every case it appears in", () => {
    for (const la of [
      "Arteria gastrica sinistra", "Bronchus principalis dexter", "Cavitas ventriculi sinistri",
      "Paries atrii dextri", "Lobus sinister thymi", "Ramus lobi dextri arteriae hepaticae dextrae",
      "Valva aortae, valvula semilunaris dextra", "Ductus lobi caudati sinister",
    ]) expect(LATIN_SIDE.test(la), la).toBe(true);
  });
  it("does not match Latin names without a side word", () => {
    for (const la of [
      "Arteria coronaria", "Valva trunci pulmonalis, valvula semilunaris anterior",
      "Ramus diagonalis rami interventricularis anterioris", "Anulus tendineus communis",
    ]) expect(LATIN_SIDE.test(la), la).toBe(false);
  });
});

describe("sideFor", () => {
  it("drops the badge when la already names the side", () => {
    // имя уже говорит «Левая желудочная артерия» — бейдж «(слева)» был бы повтором
    expect(sideFor("FJ3499", "Left gastric artery", "Arteria gastrica sinistra")).toBe("");
    expect(sideFor("FJ3583", "Right brachiocephalic vein", "Vena brachiocephalica dextra")).toBe("");
    expect(sideFor("FJ2422", "Cavity of left ventricle", "Cavitas ventriculi sinistri")).toBe("");
    expect(sideFor("FJ2435", "Anterior cusp of aortic valve", "Valva aortae, valvula semilunaris dextra")).toBe("");
    expect(sideFor("FJ2437", "Septal papillary muscle of right ventricle", "Musculus papillaris septalis ventriculi dextri")).toBe("");
    expect(sideFor("FJ2701", "Posterior vein of left ventricle", "Vena ventriculi sinistri posterior")).toBe("");
  });
  it("keeps the badge for paired structures whose la says nothing about the side", () => {
    expect(sideFor("FJ1254", "Left femur", "Femur")).toBe("left");
    expect(sideFor("FJ2076", "Left inferior lateral genicular artery", "Arteria inferior lateralis genus")).toBe("left");
  });
  it("overrides the mislabeled FJ1469 pair regardless of manifest text", () => {
    expect(sideFor("FJ1469", "Left flexor pollicis brevis", "Musculus flexor pollicis brevis")).toBe("right");
    expect(sideFor("FJ1469M", "Right flexor pollicis brevis", "Musculus flexor pollicis brevis")).toBe("left");
  });
  it("pins the LAD's 'right anterior branch … of left coronary artery' meshes to the left", () => {
    const en = "First right anterior branch of anterior interventricular branch of left coronary artery";
    const la = "Ramus ventricularis anterior I rami interventricularis anterioris";
    expect(detectSide(en)).toBe("right"); // first match wins without the override
    expect(LATIN_SIDE.test(la)).toBe(false); // la не называет сторону — правило тут не работает
    for (const id of ["FJ2632", "FJ2641", "FJ2645", "FJ2646", "FJ2647"]) expect(sideFor(id, en, la)).toBe("left");
  });
  it("pins the mislabeled 'Right fibular vein' FJ2190 (left-thigh perforating veins) to the left", () => {
    expect(sideFor("FJ2190", "Right fibular vein", "Vena fibularis")).toBe("left");
  });
  it("swaps the mislabeled superior colliculus brachia", () => {
    expect(sideFor("FJ1735", "Brachium of left superior colliculus", "Brachium colliculi superioris")).toBe("right");
    expect(sideFor("FJ1736", "Brachium of right superior colliculus", "Brachium colliculi superioris")).toBe("left");
  });
  it("swaps the mislabeled middle pharyngeal constrictors", () => {
    expect(sideFor("FJ2742", "Right middle pharyngeal constrictor", "Musculus constrictor pharyngis medius")).toBe("left");
    expect(sideFor("FJ2754", "Left middle pharyngeal constrictor", "Musculus constrictor pharyngis medius")).toBe("right");
  });
  it("keeps the two cusps whose la names no side but whose en does", () => {
    expect(sideFor("FJ2417", "Left anterior cusp of pulmonary valve", "Valva trunci pulmonalis, valvula semilunaris anterior")).toBe("");
    expect(sideFor("FJ2431", "Right posterior cusp of aortic valve", "Valva aortae, valvula semilunaris posterior")).toBe("");
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
