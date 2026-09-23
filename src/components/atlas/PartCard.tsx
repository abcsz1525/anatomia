"use client";
import type { DisplayNames } from "@/lib/content/names";

export type { DisplayNames };

export function PartCard({
  partId, names, systemRu, isolated, onHide, onIsolate, onClearIsolation, onClose,
}: {
  partId: string; names: DisplayNames; systemRu: string; isolated: boolean;
  onHide(): void; onIsolate(): void; onClearIsolation(): void; onClose(): void;
}) {
  return (
    <section className="absolute right-3 top-3 z-10 w-72 rounded-lg border bg-white p-4 shadow-lg" data-testid="part-card" data-part-id={partId}>
      <button onClick={onClose} aria-label="Закрыть" className="absolute right-2 top-2 text-neutral-400 hover:text-neutral-900">×</button>
      <p className="text-xs uppercase tracking-wide text-neutral-500">{systemRu}</p>
      <h2 className="mt-1 text-lg font-semibold italic" data-testid="part-la">{names.la || names.en}</h2>
      <p className="text-base" data-testid="part-ru">
        {names.translated ? `${names.ru}${names.sideRu ? ` (${names.sideRu})` : ""}` : "Перевод в работе"}
      </p>
      <p className="text-sm text-neutral-500" data-testid="part-en">{names.en}</p>
      {names.topicRu && <p className="mt-1 text-xs text-neutral-500" data-testid="part-topic">{names.topicRu}</p>}
      <div className="mt-3 flex flex-wrap gap-2 text-sm">
        <button onClick={onHide} className="rounded border px-2 py-1 hover:bg-neutral-100">Скрыть</button>
        {isolated ? (
          <button onClick={onClearIsolation} className="rounded border px-2 py-1 hover:bg-neutral-100">Показать всё</button>
        ) : (
          <button onClick={onIsolate} className="rounded border px-2 py-1 hover:bg-neutral-100">Изолировать</button>
        )}
      </div>
    </section>
  );
}
