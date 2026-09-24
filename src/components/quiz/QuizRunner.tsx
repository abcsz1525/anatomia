"use client";
import { useEffect, useRef } from "react";
import { sideLabel } from "@/lib/content/names";
import { FIND_ATTEMPTS, isAnswered, type Feedback } from "@/lib/quiz/session";
import type { Question } from "@/lib/quiz/types";

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
    // попытка не потрачена — повторяем счётчик, чтобы клик по кости-декорации
    // не читался как потерянная попытка
    case "offtopic":
      return `Это не относится к теме (осталось попыток: ${f.left})`;
    case "revealed":
      return "Правильный ответ показан";
    case "chosen":
      return f.correct ? "Верно" : `Неверно. Правильно: ${q.target.la}`;
  }
}

function feedbackClass(f: Feedback): string {
  if (f.kind === "correct" || (f.kind === "chosen" && f.correct)) return "text-green-700";
  if (f.kind === "idle" || f.kind === "offtopic") return "text-neutral-500";
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
  collapsed = false,
  onToggle,
}: {
  question: Question;
  index: number;
  total: number;
  feedback: Feedback;
  onChoose(optionIndex: number): void;
  onNext(): void;
  onAbort(): void;
  /** Панель свёрнута до одной строки: видны вопрос, отклик и «Дальше». */
  collapsed?: boolean;
  /** Только для мобильной раскладки: без неё кнопка сворачивания не нужна. */
  onToggle?: () => void;
}) {
  const answered = isAnswered(feedback);
  // ответ закрыт — фокус уезжает на «Дальше», чтобы клавиатура вела дальше сама
  const nextRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (answered) nextRef.current?.focus();
  }, [answered]);

  return (
    <div
      className={collapsed ? "flex h-full w-full items-center gap-2" : "flex h-full flex-col gap-3"}
      data-testid="quiz-runner"
    >
      <div className={collapsed ? "hidden" : "flex items-baseline justify-between"}>
        <p className="text-xs uppercase tracking-wide text-neutral-500" data-testid="quiz-counter">
          Вопрос {index + 1} из {total}
        </p>
        <button type="button" data-testid="quiz-abort" onClick={onAbort} className="text-xs text-neutral-500 hover:text-neutral-900">
          Прервать
        </button>
      </div>

      <p
        className={collapsed ? "min-w-0 flex-1 truncate text-sm font-medium" : "text-base font-medium"}
        data-testid="quiz-prompt"
      >
        {promptText(question)}
      </p>

      <div className={collapsed ? "hidden" : "min-h-0 flex-1 overflow-y-auto"}>
        {question.kind === "find" ? (
          <p className="text-xs text-neutral-500">Кликните по структуре на модели. Попыток: {FIND_ATTEMPTS}.</p>
        ) : (
          <div className="grid grid-cols-1 gap-2">
            {question.options.map((option, i) => (
              <button
                key={option.la}
                type="button"
                data-testid="quiz-option"
                onClick={() => onChoose(i)}
                disabled={answered}
                className={`block min-h-11 w-full rounded border px-3 py-2 text-left md:min-h-0 ${optionClass(feedback, question.correctIndex, i)}`}
              >
                <span className="block font-semibold italic">{option.la}</span>
                <span className="block text-xs text-neutral-500">{option.ru}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <p
        // в свёрнутой строке отклик уступает место кнопке «Дальше»: вопрос
        // важнее, а вердикт виден на самой модели (подсветка) и после «Развернуть»
        className={`text-sm ${feedbackClass(feedback)} ${
          collapsed ? (answered ? "hidden" : "min-w-0 max-w-[45%] shrink truncate") : ""
        }`}
        data-testid="quiz-feedback"
        aria-live="polite"
      >
        {feedbackText(feedback, question)}
      </p>

      {answered && (
        <button
          ref={nextRef}
          type="button"
          data-testid="quiz-next"
          onClick={onNext}
          className="min-h-11 shrink-0 rounded bg-neutral-900 px-4 py-2 text-sm font-medium text-white md:min-h-0"
        >
          {index + 1 === total ? "Завершить" : "Дальше"}
        </button>
      )}

      {/* сворачивание панели: только мобильная раскладка передаёт onToggle */}
      {onToggle && (
        <button
          type="button"
          data-testid="quiz-panel-toggle"
          onClick={onToggle}
          // развёрнутая панель прижимает кнопку вправо: слева внизу в dev-режиме
          // сидит индикатор Next.js и перехватывает касания
          className={`min-h-11 shrink-0 rounded border px-3 text-xs text-neutral-600 ${
            collapsed ? "" : "self-end"
          }`}
        >
          {collapsed ? "Развернуть" : "Свернуть"}
        </button>
      )}
    </div>
  );
}
