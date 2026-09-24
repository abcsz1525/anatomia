import type { QuizMode } from "@/lib/quiz/types";
import type { CardState, ReviewSummary } from "@/lib/srs/types";
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

function isCardState(v: unknown): v is CardState {
  return (
    isRecord(v) &&
    typeof v.ease === "number" &&
    typeof v.interval === "number" &&
    typeof v.reps === "number" &&
    typeof v.lapses === "number" &&
    typeof v.due === "string" &&
    DAY_RE.test(v.due) &&
    typeof v.lastAt === "string"
  );
}

function isCardsMap(v: unknown): v is Record<string, CardState> {
  return isRecord(v) && Object.values(v).every(isCardState);
}

/** Сводка, как она лежит на диске: fresh появился позже и может отсутствовать. */
type StoredReviewSummary = Omit<ReviewSummary, "fresh"> & { fresh?: number };

function isReviewSummary(v: unknown): v is StoredReviewSummary {
  return (
    isRecord(v) &&
    typeof v.finishedAt === "string" &&
    typeof v.topicId === "string" &&
    typeof v.reviewed === "number" &&
    typeof v.again === "number" &&
    (v.fresh === undefined || typeof v.fresh === "number")
  );
}

function isReviewsList(v: unknown): v is StoredReviewSummary[] {
  return Array.isArray(v) && v.every(isReviewSummary);
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

  // cards/reviews are newer, optional-on-disk fields: absent -> default to
  // empty, present-but-malformed -> reject (same policy as every other field).
  if (data.cards !== undefined && !isCardsMap(data.cards)) return null;
  if (data.reviews !== undefined && !isReviewsList(data.reviews)) return null;
  const cards: Record<string, CardState> = data.cards === undefined ? {} : data.cards;
  // reviews[].fresh — тоже поле «новее диска»: сводки, записанные до дневной
  // нормы новых карточек, читаются как «новых не было»
  const reviews: ReviewSummary[] =
    data.reviews === undefined ? [] : data.reviews.map((r) => ({ ...r, fresh: r.fresh ?? 0 }));

  return {
    version: 1,
    parts: data.parts,
    sessions: data.sessions,
    activeDays: data.activeDays,
    cards,
    reviews,
  };
}

export function stringifyProgress(p: ProgressV1): string {
  return JSON.stringify(p);
}
