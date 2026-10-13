import type { ReactNode } from "react";
import { SiteHeader } from "@/components/SiteHeader";

/**
 * Страницы со шапкой сайта. Атлас живёт снаружи группы (`src/app/atlas`)
 * и рисует студию на весь экран, поэтому шапка объявлена здесь, а не в
 * корневом layout.
 */
export default function SiteLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <SiteHeader />
      {children}
    </>
  );
}
