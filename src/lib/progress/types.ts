import type { QuizMode } from "@/lib/quiz/types";

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

/** Схема прогресса пользователя, версия 1. */
export interface ProgressV1 {
  version: 1;
  parts: Record<string, PartStat>;
  sessions: SessionSummary[];
  activeDays: string[];
}
