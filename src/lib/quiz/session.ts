import type { AnswerRecord, Question, QuizMode, SessionResult } from "./types";

/** Число кликов по модели на один вопрос режима «найди». */
export const FIND_ATTEMPTS = 3;

/**
 * Состояние текущего вопроса в панели.
 * - "wrong" — только режим «найди»: попытки ещё есть, вопрос не закрыт.
 * - "offtopic" — клик по части-декорации (скелет-контекст): попытка не тратится,
 *   поэтому `left` повторяет оставшееся число попыток, а не уменьшает его.
 * - "revealed" — попытки кончились, ответ показан на модели.
 * - "chosen" — режим «назови»: вариант выбран, вопрос закрыт.
 */
export type Feedback =
  | { kind: "idle" }
  | { kind: "correct" }
  | { kind: "wrong"; left: number }
  | { kind: "offtopic"; left: number }
  | { kind: "revealed" }
  | { kind: "chosen"; index: number; correct: boolean };

/** Вопрос закрыт: ответ записан, дальше только «Дальше». */
export function isAnswered(f: Feedback): boolean {
  return f.kind === "correct" || f.kind === "revealed" || f.kind === "chosen";
}

export type QuizState =
  | { phase: "setup" }
  | {
      phase: "running";
      topicId: string;
      mode: QuizMode;
      questions: Question[];
      index: number;
      answers: AnswerRecord[];
      /** Использовано попыток на текущем вопросе (клики/выборы). */
      attempts: number;
      feedback: Feedback;
      startedAt: string;
    }
  | { phase: "result"; result: SessionResult };

export type Action =
  | { type: "start"; topicId: string; mode: QuizMode; questions: Question[]; startedAt: string }
  | { type: "answer"; correct: boolean }
  | { type: "offtopic" }
  | { type: "choose"; index: number; correct: boolean }
  | { type: "next"; now: string }
  | { type: "abort" };

export const initialQuizState: QuizState = { phase: "setup" };

function answerFor(q: Question, correct: boolean, attempts: number): AnswerRecord {
  return { partId: q.target.id, la: q.target.la, ru: q.target.ru, side: q.target.side, correct, attempts };
}

/**
 * Машина состояний одной сессии: setup → running (10 вопросов) → result.
 * Чистая функция без React и без стора сцены — подсветки/камеру ставит экран.
 */
export function reducer(state: QuizState, action: Action): QuizState {
  switch (action.type) {
    case "start":
      return {
        phase: "running",
        topicId: action.topicId,
        mode: action.mode,
        questions: action.questions,
        index: 0,
        answers: [],
        attempts: 0,
        feedback: { kind: "idle" },
        startedAt: action.startedAt,
      };
    case "abort":
      return { phase: "setup" };
    case "answer": {
      if (state.phase !== "running" || isAnswered(state.feedback)) return state;
      const q = state.questions[state.index];
      const attempts = state.attempts + 1;
      if (action.correct) {
        return { ...state, attempts, answers: [...state.answers, answerFor(q, true, attempts)], feedback: { kind: "correct" } };
      }
      // третий промах закрывает вопрос: ответ показан, записывается как ошибка
      if (attempts >= FIND_ATTEMPTS) {
        return {
          ...state,
          attempts,
          answers: [...state.answers, answerFor(q, false, FIND_ATTEMPTS)],
          feedback: { kind: "revealed" },
        };
      }
      return { ...state, attempts, feedback: { kind: "wrong", left: FIND_ATTEMPTS - attempts } };
    }
    // клик по скелету-контексту чужой темы: подсказка вместо попытки
    case "offtopic":
      if (state.phase !== "running" || isAnswered(state.feedback)) return state;
      return { ...state, feedback: { kind: "offtopic", left: FIND_ATTEMPTS - state.attempts } };
    case "choose": {
      if (state.phase !== "running" || isAnswered(state.feedback)) return state;
      const q = state.questions[state.index];
      return {
        ...state,
        attempts: 1,
        answers: [...state.answers, answerFor(q, action.correct, 1)],
        feedback: { kind: "chosen", index: action.index, correct: action.correct },
      };
    }
    case "next": {
      if (state.phase !== "running" || !isAnswered(state.feedback)) return state;
      const next = state.index + 1;
      if (next < state.questions.length) {
        return { ...state, index: next, attempts: 0, feedback: { kind: "idle" } };
      }
      return {
        phase: "result",
        result: {
          topicId: state.topicId,
          mode: state.mode,
          startedAt: state.startedAt,
          finishedAt: action.now,
          answers: state.answers,
        },
      };
    }
  }
}
