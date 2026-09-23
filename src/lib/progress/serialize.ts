import type { QuizMode } from "@/lib/quiz/types";
import type { PartStat, ProgressV1, SessionSummary } from "./types";

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function isQuizMode(v: unknown): v is QuizMode {
  return v === "find" || v === "name";
}

function isPartStat(v: unknown): v is PartStat {
  return (
    isRecord(v) &&
    typeof v.correct === "number" &&
    typeof v.wrong === "number" &&
    typeof v.lastAt === "string"
  );
}

function isPartsMap(v: unknown): v is Record<string, PartStat> {
  return isRecord(v) && Object.values(v).every(isPartStat);
}

function isSessionSummary(v: unknown): v is SessionSummary {
  return (
    isRecord(v) &&
    typeof v.topicId === "string" &&
    isQuizMode(v.mode) &&
    typeof v.finishedAt === "string" &&
    typeof v.correct === "number" &&
    typeof v.total === "number"
  );
}

function isSessionsList(v: unknown): v is SessionSummary[] {
  return Array.isArray(v) && v.every(isSessionSummary);
}

function isActiveDaysList(v: unknown): v is string[] {
  return Array.isArray(v) && v.every((d) => typeof d === "string" && DAY_RE.test(d));
}

/** Возвращает ProgressV1 только если форма и версия валидны; иначе null. Никогда не бросает. */
export function parseProgress(raw: string | null): ProgressV1 | null {
  if (raw === null || raw === "") return null;

  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return null;
  }

  if (!isRecord(data)) return null;
  if (data.version !== 1) return null;
  if (!isPartsMap(data.parts)) return null;
  if (!isSessionsList(data.sessions)) return null;
  if (!isActiveDaysList(data.activeDays)) return null;

  return {
    version: 1,
    parts: data.parts,
    sessions: data.sessions,
    activeDays: data.activeDays,
  };
}

export function stringifyProgress(p: ProgressV1): string {
  return JSON.stringify(p);
}
