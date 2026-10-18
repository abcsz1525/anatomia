import { Suspense } from "react";
import { BoneExplorer } from "@/components/osteology/BoneExplorer";

export const metadata = { title: "Строение костей — Анатомия" };
export default function OsteologyPage() {
  return <Suspense fallback={<p className="p-6">Загрузка…</p>}><BoneExplorer/></Suspense>;
}
