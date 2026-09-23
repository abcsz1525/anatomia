"use client";
import Link from "next/link";
import type { AnswerRecord, SessionResult } from "@/lib/quiz/types";

/** Ошибки без повторов: одна и та же структура может выпасть в сессии дважды. */
function mistakes(answers: AnswerRecord[]): AnswerRecord[] {
  const seen = new Set<string>();
  const result: AnswerRecord[] = [];
  for (const a of answers) {
    if (a.correct || seen.has(a.partId)) continue;
    seen.add(a.partId);
    result.push(a);
  }
  return result;
}

export function QuizResult({
  result,
  onAgain,
  onOther,
}: {
  result: SessionResult;
  onAgain(): void;
  onOther(): void;
}) {
  const correct = result.answers.filter((a) => a.correct).length;
  const wrong = mistakes(result.answers);

  return (
    <div className="flex h-full flex-col gap-3" data-testid="quiz-result">
      <h1 className="text-lg font-semibold" data-testid="quiz-score">
        Верно {correct} из {result.answers.length}
      </h1>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {wrong.length === 0 ? (
          <p className="text-sm text-neutral-600">Без ошибок.</p>
        ) : (
          <>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">Ошибки</p>
            <ul className="space-y-2">
              {wrong.map((a) => (
                <li key={a.partId} data-testid="quiz-mistake" className="rounded border px-3 py-2">
                  <span className="block font-semibold italic">{a.la}</span>
                  <span className="block text-xs text-neutral-500">{a.ru}</span>
                  <Link href={`/atlas?focus=${a.partId}`} className="mt-1 inline-block text-xs text-blue-700 hover:underline">
                    Показать в атласе
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>

      <div className="flex gap-2 border-t pt-3">
        <button
          type="button"
          data-testid="quiz-again"
          onClick={onAgain}
          className="rounded bg-neutral-900 px-4 py-2 text-sm font-medium text-white"
        >
          Ещё раз
        </button>
        <button
          type="button"
          data-testid="quiz-other-topic"
          onClick={onOther}
          className="rounded border px-4 py-2 text-sm hover:bg-neutral-100"
        >
          Другая тема
        </button>
      </div>
    </div>
  );
}
