import { describe, expect, it, vi } from "vitest";
import { getCached, resetCache } from "./batch-cache";

// фейковые «батчи»: кэшу нужен только dispose(), поэтому тест обходится без three
interface FakeBatch {
  id: string;
  dispose: () => void;
}

const fake = (id: string): FakeBatch => ({ id, dispose: vi.fn() });

describe("getCached", () => {
  it("builds once per key", () => {
    const cache = new Map<object, FakeBatch[]>();
    const key = {};
    const build = vi.fn(() => [fake("a")]);
    getCached(cache, key, build);
    getCached(cache, key, build);
    expect(build).toHaveBeenCalledTimes(1);
  });

  it("returns the same array on the second call", () => {
    const cache = new Map<object, FakeBatch[]>();
    const key = {};
    const first = getCached(cache, key, () => [fake("a"), fake("b")]);
    const second = getCached(cache, key, () => [fake("c")]);
    expect(second).toBe(first);
    expect(second.map((b) => b.id)).toEqual(["a", "b"]);
  });

  it("stores nothing when build throws, and a later build still succeeds", () => {
    const cache = new Map<object, FakeBatch[]>();
    const key = {};
    expect(() =>
      getCached(cache, key, () => {
        throw new Error("atlas buffers already released");
      }),
    ).toThrow("atlas buffers already released");
    expect(cache.size).toBe(0);
    // неудачная сборка не должна отравить ключ: следующая попытка обязана сработать
    expect(getCached(cache, key, () => [fake("a")]).map((b) => b.id)).toEqual(["a"]);
  });

  it("builds separately for different keys", () => {
    const cache = new Map<object, FakeBatch[]>();
    const first = getCached(cache, {}, () => [fake("a")]);
    const second = getCached(cache, {}, () => [fake("b")]);
    expect(second).not.toBe(first);
    expect(cache.size).toBe(2);
  });
});

describe("resetCache", () => {
  it("disposes every entry and clears the cache", () => {
    const cache = new Map<object, FakeBatch[]>();
    const built = [
      ...getCached(cache, {}, () => [fake("a"), fake("b")]),
      ...getCached(cache, {}, () => [fake("c")]),
    ];
    resetCache(cache);
    for (const batch of built) expect(batch.dispose).toHaveBeenCalledTimes(1);
    expect(cache.size).toBe(0);
  });

  it("rebuilds after a reset", () => {
    const cache = new Map<object, FakeBatch[]>();
    const key = {};
    const first = getCached(cache, key, () => [fake("a")]);
    resetCache(cache);
    const build = vi.fn(() => [fake("b")]);
    const second = getCached(cache, key, build);
    expect(build).toHaveBeenCalledTimes(1);
    expect(second).not.toBe(first);
  });
});
