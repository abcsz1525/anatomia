import { describe, expect, it } from "vitest";
import type { Side } from "@/lib/content/types";
import { generateSession, SESSION_LENGTH } from "./generate";
import { FIND_ATTEMPTS, initialQuizState, isAnswered, reducer, type Action, type QuizState } from "./session";
import type { QuizPart } from "./types";

function part(id: string, la: string, side: Side, ru = la): QuizPart {
  return { id, la, ru, side, system: "skeletal", topic: "test-topic" };
}

// 5 различных концептов — хватает и на «найди», и на «назови» (нужно >= 4)
const parts: QuizPart[] = [
  part("FEM_L", "Femur", "left", "Бедренная кость"),
  part("FEM_R", "Femur", "right", "Бедренная кость"),
  part("TIB_L", "Tibia", "left", "Большеберцовая кость"),
  part("HUM_L", "Humerus", "left", "Плечевая кость"),
  part("RAD_L", "Radius", "left", "Лучевая кость"),
  part("ULN_L", "Ulna", "left", "Локтевая кость"),
];

const SEED = 7;
const STARTED_AT = "2026-09-23T10:00:00.000Z";
const NOW = "2026-09-23T10:05:00.000Z";

function start(mode: "find" | "name"): QuizState {
  return reducer(initialQuizState, {
    type: "start",
    topicId: "test-topic",
    mode,
    questions: generateSession(parts, mode, SEED),
    startedAt: STARTED_AT,
  });
}

function apply(state: QuizState, ...actions: Action[]): QuizState {
  return actions.reduce(reducer, state);
}

/** Состояние фазы running — иначе тест падает с понятным сообщением. */
function running(state: QuizState) {
  if (state.phase !== "running") throw new Error(`expected phase "running", got "${state.phase}"`);
  return state;
}

describe("quiz session — start", () => {
  it("start makes a running session at question 1 with no answers", () => {
    const s = running(start("find"));
    expect(s.topicId).toBe("test-topic");
    expect(s.mode).toBe("find");
    expect(s.questions.length).toBe(SESSION_LENGTH);
    expect(s.index).toBe(0);
    expect(s.answers).toEqual([]);
    expect(s.attempts).toBe(0);
    expect(s.feedback).toEqual({ kind: "idle" });
    expect(s.startedAt).toBe(STARTED_AT);
  });
});

describe("quiz session — find mode", () => {
  it("records a correct first click with attempts 1", () => {
    const s0 = running(start("find"));
    const s = running(apply(s0, { type: "answer", correct: true }));
    expect(s.feedback).toEqual({ kind: "correct" });
    expect(s.attempts).toBe(1);
    expect(s.answers).toEqual([
      {
        partId: s0.questions[0].target.id,
        la: s0.questions[0].target.la,
        ru: s0.questions[0].target.ru,
        side: s0.questions[0].target.side,
        correct: true,
        attempts: 1,
      },
    ]);
    expect(isAnswered(s.feedback)).toBe(true);
  });

  it("wrong then correct records the answer with attempts 2", () => {
    const s0 = start("find");
    const afterMiss = running(apply(s0, { type: "answer", correct: false }));
    expect(afterMiss.feedback).toEqual({ kind: "wrong", left: FIND_ATTEMPTS - 1 });
    expect(afterMiss.answers).toEqual([]); // вопрос ещё открыт
    expect(isAnswered(afterMiss.feedback)).toBe(false);

    const s = running(apply(afterMiss, { type: "answer", correct: true }));
    expect(s.feedback).toEqual({ kind: "correct" });
    expect(s.attempts).toBe(2);
    expect(s.answers.length).toBe(1);
    expect(s.answers[0]).toMatchObject({ correct: true, attempts: 2 });
  });

  it("the third miss reveals the answer and records it as wrong with attempts 3", () => {
    const s0 = running(start("find"));
    const s = running(
      apply(
        s0,
        { type: "answer", correct: false },
        { type: "answer", correct: false },
        { type: "answer", correct: false },
      ),
    );
    expect(s.feedback).toEqual({ kind: "revealed" });
    expect(s.attempts).toBe(FIND_ATTEMPTS);
    expect(s.answers).toEqual([
      {
        partId: s0.questions[0].target.id,
        la: s0.questions[0].target.la,
        ru: s0.questions[0].target.ru,
        side: s0.questions[0].target.side,
        correct: false,
        attempts: FIND_ATTEMPTS,
      },
    ]);
    expect(isAnswered(s.feedback)).toBe(true);
  });

  it("ignores further answers once the question is revealed", () => {
    const revealed = apply(
      start("find"),
      { type: "answer", correct: false },
      { type: "answer", correct: false },
      { type: "answer", correct: false },
    );
    const after = apply(revealed, { type: "answer", correct: true }, { type: "offtopic" });
    expect(after).toBe(revealed); // та же ссылка: состояние не менялось
  });

  it("ignores further answers once an option was chosen", () => {
    const chosen = apply(start("name"), { type: "choose", index: 0, correct: true });
    const after = apply(chosen, { type: "answer", correct: false }, { type: "choose", index: 1, correct: false });
    expect(after).toBe(chosen);
  });

  it("offtopic shows the remaining attempts without spending one", () => {
    const s0 = start("find");
    const s1 = running(apply(s0, { type: "offtopic" }));
    expect(s1.feedback).toEqual({ kind: "offtopic", left: FIND_ATTEMPTS });
    expect(s1.attempts).toBe(0);
    expect(s1.answers).toEqual([]);

    // после промаха счётчик в подсказке тоже совпадает с реально оставшимся
    const s2 = running(apply(s1, { type: "answer", correct: false }, { type: "offtopic" }));
    expect(s2.feedback).toEqual({ kind: "offtopic", left: FIND_ATTEMPTS - 1 });
    expect(s2.attempts).toBe(1);

    // и три промаха всё ещё закрывают вопрос — offtopic попыток не съел
    const s3 = running(apply(s2, { type: "answer", correct: false }, { type: "answer", correct: false }));
    expect(s3.feedback).toEqual({ kind: "revealed" });
    expect(s3.attempts).toBe(FIND_ATTEMPTS);
  });
});

