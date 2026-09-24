"use client";
import type { TopicGroup } from "@/lib/quiz/pool";
import type { QuizMode } from "@/lib/quiz/types";

const MODES: { id: QuizMode; ru: string; hint: string }[] = [
  { id: "find", ru: "Найди структуру", hint: "Показываем название — вы кликаете по модели." },
  { id: "name", ru: "Назови структуру", hint: "Подсвечиваем структуру — вы выбираете название." },
];

/** Режим «назови» строит 4 варианта, поэтому теме нужно минимум 4 концепта. */
const NAME_MIN_CONCEPTS = 4;

export function QuizSetup({
  groups,
  topicId,
  onTopic,
  mode,
  onMode,
  onStart,
}: {
  groups: TopicGroup[];
  topicId: string | null;
  onTopic(id: string): void;
  mode: QuizMode;
  onMode(mode: QuizMode): void;
  onStart(): void;
}) {
  const selected = groups.flatMap((g) => g.topics).find((t) => t.id === topicId);
  const tooFewConcepts = mode === "name" && !!selected && selected.concepts < NAME_MIN_CONCEPTS;
  const canStart = !!selected && !tooFewConcepts;

  return (
    <div className="flex h-full flex-col gap-4" data-testid="quiz-setup">
      <div>
        <h1 className="text-lg font-semibold">Тесты</h1>
        <p className="mt-1 text-xs text-neutral-500">
          Десять вопросов по одной теме. Прогресс сохраняется в браузере.
        </p>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto" role="radiogroup" aria-label="Тема">
        {groups.map((group) => (
          <div key={group.id} className="mb-3">
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-neutral-500">{group.ru}</p>
            {group.topics.map((topic) => (
              <label
                key={topic.id}
                data-testid="quiz-topic"
                className="flex min-h-11 cursor-pointer items-center gap-2 rounded px-1 py-1 hover:bg-neutral-100 md:min-h-0"
              >
                <input
                  type="radio"
                  name="quiz-topic"
                  value={topic.id}
                  checked={topicId === topic.id}
                  onChange={() => onTopic(topic.id)}
                />
                <span className="flex-1">{topic.ru}</span>
                <span className="text-xs text-neutral-500">{topic.concepts}</span>
              </label>
            ))}
          </div>
        ))}
      </div>

      <div role="radiogroup" aria-label="Режим" className="space-y-1 border-t pt-3">
        {MODES.map((m) => (
          <label
            key={m.id}
            className="flex min-h-11 cursor-pointer items-start gap-2 rounded px-1 py-1 hover:bg-neutral-100 md:min-h-0"
          >
            <input
              type="radio"
              name="quiz-mode"
              value={m.id}
              checked={mode === m.id}
              onChange={() => onMode(m.id)}
              className="mt-1"
            />
            <span>
              <span className="block">{m.ru}</span>
              <span className="block text-xs text-neutral-500">{m.hint}</span>
            </span>
          </label>
        ))}
      </div>

      {tooFewConcepts && (
        <p className="text-xs text-red-700">В теме меньше четырёх понятий — доступен только режим «Найди структуру».</p>
      )}

      <button
        type="button"
        data-testid="quiz-start"
        onClick={onStart}
        disabled={!canStart}
        className="min-h-12 w-full rounded bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:bg-neutral-300 md:min-h-0 md:w-auto"
      >
        Начать
      </button>
    </div>
  );
}
