import type { Card, CardState } from "./types";

/**
 * Дневная очередь повторения: сначала карточки с состоянием и due <= today
 * (по возрастанию due, затем key), затем карточки без состояния в порядке
 * колоды до newLimit штук. Весь результат ограничен max.
 */
export function buildQueue(
  deck: Card[],
  states: Record<string, CardState>,
  today: string,
  newLimit: number,
  max = 50,
): Card[] {
  const due: { card: Card; due: string }[] = [];
  const fresh: Card[] = [];

  for (const card of deck) {
    const state = states[card.key];
    if (state) {
      if (state.due <= today) due.push({ card, due: state.due });
    } else {
      fresh.push(card);
    }
  }

  due.sort((a, b) => {
    if (a.due !== b.due) return a.due < b.due ? -1 : 1;
    return a.card.key < b.card.key ? -1 : a.card.key > b.card.key ? 1 : 0;
  });

  const newCards = fresh.slice(0, Math.max(0, newLimit));

  return [...due.map((d) => d.card), ...newCards].slice(0, max);
}
