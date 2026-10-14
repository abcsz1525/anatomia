import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AUTH_COOKIE, sessionToken } from "@/lib/auth/session";
import { proxy } from "./proxy";

const req = (path: string, cookie?: string) =>
  new NextRequest(`https://anatomia.test${path}`, cookie ? { headers: { cookie: `${AUTH_COOKIE}=${cookie}` } } : {});

describe("proxy", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("без SITE_PASSWORD пропускает всех", async () => {
    vi.stubEnv("SITE_PASSWORD", "");
    const res = await proxy(req("/atlas"));
    expect(res.headers.get("location")).toBeNull();
  });

  it("без куки уводит на вход и помнит, куда шли", async () => {
    vi.stubEnv("SITE_PASSWORD", "секрет");
    const res = await proxy(req("/atlas?focus=FJ1313"));
    const to = new URL(res.headers.get("location")!);
    expect(to.pathname).toBe("/login");
    expect(to.searchParams.get("next")).toBe("/atlas?focus=FJ1313");
  });

  it("закрывает и файлы модели", async () => {
    vi.stubEnv("SITE_PASSWORD", "секрет");
    const res = await proxy(req("/models/v1/atlas.json"));
    expect(new URL(res.headers.get("location")!).pathname).toBe("/login");
  });

  it("с верной кукой пускает, с чужой — нет", async () => {
    vi.stubEnv("SITE_PASSWORD", "секрет");
    expect((await proxy(req("/quiz", await sessionToken("секрет")))).headers.get("location")).toBeNull();
    expect((await proxy(req("/quiz", await sessionToken("старый")))).headers.get("location")).not.toBeNull();
  });
});
