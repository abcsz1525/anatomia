import { QuizScreen } from "@/components/quiz/QuizScreen";

export const metadata = { title: "Тесты — Анатомия" };

export default function QuizPage() {
  return (
    <main className="h-[calc(100dvh-3rem)]">
      <QuizScreen />
    </main>
  );
}
