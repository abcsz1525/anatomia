import { dayKey } from "@/lib/progress/stats";
import { review } from "./sm2";
import type { Card, CardState, Grade, ReviewSummary } from "./types";

/** Что показывается лицевой стороной карточки. */
export type Direction = "la-ru" | "ru-la";

/** Сколько раз за сессию «Не помню» возвращает карточку в конец очереди. */
export const MAX_REQUEUE = 3;

/** topicId сессии по всему курсу: темы с таким id в topics.json нет. */
export const ALL_TOPICS = "all";

/** Значения поля «Новых в день». */
export const DEFAULT_NEW_LIMIT = 20;
export const MIN_NEW_LIMIT = 1;
export const MAX_NEW_LIMIT = 100;

const DAY_KEY_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

const GRADES: Grade[] = ["again", "good", "easy"];

/**
 * Состояние экрана карточек: setup → review (очередь дня) → done.
 * Фаза review и фаза done несут одни и те же topicId/states/forgotten,
 * поэтому запись прогресса (sessionTally) одинаково работает и когда очередь
 * кончилась, и когда пользователь ушёл посреди сессии.
 */
export type CardsState =
  | { phase: "setup" }
  | {
      phase: "review";
      topicId: string;
      /** Очередь дня; «Не помню» дописывает карточку в конец. */
      queue: Card[];
      index: number;
      /** Обратная сторона открыта — оценивать можно только после этого. */
      revealed: boolean;
      /** Снимок сохранённых состояний на старте сессии (progress.cards). */
      base: Record<string, CardState>;
      /** Состояния, изменённые в сессии: результат ПОСЛЕДНЕЙ оценки ключа. */
      states: Record<string, CardState>;
      /** Сколько раз ключ уже возвращался в очередь. */
      requeues: Record<string, number>;
      /** Ключи, получившие «Не помню» хотя бы раз, без повторов. */
      forgotten: string[];
      startedAt: string;
    }
  | {
      phase: "done";
      topicId: string;
      /** Тот же снимок, что в фазе review: по нему sessionTally считает fresh. */
      base: Record<string, CardState>;
      states: Record<string, CardState>;
      forgotten: string[];
      startedAt: string;
    };

export type Action =
  | { type: "start"; topicId: string; queue: Card[]; base: Record<string, CardState>; startedAt: string }
  | { type: "reveal" }
  | { type: "grade"; grade: Grade; today: string; now: string }
  | { type: "abort" };

export const initialCardsState: CardsState = { phase: "setup" };

/**
 * Машина состояний одной сессии повторения. Чистая функция: SM-2 считает
 * review() из sm2.ts, сюда добавлена только логика очереди — возврат
 * забытых карточек (не больше MAX_REQUEUE раз) и переход в done.
 */
export function reducer(state: CardsState, action: Action): CardsState {
  switch (action.type) {
    case "start":
      return {
        phase: "review",
        topicId: action.topicId,
        queue: action.queue,
        index: 0,
        revealed: false,
        base: action.base,
        states: {},
        requeues: {},
        forgotten: [],
        startedAt: action.startedAt,
      };
    case "abort":
      return initialCardsState;
    case "reveal":
      if (state.phase !== "review" || state.revealed) return state;
      return { ...state, revealed: true };
    case "grade": {
      if (state.phase !== "review" || !state.revealed) return state;
      const card = state.queue[state.index];
      if (!card) return state;

      // состояние сессии важнее сохранённого: карточку могли уже оценить
      // сегодня, и второй ответ продолжает первый, а не начинает заново
      const prev = state.states[card.key] ?? state.base[card.key];
      const states = { ...state.states, [card.key]: review(prev, action.grade, action.today, action.now) };

      const forgot = action.grade === "again";
      const seen = state.requeues[card.key] ?? 0;
      const requeue = forgot && seen < MAX_REQUEUE;

      const next = {
        ...state,
        queue: requeue ? [...state.queue, card] : state.queue,
        requeues: requeue ? { ...state.requeues, [card.key]: seen + 1 } : state.requeues,
        index: state.index + 1,
        revealed: false,
        states,
        forgotten: forgot && !state.forgotten.includes(card.key) ? [...state.forgotten, card.key] : state.forgotten,
      };

      if (next.index < next.queue.length) return next;
      return {
        phase: "done",
        topicId: next.topicId,
        base: next.base,
        states: next.states,
        forgotten: next.forgotten,
        startedAt: next.startedAt,
      };
    }
  }
}

/** Сколько карточек осталось показать в текущей очереди. */
export function remaining(state: CardsState): number {
  return state.phase === "review" ? state.queue.length - state.index : 0;
}

