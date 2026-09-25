"use client";
import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { loadManifest } from "@/lib/atlas/load-atlas";
import type { AtlasManifest } from "@/lib/atlas/types";
import { loadContent } from "@/lib/content/load-content";
import { transcription } from "@/lib/content/names";
import type { ContentBundle } from "@/lib/content/types";
import type { StressMap } from "@/lib/latin";
import { recordReview } from "@/lib/progress/record";
import { dayKey } from "@/lib/progress/stats";
import {
  loadDirection,
  loadNewLimit,
  loadProgress,
  saveDirection,
  saveNewLimit,
  saveProgress,
} from "@/lib/progress/storage";
import type { ProgressV1 } from "@/lib/progress/types";
import { topicGroups } from "@/lib/quiz/pool";
import { allDeck, topicDeck } from "@/lib/srs/deck";
import { buildQueue } from "@/lib/srs/queue";
import {
  ALL_TOPICS,
  DEFAULT_NEW_LIMIT,
  deckCounts,
  deckNextDue,
  gradeIntervals,
  initialCardsState,
  newShownToday,
  nextDue,
  parseDirection,
  parseNewLimit,
  reducer,
  remaining,
  sessionTally,
  type Direction,
} from "@/lib/srs/session";
import type { CardState, Grade, ReviewSummary } from "@/lib/srs/types";
import { CardReview } from "./CardReview";
import { CardsDone } from "./CardsDone";
import { CardsSetup } from "./CardsSetup";

/** Общая пустая карта состояний: literal `{}` в рендере ломал бы мемоизацию. */
const NO_CARDS: Record<string, CardState> = {};
/** То же для словаря ударений, пока контент не загрузился. */
const NO_STRESS: StressMap = {};
/** То же для сводок: стабильная ссылка, пока прогресс ещё не прочитан. */
const NO_REVIEWS: ReviewSummary[] = [];

/** Экрану нужны только названия и список частей — геометрия (чанки) не грузится. */
type DataState =
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready"; content: ContentBundle; manifest: AtlasManifest };

