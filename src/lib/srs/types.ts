export type Grade = "again" | "good" | "easy";

/** Состояние SM-2 одной карточки: ease 1.3…2.5, interval в днях, due — dayKey. */
export interface CardState {
  ease: number;
  interval: number;
  reps: number;
  lapses: number;
  due: string;
  lastAt: string;
}

/** Карточка колоды: одна структура (concept) по la, с русским названием и темой. */
export interface Card {
  key: string;
  la: string;
  ru: string;
  topic: string;
}

/** Сводка одной сессии повторения карточек. */
export interface ReviewSummary {
  finishedAt: string;
  topicId: string;
  reviewed: number;
  again: number;
  /**
   * Сколько карточек сессии не имели состояния на её старте. Из суммы fresh
   * по сегодняшним сводкам считается дневная норма новых карточек, поэтому
   * поле обязательно в типе; в сохранениях до этого поля parseProgress
   * подставляет 0.
   */
  fresh: number;
}
