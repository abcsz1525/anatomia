"use client";
import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { AtlasCanvas } from "@/components/atlas/AtlasCanvas";
import { LoadingOverlay } from "@/components/atlas/LoadingOverlay";
import { WebGLGate } from "@/components/atlas/WebGLGate";
import { useAtlasData } from "@/hooks/use-atlas-data";
import { recordSession } from "@/lib/progress/record";
import { loadProgress, saveProgress } from "@/lib/progress/storage";
import { checkFind, checkName } from "@/lib/quiz/check";
import { generateSession } from "@/lib/quiz/generate";
import { courseTopics, distinctConcepts, topicParts, visibleIdsForTopic } from "@/lib/quiz/pool";
import type { AnswerRecord, Question, QuizMode, SessionResult } from "@/lib/quiz/types";
import { useAtlasStore } from "@/store/atlas-store";
import { QuizResult } from "./QuizResult";
import { QuizRunner, isAnswered, type Feedback } from "./QuizRunner";
import { QuizSetup, type TopicGroup } from "./QuizSetup";

/** Число кликов по модели на один вопрос режима «найди». */
const FIND_ATTEMPTS = 3;

type QuizState =
  | { phase: "setup" }
  | {
      phase: "running";
      topicId: string;
      mode: QuizMode;
      questions: Question[];
      index: number;
      answers: AnswerRecord[];
      /** Использовано попыток на текущем вопросе (клики/выборы). */
      attempts: number;
      feedback: Feedback;
      startedAt: string;
    }
  | { phase: "result"; result: SessionResult };

type Action =
  | { type: "start"; topicId: string; mode: QuizMode; questions: Question[]; startedAt: string }
  | { type: "answer"; correct: boolean }
  | { type: "choose"; index: number; correct: boolean }
  | { type: "next"; now: string }
  | { type: "abort" };

function answerFor(q: Question, correct: boolean, attempts: number): AnswerRecord {
  return { partId: q.target.id, la: q.target.la, ru: q.target.ru, correct, attempts };
}

function reducer(state: QuizState, action: Action): QuizState {
  switch (action.type) {
    case "start":
      return {
        phase: "running",
        topicId: action.topicId,
        mode: action.mode,
        questions: action.questions,
        index: 0,
        answers: [],
        attempts: 0,
        feedback: { kind: "idle" },
        startedAt: action.startedAt,
      };
    case "abort":
      return { phase: "setup" };
    case "answer": {
      if (state.phase !== "running" || isAnswered(state.feedback)) return state;
      const q = state.questions[state.index];
      const attempts = state.attempts + 1;
      if (action.correct) {
        return { ...state, attempts, answers: [...state.answers, answerFor(q, true, attempts)], feedback: { kind: "correct" } };
      }
      // третий промах закрывает вопрос: ответ показан, записывается как ошибка
      if (attempts >= FIND_ATTEMPTS) {
        return {
          ...state,
          attempts,
          answers: [...state.answers, answerFor(q, false, FIND_ATTEMPTS)],
          feedback: { kind: "revealed" },
        };
      }
      return { ...state, attempts, feedback: { kind: "wrong", left: FIND_ATTEMPTS - attempts } };
    }
    case "choose": {
      if (state.phase !== "running" || isAnswered(state.feedback)) return state;
      const q = state.questions[state.index];
      return {
        ...state,
        attempts: 1,
        answers: [...state.answers, answerFor(q, action.correct, 1)],
        feedback: { kind: "chosen", index: action.index, correct: action.correct },
      };
    }
    case "next": {
      if (state.phase !== "running" || !isAnswered(state.feedback)) return state;
      const next = state.index + 1;
      if (next < state.questions.length) {
        return { ...state, index: next, attempts: 0, feedback: { kind: "idle" } };
      }
      return {
        phase: "result",
        result: {
          topicId: state.topicId,
          mode: state.mode,
          startedAt: state.startedAt,
          finishedAt: action.now,
          answers: state.answers,
        },
      };
    }
  }
}

