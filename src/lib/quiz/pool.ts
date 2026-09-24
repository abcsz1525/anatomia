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
 * Скелет как контекст для тем миологии/артрологии/ангиологии: без костей
 * "найди мышцу" или "найди артерию" не имеет смысла, но кости самой темы
 * искать не нужно — только показать. Для неврологии/спланхнологии/органов
 * чувств контекста нет: череп закрыл бы мозг и глаз.
 */
const SKELETAL_CONTEXT_PARENTS = new Set(["myology", "arthrology", "angiology"]);

export function contextIds(manifest: AtlasManifest, topics: Topic[], topicId: string): string[] {
  const topic = topics.find((t) => t.id === topicId);
  if (!topic?.parent || !SKELETAL_CONTEXT_PARENTS.has(topic.parent)) return [];
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

/**
 * Ключ группы дублей: одна структура часто разрезана на несколько мешей
 * (`FJ1475`/`FJ1499` — одна и та же мышца). Латынь + сторона определяют
 * структуру однозначно; пустая сторона совпадает только с пустой.
 */
export function groupKey(part: QuizPart): string {
  return `${part.la}|${part.side}`;
}

/** Группы дублей темы: ключ → id всех её мешей, в порядке manifest.parts. */
export function groupsOf(parts: QuizPart[]): Map<string, string[]> {
  const result = new Map<string, string[]>();
  for (const p of parts) {
    const key = groupKey(p);
    const ids = result.get(key);
    if (ids) ids.push(p.id);
    else result.set(key, [p.id]);
  }
  return result;
}

/** Курсовая тема как вариант выбора: подпись и число различных концептов (la). */
export interface TopicOption {
  id: string;
  ru: string;
  concepts: number;
}

/** Курсовые темы, сгруппированные по родителю (остеология/артрология/миология). */
export interface TopicGroup {
  id: string;
  ru: string;
  topics: TopicOption[];
}

/**
 * Общий список тем для экранов квиза, карточек и прогресса: курсовые темы,
 * сгруппированные по родителю, в порядке topics.json. Тема без концептов
 * выпадает — по ней нечего ни спрашивать, ни учить, ни считать освоение.
 */
export function topicGroups(content: ContentBundle, manifest: AtlasManifest): TopicGroup[] {
  const topicById = new Map(content.topics.map((t) => [t.id, t]));
  const byParent = new Map<string, TopicGroup>();
  const result: TopicGroup[] = [];
  for (const topic of courseTopics(content.topics)) {
    const concepts = distinctConcepts(topicParts(content, manifest, topic.id)).length;
    if (concepts === 0) continue;
    // тема верхнего уровня (без родителя) образует группу из самой себя
    const parentId = topic.parent ?? topic.id;
    let group = byParent.get(parentId);
    if (!group) {
      group = { id: parentId, ru: topicById.get(parentId)?.ru ?? topic.ru, topics: [] };
      byParent.set(parentId, group);
      result.push(group);
    }
    group.topics.push({ id: topic.id, ru: topic.ru, concepts });
  }
  return result;
}
