import { ProgressScreen } from "@/components/progress/ProgressScreen";

export const metadata = { title: "Прогресс — Анатомия" };

export default function ProgressPage() {
  return (
    <main className="mx-auto w-full max-w-3xl p-6">
      <ProgressScreen />
    </main>
  );
}
