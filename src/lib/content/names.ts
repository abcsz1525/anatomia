import type { StructureEntry, Topic } from "./types";

export interface DisplayNames {
  la: string;
  ru: string;
  en: string;
  sideRu: "" | "левая" | "правая";
  topicRu: string;
  translated: boolean;
}

const SIDE_RU = { left: "левая", right: "правая", "": "" } as const;

/** "Кости нижней конечности · Остеология" — лист темы, затем родитель. */
function topicPath(topicId: string, topics: Topic[]): string {
  const leaf = topics.find((t) => t.id === topicId);
  if (!leaf) return "";
  const parent = leaf.parent ? topics.find((t) => t.id === leaf.parent) : undefined;
  return parent ? `${leaf.ru} · ${parent.ru}` : leaf.ru;
}

export function displayNames(en: string, entry: StructureEntry | undefined, topics: Topic[]): DisplayNames {
  if (!entry) return { la: "", ru: "", en, sideRu: "", topicRu: "", translated: false };
  return {
    la: entry.la,
    ru: entry.ru,
    en,
    sideRu: SIDE_RU[entry.side],
    topicRu: topicPath(entry.topic, topics),
    translated: true,
  };
}

/** Метки для поискового индекса: английское имя, латынь, русский и синонимы. */
export function searchLabels(en: string, entry: StructureEntry | undefined): string[] {
  return [en, entry?.la ?? "", entry?.ru ?? "", ...(entry?.aliases ?? [])].filter((s) => s.trim().length > 0);
}
