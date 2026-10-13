"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { CloseIcon } from "@/components/ui/icons";
import { buildIndex, search } from "@/lib/atlas/search";
import type { AtlasManifest } from "@/lib/atlas/types";
import { searchLabels, sideLabel } from "@/lib/content/names";
import type { ContentBundle } from "@/lib/content/types";

/**
 * Выезжающая панель поиска. Ищет сразу по английскому, латыни, русскому и
 * синонимам; результат отдаёт id структуры. Escape и крестик закрывают.
 */
export function SearchPanel({
  manifest, content, onPick, onClose,
}: { manifest: AtlasManifest; content: ContentBundle; onPick(id: string): void; onClose(): void }) {
  const [q, setQ] = useState("");
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    input.current?.focus();
  }, []);
  const index = useMemo(
    () => buildIndex(manifest.parts.map((p) => ({ id: p.id, labels: searchLabels(p.name, content.structures[p.id]) }))),
    [manifest, content],
  );
  const byId = useMemo(() => new Map(manifest.parts.map((p) => [p.id, p])), [manifest]);
  const results = useMemo(() => (q.trim().length < 2 ? [] : search(index, q, 12)), [index, q]);
  const short = q.trim().length < 2;
  return (
    <section
      className="glass flex flex-col gap-2 p-3 md:p-4"
      aria-label="Найти структуру"
      data-testid="search-panel"
      onKeyDown={(e) => {
        if (e.key === "Escape") onClose();
      }}
    >
      <div className="flex items-center justify-between text-[13px] font-semibold text-studio-fg">
        <span>Найти структуру</span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Закрыть поиск"
          className="flex h-11 w-11 items-center justify-center rounded-lg text-studio-muted md:h-9 md:w-9 hover:bg-neutral-900/5"
        >
          <CloseIcon />
        </button>
      </div>
      <input
        ref={input}
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Желудочек, femur, бедренная кость…"
        aria-label="Поиск структуры"
        // 16 px на мобайле: иначе iOS приближает страницу при фокусе
        className="h-11 w-full rounded-lg border border-studio-border bg-neutral-50 px-3 text-[16px] text-studio-fg outline-none focus:border-studio-accent md:text-[14px]"
      />
      {results.length > 0 ? (
        <ul className="max-h-72 overflow-y-auto" role="listbox" aria-label="Результаты поиска">
          {results.map((id) => {
            const part = byId.get(id);
            const entry = content.structures[id];
            const primary = entry?.ru ?? part?.name ?? id;
            const side = entry ? sideLabel(entry.side) : "";
            return (
              <li key={id}>
                <button
                  type="button"
                  className="flex min-h-11 w-full items-center gap-2 rounded-md px-2 text-left text-[14px] text-studio-fg hover:bg-neutral-900/5"
                  onClick={() => {
                    onPick(id);
                    setQ("");
                  }}
                >
                  <span className="font-medium">{primary}{side && ` (${side})`}</span>
                  {entry?.la && <span className="italic text-studio-muted">{entry.la}</span>}
                </button>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="text-[12px] leading-relaxed text-studio-muted">
          {short
            ? "Начните с органа или кости. Ищется по русскому, латыни и английскому."
            : "Ничего не нашлось. Попробуйте другое слово."}
        </p>
      )}
    </section>
  );
}
