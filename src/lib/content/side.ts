import type { Side } from "./types";

const SIDE_RE = /\b(left|right)\b/i;

export function detectSide(en: string): Side {
  const m = SIDE_RE.exec(en);
  if (!m) return "";
  return m[1].toLowerCase() as Side;
}

export function stripSide(en: string): string {
  const s = en.replace(SIDE_RE, "").replace(/\s{2,}/g, " ").trim();
  return s.charAt(0).toUpperCase() + s.slice(1);
}
