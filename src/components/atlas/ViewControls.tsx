"use client";
import { IconButton } from "@/components/ui/IconButton";
import { PauseIcon, ResetIcon, RotateIcon } from "@/components/ui/icons";
import { useAtlasStore, type AtlasView } from "@/store/atlas-store";

const VIEWS: { id: AtlasView; short: string; label: string }[] = [
  { id: "three-quarter", short: "¾", label: "Три четверти" },
  { id: "front", short: "П", label: "Спереди" },
  { id: "side", short: "Б", label: "Сбоку" },
  { id: "back", short: "З", label: "Сзади" },
];

/** Ракурсы, автоповорот и сброс: колонка на десктопе, полоска на мобайле. */
export function ViewControls({ direction = "column" }: { direction?: "column" | "row" }) {
  const view = useAtlasStore((s) => s.view);
  const explode = useAtlasStore((s) => s.explode);
  const autoRotate = useAtlasStore((s) => s.autoRotate);
  const isolated = useAtlasStore((s) => s.isolatedPartId !== null);
  const setView = useAtlasStore((s) => s.setView);
  const toggleAutoRotate = useAtlasStore((s) => s.toggleAutoRotate);
  const reset = useAtlasStore((s) => s.reset);
  const column = direction === "column";
  return (
    <nav
      aria-label="Ракурсы"
      data-testid="view-controls"
      className={`glass flex gap-0.5 p-1 ${column ? "flex-col" : "flex-row"}`}
    >
      {VIEWS.map((v) => (
        <IconButton
          key={v.id}
          label={v.label}
          active={view === v.id}
          pressed={view === v.id}
          // в инвентаре смотреть можно только спереди
          disabled={explode > 0.8 && v.id !== "front"}
          onClick={() => setView(v.id)}
          className="h-11 w-11"
        >
          {v.short}
        </IconButton>
      ))}
      <i aria-hidden className={`bg-studio-border ${column ? "mx-1 my-1 h-px" : "mx-1 my-1 w-px self-stretch"}`} />
      <IconButton
        label={autoRotate ? "Остановить вращение" : "Вращать модель"}
        active={autoRotate}
        disabled={explode >= 0.4 || isolated}
        onClick={toggleAutoRotate}
        className="h-11 w-11"
      >
        {autoRotate ? <PauseIcon size={17} /> : <RotateIcon />}
      </IconButton>
      <IconButton label="Сброс вида и слоёв" onClick={reset} className="h-11 w-11">
        <ResetIcon size={17} />
      </IconButton>
    </nav>
  );
}
