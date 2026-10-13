"use client";

export function LoadingOverlay({
  loaded, total, error, onRetry,
}: { loaded: number; total: number; error?: string; onRetry?: () => void }) {
  const pct = total > 0 ? Math.round((loaded / total) * 100) : 0;
  return (
    <div
      className="absolute inset-0 z-20 flex items-center justify-center bg-studio-bg/70"
      role={error ? "alert" : "status"}
    >
      <div className="glass flex min-w-[290px] max-w-[90vw] items-start gap-4 px-6 py-5">
        {error ? (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-studio-fg">{error}</p>
            <button
              onClick={onRetry}
              className="self-start rounded-lg border border-studio-border px-4 py-2 text-sm text-studio-primary hover:bg-neutral-900/5"
            >
              Повторить
            </button>
          </div>
        ) : (
          <>
            <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-studio-accent" />
            <div className="flex-1">
              <strong className="block text-[15px] font-medium text-studio-fg">Готовим модель</strong>
              <span className="mt-1.5 block text-[12px] text-studio-muted">{pct} % · загружаем геометрию</span>
              <div className="mt-3 h-0.5 min-w-[200px] bg-studio-border">
                <i className="block h-full bg-studio-accent transition-[width] duration-300" style={{ width: `${pct}%` }} />
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
