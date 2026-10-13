/** Подпись над доком: что сейчас на сцене. Пороги — как в human-atlas. */
export function captionFor(explode: number, isolatedName: string | null): string {
  if (isolatedName) return isolatedName;
  if (explode > 0.95) return "Инвентарь";
  if (explode > 0.05) return "Разнесённые структуры";
  return "Взрослый мужчина";
}
