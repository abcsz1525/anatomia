"use client";
import type { TopicGroup } from "@/lib/quiz/pool";
import { ALL_TOPICS, MAX_NEW_LIMIT, MIN_NEW_LIMIT, formatDay, type Direction } from "@/lib/srs/session";

const DIRECTIONS: { id: Direction; ru: string }[] = [
  { id: "la-ru", ru: "Латынь → Русский" },
  { id: "ru-la", ru: "Русский → Латынь" },
];

export function CardsSetup({
  groups,
  allCards,
  topicId,
  onTopic,
  direction,
  onDirection,
  newLimit,
  onNewLimit,
  due,
  fresh,
  newToday,
  nextDue,
  deckCards,
  onStart,
}: {
  groups: TopicGroup[];
  allCards: number;
  topicId: string;
  onTopic(id: string): void;
  direction: Direction;
  onDirection(d: Direction): void;
  newLimit: string;
  onNewLimit(value: string): void;
  due: number;
  fresh: number;
  /** Сколько новых карточек уже показано сегодня: остаток дневной нормы. */
  newToday: number;
  /** Ближайшее будущее повторение по всей колоде темы; null — ждать нечего. */
  nextDue: string | null;
  /** Размер выбранной колоды: пустая тема объясняется отдельной строкой. */
  deckCards: number;
  onStart(): void;
}) {
  return (
    <div className="flex h-full flex-col gap-4" data-testid="cards-setup">
      <div>
        <h1 className="text-lg font-semibold">Карточки</h1>
        <p className="mt-1 text-xs text-neutral-500">
          Интервальное повторение: чем лучше вы помните карточку, тем позже она вернётся.
        </p>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto" role="radiogroup" aria-label="Тема">
        <label
          data-testid="cards-topic"
          className="mb-3 flex min-h-11 cursor-pointer items-center gap-2 rounded px-1 py-1 hover:bg-neutral-100 md:min-h-0"
        >
          <input
            type="radio"
            name="cards-topic"
            value={ALL_TOPICS}
            checked={topicId === ALL_TOPICS}
            onChange={() => onTopic(ALL_TOPICS)}
          />
          <span className="flex-1 font-medium">Все темы</span>
          <span className="text-xs text-neutral-500">{allCards}</span>
        </label>
        {groups.map((group) => (
          <div key={group.id} className="mb-3">
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-neutral-500">{group.ru}</p>
            {group.topics.map((topic) => (
              <label
                key={topic.id}
                data-testid="cards-topic"
                className="flex min-h-11 cursor-pointer items-center gap-2 rounded px-1 py-1 hover:bg-neutral-100 md:min-h-0"
              >
                <input
                  type="radio"
                  name="cards-topic"
                  value={topic.id}
                  checked={topicId === topic.id}
                  onChange={() => onTopic(topic.id)}
                />
                <span className="flex-1">{topic.ru}</span>
                <span className="text-xs text-neutral-500">{topic.concepts}</span>
              </label>
            ))}
          </div>
        ))}
      </div>

      <div role="radiogroup" aria-label="Направление" className="space-y-1 border-t pt-3">
        {DIRECTIONS.map((d) => (
          <label
            key={d.id}
            data-testid="cards-direction"
            className="flex min-h-11 cursor-pointer items-center gap-2 rounded px-1 py-1 hover:bg-neutral-100 md:min-h-0"
          >
            <input
              type="radio"
              name="cards-direction"
              value={d.id}
              data-testid={`cards-direction-${d.id}`}
              checked={direction === d.id}
              onChange={() => onDirection(d.id)}
            />
            <span>{d.ru}</span>
          </label>
        ))}
      </div>

      <label className="flex items-center gap-2">
        <span className="flex-1">Новых в день</span>
        <input
          type="number"
          min={MIN_NEW_LIMIT}
          max={MAX_NEW_LIMIT}
          step={1}
          value={newLimit}
          data-testid="cards-new-limit"
          onChange={(e) => onNewLimit(e.target.value)}
          className="w-20 rounded border px-2 py-1 text-right"
        />
      </label>

      <div>
        <button
          type="button"
          data-testid="cards-start"
          onClick={onStart}
          disabled={due + fresh === 0}
          className="min-h-12 w-full rounded bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:bg-neutral-300 md:min-h-0"
        >
          Начать
        </button>
        <p className="mt-2 text-xs text-neutral-500" data-testid="cards-today">
          Сегодня: {due} к повторению, {fresh} новых
        </p>
        {newToday > 0 && (
          <p className="mt-1 text-xs text-neutral-400" data-testid="cards-new-today">
            (сегодня уже показано {newToday} новых)
          </p>
        )}
        {/* на сегодня очередь пуста — кнопка неактивна, поэтому экран
            обязан сказать, когда карточки вернутся, а не молчать */}
        {due + fresh === 0 && nextDue !== null && (
          <p className="mt-1 text-xs text-neutral-500" data-testid="cards-setup-next-due">
            Следующее повторение: {formatDay(nextDue)}
          </p>
        )}
        {due + fresh === 0 && nextDue === null && deckCards === 0 && (
          <p className="mt-1 text-xs text-neutral-500" data-testid="cards-empty-deck">
            В этой теме пока нет карточек
          </p>
        )}
      </div>
    </div>
  );
}
