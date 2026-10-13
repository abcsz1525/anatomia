import { Suspense } from "react";
import { AtlasScreen } from "@/components/atlas/AtlasScreen";

export const metadata = { title: "3D-атлас — Анатомия" };

export default function AtlasPage() {
  // студия занимает весь экран: шапки сайта на этой странице нет
  return (
    <main className="relative h-dvh min-h-[340px] w-full overflow-hidden bg-studio-bg">
      {/* AtlasScreen читает ?focus= через useSearchParams: без Suspense
          Next.js не может пререндерить страницу статически */}
      <Suspense fallback={null}>
        <AtlasScreen />
      </Suspense>
    </main>
  );
}
