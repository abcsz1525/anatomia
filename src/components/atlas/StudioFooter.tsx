import Link from "next/link";
import { ArrowUpRightIcon } from "@/components/ui/icons";

/** Подсказки по управлению и ссылка на источник (атрибуция CC BY 4.0 в интерфейсе). */
export function StudioFooter({ panning }: { panning: boolean }) {
  return (
    <footer className="pointer-events-none absolute inset-x-4 bottom-2 z-10 flex items-center justify-center pb-[env(safe-area-inset-bottom)] text-[10px] text-studio-muted md:inset-x-8 md:bottom-5 md:justify-between md:text-[11px]">
      <span className="hidden md:inline">
        {panning ? "Тянуть, чтобы сдвинуть" : "Тянуть, чтобы вращать"}
        <b className="mx-2 font-normal text-neutral-400">·</b>
        Колёсико или щипок, чтобы приблизить
        <b className="mx-2 font-normal text-neutral-400">·</b>
        Нажать, чтобы узнать
      </span>
      <Link
        href="/about"
        data-testid="source-link"
        className="pointer-events-auto flex min-h-11 items-center md:min-h-6 gap-1 hover:text-studio-primary"
      >
        Источник и лицензия <ArrowUpRightIcon size={12} />
      </Link>
    </footer>
  );
}
