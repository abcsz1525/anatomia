"use client";
import Link from "next/link";
import { ChevronRightIcon, CloseIcon, FocusIcon } from "@/components/ui/icons";
import type { DisplayNames } from "@/lib/content/names";
import boneDetailLinks from "../../../content/bone-detail-links.json";

export type { DisplayNames };

export type PartCardVariant = "card" | "sheet";

/**
 * Карточка структуры. `card` — стеклянная, плавает справа на десктопе с
 * отступом от колонки ракурсов; `sheet` — содержимое нижней шторки на мобайле.
 * `siblings` — другие меши того же понятия (conceptId): у 243 понятий их
 * несколько, и клик переводит выделение на них.
 */
export function PartCard({
  partId, names, systemRu, systemColor, isolated, topicId, siblings, variant = "card",
  onHide, onIsolate, onClearIsolation, onClose, onPickSibling,
}: {
  partId: string; names: DisplayNames; systemRu: string; systemColor: string; isolated: boolean; topicId?: string;
  siblings: { id: string; label: string }[]; variant?: PartCardVariant;
  onHide(): void; onIsolate(): void; onClearIsolation(): void; onClose(): void; onPickSibling(id: string): void;
}) {
  const shell = variant === "sheet"
    ? "flex flex-col pr-8"
    : "glass absolute right-[88px] top-24 z-10 flex max-h-[calc(100dvh-290px)] w-[310px] flex-col p-6";
  // в шторке на мобайле — пальцем: цели не меньше 44 px
  const sheet = variant === "sheet";
  const siblingHeight = sheet ? "min-h-11" : "min-h-10";
  const actionHeight = sheet ? "min-h-11" : "min-h-9";
  return (
    <section className={shell} data-testid="part-card" data-part-id={partId}>
      {variant === "card" && (
        <button
          onClick={onClose}
          aria-label="Закрыть"
          className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-lg text-studio-muted hover:bg-neutral-900/5"
        >
          <CloseIcon />
        </button>
      )}
      <div className="flex shrink-0 flex-col gap-2.5 pr-6">
        <span className="h-1 w-7 rounded-full" style={{ background: systemColor }} />
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-studio-muted">{systemRu}</p>
        <h2
          className="text-[25px] font-semibold leading-tight tracking-[-0.75px] text-studio-fg [overflow-wrap:anywhere]"
          data-testid="part-la"
        >
          {names.la || names.en}
        </h2>
      </div>
      <div className="mt-3 flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto">
        {/* чтение латыни: квадратные скобки — привычная в словарях рамка транскрипции */}
        {names.laRu && (
          <p className="break-words text-sm text-studio-muted" data-testid="part-la-ru">[{names.laRu}]</p>
        )}
        <p className="text-[15px] leading-relaxed text-studio-fg" data-testid="part-ru">
          {names.translated ? `${names.ru}${names.sideRu ? ` (${names.sideRu})` : ""}` : "Перевод в работе"}
        </p>
        <p className="text-[12px] text-studio-muted" data-testid="part-en">{names.en}</p>
        {names.topicRu && <p className="text-[11px] text-studio-muted" data-testid="part-topic">{names.topicRu}</p>}
        {partId.startsWith("ZF-") && (
          <p className="text-[11px] text-studio-muted">Z-Anatomy · приблизительное совмещение с моделью головы.</p>
        )}
        {Object.hasOwn(boneDetailLinks, partId) && (
          <Link href={`/osteology?part=${encodeURIComponent(partId)}`} data-testid="bone-details-link"
            className="flex min-h-11 items-center rounded-lg border border-studio-border px-3 text-sm font-medium text-studio-primary hover:bg-white/70">
            Поверхности и отверстия · 3D <ChevronRightIcon size={14} className="ml-auto" />
          </Link>
        )}
        {/* у непереведённой структуры нет ни латыни, ни русского — карточек по ней не собрать */}
        {names.translated && topicId && (
          <Link
            href={`/cards?topic=${topicId}`}
            data-testid="part-cards-link"
            className="inline-block text-[13px] text-studio-accent hover:underline"
          >
            Учить карточки темы
          </Link>
        )}
        {siblings.length > 0 && (
          <div className="border-t border-studio-border pt-3" data-testid="part-siblings">
            <h3 className="text-[11px] text-studio-muted">Входящие структуры</h3>
            <ul>
              {siblings.map((s) => (
                <li key={s.id}>
                  <button
                    type="button"
                    onClick={() => onPickSibling(s.id)}
                    className={`flex ${siblingHeight} w-full items-center justify-between gap-2 border-b border-studio-border py-2 text-left text-[12px] text-studio-fg hover:text-studio-primary`}
                  >
                    <span>{s.label}</span>
                    <ChevronRightIcon size={14} />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
      <div className="mt-3 flex shrink-0 flex-col gap-1 border-t border-studio-border pt-3">
        <button
          type="button"
          onClick={isolated ? onClearIsolation : onIsolate}
          data-testid="part-isolate"
          className="flex min-h-11 items-center gap-2 rounded-lg bg-studio-primary px-3 text-[12px] font-medium text-white hover:bg-[#3b5261]"
        >
          <FocusIcon />
          {isolated ? "Показать окружение" : "Изолировать структуру"}
          <ChevronRightIcon size={14} className="ml-auto" />
        </button>
        <div className="flex gap-1 text-[12px] text-studio-muted">
          <button onClick={onHide} className={`${actionHeight} flex-1 rounded-lg px-2 hover:bg-neutral-900/5`}>Скрыть</button>
          <button onClick={onClose} className={`${actionHeight} flex-1 rounded-lg px-2 hover:bg-neutral-900/5`}>Снять выделение</button>
        </div>
      </div>
    </section>
  );
}
