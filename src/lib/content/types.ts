export type Side = "left" | "right" | "";
export interface Topic { id: string; ru: string; la?: string; parent?: string; }
export interface StructureEntry { la: string; ru: string; topic: string; side: Side; aliases: string[]; }
export interface ContentBundle { structures: Record<string, StructureEntry>; topics: Topic[]; }
