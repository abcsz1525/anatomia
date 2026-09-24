"use client";
import { SYSTEMS } from "@/lib/atlas/systems";
import { useAtlasStore } from "@/store/atlas-store";

export type LayerPanelVariant = "aside" | "sheet";

export function LayerPanel({ variant = "aside" }: { variant?: LayerPanelVariant }) {
  const visible = useAtlasStore((s) => s.visibleSystems);
  const toggle = useAtlasStore((s) => s.toggleSystem);
  const reset = useAtlasStore((s) => s.reset);
  // aside — боковая панель десктопа; sheet — содержимое шторки на мобайле,
  // где строки должны быть целями касания ≥ 44 px
  const shell = variant === "sheet"
    ? "flex flex-col gap-1 text-sm"
    : "flex w-56 flex-col gap-1 overflow-y-auto border-r bg-white p-3 text-sm";
  const row = variant === "sheet"
    ? "flex min-h-11 cursor-pointer items-center gap-3 rounded px-1 hover:bg-neutral-100"
    : "flex cursor-pointer items-center gap-2 rounded px-1 py-0.5 hover:bg-neutral-100";
  return (
    <aside className={shell} aria-label="Слои">
      <div className="mb-1 flex items-center justify-between">
        <span className="font-semibold">Системы</span>
        <button onClick={reset} className="text-xs text-neutral-500 hover:text-neutral-900">Сброс</button>
      </div>
      {SYSTEMS.map((s) => (
        <label key={s.id} className={row}>
          <input type="checkbox" checked={visible[s.id]} onChange={() => toggle(s.id)} />
          <span className="inline-block h-3 w-3 rounded-sm" style={{ background: s.color }} />
          <span>{s.ru}</span>
        </label>
      ))}
    </aside>
  );
}
