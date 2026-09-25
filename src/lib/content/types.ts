import type { StressMap } from "@/lib/latin";

export type Side = "left" | "right" | "";
export interface Topic { id: string; ru: string; la?: string; parent?: string; }
export interface StructureEntry { la: string; ru: string; topic: string; side: Side; aliases: string[]; }
/**
 * Словарь ударений — такая же часть контента, как имена: он лежит отдельным
 * файлом и грузится вместе с ними. Пустой словарь означает «не загрузился» —
 * транскрипция тогда просто не показывается (см. `displayNames`).
 */
export interface ContentBundle { structures: Record<string, StructureEntry>; topics: Topic[]; stress: StressMap; }
