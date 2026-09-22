import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="flex h-12 items-center gap-6 border-b bg-white px-4 text-sm">
      <Link href="/atlas" className="font-semibold">Анатомия</Link>
      <nav className="flex gap-4 text-neutral-600">
        <Link href="/atlas" className="hover:text-neutral-900">Атлас</Link>
        <Link href="/about" className="hover:text-neutral-900">Об источниках</Link>
      </nav>
    </header>
  );
}
