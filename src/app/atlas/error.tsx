"use client";

export default function AtlasError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex h-full w-full items-center justify-center bg-white/80 p-6 backdrop-blur-sm">
      <div className="w-96 max-w-full space-y-3 text-center">
        <h2 className="text-lg font-semibold text-neutral-900">Не удалось показать 3D-атлас</h2>
        <p className="text-sm text-neutral-700">
          Попробуйте обновить страницу. Если ошибка повторяется, напишите нам.
        </p>
        <button onClick={reset} className="rounded bg-neutral-900 px-4 py-2 text-sm text-white">
          Повторить
        </button>
        <pre className="overflow-x-auto whitespace-pre-wrap break-words text-left text-xs text-neutral-400">
          {error.message}
        </pre>
      </div>
    </div>
  );
}
