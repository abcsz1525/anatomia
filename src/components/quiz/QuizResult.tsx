"use client";
import Link from "next/link";
import { sideLabel, transcription } from "@/lib/content/names";
import type { StressMap } from "@/lib/latin";
import type { AnswerRecord, SessionResult } from "@/lib/quiz/types";

/**
 * Ошибки без повторов: одна и та же структура может выпасть в сессии дважды,
 * и притом разными мешами — поэтому ключ тот же, что у группы дублей (la|side),
 * а не partId.
 */
function mistakes(answers: AnswerRecord[]): AnswerRecord[] {
  const seen = new Set<string>();
  const result: AnswerRecord[] = [];
  for (const a of answers) {
    const key = `${a.la}|${a.side}`;
    if (a.correct || seen.has(key)) continue;
    seen.add(key);
    result.push(a);
  }
  return result;
}

export function QuizResult({
  result,
  stress,
  onAgain,
  onOther,
}: {
  result: SessionResult;
  /** Словарь ударений бандла: пустой — транскрипции нет. */
  stress: StressMap;
  onAgain(): void;
  onOther(): void;
}) {
  const correct = result.answers.filter((a) => a.correct).length;
  // транскрипция считается один раз на ошибку, а не на каждый её рендер
  const wrong = mistakes(result.answers).map((record) => ({
    record,
    laRu: transcription(record.la, stress),
  }));

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
              {wrong.map(({ record: a, laRu }) => (
                <li key={`${a.la}|${a.side}`} data-testid="quiz-mistake" className="rounded border px-3 py-2">
                  <span className="block font-semibold italic">{a.la}</span>
                  {/* разбор ошибок — то место, где термин чаще всего проговаривают вслух */}
                  {laRu && (
                    <span className="block break-words text-xs text-neutral-500" data-testid="mistake-la-ru">[{laRu}]</span>
                  )}
                  <span className="block text-xs text-neutral-500">
                    {a.ru}
                    {sideLabel(a.side) && ` (${sideLabel(a.side)})`}
                  </span>
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
