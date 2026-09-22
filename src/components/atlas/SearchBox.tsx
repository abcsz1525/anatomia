"use client";
import { useMemo, useState } from "react";
import { buildIndex, search } from "@/lib/atlas/search";
import type { AtlasManifest } from "@/lib/atlas/types";

export function SearchBox({ manifest, onPick }: { manifest: AtlasManifest; onPick(id: string): void }) {
  const [q, setQ] = useState("");
  const index = useMemo(() => buildIndex(manifest.parts.map((p) => ({ id: p.id, labels: [p.name] }))), [manifest]);
  const byId = useMemo(() => new Map(manifest.parts.map((p) => [p.id, p])), [manifest]);
  const results = useMemo(() => (q.trim().length < 2 ? [] : search(index, q, 12)), [index, q]);
  return (
    <div className="absolute left-3 top-3 z-10 w-80">
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Поиск структуры…"
        aria-label="Поиск структуры"
        className="w-full rounded-lg border bg-white px-3 py-2 text-sm shadow"
      />
      {results.length > 0 && (
        <ul className="mt-1 max-h-72 overflow-y-auto rounded-lg border bg-white shadow" role="listbox">
          {results.map((id) => (
            <li key={id}>
              <button
                className="w-full px-3 py-1.5 text-left text-sm hover:bg-neutral-100"
                onClick={() => { onPick(id); setQ(""); }}
              >
                {byId.get(id)?.name}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
