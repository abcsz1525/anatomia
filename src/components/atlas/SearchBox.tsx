"use client";
import { useMemo, useState } from "react";
import { buildIndex, search } from "@/lib/atlas/search";
import type { AtlasManifest } from "@/lib/atlas/types";
import { searchLabels, sideLabel } from "@/lib/content/names";
import type { ContentBundle } from "@/lib/content/types";

export function SearchBox({
  manifest, content, onPick,
}: { manifest: AtlasManifest; content: ContentBundle; onPick(id: string): void }) {
  const [q, setQ] = useState("");
  // ищем сразу по английскому, латыни, русскому и синонимам
  const index = useMemo(
    () => buildIndex(manifest.parts.map((p) => ({ id: p.id, labels: searchLabels(p.name, content.structures[p.id]) }))),
    [manifest, content],
  );
  const byId = useMemo(() => new Map(manifest.parts.map((p) => [p.id, p])), [manifest]);
  const results = useMemo(() => (q.trim().length < 2 ? [] : search(index, q, 12)), [index, q]);
  return (
    <div className="absolute left-3 right-3 top-3 z-10 md:right-auto md:w-80">
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Поиск структуры…"
        aria-label="Поиск структуры"
        className="w-full rounded-lg border bg-white px-3 py-2 text-sm shadow"
      />
      {results.length > 0 && (
        <ul className="mt-1 max-h-72 overflow-y-auto rounded-lg border bg-white shadow" role="listbox">
          {results.map((id) => {
            const part = byId.get(id);
            const entry = content.structures[id];
            const primary = entry?.ru ?? part?.name ?? id;
            const side = entry ? sideLabel(entry.side) : "";
            return (
              <li key={id}>
                <button
                  className="w-full px-3 py-1.5 text-left text-sm hover:bg-neutral-100"
                  onClick={() => { onPick(id); setQ(""); }}
                >
                  <span className="font-medium">{primary}{side && ` (${side})`}</span>
                  {entry?.la && <span className="ml-1 italic text-neutral-500">{entry.la}</span>}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
