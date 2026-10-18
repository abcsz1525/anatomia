import { describe, expect, it } from "vitest";
import { makeManual, parseManual } from "./manual";

describe("manual anatomical anchors", () => {
  const data = () => ({ version:1, boneId:"femur-l", sourceHash:"geometry-v1", landmarks:[makeManual("Головка", "Caput", [0.1,0.2,0.3])] });
  it("round-trips the exact surface hit", () => {
    expect(parseManual(data(), "femur-l", "geometry-v1").landmarks[0].position).toEqual([0.1,0.2,0.3]);
  });
  it("rejects transfer to the other side or a different geometry", () => {
    expect(()=>parseManual(data(),"femur-r","geometry-v1")).toThrow();
    expect(()=>parseManual(data(),"femur-l","geometry-v2")).toThrow();
  });
  it("rejects invalid coordinates, duplicate IDs and pretending to be sourced", () => {
    const bad = data(); bad.landmarks[0].position = [NaN,0,0];
    expect(()=>parseManual(bad,"femur-l","geometry-v1")).toThrow();
    const repeated = data(); repeated.landmarks.push(repeated.landmarks[0]);
    expect(()=>parseManual(repeated,"femur-l","geometry-v1")).toThrow();
    const forged = data(); forged.landmarks[0].source = "z-anatomy";
    expect(()=>parseManual(forged,"femur-l","geometry-v1")).toThrow();
  });
});
