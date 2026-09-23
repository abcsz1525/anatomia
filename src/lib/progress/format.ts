/**
 * Русская форма существительного при числе: 1 сессия, 2 сессии, 5 сессий.
 * Числа 11–14 всегда берут форму «many» (11 сессий), поэтому проверяются первыми.
 */
export function plural(n: number, one: string, few: string, many: string): string {
  const abs = Math.abs(Math.trunc(n));
  const hundred = abs % 100;
  if (hundred >= 11 && hundred <= 14) return many;
  const last = abs % 10;
  if (last === 1) return one;
  if (last >= 2 && last <= 4) return few;
  return many;
}

/** «0 сессий» / «1 сессия» / «3 сессии» / «7 сессий». */
export function sessionsLabel(n: number): string {
  return `${n} ${plural(n, "сессия", "сессии", "сессий")}`;
}

/** «0 дней» / «1 день» / «3 дня» / «7 дней». */
export function daysLabel(n: number): string {
  return `${n} ${plural(n, "день", "дня", "дней")}`;
}
