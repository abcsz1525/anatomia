"use client";
import type { ReactNode } from "react";
import { Slider } from "@/components/ui/Slider";
import { ResetIcon } from "@/components/ui/icons";
import { useAtlasStore } from "@/store/atlas-store";

/**
 * Док разнесения внизу. `trailing` — место для кнопки «Слои» на мобайле:
 * она стоит справа, подальше от левого нижнего угла с индикатором Next.js.
 */
export function ExplodeDock({ trailing, className = "" }: { trailing?: ReactNode; className?: string }) {
  const explode = useAtlasStore((s) => s.explode);
  const setExplode = useAtlasStore((s) => s.setExplode);
  const reset = useAtlasStore((s) => s.reset);
  const pct = Math.round(explode * 100);
  return (
    <div className={`glass flex items-center gap-4 px-4 py-3 md:gap-5 md:px-5 md:py-4 ${className}`} data-testid="explode-dock">
      <div className="min-w-0 flex-1">
        <div className="mb-2 flex items-center justify-between text-[12px] font-medium text-studio-fg">
          <label id="explode-label" htmlFor="explode-slider">Разнести модель</label>
          <output
            htmlFor="explode-slider"
            data-testid="explode-value"
            className="min-w-12 rounded-md border border-studio-border bg-neutral-100 px-2 py-0.5 text-center text-[12px] tabular-nums text-studio-primary"
          >
            {pct}<span className="ml-0.5 text-[10px] text-studio-muted">%</span>
          </output>
        </div>
        <Slider id="explode-slider" value={pct} onChange={(v) => setExplode(v / 100)} labelledBy="explode-label" />
        <div className="mt-1 flex justify-between text-[10px] text-studio-muted">
          <span>Собрано</span>
          <span>Каждая деталь</span>
        </div>
      </div>
      <button
        type="button"
        onClick={reset}
        aria-label="Собрать модель и сбросить вид"
        className="flex min-h-11 flex-col items-center justify-center gap-1 border-l border-studio-border pl-4 text-[10px] text-studio-muted hover:text-studio-primary md:pl-5"
      >
        <ResetIcon />
        <span>Сброс</span>
      </button>
      {trailing}
    </div>
  );
}
