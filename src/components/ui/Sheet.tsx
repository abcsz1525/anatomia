"use client";
import { useEffect, type ReactNode } from "react";

/**
 * Шторка снизу — мобильная замена боковой панели и карточки структуры.
 * Рендерится только на мобильной раскладке (вызывающий код проверяет
 * `useIsMobile()`); `md:hidden` — подстраховка на время гидратации.
 */
export function Sheet({
  open, onClose, label, testId, children,
}: {
  open: boolean;
  onClose(): void;
  label: string;
  testId: string;
  children: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-20 md:hidden" data-testid={testId}>
      {/* фон: клик мимо шторки закрывает её */}
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <section
        role="dialog"
        aria-label={label}
        className="absolute inset-x-0 bottom-0 max-h-[60dvh] overflow-y-auto rounded-t-2xl bg-white p-4 shadow-xl"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Закрыть"
          className="absolute right-2 top-2 flex h-11 w-11 items-center justify-center text-xl text-neutral-400 hover:text-neutral-900"
        >
          ×
        </button>
        {children}
      </section>
    </div>
  );
}
