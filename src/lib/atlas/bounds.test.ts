import { describe, expect, it } from "vitest";
import { boundsCenter, boundsRadius, cameraDistance, unionBounds } from "./bounds";

describe("bounds", () => {
  it("center and radius", () => {
    expect(boundsCenter([[0, 0, 0], [2, 4, 6]])).toEqual([1, 2, 3]);
    expect(boundsRadius([[0, 0, 0], [3, 4, 0]])).toBeCloseTo(2.5);
  });
  it("union", () => {
    expect(unionBounds([[[0, 0, 0], [1, 1, 1]], [[-1, 2, 0], [0, 3, 5]]])).toEqual([[-1, 0, 0], [1, 3, 5]]);
    expect(() => unionBounds([])).toThrow();
  });
  it("camera distance grows with radius and shrinks with fov", () => {
    expect(cameraDistance(1, 90, 1)).toBeCloseTo(Math.SQRT2, 5);
    expect(cameraDistance(1, 45)).toBeGreaterThan(cameraDistance(1, 90));
  });
});
