import type { Side } from "@/lib/content/types";
import type { SystemId } from "@/lib/atlas/types";

export type QuizMode = "find" | "name";

/** Одна анатомическая структура как предмет квиза: часть модели + подпись. */
export interface QuizPart {
  id: string;
  la: string;
  ru: string;
  side: Side;
  system: SystemId;
  topic: string;
}

/** «Найди на модели»: цель + список id, засчитываемых как верный клик. */
export interface FindQuestion {
  kind: "find";
  target: QuizPart;
  accept: string[];
  attemptsLeft: number;
}

/** «Назови»: цель + 4 варианта названия, один из которых верный. */
export interface NameQuestion {
  kind: "name";
  target: QuizPart;
  options: { la: string; ru: string }[];
  correctIndex: number;
}

export type Question = FindQuestion | NameQuestion;

export interface AnswerRecord {
  partId: string;
  la: string;
  ru: string;
  correct: boolean;
  attempts: number;
}

export interface SessionResult {
  topicId: string;
  mode: QuizMode;
  startedAt: string;
  finishedAt: string;
  answers: AnswerRecord[];
}