export function CardsScreen() {
  const [data, setData] = useState<DataState>({ status: "loading" });
  const [progress, setProgress] = useState<ProgressV1 | null>(null);
  const [newLimitText, setNewLimitText] = useState(String(DEFAULT_NEW_LIMIT));
  const [picked, setPicked] = useState<string | null>(null);
  const [direction, setDirection] = useState<Direction>(() => parseDirection(null));
  const [state, dispatch] = useReducer(reducer, initialCardsState);
  const param = useSearchParams().get("topic");

  useEffect(() => {
    const controller = new AbortController();
    (async () => {
      try {
        const [content, manifest] = await Promise.all([
          loadContent("", { signal: controller.signal }),
          loadManifest("", { signal: controller.signal }),
        ]);
        if (controller.signal.aborted) return;
        setData({ status: "ready", content, manifest });
      } catch {
        if (controller.signal.aborted) return;
        setData({ status: "error" });
      }
    })();
    return () => controller.abort();
  }, []);

  // localStorage есть только в браузере: читаем после монтирования, иначе
  // серверная разметка разошлась бы с первым клиентским рендером
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- localStorage is unavailable until mount
    setProgress(loadProgress());
    setNewLimitText(String(loadNewLimit()));
    setDirection(loadDirection());
  }, []);

  const groups = useMemo(() => (data.status === "ready" ? topicGroups(data.content, data.manifest) : []), [data]);
  const all = useMemo(() => (data.status === "ready" ? allDeck(data.content, data.manifest) : []), [data]);
  const known = useMemo(() => new Set(groups.flatMap((g) => g.topics.map((t) => t.id))), [groups]);
  // ?topic=<id> из атласа предвыбирает тему, пока пользователь не выбрал свою;
  // неизвестный id игнорируется — список тем известен только после загрузки
  const topicId = picked ?? (param !== null && known.has(param) ? param : ALL_TOPICS);

  const deck = useMemo(() => {
    if (topicId === ALL_TOPICS) return all;
    if (data.status !== "ready") return [];
    return topicDeck(data.content, data.manifest, topicId);
  }, [all, data, topicId]);
  const topicRu = useMemo(
    () => new Map(data.status === "ready" ? data.content.topics.map((t) => [t.id, t.ru] as const) : []),
    [data],
  );
  // словарь ударений приходит тем же бандлом; без него транскрипции просто нет
  const stress = data.status === "ready" ? data.content.stress : NO_STRESS;

  const today = dayKey(new Date().toISOString());
  const newLimit = parseNewLimit(newLimitText);
  const cards = progress?.cards ?? NO_CARDS;
  const reviews = progress?.reviews ?? NO_REVIEWS;
  // дневная норма новых считается по уже записанным сегодня сводкам: иначе
  // каждая следующая сессия дня снова выдавала бы полный лимит новых карточек
  const newToday = useMemo(() => newShownToday(reviews, today), [reviews, today]);
  const remainingNew = Math.max(0, newLimit - newToday);
  const counts = useMemo(
    () => deckCounts(deck, cards, today, remainingNew),
    [deck, cards, today, remainingNew],
  );
  // «Ещё» показывается, только если на сегодня осталась очередь: карточки,
  // не поместившиеся в лимит max=50, или следующая порция новых в пределах нормы
  const hasMore = useMemo(
    () => state.phase === "done" && buildQueue(deck, cards, today, remainingNew).length > 0,
    [state.phase, deck, cards, today, remainingNew],
  );
  // когда на сегодня всё сделано, экран говорит, когда карточки вернутся
  const upcoming = useMemo(() => deckNextDue(deck, cards, today), [deck, cards, today]);

  // итог сессии: его же показывает экран «Повторено N» и пишет flush()
  const tally = useMemo(() => sessionTally(state), [state]);

  // последний снимок сессии для записи при уходе со страницы
  const pending = useRef<ReturnType<typeof sessionTally>>(null);
  useEffect(() => {
    if (state.phase !== "setup") pending.current = tally;
  }, [state.phase, tally]);

  /** Пишет сессию в прогресс ровно один раз: pending обнуляется до записи. */
  const flush = useCallback((): ProgressV1 | null => {
    const p = pending.current;
    pending.current = null;
    if (p === null || p.reviewed === 0) return null;
    const next = recordReview(
      loadProgress(),
      {
        finishedAt: new Date().toISOString(),
        topicId: p.topicId,
        reviewed: p.reviewed,
        again: p.again,
        fresh: p.fresh,
      },
      p.states,
    );
    saveProgress(next);
    return next;
  }, []);

  useEffect(() => {
    if (state.phase !== "done") return;
    const next = flush();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- запись прогресса происходит по завершению сессии
    if (next) setProgress(next);
  }, [state.phase, flush]);

  // уход со страницы (или «Прервать») посреди сессии тоже сохраняет оценки
  useEffect(() => () => void flush(), [flush]);

  const start = useCallback(() => {
    const queue = buildQueue(deck, cards, today, remainingNew);
    if (queue.length === 0) return;
    dispatch({ type: "start", topicId, queue, base: cards, startedAt: new Date().toISOString() });
  }, [deck, cards, today, remainingNew, topicId]);

  const grade = useCallback((g: Grade) => {
    const now = new Date().toISOString();
    dispatch({ type: "grade", grade: g, today: dayKey(now), now });
  }, []);

  const abort = useCallback(() => {
    const next = flush();
    if (next) setProgress(next);
    dispatch({ type: "abort" });
  }, [flush]);

  const changeNewLimit = useCallback((value: string) => {
    setNewLimitText(value);
    saveNewLimit(parseNewLimit(value));
  }, []);

  const changeDirection = useCallback((d: Direction) => {
    setDirection(d);
    saveDirection(d);
  }, []);

  return (
    <div className="mx-auto flex h-full w-full max-w-xl flex-col p-6 text-sm">
      {state.phase === "setup" && data.status === "loading" && (
        <p className="text-neutral-500">Загружаем темы…</p>
      )}
      {state.phase === "setup" && data.status === "error" && (
        <p className="text-red-700">Не удалось загрузить темы. Обновите страницу.</p>
      )}
      {state.phase === "setup" && data.status === "ready" && (
        <CardsSetup
          groups={groups}
          allCards={all.length}
          topicId={topicId}
          onTopic={setPicked}
          direction={direction}
          onDirection={changeDirection}
          newLimit={newLimitText}
          onNewLimit={changeNewLimit}
          due={counts.due}
          fresh={counts.fresh}
          newToday={newToday}
          nextDue={upcoming}
          deckCards={deck.length}
          onStart={start}
        />
      )}
      {state.phase === "review" && (
        <CardReview
          card={state.queue[state.index]}
          direction={direction}
          topicRu={topicRu.get(state.queue[state.index].topic) ?? ""}
          laRu={transcription(state.queue[state.index].la, stress)}
          revealed={state.revealed}
          remaining={remaining(state)}
          intervals={gradeIntervals(
            state.states[state.queue[state.index].key] ?? state.base[state.queue[state.index].key],
            today,
          )}
          onShow={() => dispatch({ type: "reveal" })}
          onGrade={grade}
          onAbort={abort}
        />
      )}
      {state.phase === "done" && tally !== null && (
        <CardsDone
          reviewed={tally.reviewed}
          again={tally.again}
          due={upcoming ?? nextDue(tally.states)}
          today={today}
          hasMore={hasMore}
          onMore={start}
          onOther={abort}
        />
      )}
    </div>
  );
}
