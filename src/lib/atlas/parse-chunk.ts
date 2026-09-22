import type { AtlasPart, PartGeometry } from "./types";

function assertAligned(offset: number, bytes: number, what: string, partId: string) {
  if (offset % bytes !== 0) {
    throw new Error(`Chunk offset for ${what} of ${partId} is not ${bytes}-byte aligned (${offset})`);
  }
}

export function partGeometry(buffer: ArrayBuffer, part: AtlasPart): PartGeometry {
  const n = part.vertexCount * 3;
  assertAligned(part.positions, 4, "positions", part.id);
  assertAligned(part.normals, 2, "normals", part.id);
  assertAligned(part.indices, 4, "indices", part.id);

  const positions = new Float32Array(buffer, part.positions, n);
  const quantized = new Int16Array(buffer, part.normals, n);
  const normals = new Float32Array(n);
  for (let i = 0; i < n; i++) normals[i] = Math.max(-1, quantized[i] / 32767);
  const indices = new Uint32Array(buffer, part.indices, part.indexCount);
  return { positions, normals, indices };
}