/**
 * Итог сессии для ReviewSummary: reviewed — сколько различных карточек
 * оценено, again — скольких из них хотя бы раз не вспомнили, fresh — сколько
 * из них не имели состояния на старте сессии (новые). Повторный показ одной
 * карточки не увеличивает ни одно из трёх чисел.
 */
export function sessionTally(
  state: CardsState,
): { topicId: string; states: Record<string, CardState>; reviewed: number; again: number; fresh: number } | null {
  if (state.phase === "setup") return null;
  const keys = Object.keys(state.states);
  return {
    topicId: state.topicId,
    states: state.states,
    reviewed: keys.length,
    again: state.forgotten.length,
    fresh: keys.filter((key) => state.base[key] === undefined).length,
  };
}

/**
 * Сколько новых карточек уже показано сегодня: сумма fresh по сводкам,
 * законченным в этот день. Дневной лимит новых — это остаток
 * newLimit − newShownToday, иначе каждая следующая сессия снова выдавала бы
 * полный лимит новых карточек.
 */
export function newShownToday(reviews: ReviewSummary[], today: string): number {
  let count = 0;
  for (const r of reviews) {
    if (dayKey(r.finishedAt) === today) count += r.fresh;
  }
  return count;
}

/** Ближайшая дата повторения среди состояний сессии; null, если их нет. */
export function nextDue(states: Record<string, CardState>): string | null {
  let min: string | null = null;
  for (const s of Object.values(states)) {
    if (min === null || s.due < min) min = s.due;
  }
  return min;
}

/**
 * Ближайшая дата повторения строго позже today среди карточек колоды, у
 * которых есть состояние; null, если ждать нечего. Нужна, когда на сегодня
 * очередь пуста: экран настройки и экран «готово» говорят, когда прийти
 * снова, вместо тупика с неактивной кнопкой.
 */
export function deckNextDue(deck: Card[], states: Record<string, CardState>, today: string): string | null {
  let min: string | null = null;
  for (const card of deck) {
    const state = states[card.key];
    if (state === undefined || state.due <= today) continue;
    if (min === null || state.due < min) min = state.due;
  }
  return min;
}

/**
 * «Сегодня: N к повторению, M новых» — то же разбиение колоды, что делает
 * buildQueue: due — карточки с состоянием и due <= today, fresh — карточки
 * без состояния, не больше newLimit.
 */
export function deckCounts(
  deck: Card[],
  states: Record<string, CardState>,
  today: string,
  newLimit: number,
): { due: number; fresh: number } {
  let due = 0;
  let fresh = 0;
  for (const card of deck) {
    const state = states[card.key];
    if (state) {
      if (state.due <= today) due += 1;
    } else {
      fresh += 1;
    }
  }
  return { due, fresh: Math.min(fresh, Math.max(0, newLimit)) };
}

/** Подсказка на кнопках оценок: каким станет интервал карточки. */
export function gradeIntervals(prev: CardState | undefined, today: string): Record<Grade, number> {
  const result = {} as Record<Grade, number>;
  for (const grade of GRADES) result[grade] = review(prev, grade, today).interval;
  return result;
}

/** Значение поля «Новых в день»: целое 1…100, по умолчанию 20. */
export function parseNewLimit(raw: string | null): number {
  const n = Number(raw);
  if (raw === null || raw.trim() === "" || !Number.isFinite(n)) return DEFAULT_NEW_LIMIT;
  return Math.min(MAX_NEW_LIMIT, Math.max(MIN_NEW_LIMIT, Math.trunc(n)));
}

/** Направление карточек из хранилища: всё, кроме "ru-la", читается как "la-ru". */
export function parseDirection(raw: string | null): Direction {
  return raw === "ru-la" ? "ru-la" : "la-ru";
}

/** dayKey "2026-09-25" → «25.09.2026»; неразобранный ключ возвращается как есть. */
export function formatDay(key: string): string {
  const m = DAY_KEY_RE.exec(key);
  return m ? `${m[3]}.${m[2]}.${m[1]}` : key;
}

/** «25.09.2026» для будущей даты, «сегодня» пока карточки ещё ждут, «—» без повторений. */
export function dueLabel(due: string | null, today: string): string {
  if (due === null) return "—";
  return due <= today ? "сегодня" : formatDay(due);
}

/** Лицевая и обратная стороны карточки в выбранном направлении. */
export function cardSides(card: Card, direction: Direction): { front: string; back: string; frontLatin: boolean } {
  return direction === "la-ru"
    ? { front: card.la, back: card.ru, frontLatin: true }
    : { front: card.ru, back: card.la, frontLatin: false };
}
