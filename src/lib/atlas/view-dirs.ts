export type Vec3 = [number, number, number];

const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));
/** Две точки ближе этого считаем одним и тем же направлением. */
const SAME_DIR = 1e-6;

function normalize(v: Vec3): Vec3 {
  const len = Math.hypot(v[0], v[1], v[2]);
  // вырожденный вектор (камера ровно в цели) — смотрим «спереди»
  if (!(len > 0)) return [0, 0, 1];
  return [v[0] / len, v[1] / len, v[2] / len];
}

/** Равномерные точки на сфере (спираль Фибоначчи), все единичной длины. */
function fibonacciSphere(count: number): Vec3[] {
  const points: Vec3[] = [];
  for (let i = 0; i < count; i++) {
    const y = 1 - ((i + 0.5) / count) * 2;
    const r = Math.sqrt(Math.max(0, 1 - y * y));
    const theta = GOLDEN_ANGLE * i;
    points.push([Math.cos(theta) * r, y, Math.sin(theta) * r]);
  }
  return points;
}

/**
 * Кандидаты на ракурс — единичные направления «от цели к камере».
 * Первым идёт текущее направление (камера не двигается, если цель и так видна),
 * дальше точки сферы Фибоначчи по возрастанию угла к текущему: перелёт должен
 * быть минимальным из тех, откуда структура видна.
 */
export function candidateDirections(current: Vec3, count = 26): Vec3[] {
  const dir = normalize(current);
  const rest = fibonacciSphere(count)
    .filter((p) => Math.hypot(p[0] - dir[0], p[1] - dir[1], p[2] - dir[2]) > SAME_DIR)
    // косинус угла убывает — угол растёт; dot обоих единичных, ключ монотонен
    .sort((a, b) => dot(b, dir) - dot(a, dir));
  return [dir, ...rest];
}

function dot(a: Vec3, b: Vec3): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}
