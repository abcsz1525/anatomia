"use client";
import { cardSides, type Direction } from "@/lib/srs/session";
import type { Card, Grade } from "@/lib/srs/types";

const GRADES: { id: Grade; ru: string; className: string }[] = [
  { id: "again", ru: "Не помню", className: "border-red-300 text-red-800 hover:bg-red-50" },
  { id: "good", ru: "Помню", className: "border-neutral-300 hover:bg-neutral-100" },
  { id: "easy", ru: "Легко", className: "border-green-300 text-green-800 hover:bg-green-50" },
];

export function CardReview({
  card,
  direction,
  topicRu,
  laRu,
  revealed,
  remaining,
  intervals,
  onShow,
  onGrade,
  onAbort,
}: {
  card: Card;
  direction: Direction;
  topicRu: string;
  /** Транскрипция латыни карточки; пусто — словарь не загрузился. */
  laRu: string;
  revealed: boolean;
  remaining: number;
  intervals: Record<Grade, number>;
  onShow(): void;
  onGrade(grade: Grade): void;
  onAbort(): void;
}) {
  const { front, back, frontLatin } = cardSides(card, direction);

  return (
    <div className="flex h-full flex-col gap-3" data-testid="cards-review">
      <div className="flex items-baseline justify-between">
        <p className="text-xs uppercase tracking-wide text-neutral-500" data-testid="cards-counter">
          Осталось {remaining}
        </p>
        <button
          type="button"
          data-testid="cards-abort"
          onClick={onAbort}
          className="text-xs text-neutral-500 hover:text-neutral-900"
        >
          Прервать
        </button>
      </div>

      {/* вся лицевая сторона — кнопка: карточка переворачивается и по клику
          по тексту, и по подписи «Показать» под ним */}
      <button
        type="button"
        data-testid="card-show"
        aria-label="Показать"
        onClick={onShow}
        disabled={revealed}
        className="min-h-0 flex-1 rounded-lg border px-4 py-8 text-center disabled:cursor-default"
      >
        <span
          data-testid="card-front"
          className={`block text-2xl font-semibold ${frontLatin ? "italic" : ""}`}
        >
          {front}
        </span>
        {/* транскрипция всегда стоит под латынью: при «Латынь → Русский» это лицо
            карточки, при «Русский → Латынь» — оборот (ниже) */}
        {frontLatin && laRu && (
          <span className="mt-1 block break-words text-sm text-neutral-500" data-testid="card-la-ru">
            [{laRu}]
          </span>
        )}
        {!revealed && <span className="mt-4 block text-sm text-neutral-500">Показать</span>}
      </button>

      {revealed && (
        <div className="rounded-lg border bg-neutral-50 px-4 py-4 text-center" data-testid="card-back">
          <p className={`text-2xl md:text-xl ${frontLatin ? "" : "italic"}`}>{back}</p>
          {!frontLatin && laRu && (
            <p className="mt-1 break-words text-sm text-neutral-500" data-testid="card-la-ru">[{laRu}]</p>
          )}
          {topicRu && <p className="mt-1 text-xs text-neutral-500">{topicRu}</p>}
        </div>
      )}

      {revealed && (
        <div className="grid grid-cols-3 gap-2 border-t pt-3">
          {GRADES.map((g) => (
            <button
              key={g.id}
              type="button"
              data-testid={`card-grade-${g.id}`}
              onClick={() => onGrade(g.id)}
              className={`min-h-14 rounded border px-2 py-2 text-sm md:min-h-0 ${g.className}`}
            >
              <span className="block font-medium">{g.ru}</span>
              <span className="block text-xs text-neutral-500">через {intervals[g.id]} д</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
