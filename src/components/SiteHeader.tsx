import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="flex h-12 items-center gap-6 border-b bg-white px-4 text-sm">
      <Link href="/atlas" className="font-semibold">Анатомия</Link>
      {/* на узком экране пять ссылок не помещаются — даём им горизонтальный скролл
          и сокращаем самую длинную подпись */}
      <nav className="flex gap-4 overflow-x-auto whitespace-nowrap text-neutral-600" data-testid="site-nav">
        <Link href="/atlas" className="hover:text-neutral-900">Атлас</Link>
        <Link href="/quiz" className="hover:text-neutral-900">Тесты</Link>
        <Link href="/cards" className="hover:text-neutral-900">Карточки</Link>
        <Link href="/progress" className="hover:text-neutral-900">Прогресс</Link>
        <Link href="/about" className="hover:text-neutral-900">
          <span className="md:hidden">Источники</span>
          <span className="hidden md:inline">Об источниках</span>
        </Link>
      </nav>
    </header>
  );
}
