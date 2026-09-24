"use client";
import { dueLabel } from "@/lib/srs/session";

export function CardsDone({
  reviewed,
  again,
  due,
  today,
  hasMore,
  onMore,
  onOther,
}: {
  reviewed: number;
  again: number;
  due: string | null;
  today: string;
  hasMore: boolean;
  onMore(): void;
  onOther(): void;
}) {
  return (
    <div className="flex h-full flex-col gap-3" data-testid="cards-done">
      <h1 className="text-lg font-semibold" data-testid="cards-summary">
        Повторено {reviewed}, не помню {again}
      </h1>

      <p className="text-sm text-neutral-600" data-testid="cards-next-due">
        Следующее повторение: {dueLabel(due, today)}
      </p>

      <div className="min-h-0 flex-1" />

      <div className="flex gap-2 border-t pt-3">
        {hasMore && (
          <button
            type="button"
            data-testid="cards-more"
            onClick={onMore}
            className="rounded bg-neutral-900 px-4 py-2 text-sm font-medium text-white"
          >
            Ещё
          </button>
        )}
        <button
          type="button"
          data-testid="cards-other-topic"
          onClick={onOther}
          className="rounded border px-4 py-2 text-sm hover:bg-neutral-100"
        >
          Другая тема
        </button>
      </div>
    </div>
  );
}
