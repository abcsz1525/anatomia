"use client";
import { useMemo } from "react";
import { Switch } from "@/components/ui/Switch";
import { SYSTEMS } from "@/lib/atlas/systems";
import type { AtlasManifest, SystemId } from "@/lib/atlas/types";
import { plural } from "@/lib/progress/format";
import { isPartVisible, useAtlasStore } from "@/store/atlas-store";

/** Чип «Органы»: внутренние органы без сосудов, нервов и опорно-двигательного аппарата. */
const ORGAN_SYSTEMS: SystemId[] = ["cardiac", "respiratory", "digestive", "urinary", "endocrine", "reproductive"];

export type SystemsPanelVariant = "aside" | "sheet";

/**
 * Панель систем: чипы-наборы, строка на систему (точка цвета, название,
 * число структур, тумблер), подвал со счётчиком видимых структур.
 * `aside` — стеклянная панель десктопа; `sheet` — содержимое шторки на
 * мобайле (цели касания ≥ 44 px, отступ справа под крестик шторки).
 */
export function SystemsPanel({ manifest, variant = "aside" }: { manifest: AtlasManifest; variant?: SystemsPanelVariant }) {
  const visible = useAtlasStore((s) => s.visibleSystems);
  const hiddenParts = useAtlasStore((s) => s.hiddenParts);
  const isolatedPartId = useAtlasStore((s) => s.isolatedPartId);
  const restrictTo = useAtlasStore((s) => s.restrictTo);
  const setSystemVisible = useAtlasStore((s) => s.setSystemVisible);
  const showOnlySystems = useAtlasStore((s) => s.showOnlySystems);
  const hideAllSystems = useAtlasStore((s) => s.hideAllSystems);

  // число структур в каждой системе — из манифеста, один раз
  const counts = useMemo(() => {
    const c = Object.fromEntries(SYSTEMS.map((s) => [s.id, 0])) as Record<SystemId, number>;
    for (const p of manifest.parts) c[p.system]++;
    return c;
  }, [manifest]);
  const systems = useMemo(() => SYSTEMS.filter((s) => counts[s.id] > 0), [counts]);

  const visibleCount = useMemo(() => {
    const state = { visibleSystems: visible, hiddenParts, isolatedPartId, restrictTo };
    let n = 0;
    for (const p of manifest.parts) if (isPartVisible(state, p.id, p.system)) n++;
    return n;
  }, [manifest, visible, hiddenParts, isolatedPartId, restrictTo]);

  const onCount = systems.filter((s) => visible[s.id]).length;
  // чип подсвечен, когда включён ровно его набор систем
  const isExactly = (ids: SystemId[]) => onCount === ids.length && ids.every((id) => visible[id]);
  const presets: { label: string; ids: SystemId[] }[] = [
    { label: "Все", ids: systems.map((s) => s.id) },
    { label: "Скелет", ids: ["skeletal"] },
    { label: "Органы", ids: ORGAN_SYSTEMS },
  ];

  const sheet = variant === "sheet";
  const Shell = sheet ? "div" : "aside";
  return (
    <Shell
      className={sheet ? "flex flex-col pr-8 text-sm" : "glass flex h-full w-[254px] flex-col px-3.5 pt-4"}
      {...(sheet ? {} : { "aria-label": "Системы" })}
      data-testid="systems-panel"
    >
      <div className="flex items-center justify-between px-1 text-[13px] font-semibold text-studio-fg">
        <span>Системы</span>
        <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-medium tabular-nums text-studio-muted">
          {systems.length}
        </span>
      </div>
      <div className="my-3 flex gap-0.5 rounded-lg bg-neutral-100 p-0.5" role="group" aria-label="Наборы систем">
        {presets.map((p) => {
          const on = isExactly(p.ids);
          return (
            <button
              key={p.label}
              type="button"
              aria-pressed={on}
              onClick={() => showOnlySystems(p.ids)}
              className={`flex-1 rounded-md text-[11px] font-medium transition-colors ${sheet ? "min-h-11 text-[12px]" : "min-h-8"} ${
                on ? "bg-white text-studio-fg shadow-sm" : "text-studio-muted hover:text-studio-fg"
              }`}
            >
              {p.label}
            </button>
          );
        })}
      </div>
      <ul className="flex min-h-0 flex-1 flex-col overflow-y-auto pr-1">
        {systems.map((s) => {
          const on = visible[s.id];
          return (
            <li key={s.id} className={`flex items-center gap-2 ${sheet ? "min-h-11" : "min-h-[35px]"}`}>
              <button
                type="button"
                title={`Показать только: ${s.ru.toLowerCase()}`}
                onClick={() => showOnlySystems([s.id])}
                className={`flex min-w-0 flex-1 items-center gap-2 rounded-md px-1 py-1 text-left text-[12px] hover:bg-neutral-900/5 ${
                  on ? "text-studio-fg" : "text-neutral-400"
                } ${sheet ? "text-[13px]" : ""}`}
              >
                <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: s.color }} />
                <span className="truncate">{s.ru}</span>
                <span className="ml-auto text-[10px] tabular-nums text-studio-muted">{counts[s.id]}</span>
              </button>
              <Switch checked={on} onChange={(next) => setSystemVisible(s.id, next)} label={s.ru} />
            </li>
          );
        })}
      </ul>
      <div className="mt-2 flex min-h-11 items-center justify-between border-t border-studio-border px-1 text-[10px] text-studio-muted">
        <span data-testid="visible-count">
          Видно {visibleCount.toLocaleString("ru-RU")} {plural(visibleCount, "структура", "структуры", "структур")}
        </span>
        <button type="button" onClick={hideAllSystems} className="min-h-11 px-1 hover:text-studio-primary">
          Скрыть все
        </button>
      </div>
    </Shell>
  );
}
