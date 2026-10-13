import { describe, expect, it } from "vitest";
import { explodeLayout, explodeOffset, type ExplodeCell } from "./explode-layout";
import type { Bounds } from "./types";

function box(
  id: string, w: number, h: number, d = 0.05, at: [number, number, number] = [0, 0, 0],
): { id: string; bounds: Bounds } {
  return {
    id,
    bounds: [
      [at[0] - w / 2, at[1] - h / 2, at[2] - d / 2],
      [at[0] + w / 2, at[1] + h / 2, at[2] + d / 2],
    ],
  };
}

function overlaps(a: ExplodeCell, b: ExplodeCell): boolean {
  const eps = 1e-9;
  return (
    Math.abs(a.x - b.x) < (a.width + b.width) / 2 - eps &&
    Math.abs(a.y - b.y) < (a.height + b.height) / 2 - eps
  );
}

const parts = Array.from({ length: 40 }, (_, i) => box(`P${i}`, 0.05 + (i % 7) * 0.03, 0.04 + (i % 5) * 0.05));

describe("explodeLayout", () => {
  it("каждая деталь получает ячейку; пустой список даёт пустую сетку", () => {
    const layout = explodeLayout(parts, 1.5);
    expect(layout.cells.size).toBe(parts.length);
    for (const p of parts) expect(layout.cells.has(p.id)).toBe(true);
    const empty = explodeLayout([], 1);
    expect(empty.cells.size).toBe(0);
    expect(empty.width).toBe(0);
    expect(empty.height).toBe(0);
  });

  it("ячейки не пересекаются", () => {
    const cells = [...explodeLayout(parts, 1).cells.values()];
    for (let i = 0; i < cells.length; i++)
      for (let j = i + 1; j < cells.length; j++) expect(overlaps(cells[i], cells[j])).toBe(false);
  });

  it("сетка центрирована, размер совпадает с крайними ячейками", () => {
    const layout = explodeLayout(parts, 1);
    const cells = [...layout.cells.values()];
    const left = Math.min(...cells.map((c) => c.x - c.width / 2));
    const right = Math.max(...cells.map((c) => c.x + c.width / 2));
    const top = Math.max(...cells.map((c) => c.y + c.height / 2));
    const bottom = Math.min(...cells.map((c) => c.y - c.height / 2));
    expect(left).toBeCloseTo(-layout.width / 2, 6);
    expect(right).toBeCloseTo(layout.width / 2, 6);
    expect(top).toBeCloseTo(layout.height / 2, 6);
    expect(bottom).toBeCloseTo(-layout.height / 2, 6);
  });

  it("детерминирована и не зависит от порядка входа", () => {
    const a = explodeLayout(parts, 1);
    const b = explodeLayout([...parts].reverse(), 1);
    expect([...a.cells.entries()]).toEqual([...b.cells.entries()]);
  });

  it("широкий экран даёт более широкую сетку", () => {
    expect(explodeLayout(parts, 1.5).width).toBeGreaterThan(explodeLayout(parts, 0.6).width);
  });

  it("крошечная деталь получает минимальную ячейку с полями", () => {
    const cell = explodeLayout([box("tiny", 0.001, 0.001)], 1).cells.get("tiny")!;
    expect(cell.width).toBeCloseTo(0.075);
    expect(cell.height).toBeCloseTo(0.075);
  });
});

describe("explodeOffset", () => {
  it("переносит центр детали в центр ячейки на высоте тела и в плоскость z = 0", () => {
    const part = box("P", 0.1, 0.2, 0.3, [1, 2, 3]);
    const cell = { x: -0.5, y: 0.25, width: 0.14, height: 0.24 };
    expect(explodeOffset(cell, part.bounds, 0.85)).toEqual([-0.5 - 1, 0.25 + 0.85 - 2, -3]);
  });
});
