// проверка здоровья Railway: открыта без пароля (см. matcher в src/proxy.ts)
export function GET() {
  return new Response("ok");
}
