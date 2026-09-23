import { Suspense } from "react";
import { AtlasScreen } from "@/components/atlas/AtlasScreen";

export const metadata = { title: "3D-атлас — Анатомия" };

export default function AtlasPage() {
  return (
    <main className="h-[calc(100dvh-3rem)]">
      {/* AtlasScreen читает ?focus= через useSearchParams: без Suspense
          Next.js не может пререндерить страницу статически */}
      <Suspense fallback={null}>
        <AtlasScreen />
      </Suspense>
    </main>
  );
}
