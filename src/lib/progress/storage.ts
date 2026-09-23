import { emptyProgress } from "./record";
import { parseProgress, stringifyProgress } from "./serialize";
import type { ProgressV1 } from "./types";

export const PROGRESS_KEY = "anatomia.progress.v1";
const BACKUP_KEY = `${PROGRESS_KEY}.backup`;

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

    return parsed;
  } catch {
    return emptyProgress();
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
