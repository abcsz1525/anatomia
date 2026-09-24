import type { SessionResult } from "@/lib/quiz/types";
import type { CardState, ReviewSummary } from "@/lib/srs/types";
import { dayKey } from "./stats";
import type { PartStat, ProgressV1 } from "./types";

export function emptyProgress(): ProgressV1 {
  return { version: 1, parts: {}, sessions: [], activeDays: [], cards: {}, reviews: [] };
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

  return { version: 1, parts, sessions, activeDays, cards: p.cards, reviews: p.reviews };
}

/**
 * Чистая функция: сливает states в p.cards (новые состояния поверх старых),
 * добавляет summary в reviews и пересчитывает activeDays из sessions ∪
 * reviews (та же формула, что и normalizeActiveDays).
 */
export function recordReview(
  p: ProgressV1,
  summary: ReviewSummary,
  states: Record<string, CardState>,
): ProgressV1 {
  const cards: Record<string, CardState> = { ...p.cards, ...states };
  const reviews = [...p.reviews, summary];
  const activeDays = activeDaysFrom(p.sessions, reviews);

  return { ...p, cards, reviews, activeDays };
}

/**
 * Чистая функция: пересчитывает activeDays из sessions ∪ reviews текущим
 * (местным) dayKey(). Нужна на загрузке/импорте прогресса — ключи,
 * записанные старой UTC-версией dayKey() (или иначе разошедшиеся с
 * sessions/reviews), иначе остаются неверными до следующей сессии, а не
 * только для новых дней.
 */
export function normalizeActiveDays(p: ProgressV1): ProgressV1 {
  const activeDays = activeDaysFrom(p.sessions, p.reviews);
  return { ...p, activeDays };
}

function activeDaysFrom(
  sessions: { finishedAt: string }[],
  reviews: { finishedAt: string }[],
): string[] {
  return Array.from(
    new Set([...sessions.map((s) => dayKey(s.finishedAt)), ...reviews.map((r) => dayKey(r.finishedAt))]),
  ).sort();
}
