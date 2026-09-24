import { describe, expect, it, vi } from "vitest";
import { subscribeMatchMedia, type MediaQueryListLike } from "./use-media-query";

// jsdom в проекте нет (vitest.config.ts: environment "node"), поэтому тестируем
// чистую часть хука — подписку — на заглушке MediaQueryList.
function fakeMql(matches = false) {
  const listeners = new Set<() => void>();
  const mql: MediaQueryListLike & { emit(next: boolean): void; count(): number } = {
    matches,
    addEventListener: vi.fn((_type: "change", listener: () => void) => {
      listeners.add(listener);
    }),
    removeEventListener: vi.fn((_type: "change", listener: () => void) => {
      listeners.delete(listener);
    }),
    emit(next: boolean) {
      mql.matches = next;
      for (const listener of listeners) listener();
    },
    count: () => listeners.size,
  };
  return mql;
}

describe("subscribeMatchMedia", () => {
  it("notifies on change", () => {
    const mql = fakeMql(false);
    const onChange = vi.fn();
    subscribeMatchMedia(mql, onChange);
    mql.emit(true);
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it("unsubscribes the same listener", () => {
    const mql = fakeMql(false);
    const onChange = vi.fn();
    const unsubscribe = subscribeMatchMedia(mql, onChange);
    expect(mql.count()).toBe(1);
    unsubscribe();
    expect(mql.count()).toBe(0);
    mql.emit(true);
    expect(onChange).not.toHaveBeenCalled();
  });
});
