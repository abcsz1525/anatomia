import { acceptIds } from "./check";
import { distinctConcepts } from "./pool";
import { mulberry32, shuffle } from "./random";
import type { FindQuestion, NameQuestion, QuizMode, QuizPart, Question } from "./types";

export const SESSION_LENGTH = 10;

const NAME_OPTION_COUNT = 4;
const NAME_DISTRACTOR_COUNT = NAME_OPTION_COUNT - 1;

function groupByLa(parts: QuizPart[]): Map<string, QuizPart[]> {
  const map = new Map<string, QuizPart[]>();
  for (const p of parts) {
    const list = map.get(p.la);
    if (list) list.push(p);
    else map.set(p.la, [p]);
  }
  return map;
}

/**
 * Последовательность концептов (la) длиной count: концепты идут по кругу
 * (перемешиваются заново на каждом круге), но одна и та же la никогда не
 * встречается подряд — если это правило нельзя соблюсти внутри круга
 * (concept — последний в перемешанном круге и совпадает с предыдущим),
 * концепт откладывается до следующего круга вместо повтора.
 */
function conceptSequence(concepts: string[], count: number, rng: () => number): string[] {
  if (concepts.length === 0) return [];
  const seq: string[] = [];
  let lap = shuffle(concepts, rng);
  let idx = 0;
  while (seq.length < count) {
    if (idx >= lap.length) {
      lap = shuffle(concepts, rng);
      idx = 0;
      continue;
    }
    const candidate = lap[idx];
    const last = seq[seq.length - 1];
    if (candidate === last && concepts.length > 1) {
      if (idx + 1 < lap.length) {
        [lap[idx], lap[idx + 1]] = [lap[idx + 1], lap[idx]];
        continue; // re-check the swapped-in candidate at the same idx
      }
      idx++; // drop this concept for this lap; it reappears next lap
      continue;
    }
    seq.push(candidate);
    idx++;
  }
  return seq;
}

function pickTarget(la: string, byLa: Map<string, QuizPart[]>, rng: () => number): QuizPart {
  const candidates = byLa.get(la)!;
  return candidates[Math.floor(rng() * candidates.length)];
}

function buildFindQuestion(target: QuizPart, allParts: QuizPart[]): FindQuestion {
  return { kind: "find", target, accept: acceptIds(target, allParts), attemptsLeft: 3 };
}

function buildNameQuestion(
  target: QuizPart,
  la: string,
  concepts: string[],
  byLa: Map<string, QuizPart[]>,
  rng: () => number,
): NameQuestion {
  const otherConcepts = shuffle(
    concepts.filter((c) => c !== la),
    rng,
  ).slice(0, NAME_DISTRACTOR_COUNT);
  const distractorOptions = otherConcepts.map((c) => ({ la: c, ru: byLa.get(c)![0].ru }));
  const targetOption = { la: target.la, ru: target.ru };
  const options = shuffle([targetOption, ...distractorOptions], rng);
  const correctIndex = options.findIndex((o) => o.la === target.la);
  return { kind: "name", target, options, correctIndex };
}

/**
 * Детерминированная (по seed) сессия из `count` вопросов по одной теме.
 * - "find": accept = acceptIds(target), attemptsLeft = 3.
 * - "name": 4 варианта (цель + 3 случайных дистрактора из других concepts темы);
 *   бросает Error, если у темы меньше 4 различных концептов.
 */
export function generateSession(
  parts: QuizPart[],
  mode: QuizMode,
  seed: number,
  count = SESSION_LENGTH,
): Question[] {
  const concepts = distinctConcepts(parts);
  if (mode === "name" && concepts.length < NAME_OPTION_COUNT) {
    throw new Error("topic has fewer than 4 concepts");
  }

  const rng = mulberry32(seed);
  const laSequence = conceptSequence(concepts, count, rng);
  const byLa = groupByLa(parts);

  return laSequence.map((la) => {
    const target = pickTarget(la, byLa, rng);
    return mode === "find"
      ? buildFindQuestion(target, parts)
      : buildNameQuestion(target, la, concepts, byLa, rng);
  });
}
