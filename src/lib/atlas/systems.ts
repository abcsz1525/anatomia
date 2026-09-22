import type { SystemId } from "./types";

export interface SystemInfo {
  id: SystemId;
  ru: string;
  color: string;
  defaultVisible: boolean;
  order: number;
}

export const SYSTEMS: SystemInfo[] = [
  { id: "skeletal", ru: "Кости", color: "#e8e0cf", defaultVisible: true, order: 1 },
  { id: "connective", ru: "Связки и хрящи", color: "#cfd8dc", defaultVisible: true, order: 2 },
  { id: "muscular", ru: "Мышцы", color: "#b5453f", defaultVisible: true, order: 3 },
  { id: "arterial", ru: "Артерии", color: "#d33a2c", defaultVisible: false, order: 4 },
  { id: "venous", ru: "Вены", color: "#3352b5", defaultVisible: false, order: 5 },
  { id: "cardiac", ru: "Сердце", color: "#a8323c", defaultVisible: false, order: 6 },
  { id: "nervous", ru: "Нервная система", color: "#e4c33c", defaultVisible: false, order: 7 },
  { id: "sensory", ru: "Органы чувств", color: "#8fb7a8", defaultVisible: false, order: 8 },
  { id: "respiratory", ru: "Дыхательная система", color: "#e9a2b8", defaultVisible: false, order: 9 },
  { id: "digestive", ru: "Пищеварительная система", color: "#d9a066", defaultVisible: false, order: 10 },
  { id: "urinary", ru: "Мочевая система", color: "#c9b45c", defaultVisible: false, order: 11 },
  { id: "reproductive", ru: "Половая система", color: "#b98fc7", defaultVisible: false, order: 12 },
  { id: "endocrine", ru: "Эндокринные железы", color: "#e7b27a", defaultVisible: false, order: 13 },
  { id: "lymphatic", ru: "Лимфатическая система", color: "#8bc48a", defaultVisible: false, order: 14 },
  { id: "integumentary", ru: "Кожа", color: "#e6c3a5", defaultVisible: false, order: 15 },
];

export const SYSTEM_BY_ID = Object.fromEntries(
  SYSTEMS.map((s) => [s.id, s]),
) as Record<SystemId, SystemInfo>;
