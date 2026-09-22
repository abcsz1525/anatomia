import { AtlasScreen } from "@/components/atlas/AtlasScreen";

export const metadata = { title: "3D-атлас — Анатомия" };

export default function AtlasPage() {
  return (
    <main className="h-[calc(100dvh-3rem)]">
      <AtlasScreen />
    </main>
  );
}
