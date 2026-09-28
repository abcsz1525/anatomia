import { Color, SRGBColorSpace } from "three";
import type { AtlasPart, Bounds } from "./types";

/**
 * Оттенки одного слоя: на экране соседние отделы (тощая и подвздошная кишка,
 * соседние мышцы голени) не должны сливаться в одно пятно, но слой должен
 * оставаться узнаваемым по цвету. Поэтому вариации — сдвиги тона и светлоты
 * вокруг цвета системы, а не произвольная палитра.
 */
// в долях круга и в sRGB: 0.06 ≈ 22°, дальше красные мышцы уходят в малиновый и рыжий
const HUE_SHIFTS = [0, 0.03, -0.03, 0.06, -0.06];
const LIGHTNESS_SHIFTS = [0, -0.1, 0.1];

export function shadePalette(baseHex: string): Color[] {
  const hsl = { h: 0, s: 0, l: 0 };
  // HSL в sRGB: по умолчанию three считает его в линейном пространстве, где
  // те же сдвиги дают на экране совсем другие, куда более резкие цвета
  new Color(baseHex).getHSL(hsl, SRGBColorSpace);
  const candidates: Color[] = [];
  for (const dh of HUE_SHIFTS)
    for (const dl of LIGHTNESS_SHIFTS) {
      const l = Math.min(0.85, Math.max(0.2, hsl.l + dl));
      // для бесцветных слоёв добавляем немного насыщенности, иначе сдвиг тона пуст
      const s = dh === 0 ? hsl.s : Math.max(hsl.s, 0.18);
      candidates.push(new Color().setHSL((hsl.h + dh + 1) % 1, s, l, SRGBColorSpace));
    }
  // раскраска берёт первый свободный оттенок, поэтому порядок решает: каждый
  // следующий — самый далёкий от уже выбранных, и два соседа почти всегда
  // различаются заметно, а не на полтона светлоты
  const out = [candidates.shift()!];
  while (candidates.length) {
    let best = 0;
    let bestDist = -1;
    candidates.forEach((c, i) => {
      const d = Math.min(...out.map((o) => (c.r - o.r) ** 2 + (c.g - o.g) ** 2 + (c.b - o.b) ** 2));
      if (d > bestDist) { bestDist = d; best = i; }
    });
    out.push(candidates.splice(best, 1)[0]);
  }
  return out;
}

/** Одна структура слева и справа — один термин и один цвет. */
export function conceptKey(name: string): string {
  return name.toLowerCase().replace(/\b(left|right)\b/g, "").replace(/\s+/g, " ").trim();
}

const TOUCH_MARGIN = 0.005; // 5 мм: касающиеся структуры считаем соседями

function touches(a: Bounds, b: Bounds): boolean {
  for (let k = 0; k < 3; k++)
    if (a[0][k] > b[1][k] + TOUCH_MARGIN || b[0][k] > a[1][k] + TOUCH_MARGIN) return false;
  return true;
}

/**
 * Номер оттенка для каждой части слоя: жадная раскраска графа соседства
 * (соседи — структуры с пересекающимися габаритами), самые «окружённые»
 * первыми. Детерминирована: зависит только от порядка частей в манифесте.
 */
export function shadeIndices(parts: AtlasPart[], paletteSize: number): number[] {
  const keys: string[] = [];
  const members = new Map<string, number[]>();
  parts.forEach((p, i) => {
    const key = conceptKey(p.name);
    if (!members.has(key)) {
      members.set(key, []);
      keys.push(key);
    }
    members.get(key)!.push(i);
  });
  const neighbours = keys.map(() => new Set<number>());
  for (let a = 0; a < keys.length; a++)
    for (let b = a + 1; b < keys.length; b++) {
      const near = members.get(keys[a])!.some((i) =>
        members.get(keys[b])!.some((j) => touches(parts[i].bounds, parts[j].bounds)),
      );
      if (near) {
        neighbours[a].add(b);
        neighbours[b].add(a);
      }
    }
  const order = keys.map((_, i) => i).sort((a, b) => neighbours[b].size - neighbours[a].size || a - b);
  const shade = new Array<number>(keys.length).fill(-1);
  for (const c of order) {
    const used = new Map<number, number>();
    for (const n of neighbours[c]) if (shade[n] >= 0) used.set(shade[n], (used.get(shade[n]) ?? 0) + 1);
    // свободный оттенок, а если все заняты — самый редкий среди соседей
    let best = 0;
    for (let s = 0; s < paletteSize; s++) {
      if (!used.has(s)) { best = s; break; }
      if ((used.get(s) ?? 0) < (used.get(best) ?? 0)) best = s;
    }
    shade[c] = best;
  }
  const byKey = new Map(keys.map((k, i) => [k, shade[i]]));
  return parts.map((p) => byKey.get(conceptKey(p.name))!);
}
