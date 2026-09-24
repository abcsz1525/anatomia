import { Suspense } from "react";
import { CardsScreen } from "@/components/cards/CardsScreen";

export const metadata = { title: "Карточки — Анатомия" };

export default function CardsPage() {
  return (
    <main className="h-[calc(100dvh-3rem)]">
      {/* CardsScreen читает ?topic= через useSearchParams: без Suspense
          Next.js не может пререндерить страницу статически */}
      <Suspense fallback={null}>
        <CardsScreen />
      </Suspense>
    </main>
  );
}
