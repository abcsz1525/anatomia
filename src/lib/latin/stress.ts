import { syllables } from "./syllables";
import type { StressMap, StressPos, Syllable } from "./types";

/**
 * Суффиксы с долгим предпоследним слогом: ударение падает на него (значение 2).
 * Косвенные падежи и множественное число здесь тоже нужны: словарь собирается
 * по формам из корпуса, а не по словарным («musculi intercostales» → 2).
 * `-ilis` в таблицу не входит: в анатомии он чаще краткий (`gracilis` →
 * гра́цилис), как и `-inae` (`retinae` → рэ́тинэ).
 */
const LONG_SUFFIXES = [
  "alis", "ale", "ales", "alium", "aris", "are", "ares", "arium",
  "atus", "ata", "atum", "ati", "atae", "inus", "ina", "inum", "ini",
  "osus", "osa", "osum", "osi", "osae", "ivus", "iva", "ivum", "ura", "urus",
];

/** Суффиксы с кратким предпоследним слогом: ударение на третьем от конца (3). */
const SHORT_SUFFIXES = [
  "icus", "ica", "icum", "ulus", "ula", "ulum", "olus", "ola", "olum",
  "eus", "ea", "eum", "ius", "ia", "ium", "bilis",
];

/** «Немая + плавная»: перед таким сочетанием гласная остаётся краткой. */
const MUTES = "bcdgpt";
const LIQUIDS = "lr";

/**
 * Суффикс слова из таблиц: его длина и долгота. Выигрывает самое длинное
 * совпадение, поэтому `vagina` читается по долгому `-ina`, а не по краткому
 * `-ia`, а `mobilis` — по краткому `-bilis`.
 */
function matchSuffix(word: string): { length: number; long: boolean } | null {
  let length = 0;
  let long = false;
  for (const [suffixes, isLong] of [[LONG_SUFFIXES, true], [SHORT_SUFFIXES, false]] as const) {
    for (const suffix of suffixes) {
      if (!word.endsWith(suffix) || suffix.length <= length) continue;
      length = suffix.length;
      long = isLong;
    }
  }
  return length === 0 ? null : { length, long };
}

/**
 * Долгий ли предпоследний слог. Сначала таблицы суффиксов (они знают долготу
 * по происхождению слова), затем позиционные признаки: дифтонг долог всегда;
 * гласная перед двумя согласными, `x` или `z` — долгая по положению; перед
 * другой гласной или перед «немой + плавной» — краткая.
 */
function penultLong(word: string, syls: Syllable[]): boolean {
  const penult = syls[syls.length - 2];
  const last = syls[syls.length - 1];
  // Суффикс говорит о долготе своей первой гласной, поэтому он решает дело
  // только если это и есть предпоследнее ядро. В `substantia` ядро «stan»
  // лежит левее «-ia», и долготу решает положение (перед nti), а не таблица.
  const suffix = matchSuffix(word);
  if (suffix && penult.start >= word.length - suffix.length) return suffix.long;
  if (penult.nucleus.length > 1) return true;
  const between = word.slice(penult.start + penult.nucleus.length, last.start);
  if (between.length === 0) return false;
  if (between.length === 1) return between === "x" || between === "z";
  if (between.length === 2 && MUTES.includes(between[0]) && LIQUIDS.includes(between[1])) return false;
  return true;
}

/**
 * Черновик ударения по правилам чтения. Значение годится как заготовка для
 * `content/latin-stress.json`, но не как истина: долготу по природе (`jejunum`,
 * `obliquus`) из написания не видно, поэтому словарь вычитывает человек.
 */
export function guessStress(word: string): StressPos {
  const w = word.toLowerCase();
  const syls = syllables(w);
  if (syls.length <= 1) return 1;
  if (syls.length === 2) return 2;
  return penultLong(w, syls) ? 2 : 3;
}

/** Ударение слова из словаря; null — слова там нет, знак ставить не из чего. */
export function stressOf(word: string, map: StressMap): StressPos | null {
  return map[word.toLowerCase()] ?? null;
}
