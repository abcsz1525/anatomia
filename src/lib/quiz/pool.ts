import type { ContentBundle, Topic } from "@/lib/content/types";
import type { AtlasManifest } from "@/lib/atlas/types";
import type { QuizPart } from "./types";

/** Листья дерева тем (не являются чьим-либо parent), кроме "other". Порядок topics.json. */
export function courseTopics(topics: Topic[]): Topic[] {
  const parentIds = new Set(topics.map((t) => t.parent).filter((p): p is string => p !== undefined));
  return topics.filter((t) => !parentIds.has(t.id) && t.id !== "other");
}

/** Части модели темы (содержательный экран квиза), в порядке manifest.parts. */
export function topicParts(content: ContentBundle, manifest: AtlasManifest, topicId: string): QuizPart[] {
  const result: QuizPart[] = [];
  for (const part of manifest.parts) {
    const entry = content.structures[part.id];
    if (!entry || entry.topic !== topicId) continue;
    result.push({
      id: part.id,
      la: entry.la,
      ru: entry.ru,
      side: entry.side,
      system: part.system,
      topic: entry.topic,
    });
  }
  return result;
}

/**
 * Скелет как контекст для тем миологии/артрологии: без костей "найди мышцу"
 * не имеет смысла, но кости самой темы искать не нужно — только показать.
 */
export function contextIds(manifest: AtlasManifest, topics: Topic[], topicId: string): string[] {
  const topic = topics.find((t) => t.id === topicId);
  if (!topic?.parent || (topic.parent !== "myology" && topic.parent !== "arthrology")) return [];
  return manifest.parts.filter((p) => p.system === "skeletal").map((p) => p.id);
}

/** Все id, которые должны быть видимы в 3D-сцене для темы: части темы + контекст, без дублей. */
export function visibleIdsForTopic(
  content: ContentBundle,
  manifest: AtlasManifest,
  topics: Topic[],
  topicId: string,
): string[] {
  const partIds = topicParts(content, manifest, topicId).map((p) => p.id);
  const seen = new Set(partIds);
  const result = [...partIds];
  for (const id of contextIds(manifest, topics, topicId)) {
    if (seen.has(id)) continue;
    seen.add(id);
    result.push(id);
  }
  return result;
}

/** Уникальные латинские названия (concepts), в порядке первого появления. */
export function distinctConcepts(parts: QuizPart[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const p of parts) {
    if (seen.has(p.la)) continue;
    seen.add(p.la);
    result.push(p.la);
  }
  return result;
}
