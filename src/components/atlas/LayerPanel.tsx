"use client";
import { SYSTEMS } from "@/lib/atlas/systems";
import { useAtlasStore } from "@/store/atlas-store";

export function LayerPanel() {
  const visible = useAtlasStore((s) => s.visibleSystems);
  const toggle = useAtlasStore((s) => s.toggleSystem);
  const reset = useAtlasStore((s) => s.reset);
  return (
    <aside className="flex w-56 flex-col gap-1 overflow-y-auto border-r bg-white p-3 text-sm" aria-label="Слои">
      <div className="mb-1 flex items-center justify-between">
        <span className="font-semibold">Системы</span>
        <button onClick={reset} className="text-xs text-neutral-500 hover:text-neutral-900">Сброс</button>
      </div>
      {SYSTEMS.map((s) => (
        <label key={s.id} className="flex cursor-pointer items-center gap-2 rounded px-1 py-0.5 hover:bg-neutral-100">
          <input type="checkbox" checked={visible[s.id]} onChange={() => toggle(s.id)} />
          <span className="inline-block h-3 w-3 rounded-sm" style={{ background: s.color }} />
          <span>{s.ru}</span>
        </label>
      ))}
    </aside>
  );
}
