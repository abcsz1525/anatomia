import type { QuizMode } from "@/lib/quiz/types";
import type { CardState, ReviewSummary } from "@/lib/srs/types";

/** Накопленная статистика по одной части (мешу/структуре) квиза. */
export interface PartStat {
  correct: number;
  wrong: number;
  lastAt: string;
}

/** Краткая сводка одной завершённой сессии квиза. */
export interface SessionSummary {
  topicId: string;
  mode: QuizMode;
  finishedAt: string;
  correct: number;
  total: number;
}

/**
 * Схема прогресса пользователя, версия 1. cards/reviews обязательны в типе
 * (с пустыми значениями по умолчанию для старых сохранений) — на диске эти
 * поля могут отсутствовать; parseProgress() их подставляет.
 */
export interface ProgressV1 {
  version: 1;
  parts: Record<string, PartStat>;
  sessions: SessionSummary[];
  activeDays: string[];
  cards: Record<string, CardState>;
  reviews: ReviewSummary[];
}
