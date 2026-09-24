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
  const due: Card[] = [];
  const fresh: Card[] = [];

  for (const card of deck) {
    const state = states[card.key];
    if (state) {
      if (state.due <= today) due.push(card);
    } else {
      fresh.push(card);
    }
  }

  due.sort((a, b) => {
    const dueA = states[a.key].due;
    const dueB = states[b.key].due;
    if (dueA !== dueB) return dueA < dueB ? -1 : 1;
    return a.key < b.key ? -1 : a.key > b.key ? 1 : 0;
  });

  const newCards = fresh.slice(0, newLimit);

  return [...due, ...newCards].slice(0, max);
}