export function QuizScreen() {
  const atlas = useAtlasData();
  const [ready, setReady] = useState(false);
  const onReady = useCallback(() => setReady(true), []);
  const [quiz, dispatch] = useReducer(reducer, { phase: "setup" } as QuizState);
  const [topicId, setTopicId] = useState<string | null>(null);
  const [mode, setMode] = useState<QuizMode>("find");

  const setRestrict = useAtlasStore((s) => s.setRestrict);
  const setHighlights = useAtlasStore((s) => s.setHighlights);
  const flyTo = useAtlasStore((s) => s.flyTo);
  const clearQuiz = useAtlasStore((s) => s.clearQuiz);

  const bundle = atlas.status === "ready" ? atlas.data : null;

  // сцена принадлежит только викторине, пока экран смонтирован
  useEffect(() => {
    clearQuiz();
    return () => clearQuiz();
  }, [clearQuiz]);

  const groups = useMemo<TopicGroup[]>(() => {
    if (!bundle) return [];
    const { content, manifest } = bundle;
    const topicById = new Map(content.topics.map((t) => [t.id, t]));
    const byParent = new Map<string, TopicGroup>();
    const result: TopicGroup[] = [];
    for (const topic of courseTopics(content.topics)) {
      const concepts = distinctConcepts(topicParts(content, manifest, topic.id)).length;
      if (concepts === 0) continue;
      const parentId = topic.parent ?? topic.id;
      let group = byParent.get(parentId);
      if (!group) {
        group = { id: parentId, ru: topicById.get(parentId)?.ru ?? topic.ru, topics: [] };
        byParent.set(parentId, group);
        result.push(group);
      }
      group.topics.push({ id: topic.id, ru: topic.ru, concepts });
    }
    return result;
  }, [bundle]);

  // без явного выбора берём первую тему списка, чтобы «Начать» было активно сразу
  const selectedTopicId = topicId ?? groups[0]?.topics[0]?.id ?? null;

  const start = useCallback(
    (id: string, m: QuizMode) => {
      if (!bundle) return;
      const { content, manifest } = bundle;
      const parts = topicParts(content, manifest, id);
      if (parts.length === 0) return;
      let questions: Question[];
      try {
        questions = generateSession(parts, m, Date.now());
      } catch {
        return; // тема мельче 4 концептов для режима «назови» — кнопка и так заблокирована
      }
      clearQuiz();
      const visible = visibleIdsForTopic(content, manifest, content.topics, id);
      // setRestrict([]) спрятал бы всё; пустого списка здесь быть не может, но проверяем
      if (visible.length > 0) setRestrict(visible);
      dispatch({ type: "start", topicId: id, mode: m, questions, startedAt: new Date().toISOString() });
    },
    [bundle, clearQuiz, setRestrict],
  );

  // подсветка/камера для вновь показанного вопроса; между вопросами подсветки сбрасываются
  const questions = quiz.phase === "running" ? quiz.questions : null;
  const index = quiz.phase === "running" ? quiz.index : 0;
  useEffect(() => {
    const q = questions?.[index];
    if (!q) return;
    if (q.kind === "name") {
      setHighlights({ [q.target.id]: "target" });
      flyTo(q.target.id);
    } else {
      setHighlights({});
    }
  }, [questions, index, setHighlights, flyTo]);

  // результат записывается ровно один раз на сессию
  const result = quiz.phase === "result" ? quiz.result : null;
  const recorded = useRef<SessionResult | null>(null);
  useEffect(() => {
    if (!result || recorded.current === result) return;
    recorded.current = result;
    saveProgress(recordSession(loadProgress(), result));
    clearQuiz();
  }, [result, clearQuiz]);

  const handlePick = useCallback(
    (clickedId: string) => {
      if (quiz.phase !== "running" || isAnswered(quiz.feedback)) return;
      const q = quiz.questions[quiz.index];
      if (q.kind !== "find") return;
      const correct = checkFind(q, clickedId);
      if (correct) {
        setHighlights({ [clickedId]: "correct" });
      } else if (quiz.attempts + 1 >= FIND_ATTEMPTS) {
        setHighlights({ [q.target.id]: "target" });
        flyTo(q.target.id);
      } else {
        // прошлые промахи остаются красными — читаем их прямо из стора
        setHighlights({ ...useAtlasStore.getState().highlights, [clickedId]: "wrong" });
      }
      dispatch({ type: "answer", correct });
    },
    [quiz, setHighlights, flyTo],
  );

  const handleChoose = useCallback(
    (optionIndex: number) => {
      if (quiz.phase !== "running" || isAnswered(quiz.feedback)) return;
      const q = quiz.questions[quiz.index];
      if (q.kind !== "name") return;
      dispatch({ type: "choose", index: optionIndex, correct: checkName(q, optionIndex) });
    },
    [quiz],
  );

  const handleNext = useCallback(() => dispatch({ type: "next", now: new Date().toISOString() }), []);
  const handleAbort = useCallback(() => {
    clearQuiz();
    dispatch({ type: "abort" });
  }, [clearQuiz]);

  return (
    <div className="flex h-full w-full" data-atlas-ready={ready ? "true" : "false"}>
      <aside className="flex w-80 shrink-0 flex-col overflow-hidden border-r bg-white p-4 text-sm" aria-label="Тест">
        {!bundle ? (
          <p className="text-neutral-500">Загружаем модель…</p>
        ) : quiz.phase === "setup" ? (
          <QuizSetup
            groups={groups}
            topicId={selectedTopicId}
            onTopic={setTopicId}
            mode={mode}
            onMode={setMode}
            onStart={() => selectedTopicId && start(selectedTopicId, mode)}
          />
        ) : quiz.phase === "running" ? (
          <QuizRunner
            question={quiz.questions[quiz.index]}
            index={quiz.index}
            total={quiz.questions.length}
            feedback={quiz.feedback}
            onChoose={handleChoose}
            onNext={handleNext}
            onAbort={handleAbort}
          />
        ) : (
          <QuizResult
            result={quiz.result}
            onAgain={() => start(quiz.result.topicId, quiz.result.mode)}
            onOther={handleAbort}
          />
        )}
      </aside>
      <div className="relative flex-1">
        <WebGLGate>
          {atlas.status === "loading" && <LoadingOverlay loaded={atlas.loaded} total={atlas.total} />}
          {atlas.status === "error" && (
            <LoadingOverlay loaded={0} total={0} error={atlas.message} onRetry={atlas.retry} />
          )}
          {atlas.status === "ready" && (
            <>
              {/* onPick всегда перехватывает клик: без него клик выделял бы структуру
                  оранжевым и подсказывал ответ */}
              <AtlasCanvas data={atlas.data} onReady={onReady} onPick={handlePick} />
              {!ready && <LoadingOverlay loaded={1} total={1} />}
            </>
          )}
        </WebGLGate>
      </div>
    </div>
  );
}
