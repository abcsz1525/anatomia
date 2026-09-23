import type { QuizPart } from "@/lib/quiz/types";
import type { ProgressV1 } from "./types";

const DAY_MS = 24 * 60 * 60 * 1000;
const DAY_KEY_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

/**
 * Календарный день ISO-метки времени в UTC (а не в локальном часовом
 * поясе): "2026-09-23" для любой метки внутри 2026-09-23T00:00:00.000Z —
 * 2026-09-23T23:59:59.999Z. Это делает activeDays детерминированными
 * независимо от часового пояса устройства.
 */
export function dayKey(iso: string): string {
  return new Date(iso).toISOString().slice(0, 10);
}

function dayKeyToUTCms(key: string): number {
  const m = DAY_KEY_RE.exec(key);
  if (!m) return NaN;
  const [, y, mo, d] = m;
  return Date.UTC(Number(y), Number(mo) - 1, Number(d));
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

/** Подряд идущие дни активности, заканчивающиеся today или today-1; иначе 0. */
export function streakDays(activeDays: string[], today: string): number {
  const days = new Set(activeDays);
  const todayMs = dayKeyToUTCms(today);
  if (Number.isNaN(todayMs)) return 0;

  let cursor: number;
  if (days.has(today)) {
    cursor = todayMs;
  } else {
    const yesterdayKey = new Date(todayMs - DAY_MS).toISOString().slice(0, 10);
    if (days.has(yesterdayKey)) {
      cursor = todayMs - DAY_MS;
    } else {
      return 0;
    }
  }

  let count = 0;
  while (days.has(new Date(cursor).toISOString().slice(0, 10))) {
    count += 1;
    cursor -= DAY_MS;
  }
  return count;
}
