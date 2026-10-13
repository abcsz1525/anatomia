import type { Bounds } from "./types";

export interface ExplodeCell {
  /** Центр ячейки в плоскости XY сетки (единицы модели, метры). */
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ExplodeLayout {
  cells: Map<string, ExplodeCell>;
  width: number;
  height: number;
}

/** Меньше этого проекция детали не бывает: иначе кость запястья в сетке не найти. */
const MIN_SIZE = 0.035;
/** Поле вокруг каждой детали, чтобы соседи не касались. */
const PADDING = 0.04;

/**
 * Раскладка «инвентаря»: каждая видимая деталь получает ячейку по размеру
 * своей проекции на XY, ячейки укладываются рядами в сетку, пропорции
 * которой подстроены под экран (`aspect` = ширина / высота). Сетка
 * центрирована по обеим осям. Порт укладчика human-atlas.
 *
 * Детерминирована: сортировка по высоте, затем по id — одинаковый набор
 * деталей всегда даёт одинаковую сетку.
 */
export function explodeLayout(parts: { id: string; bounds: Bounds }[], aspect = 1): ExplodeLayout {
  if (parts.length === 0) return { cells: new Map(), width: 0, height: 0 };
  const cards = parts.map((p) => ({
    id: p.id,
    width: Math.max(MIN_SIZE, p.bounds[1][0] - p.bounds[0][0]) + PADDING,
    height: Math.max(MIN_SIZE, p.bounds[1][1] - p.bounds[0][1]) + PADDING,
  }));
  const area = cards.reduce((n, c) => n + c.width * c.height, 0);
  let maxWidth = 0.3;
  for (const c of cards) if (c.width > maxWidth) maxWidth = c.width;
  const targetWidth = Math.max(maxWidth, Math.sqrt(area * Math.max(0.5, Math.min(1.5, aspect))) * 1.18);
  cards.sort((a, b) => b.height - a.height || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));

  const cells = new Map<string, ExplodeCell>();
  let x = 0;
  let y = 0;
  let row = 0;
  let usedWidth = 0;
  for (const c of cards) {
    if (x > 0 && x + c.width > targetWidth) {
      x = 0;
      y += row;
      row = 0;
    }
    cells.set(c.id, { x: x + c.width / 2, y: -y - c.height / 2, width: c.width, height: c.height });
    x += c.width;
    usedWidth = Math.max(usedWidth, x);
    row = Math.max(row, c.height);
  }
  const height = y + row;
  for (const c of cells.values()) {
    c.x -= usedWidth / 2;
    c.y += height / 2;
  }
  return { cells, width: usedWidth, height };
}

/**
 * Смещение детали при полном разнесении: её центр ложится в центр ячейки,
 * сетка висит на высоте центра тела, все детали — в плоскости z = 0.
 */
export function explodeOffset(cell: ExplodeCell, bounds: Bounds, bodyCenterY: number): [number, number, number] {
  const cx = (bounds[0][0] + bounds[1][0]) / 2;
  const cy = (bounds[0][1] + bounds[1][1]) / 2;
  const cz = (bounds[0][2] + bounds[1][2]) / 2;
  return [cell.x - cx, cell.y + bodyCenterY - cy, -cz];
}
