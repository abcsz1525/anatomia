import { describe, expect, it } from "vitest";
import { partGeometry } from "./parse-chunk";
import type { AtlasPart } from "./types";

function makeBuffer() {
  // 3 vertices, 1 triangle
  const positions = new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]); // 36 bytes @0
  const normals = new Int16Array([0, 0, 32767, 0, 0, 32767, 0, 0, -32768]); // 18 bytes @36
  const indices = new Uint32Array([0, 1, 2]); // 12 bytes @56 (36+18=54 → pad to 56)
  const buffer = new ArrayBuffer(68);
  new Float32Array(buffer, 0, 9).set(positions);
  new Int16Array(buffer, 36, 9).set(normals);
  new Uint32Array(buffer, 56, 3).set(indices);
  return buffer;
}

const part: AtlasPart = {
  id: "FJ1", name: "Test", conceptId: "FMA1", system: "skeletal", chunk: 0,
  positions: 0, normals: 36, indices: 56, vertexCount: 3, indexCount: 3,
  bounds: [[0, 0, 0], [1, 1, 0]],
};

describe("partGeometry", () => {
  it("reads positions, dequantizes normals and reads indices", () => {
    const g = partGeometry(makeBuffer(), part);
    expect(Array.from(g.positions)).toEqual([0, 0, 0, 1, 0, 0, 0, 1, 0]);
    expect(g.normals[2]).toBeCloseTo(1, 5);
    expect(g.normals[8]).toBeCloseTo(-1, 5);
    expect(Array.from(g.indices)).toEqual([0, 1, 2]);
  });

  it("throws a clear error on misaligned offsets", () => {
    expect(() => partGeometry(makeBuffer(), { ...part, positions: 2 })).toThrow(/aligned/);
  });
});