describe("quiz session — name mode", () => {
  it("choose with the correct option records a correct answer with attempts 1", () => {
    const s0 = running(start("name"));
    const q = s0.questions[0];
    if (q.kind !== "name") throw new Error("expected a name question");
    const s = running(apply(s0, { type: "choose", index: q.correctIndex, correct: true }));
    expect(s.feedback).toEqual({ kind: "chosen", index: q.correctIndex, correct: true });
    expect(s.answers).toEqual([
      { partId: q.target.id, la: q.target.la, ru: q.target.ru, side: q.target.side, correct: true, attempts: 1 },
    ]);
  });

  it("choose with a wrong option records a wrong answer and closes the question", () => {
    const s0 = running(start("name"));
    const q = s0.questions[0];
    if (q.kind !== "name") throw new Error("expected a name question");
    const wrongIndex = (q.correctIndex + 1) % q.options.length;
    const s = running(apply(s0, { type: "choose", index: wrongIndex, correct: false }));
    expect(s.feedback).toEqual({ kind: "chosen", index: wrongIndex, correct: false });
    expect(s.answers[0]).toMatchObject({ partId: q.target.id, correct: false, attempts: 1 });
    expect(isAnswered(s.feedback)).toBe(true);
  });
});

describe("quiz session — side in the record", () => {
  it("copies the side of the target so left/right stay distinguishable", () => {
    // две части с одной la и разной стороной: без side запись неотличима
    const bySide = new Map(parts.map((p) => [p.id, p.side]));
    for (const mode of ["find", "name"] as const) {
      const s0 = running(start(mode));
      const q = s0.questions[0];
      const s =
        mode === "find"
          ? running(apply(s0, { type: "answer", correct: true }))
          : running(apply(s0, { type: "choose", index: 0, correct: true }));
      expect(s.answers[0].side).toBe(bySide.get(q.target.id));
      expect(s.answers[0].side).toBe(q.target.side);
    }
  });

  it("records the two femurs with different sides", () => {
    const femL = parts.find((p) => p.id === "FEM_L")!;
    const femR = parts.find((p) => p.id === "FEM_R")!;
    expect(femL.la).toBe(femR.la);
    expect(femL.side).not.toBe(femR.side);
  });
});

describe("quiz session — next and abort", () => {
  it("ignores next while the question is unanswered", () => {
    const s0 = start("find");
    expect(apply(s0, { type: "next", now: NOW })).toBe(s0);
    // промах вопрос не закрывает, «Дальше» по-прежнему не работает
    const missed = apply(s0, { type: "answer", correct: false });
    expect(apply(missed, { type: "next", now: NOW })).toBe(missed);
  });

  it("next moves to the following question and resets attempts and feedback", () => {
    const s = running(
      apply(start("find"), { type: "answer", correct: false }, { type: "answer", correct: true }, { type: "next", now: NOW }),
    );
    expect(s.index).toBe(1);
    expect(s.attempts).toBe(0);
    expect(s.feedback).toEqual({ kind: "idle" });
    expect(s.answers.length).toBe(1); // уже записанный ответ остаётся
  });

  it("next on the last question finishes the session with 10 answers", () => {
    let state = start("name");
    for (let i = 0; i < SESSION_LENGTH; i++) {
      const s = running(state);
      const q = s.questions[s.index];
      if (q.kind !== "name") throw new Error("expected a name question");
      // каждый второй вопрос отвечаем неверно, чтобы в результате были ошибки
      const correct = i % 2 === 0;
      const index = correct ? q.correctIndex : (q.correctIndex + 1) % q.options.length;
      state = apply(s, { type: "choose", index, correct }, { type: "next", now: NOW });
    }

    expect(state.phase).toBe("result");
    if (state.phase !== "result") return;
    expect(state.result).toEqual({
      topicId: "test-topic",
      mode: "name",
      startedAt: STARTED_AT,
      finishedAt: NOW,
      answers: state.result.answers,
    });
    expect(state.result.answers.length).toBe(SESSION_LENGTH);
    expect(state.result.answers.filter((a) => a.correct).length).toBe(SESSION_LENGTH / 2);
    for (const a of state.result.answers) {
      expect(a.attempts).toBe(1);
      expect(typeof a.partId).toBe("string");
      expect(typeof a.la).toBe("string");
      expect(["", "left", "right"]).toContain(a.side);
    }
  });

  it("abort returns to setup from anywhere", () => {
    expect(apply(start("find"), { type: "abort" })).toEqual({ phase: "setup" });
    const answered = apply(start("find"), { type: "answer", correct: true });
    expect(apply(answered, { type: "abort" })).toEqual({ phase: "setup" });
  });

  it("ignores running-only actions while in setup", () => {
    for (const action of [
      { type: "answer", correct: true },
      { type: "offtopic" },
      { type: "choose", index: 0, correct: true },
      { type: "next", now: NOW },
    ] satisfies Action[]) {
      expect(reducer(initialQuizState, action)).toBe(initialQuizState);
    }
  });
});
