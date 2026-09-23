import { describe, expect, it } from "vitest";
import { daysLabel, plural, sessionsLabel } from "./format";

describe("plural", () => {
  it("picks the singular form for 1, 21, 101", () => {
    for (const n of [1, 21, 101]) expect(plural(n, "one", "few", "many")).toBe("one");
  });

  it("picks the few form for 2–4, 22–24", () => {
    for (const n of [2, 3, 4, 22, 24]) expect(plural(n, "one", "few", "many")).toBe("few");
  });

  it("picks the many form for 0, 5–20 and 11–14 in every hundred", () => {
    for (const n of [0, 5, 10, 11, 12, 13, 14, 20, 111, 112]) {
      expect(plural(n, "one", "few", "many")).toBe("many");
    }
  });
});

describe("sessionsLabel", () => {
  it("matches the Russian forms of «сессия»", () => {
    expect(sessionsLabel(0)).toBe("0 сессий");
    expect(sessionsLabel(1)).toBe("1 сессия");
    expect(sessionsLabel(3)).toBe("3 сессии");
    expect(sessionsLabel(5)).toBe("5 сессий");
    expect(sessionsLabel(11)).toBe("11 сессий");
  });
});

describe("daysLabel", () => {
  it("matches the Russian forms of «день»", () => {
    expect(daysLabel(0)).toBe("0 дней");
    expect(daysLabel(1)).toBe("1 день");
    expect(daysLabel(2)).toBe("2 дня");
    expect(daysLabel(5)).toBe("5 дней");
  });
});
