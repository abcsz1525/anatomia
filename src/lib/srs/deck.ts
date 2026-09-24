import type { ContentBundle } from "@/lib/content/types";
import type { AtlasManifest } from "@/lib/atlas/types";
import { courseTopics, distinctConcepts, topicParts } from "@/lib/quiz/pool";
import { cardKey } from "./sm2";
import type { Card } from "./types";

/** Колода темы: одна карточка на distinct concept (la), ru — из первой части с этой la. */
export function topicDeck(content: ContentBundle, manifest: AtlasManifest, topicId: string): Card[] {
  const parts = topicParts(content, manifest, topicId);
  const ruByLa = new Map<string, string>();
  for (const part of parts) {
    if (!ruByLa.has(part.la)) ruByLa.set(part.la, part.ru);
  }

  return distinctConcepts(parts).map((la) => ({
    key: cardKey(la),
    la,
    ru: ruByLa.get(la) ?? "",
    topic: topicId,
  }));
}

/** Колода всего курса: конкатенация topicDeck по courseTopics, без дублей ключей (первое появление побеждает). */
export function allDeck(content: ContentBundle, manifest: AtlasManifest): Card[] {
  const seen = new Set<string>();
  const result: Card[] = [];

  for (const topic of courseTopics(content.topics)) {
    for (const card of topicDeck(content, manifest, topic.id)) {
      if (seen.has(card.key)) continue;
      seen.add(card.key);
      result.push(card);
    }
  }

  return result;
}
