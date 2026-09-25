import type { Syllable } from "./types";

const VOWELS = new Set(["a", "e", "i", "o", "u", "y"]);

export function isVowel(ch: string | undefined): boolean {
  return ch !== undefined && VOWELS.has(ch);
}

/**
 * Диграф или дифтонг, начинающийся с позиции `i`, — одно ядро и один слог:
 * `ae`/`oe` читаются одной «э», `au`/`eu` — «ау»/«эу».
 *
 * `eu` не дифтонг, когда это окончание `-eus`/`-eum`: там `e` принадлежит
 * основе, а `u` — окончанию (`deltoide-us` → дэльтои́дэус, `perine-um` →
 * пэринэ́ум). `ae`/`oe` в анатомическом корпусе всегда диграфы.
 */
export function diphthongAt(word: string, i: number): string | null {
  const pair = word.slice(i, i + 2);
  if (pair === "ae" || pair === "oe" || pair === "au") return pair;
  if (pair === "eu") return /^eu[sm]$/.test(word.slice(i)) ? null : "eu";
  return null;
}

/**
 * `i` работает согласной (й) в начале слова перед гласной и между гласными:
 * `iodum` → йо́дум. В корпусе BodyParts3D таких слов нет (везде `j`), но
 * правило чтения без него неполное.
 */
export function isConsonantalI(word: string, i: number): boolean {
  if (word[i] !== "i" || !isVowel(word[i + 1])) return false;
  return i === 0 || isVowel(word[i - 1]);
}

/**
 * `u` в `qu` и в `ngu` перед гласной — не гласная, а часть согласного звука
 * («кв», «нгв»). Поэтому `obliquus` — три слога (o-bli-quus), а `lingua` — два
 * (lin-gua). Перед согласной `ngu` остаётся «нгу», и `u` — обычное ядро
 * (`longus` → ло́нгус).
 */
export function isGlideU(word: string, i: number): boolean {
  if (word[i] !== "u") return false;
  if (word[i - 1] === "q") return true;
  return word.slice(i - 2, i) === "ng" && isVowel(word[i + 1]);
}

/**
 * `i` внутри `ti` + гласная, которое читается «ци»: слога оно не образует —
 * «ци» здесь такой же слитный согласный, как в русском «субста́нция», и
 * ударение считается по трём слогам sub-stan-tia, а не по четырём.
 * После `s`, `t`, `x` сочетание остаётся «ти», и `i` снова ядро
 * (`ostium` → о́стиум, три слога os-ti-um).
 */
export function isTsiGlide(word: string, i: number): boolean {
  if (word[i] !== "i" || word[i - 1] !== "t" || !isVowel(word[i + 1])) return false;
  const before = word[i - 2];
  return before !== "s" && before !== "t" && before !== "x";
}

/**
 * Ядра слогов латинского слова слева направо. Слогоделение считается по
 * написанию: сколько ядер — столько слогов.
 */
export function syllables(word: string): Syllable[] {
  const w = word.toLowerCase();
  const result: Syllable[] = [];
  for (let i = 0; i < w.length; i++) {
    if (!isVowel(w[i])) continue;
    const pair = diphthongAt(w, i);
    if (pair) {
      result.push({ nucleus: pair, start: i });
      i += 1;
      continue;
    }
    if (isGlideU(w, i) || isConsonantalI(w, i) || isTsiGlide(w, i)) continue;
    result.push({ nucleus: w[i], start: i });
  }
  return result;
}
