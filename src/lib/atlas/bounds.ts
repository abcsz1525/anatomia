import type { Bounds } from "./types";

export function boundsCenter(b: Bounds): [number, number, number] {
  return [(b[0][0] + b[1][0]) / 2, (b[0][1] + b[1][1]) / 2, (b[0][2] + b[1][2]) / 2];
}

export function boundsRadius(b: Bounds): number {
  const dx = b[1][0] - b[0][0], dy = b[1][1] - b[0][1], dz = b[1][2] - b[0][2];
  return Math.sqrt(dx * dx + dy * dy + dz * dz) / 2;
}

export function unionBounds(list: Bounds[]): Bounds {
  if (list.length === 0) throw new Error("unionBounds: empty list");
  const min: [number, number, number] = [Infinity, Infinity, Infinity];
  const max: [number, number, number] = [-Infinity, -Infinity, -Infinity];
  for (const b of list) {
    for (let i = 0; i < 3; i++) {
      if (b[0][i] < min[i]) min[i] = b[0][i];
      if (b[1][i] > max[i]) max[i] = b[1][i];
    }
  }
  return [min, max];
}

export function cameraDistance(radius: number, fovDeg: number, padding = 1.25): number {
  return (radius / Math.sin((fovDeg * Math.PI) / 360)) * padding;
}
