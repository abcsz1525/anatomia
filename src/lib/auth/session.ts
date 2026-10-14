/** Кука входа на сайт: подпись пароля, а не сам пароль. */
export const AUTH_COOKIE = "anatomia_auth";
export const AUTH_MAX_AGE = 60 * 60 * 24 * 30; // 30 дней

/**
 * HMAC-SHA256 от фиксированной строки на ключе-пароле. Подделать без пароля
 * нельзя, а смена пароля на Railway разлогинивает всех. Web Crypto — чтобы
 * одна и та же функция работала и в proxy, и в серверном действии.
 */
export async function sessionToken(password: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", enc.encode(password), { name: "HMAC", hash: "SHA-256" }, false, [
    "sign",
  ]);
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode("anatomia-session-v1"));
  return Array.from(new Uint8Array(sig), (b) => b.toString(16).padStart(2, "0")).join("");
}

/** Куда вернуть после входа: только путь этого сайта, иначе атлас (без открытого редиректа). */
export function safeNext(next: unknown): string {
  if (typeof next !== "string" || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) {
    return "/atlas";
  }
  return next;
}
