"use client";

/**
 * Тумблер: кнопка с role="switch". `label` уходит в aria-label, по нему
 * тумблер находят тесты и скринридер («Артерии»). Псевдоэлемент расширяет
 * зону касания до ≥ 44 px по вертикали, не меняя размер самого тумблера.
 */
export function Switch({
  checked, onChange, label, className = "",
}: { checked: boolean; onChange(next: boolean): void; label: string; className?: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors after:absolute after:-inset-x-2 after:-inset-y-3 after:content-[''] ${
        checked ? "bg-studio-primary" : "bg-neutral-300"
      } ${className}`}
    >
      <span
        className={`pointer-events-none absolute left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${
          checked ? "translate-x-4" : "translate-x-0"
        }`}
      />
    </button>
  );
}
