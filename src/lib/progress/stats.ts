import type { QuizPart } from "@/lib/quiz/types";
import type { Card } from "@/lib/srs/types";
import type { ProgressV1 } from "./types";

const DAY_KEY_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Форматирует дату как местный календарный день "YYYY-MM-DD" (с ведущими нулями). */
function formatDayKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseDayKey(key: string): { y: number; m: number; d: number } | null {
  const m = DAY_KEY_RE.exec(key);
  if (!m) return null;
  return { y: Number(m[1]), m: Number(m[2]), d: Number(m[3]) };
}

/**
 * Местный календарный день ISO-метки времени (часовой пояс устройства, а
 * не UTC): "2026-09-23" для любой метки внутри местных суток 2026-09-23.
 * activeDays поэтому отражает то, каким днём сессия ощущалась для
 * пользователя, а не UTC-дату сервера.
 */
export function dayKey(iso: string): string {
  return formatDayKey(new Date(iso));
}

/**
 * Добавляет n (местных) календарных дней к dayKey. Использует тот же
 * DST-safe идиому new Date(y, m-1, d+n), что и streakDays: JS сам
 * нормализует выход за границы месяца/года. Невалидный ключ возвращается
 * без изменений.
 */
export function addDays(key: string, n: number): string {
  const parts = parseDayKey(key);
  if (!parts) return key;
  const { y, m, d } = parts;
  return formatDayKey(new Date(y, m - 1, d + n));
}

/** Считает освоенные структуры: known = distinct la с суммой correct >= 2 по всем id этой la. */
export function topicMastery(p: ProgressV1, parts: QuizPart[]): { known: number; total: number } {
  const idsByLa = new Map<string, string[]>();
  for (const part of parts) {
    const ids = idsByLa.get(part.la);
    if (ids) {
      ids.push(part.id);
    } else {
      idsByLa.set(part.la, [part.id]);
    }
  }

  let known = 0;
  for (const ids of idsByLa.values()) {
    const sum = ids.reduce((acc, id) => acc + (p.parts[id]?.correct ?? 0), 0);
    if (sum >= 2) known += 1;
  }

  return { known, total: idsByLa.size };
}

/** Считает освоенные карточки колоды: learned = число ключей деки с interval >= 7 (отсутствие состояния — не освоена). */
export function cardMastery(p: ProgressV1, deck: Card[]): { learned: number; total: number } {
  let learned = 0;
  for (const card of deck) {
    if ((p.cards[card.key]?.interval ?? 0) >= 7) learned += 1;
  }
  return { learned, total: deck.length };
}

/** Подряд идущие дни активности, заканчивающиеся today или today-1; иначе 0. */
export function streakDays(activeDays: string[], today: string): number {
  const days = new Set(activeDays);
  const parts = parseDayKey(today);
  if (!parts) return 0;
  const { y, m, d } = parts;

  // new Date(y, m-1, d-n) is local-time, DST-safe day arithmetic: JS
  // normalises out-of-range days (e.g. d-n <= 0) across month/year
  // boundaries without any manual carrying.
  let n: number;
  if (days.has(today)) {
    n = 0;
  } else {
    const yesterdayKey = formatDayKey(new Date(y, m - 1, d - 1));
    if (days.has(yesterdayKey)) {
      n = 1;
    } else {
      return 0;
    }
  }

  let count = 0;
  while (days.has(formatDayKey(new Date(y, m - 1, d - n)))) {
    count += 1;
    n += 1;
  }
  return count;
}
