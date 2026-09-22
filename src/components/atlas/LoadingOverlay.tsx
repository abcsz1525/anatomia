export function LoadingOverlay({
  loaded,
  total,
  error,
  onRetry,
}: {
  loaded: number;
  total: number;
  error?: string;
  onRetry?: () => void;
}) {
  const pct = total > 0 ? Math.round((loaded / total) * 100) : 0;
  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/80 backdrop-blur-sm">
      <div className="w-72 space-y-3 text-center">
        {error ? (
          <>
            <p className="text-sm text-red-700">{error}</p>
            <button onClick={onRetry} className="rounded bg-neutral-900 px-4 py-2 text-sm text-white">
              Повторить
            </button>
          </>
        ) : (
          <>
            <p className="text-sm text-neutral-700">Загружаем модель… {pct}%</p>
            <div className="h-2 w-full overflow-hidden rounded bg-neutral-200">
              <div className="h-full bg-neutral-900 transition-[width]" style={{ width: `${pct}%` }} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
