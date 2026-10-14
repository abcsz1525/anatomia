import { safeNext } from "@/lib/auth/session";
import { LoginForm } from "./LoginForm";

export const metadata = { title: "Вход — Анатомия", robots: { index: false, follow: false } };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string | string[] }> }) {
  const { next } = await searchParams;
  return (
    <main className="flex min-h-dvh w-full flex-col items-center justify-center gap-8 bg-studio-bg px-4">
      <div className="text-center">
        <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-studio-muted">
          Интерактивная анатомия
        </div>
        <h1 className="mt-2 text-[32px] font-semibold leading-none tracking-[-1.3px] text-studio-fg">Анатомия</h1>
        <p className="mt-3 text-[13px] text-studio-muted">Доступ по паролю</p>
      </div>
      <LoginForm next={safeNext(next)} />
    </main>
  );
}
