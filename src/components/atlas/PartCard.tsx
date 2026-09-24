"use client";
import Link from "next/link";
import type { DisplayNames } from "@/lib/content/names";

export type { DisplayNames };

export type PartCardVariant = "card" | "sheet";

/** Кнопка действия: на мобайле (`sheet`) растягивается и получает цель касания ≥ 44 px. */
function actionClass(variant: PartCardVariant): string {
  return variant === "sheet"
    ? "min-h-11 flex-1 rounded border px-3 py-2 hover:bg-neutral-100"
    : "rounded border px-2 py-1 hover:bg-neutral-100";
}

export function PartCard({
  partId, names, systemRu, isolated, topicId, variant = "card", onHide, onIsolate, onClearIsolation, onClose,
}: {
  partId: string; names: DisplayNames; systemRu: string; isolated: boolean; topicId?: string;
  /** `card` — плавающая карточка справа (десктоп); `sheet` — содержимое шторки снизу (мобайл). */
  variant?: PartCardVariant;
  onHide(): void; onIsolate(): void; onClearIsolation(): void; onClose(): void;
}) {
  // в шторке рамку, тень и позицию задаёт сама шторка, а закрывает её её же крестик
  const shell = variant === "sheet"
    ? "relative pr-10"
    : "absolute right-3 top-3 z-10 w-72 rounded-lg border bg-white p-4 shadow-lg";
  return (
    <section className={shell} data-testid="part-card" data-part-id={partId}>
      {variant === "card" && (
        <button onClick={onClose} aria-label="Закрыть" className="absolute right-2 top-2 text-neutral-400 hover:text-neutral-900">×</button>
      )}
      <p className="text-xs uppercase tracking-wide text-neutral-500">{systemRu}</p>
      <h2 className="mt-1 text-lg font-semibold italic" data-testid="part-la">{names.la || names.en}</h2>
      <p className="text-base" data-testid="part-ru">
        {names.translated ? `${names.ru}${names.sideRu ? ` (${names.sideRu})` : ""}` : "Перевод в работе"}
      </p>
      <p className="text-sm text-neutral-500" data-testid="part-en">{names.en}</p>
      {names.topicRu && <p className="mt-1 text-xs text-neutral-500" data-testid="part-topic">{names.topicRu}</p>}
      {/* у непереведённой структуры нет ни латыни, ни русского — карточек по ней не собрать */}
      {names.translated && topicId && (
        <Link
          href={`/cards?topic=${topicId}`}
          data-testid="part-cards-link"
          className="mt-2 inline-block text-sm text-blue-700 hover:underline"
        >
          Учить карточки темы
        </Link>
      )}
      <div className="mt-3 flex flex-wrap gap-2 text-sm">
        <button onClick={onHide} className={actionClass(variant)}>Скрыть</button>
        {isolated ? (
          <button onClick={onClearIsolation} className={actionClass(variant)}>Показать всё</button>
        ) : (
          <button onClick={onIsolate} className={actionClass(variant)}>Изолировать</button>
        )}
      </div>
    </section>
  );
}
