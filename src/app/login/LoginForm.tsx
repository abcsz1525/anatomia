"use client";
import { useActionState } from "react";
import { login } from "./actions";

export function LoginForm({ next }: { next: string }) {
  const [error, action, pending] = useActionState(login, undefined);
  return (
    <form action={action} className="glass flex w-full max-w-[340px] flex-col gap-4 p-6">
      <input type="hidden" name="next" value={next} />
      <label className="flex flex-col gap-2 text-[12px] text-studio-muted">
        Пароль
        <input
          type="password"
          name="password"
          required
          autoFocus
          autoComplete="current-password"
          data-testid="login-password"
          className="h-11 rounded-lg border border-studio-border bg-white/70 px-3 text-[15px] text-studio-fg outline-none focus:border-studio-accent"
        />
      </label>
      {error && (
        <p role="alert" className="text-[13px] text-red-600">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="h-11 rounded-lg bg-studio-fg text-[14px] font-medium text-white disabled:opacity-60"
      >
        {pending ? "Проверяю…" : "Войти"}
      </button>
    </form>
  );
}
