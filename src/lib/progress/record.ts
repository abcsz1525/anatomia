import type { SessionResult } from "@/lib/quiz/types";
import { dayKey } from "./stats";
import type { PartStat, ProgressV1 } from "./types";

export function emptyProgress(): ProgressV1 {
  return { version: 1, parts: {}, sessions: [], activeDays: [] };
}

/** Чистая функция: записывает результат сессии в прогресс, возвращая новый объект. */
export function recordSession(p: ProgressV1, r: SessionResult): ProgressV1 {
  const parts: Record<string, PartStat> = { ...p.parts };
  let correct = 0;

  for (const answer of r.answers) {
    const prev = parts[answer.partId] ?? { correct: 0, wrong: 0, lastAt: r.finishedAt };
    parts[answer.partId] = {
      correct: prev.correct + (answer.correct ? 1 : 0),
      wrong: prev.wrong + (answer.correct ? 0 : 1),
      lastAt: r.finishedAt,
    };
    if (answer.correct) correct += 1;
  }

  const sessions = [
    ...p.sessions,
    {
      topicId: r.topicId,
      mode: r.mode,
      finishedAt: r.finishedAt,
      correct,
      total: r.answers.length,
    },
  ];

  const day = dayKey(r.finishedAt);
  const activeDays = p.activeDays.includes(day)
    ? [...p.activeDays]
    : [...p.activeDays, day].sort();

  return { version: 1, parts, sessions, activeDays };
}

/**
 * Чистая функция: пересчитывает activeDays из sessions текущим (местным)
 * dayKey(). Нужна на загрузке/импорте прогресса — ключи, записанные старой
 * UTC-версией dayKey() (или иначе разошедшиеся с sessions), иначе остаются
 * неверными до следующей сессии, а не только для новых дней.
 */
export function normalizeActiveDays(p: ProgressV1): ProgressV1 {
  const activeDays = Array.from(new Set(p.sessions.map((s) => dayKey(s.finishedAt)))).sort();
  return { ...p, activeDays };
}
