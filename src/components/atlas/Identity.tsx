"use client";
import Link from "next/link";
import { plural } from "@/lib/progress/format";

/**
 * Заголовок студии слева сверху. Сам блок клики пропускает (под ним сцена),
 * кликабельны только ссылки разделов: шапки сайта на /atlas нет.
 */
export function Identity({ partCount }: { partCount?: number }) {
  return (
    <header className="pointer-events-none absolute left-4 top-4 z-10 md:left-8 md:top-7">
      <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-studio-muted">
        <span className="h-[5px] w-[5px] rounded-full bg-studio-accent shadow-[0_0_12px_rgba(69,138,133,0.4)]" />
        Интерактивная анатомия
      </div>
      <h1 className="mt-2 flex items-center gap-3 text-[28px] font-semibold leading-none tracking-[-1.3px] text-studio-fg md:text-[32px]">
        Анатомия
        <span className="rounded-md border border-studio-border px-1.5 py-0.5 text-[10px] font-medium tracking-wide text-studio-muted">
          3D
        </span>
      </h1>
      <p className="mt-2 text-[11px] text-studio-muted" data-testid="atlas-meta">
        {partCount !== undefined && (
          <>
            {partCount.toLocaleString("ru-RU")} {plural(partCount, "структура", "структуры", "структур")}
            <span className="px-1.5 text-neutral-400">·</span>
          </>
        )}
        BodyParts3D
      </p>
      <nav
        className="pointer-events-auto mt-3 flex gap-3 text-[12px] text-studio-muted"
        aria-label="Разделы"
        data-testid="atlas-nav"
      >
        <Link href="/quiz" className="hover:text-studio-primary">Тесты</Link>
        <Link href="/cards" className="hover:text-studio-primary">Карточки</Link>
        <Link href="/progress" className="hover:text-studio-primary">Прогресс</Link>
        <Link href="/about" className="hover:text-studio-primary">Об источниках</Link>
      </nav>
    </header>
  );
}
