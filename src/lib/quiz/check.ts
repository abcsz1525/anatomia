import type { FindQuestion, NameQuestion, QuizPart } from "./types";

/** Id всех частей с той же la и той же side (пустая side совпадает только с пустой). */
export function acceptIds(target: QuizPart, parts: QuizPart[]): string[] {
  return parts.filter((p) => p.la === target.la && p.side === target.side).map((p) => p.id);
}

export function checkFind(q: FindQuestion, clickedId: string): boolean {
  return q.accept.includes(clickedId);
}

export function checkName(q: NameQuestion, optionIndex: number): boolean {
  return optionIndex === q.correctIndex;
}
