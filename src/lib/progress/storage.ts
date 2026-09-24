import { DEFAULT_NEW_LIMIT, parseNewLimit } from "@/lib/srs/session";
import { emptyProgress, normalizeActiveDays } from "./record";
import { parseProgress, stringifyProgress } from "./serialize";
import type { ProgressV1 } from "./types";

export const PROGRESS_KEY = "anatomia.progress.v1";
const BACKUP_KEY = `${PROGRESS_KEY}.backup`;
/** «Новых в день» — настройка экрана карточек, не часть прогресса. */
export const NEW_LIMIT_KEY = "anatomia.cards.newLimit";

/**
 * Единственный файл, который трогает localStorage. При отсутствии DOM
 * (typeof localStorage === "undefined") — тихо деградирует до
 * emptyProgress()/no-op, не бросая исключений (SSR/тесты в node-окружении).
 */
export function loadProgress(): ProgressV1 {
  if (typeof localStorage === "undefined") return emptyProgress();

  try {
    const raw = localStorage.getItem(PROGRESS_KEY);
    if (raw === null) return emptyProgress();

    const parsed = parseProgress(raw);
    if (parsed === null) {
      try {
        localStorage.setItem(BACKUP_KEY, raw);
      } catch {
        // ignore backup failure — still fall back to empty progress
      }
      return emptyProgress();
    }

    // normalise activeDays on every load: older saves may carry keys written
    // by the pre-local-day dayKey() (UTC-based), which would otherwise stay
    // wrong forever since nothing else rewrites activeDays for past sessions
    return normalizeActiveDays(parsed);
  } catch {
    return emptyProgress();
  }
}

/** true если под BACKUP_KEY лежат данные, испорченный прогресс, сохранённый loadProgress(). */
export function hasBackup(): boolean {
  if (typeof localStorage === "undefined") return false;

  try {
    return localStorage.getItem(BACKUP_KEY) !== null;
  } catch {
    return false;
  }
}

/** Удаляет BACKUP_KEY (после успешного сброса/импорта прогресса). No-op без localStorage. */
export function clearBackup(): void {
  if (typeof localStorage === "undefined") return;

  try {
    localStorage.removeItem(BACKUP_KEY);
  } catch {
    // ignore — storage may be unavailable (private mode, etc.)
  }
}

export function saveProgress(p: ProgressV1): void {
  if (typeof localStorage === "undefined") return;

  try {
    localStorage.setItem(PROGRESS_KEY, stringifyProgress(p));
  } catch {
    // ignore — storage may be full or unavailable (private mode, etc.)
  }
}

/** «Новых в день» из localStorage: целое 1…100, по умолчанию DEFAULT_NEW_LIMIT. */
export function loadNewLimit(): number {
  if (typeof localStorage === "undefined") return DEFAULT_NEW_LIMIT;

  try {
    return parseNewLimit(localStorage.getItem(NEW_LIMIT_KEY));
  } catch {
    return DEFAULT_NEW_LIMIT;
  }
}

export function saveNewLimit(n: number): void {
  if (typeof localStorage === "undefined") return;

  try {
    localStorage.setItem(NEW_LIMIT_KEY, String(n));
  } catch {
    // ignore — storage may be full or unavailable (private mode, etc.)
  }
}
