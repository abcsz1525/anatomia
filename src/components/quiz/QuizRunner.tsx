"use client";
import { sideLabel } from "@/lib/content/names";
import type { Question } from "@/lib/quiz/types";

/**
 * Состояние текущего вопроса в панели.
 * - "wrong" — только режим «найди»: попытки ещё есть, вопрос не закрыт.
 * - "revealed" — попытки кончились, ответ показан на модели.
 * - "chosen" — режим «назови»: вариант выбран, вопрос закрыт.
 */
export type Feedback =
  | { kind: "idle" }
  | { kind: "correct" }
  | { kind: "wrong"; left: number }
  | { kind: "revealed" }
  | { kind: "chosen"; index: number; correct: boolean };

/** Вопрос закрыт: ответ записан, дальше только «Дальше». */
export function isAnswered(f: Feedback): boolean {
  return f.kind === "correct" || f.kind === "revealed" || f.kind === "chosen";
}

function promptText(q: Question): string {
  if (q.kind === "name") return "Назовите подсвеченную структуру";
  const side = sideLabel(q.target.side);
  return `Найдите: ${q.target.la} — ${q.target.ru}${side ? ` (${side})` : ""}`;
}

function feedbackText(f: Feedback, q: Question): string {
  switch (f.kind) {
    case "idle":
      return "";
    case "correct":
      return "Верно";
    case "wrong":
      return `Не то, осталось попыток: ${f.left}`;
    case "revealed":
      return "Правильный ответ показан";
    case "chosen":
      return f.correct ? "Верно" : `Неверно. Правильно: ${q.target.la}`;
  }
}

function feedbackClass(f: Feedback): string {
  if (f.kind === "correct" || (f.kind === "chosen" && f.correct)) return "text-green-700";
  if (f.kind === "idle") return "text-neutral-500";
  return "text-red-700";
}

function optionClass(f: Feedback, correctIndex: number, index: number): string {
  if (!isAnswered(f) || f.kind !== "chosen") return "border-neutral-300 hover:bg-neutral-100";
  if (index === correctIndex) return "border-green-600 bg-green-50";
  if (index === f.index) return "border-red-600 bg-red-50";
  return "border-neutral-200 opacity-60";
}

export function QuizRunner({
  question,
  index,
  total,
  feedback,
  onChoose,
  onNext,
  onAbort,
}: {
  question: Question;
  index: number;
  total: number;
  feedback: Feedback;
  onChoose(optionIndex: number): void;
  onNext(): void;
  onAbort(): void;
}) {
  const answered = isAnswered(feedback);
  return (
    <div className="flex h-full flex-col gap-3" data-testid="quiz-runner">
      <div className="flex items-baseline justify-between">
        <p className="text-xs uppercase tracking-wide text-neutral-500" data-testid="quiz-counter">
          Вопрос {index + 1} из {total}
        </p>
        <button type="button" data-testid="quiz-abort" onClick={onAbort} className="text-xs text-neutral-500 hover:text-neutral-900">
          Прервать
        </button>
      </div>

      <p className="text-base font-medium" data-testid="quiz-prompt">
        {promptText(question)}
      </p>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {question.kind === "find" ? (
          <p className="text-xs text-neutral-500">Кликните по структуре на модели. Попыток: 3.</p>
        ) : (
          <div className="space-y-2">
            {question.options.map((option, i) => (
              <button
                key={option.la}
                type="button"
                data-testid="quiz-option"
                onClick={() => onChoose(i)}
                disabled={answered}
                className={`block w-full rounded border px-3 py-2 text-left ${optionClass(feedback, question.correctIndex, i)}`}
              >
                <span className="block font-semibold italic">{option.la}</span>
                <span className="block text-xs text-neutral-500">{option.ru}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <p className={`text-sm ${feedbackClass(feedback)}`} data-testid="quiz-feedback">
        {feedbackText(feedback, question)}
      </p>

      {answered && (
        <button
          type="button"
          data-testid="quiz-next"
          onClick={onNext}
          className="rounded bg-neutral-900 px-4 py-2 text-sm font-medium text-white"
        >
          {index + 1 === total ? "Завершить" : "Дальше"}
        </button>
      )}
    </div>
  );
}
