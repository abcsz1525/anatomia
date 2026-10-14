"use server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AUTH_COOKIE, AUTH_MAX_AGE, safeNext, sessionToken } from "@/lib/auth/session";

/** Возвращает текст ошибки; при верном пароле ставит куку и уводит туда, куда шли. */
export async function login(_prev: string | undefined, formData: FormData): Promise<string | undefined> {
  const password = process.env.SITE_PASSWORD;
  if (password) {
    if (formData.get("password") !== password) return "Неверный пароль";
    (await cookies()).set(AUTH_COOKIE, await sessionToken(password), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: AUTH_MAX_AGE,
      path: "/",
    });
  }
  redirect(safeNext(formData.get("next")));
}
