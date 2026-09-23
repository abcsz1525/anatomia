import { describe, expect, it } from "vitest";
import { candidateDirections, type Vec3 } from "./view-dirs";

const len = (v: Vec3) => Math.hypot(v[0], v[1], v[2]);
const angle = (a: Vec3, b: Vec3) =>
  Math.acos(Math.min(1, Math.max(-1, a[0] * b[0] + a[1] * b[1] + a[2] * b[2])));

describe("candidateDirections", () => {
  it("starts with the normalised current direction", () => {
    const dirs = candidateDirections([0, 0, 5]);
    expect(dirs[0][0]).toBeCloseTo(0, 6);
    expect(dirs[0][1]).toBeCloseTo(0, 6);
    expect(dirs[0][2]).toBeCloseTo(1, 6);
  });

  it("returns count + 1 unit vectors without NaN", () => {
    const dirs = candidateDirections([1, 2, 3], 26);
    expect(dirs).toHaveLength(27);
    for (const d of dirs) {
      expect(len(d)).toBeCloseTo(1, 6);
      expect(d.every((c) => Number.isFinite(c))).toBe(true);
    }
  });

  it("honours a custom count", () => {
    expect(candidateDirections([0, 1, 0], 8)).toHaveLength(9);
    expect(candidateDirections([0, 1, 0], 100)).toHaveLength(101);
  });

  it("orders candidates by non-decreasing angle to the current direction", () => {
    const current: Vec3 = [0.3, -0.8, 0.5];
    const dirs = candidateDirections(current);
    const angles = dirs.map((d) => angle(d, dirs[0]));
    expect(angles[0]).toBeCloseTo(0, 6);
    for (let i = 1; i < angles.length; i++) expect(angles[i]).toBeGreaterThanOrEqual(angles[i - 1] - 1e-9);
  });

  it("covers the whole sphere, including the opposite side", () => {
    const dirs = candidateDirections([0, 0, 1], 26);
    expect(angle(dirs[dirs.length - 1], [0, 0, 1])).toBeGreaterThan(Math.PI / 2);
  });

  it("drops a sphere point that coincides with the current direction", () => {
    // точка i = 0 спирали при count = 4: y = 0.75, x = r, z = 0
    const count = 4;
    const y = 1 - 0.5 / count * 2;
    const r = Math.sqrt(1 - y * y);
    const dirs = candidateDirections([r, y, 0], count);
    expect(dirs).toHaveLength(count); // без дубля current
    expect(new Set(dirs.map((d) => d.join(","))).size).toBe(count);
  });

  it("falls back to a front view for a degenerate current direction", () => {
    const dirs = candidateDirections([0, 0, 0]);
    expect(dirs[0]).toEqual([0, 0, 1]);
    expect(dirs.every((d) => d.every(Number.isFinite))).toBe(true);
  });
});
