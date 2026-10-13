"use client";
import type { ButtonHTMLAttributes, ReactNode } from "react";

/**
 * Квадратная кнопка с иконкой или короткой подписью. `label` даёт aria-label
 * и title; `pressed` выставляет aria-pressed только когда передан (у кнопок
 * без состояния атрибута быть не должно).
 */
export function IconButton({
  label, active = false, pressed, className = "", children, ...rest
}: Omit<ButtonHTMLAttributes<HTMLButtonElement>, "aria-label" | "title"> & {
  label: string; active?: boolean; pressed?: boolean; children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      aria-pressed={pressed}
      className={`flex h-10 w-10 items-center justify-center rounded-lg text-[13px] font-medium transition-colors disabled:opacity-25 disabled:hover:bg-transparent ${
        active
          ? "bg-studio-primary text-white shadow-sm"
          : "text-studio-muted hover:bg-neutral-900/5 hover:text-studio-primary"
      } ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}
