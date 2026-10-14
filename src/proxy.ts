import { NextResponse, type NextRequest } from "next/server";
import { AUTH_COOKIE, sessionToken } from "@/lib/auth/session";

/**
 * Весь сайт — только по паролю (SITE_PASSWORD на Railway), включая файлы
 * модели и словари из public/. Без переменной сайт открыт: так работают
 * локальная разработка и e2e.
 */
export async function proxy(request: NextRequest) {
  const password = process.env.SITE_PASSWORD;
  if (!password) return NextResponse.next();
  const token = request.cookies.get(AUTH_COOKIE)?.value;
  if (token && token === (await sessionToken(password))) return NextResponse.next();

  const login = new URL("/login", request.url);
  login.searchParams.set("next", request.nextUrl.pathname + request.nextUrl.search);
  return NextResponse.redirect(login);
}

export const config = {
  // страница входа, проверка здоровья Railway и то, без чего страница входа не загрузится
  matcher: ["/((?!login|healthz|_next/static|_next/image|favicon\\.ico).*)"],
};
