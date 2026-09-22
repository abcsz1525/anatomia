export function normalize(s: string): string {
  return s.toLowerCase().replace(/ё/g, "е").replace(/\s+/g, " ").trim();
}

export interface SearchIndex {
  entries: { id: string; labels: string[] }[];
}

export function buildIndex(items: { id: string; labels: string[] }[]): SearchIndex {
  return { entries: items.map((i) => ({ id: i.id, labels: i.labels.map(normalize) })) };
}

function score(labels: string[], q: string): number {
  let best = 0;
  for (const label of labels) {
    if (label === q) return 100;
    if (label.startsWith(q)) best = Math.max(best, 80);
    else {
      const at = label.indexOf(q);
      if (at < 0) continue;
      const wordStart = at === 0 || label[at - 1] === " ";
      best = Math.max(best, wordStart ? 60 : 30);
    }
  }
  return best;
}

export function search(index: SearchIndex, query: string, limit = 20): string[] {
  const q = normalize(query);
  if (!q) return [];
  const scored: { id: string; s: number; i: number }[] = [];
  index.entries.forEach((e, i) => {
    const s = score(e.labels, q);
    if (s > 0) scored.push({ id: e.id, s, i });
  });
  scored.sort((a, b) => b.s - a.s || a.i - b.i);
  return scored.slice(0, limit).map((x) => x.id);
}
