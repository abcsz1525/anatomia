"use client";

/** Ползунок 0..100 на нативном range: стиль задаёт `.studio-slider` в globals.css. */
export function Slider({
  id, value, onChange, labelledBy, className = "",
}: { id?: string; value: number; onChange(next: number): void; labelledBy: string; className?: string }) {
  return (
    <input
      id={id}
      type="range"
      min={0}
      max={100}
      step={1}
      value={value}
      aria-labelledby={labelledBy}
      onChange={(e) => onChange(Number(e.currentTarget.value))}
      className={`studio-slider w-full ${className}`}
    />
  );
}
