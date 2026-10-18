import type { BoneLandmark, ManualLandmarks, Point3 } from "./types";

export const manualKey = (boneId: string, hash: string) => `anatomia.landmarks.v1.${hash}.${boneId}`;
const point = (v: unknown): v is Point3 => Array.isArray(v) && v.length === 3 && v.every(n => typeof n === "number" && Number.isFinite(n) && Math.abs(n) <= 10);

/** Import is deliberately tied to the exact geometry; no coordinate transfer. */
export function parseManual(value: unknown, boneId: string, sourceHash: string): ManualLandmarks {
  if (!value || typeof value !== "object") throw new Error("Некорректный файл меток");
  const data = value as Partial<ManualLandmarks>;
  if (data.version !== 1 || data.boneId !== boneId || data.sourceHash !== sourceHash) {
    throw new Error("Файл относится к другой кости или версии модели");
  }
  if (!Array.isArray(data.landmarks) || data.landmarks.length > 1000) throw new Error("Некорректный список меток");
  const ids = new Set<string>();
  const landmarks: BoneLandmark[] = data.landmarks.map(l => {
    if (!l || typeof l.id !== "string" || !l.id.startsWith("manual-") || ids.has(l.id)
      || typeof l.ru !== "string" || !l.ru.trim() || l.ru.length > 250
      || typeof l.la !== "string" || !l.la.trim() || l.la.length > 250
      || l.source !== "manual" || !point(l.position) || !point(l.labelPosition)) {
      throw new Error("Некорректная ручная метка");
    }
    ids.add(l.id);
    return { id:l.id, ru:l.ru, la:l.la, en:"", source:"manual", position:l.position, labelPosition:l.labelPosition, pointer:[] };
  });
  return { version:1, boneId, sourceHash, landmarks };
}

export function makeManual(ru: string, la: string, position: Point3): BoneLandmark {
  return { id: `manual-${crypto.randomUUID()}`, ru:ru.trim(), la:la.trim(), en:"", source:"manual", position,
    labelPosition:[position[0]+0.15,position[1]+0.12,position[2]], pointer:[] };
}
