import { addDays } from "@/lib/progress/stats";
import type { CardState, Grade } from "./types";

const MIN_EASE = 1.3;
const MAX_EASE = 2.5;
const START_EASE = 2.5;

/** Ключ карточки: la в нижнем регистре, без пробелов по краям — общий для обеих сторон и всех мешей структуры. */
export function cardKey(la: string): string {
  return la.trim().toLowerCase();
}

/**
 * Упрощённый SM-2: один шаг повторения карточки.
 * today — dayKey дня повторения (используется для вычисления due).
 * now — ISO-метка момента повторения, по умолчанию текущее время.
 */
export function review(
  prev: CardState | undefined,
  grade: Grade,
  today: string,
  now: string = new Date().toISOString(),
): CardState {
  const ease = prev?.ease ?? START_EASE;
  const reps = prev?.reps ?? 0;
  const lapses = prev?.lapses ?? 0;
  const prevInterval = prev?.interval ?? 0;

  if (grade === "again") {
    const interval = 1;
    return {
      ease: Math.max(MIN_EASE, ease - 0.2),
      interval,
      reps: 0,
      lapses: lapses + 1,
      due: addDays(today, interval),
      lastAt: now,
    };
  }

  const goodInterval = reps === 0 ? 1 : reps === 1 ? 3 : Math.round(prevInterval * ease);

  if (grade === "good") {
    return {
      ease,
      interval: goodInterval,
      reps: reps + 1,
      lapses,
      due: addDays(today, goodInterval),
      lastAt: now,
    };
  }

  // easy
  const interval = Math.round(goodInterval * 1.3);
  return {
    ease: Math.min(MAX_EASE, ease + 0.15),
    interval,
    reps: reps + 1,
    lapses,
    due: addDays(today, interval),
    lastAt: now,
  };
}
