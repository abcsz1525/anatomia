import { describe, expect, it } from "vitest";
import { safeNext, sessionToken } from "./session";

describe("sessionToken", () => {
  it("стабилен для одного пароля и различается для разных", async () => {
    const a = await sessionToken("секрет");
    expect(a).toMatch(/^[0-9a-f]{64}$/);
    expect(await sessionToken("секрет")).toBe(a);
    expect(await sessionToken("другой")).not.toBe(a);
  });

  it("не содержит сам пароль", async () => {
    expect(await sessionToken("parol123")).not.toContain("parol123");
  });
});

describe("safeNext", () => {
  it("пропускает пути сайта вместе с параметрами", () => {
    expect(safeNext("/quiz")).toBe("/quiz");
    expect(safeNext("/atlas?focus=FJ1313")).toBe("/atlas?focus=FJ1313");
  });

  it("не уводит на чужой сайт", () => {
    expect(safeNext("https://evil.example")).toBe("/atlas");
    expect(safeNext("//evil.example")).toBe("/atlas");
    expect(safeNext("/\\evil.example")).toBe("/atlas");
    expect(safeNext(null)).toBe("/atlas");
  });
});
