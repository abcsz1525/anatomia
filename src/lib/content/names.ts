import { transcribe, type StressMap } from "@/lib/latin";
import type { Side, StructureEntry, Topic } from "./types";

export interface DisplayNames {
  la: string;
  ru: string;
  en: string;
  /** Русская транскрипция латыни без скобок: «фэ́мур». Пусто — показывать нечего. */
  laRu: string;
  sideRu: "" | "слева" | "справа";
  topicRu: string;
  translated: boolean;
}

/**
 * Транскрипция латинского названия для интерфейса — общая для карточки
 * структуры, карточек и теста.
 *
 * Пустой словарь означает, что `latin-stress.json` не загрузился: читать
 * названия без ударений студенту незачем (ударение — весь смысл строки),
 * поэтому в этом случае транскрипции нет вовсе.
 */
export function transcription(la: string, stress: StressMap): string {
  if (la === "" || Object.keys(stress).length === 0) return "";
  return transcribe(la, stress);
}

// "слева"/"справа" (adverbial) rather than "левая"/"правая" (adjective),
// which would disagree in gender/number with masculine or plural heads
// like «Надколенник» — «Надколенник (слева)», not «(левая)».
const SIDE_RU = { left: "слева", right: "справа", "": "" } as const;

/** Единственный источник русских меток стороны — карточка, поиск и т.д. */
export function sideLabel(side: Side): "" | "слева" | "справа" {
  return SIDE_RU[side];
}

/** "Кости нижней конечности · Остеология" — лист темы, затем родитель. */
function topicPath(topicId: string, topics: Topic[]): string {
  const leaf = topics.find((t) => t.id === topicId);
  if (!leaf) return "";
  const parent = leaf.parent ? topics.find((t) => t.id === leaf.parent) : undefined;
  return parent ? `${leaf.ru} · ${parent.ru}` : leaf.ru;
}

export function displayNames(
  en: string,
  entry: StructureEntry | undefined,
  topics: Topic[],
  stress: StressMap,
): DisplayNames {
  if (!entry) return { la: "", ru: "", en, laRu: "", sideRu: "", topicRu: "", translated: false };
  return {
    la: entry.la,
    ru: entry.ru,
    en,
    laRu: transcription(entry.la, stress),
    sideRu: sideLabel(entry.side),
    topicRu: topicPath(entry.topic, topics),
    translated: true,
  };
}

/** Метки для поискового индекса: английское имя, латынь, русский и синонимы. */
export function searchLabels(en: string, entry: StructureEntry | undefined): string[] {
  return [en, entry?.la ?? "", entry?.ru ?? "", ...(entry?.aliases ?? [])].filter((s) => s.trim().length > 0);
}
