import { create } from "zustand";
import { SYSTEMS } from "@/lib/atlas/systems";
import type { SystemId } from "@/lib/atlas/types";

export type HighlightKind = "target" | "correct" | "wrong";
export type AtlasView = "three-quarter" | "front" | "side" | "back";
export interface ExplodeLayoutSize { width: number; height: number }

export interface AtlasState {
  visibleSystems: Record<SystemId, boolean>;
  hiddenParts: Record<string, true>;
  selectedPartId: string | null;
  isolatedPartId: string | null;
  focusPartId: string | null;
  focusNonce: number;
  /**
   * Id, попадание в которые считается «цель видна» при подборе ракурса:
   * у одной структуры бывает несколько мешей (парные/разрезанные части).
   * null — принимать только сам focusPartId.
   */
  focusAccept: string[] | null;
  resetNonce: number;
  /** Викторина: если не null — видимы только эти id, системы/скрытие/изоляция игнорируются. */
  restrictTo: Record<string, true> | null;
  highlights: Record<string, HighlightKind>;
  /** Разнесение модели 0..1 — целевое значение; анимированное живёт в explode-amount.ts. */
  explode: number;
  view: AtlasView;
  /** Растёт при каждом выборе ракурса, даже того же: камера возвращается в кадр. */
  viewNonce: number;
  autoRotate: boolean;
  /** Размер сетки инвентаря; пишет BodyMeshes при пересчёте раскладки, читает CameraRig. */
  explodeLayoutSize: ExplodeLayoutSize | null;
  /** Ограничивает 0..1; выше 0.8 ракурс становится «спереди»; любое изменение гасит автоповорот. */
  setExplode(value: number): void;
  setView(view: AtlasView): void;
  toggleAutoRotate(): void;
  /** Все системы выключить; выделение и изоляция снимаются. */
  hideAllSystems(): void;
  setExplodeLayoutSize(size: ExplodeLayoutSize): void;
  setSystemVisible(id: SystemId, visible: boolean): void;
  toggleSystem(id: SystemId): void;
  /** Оставить включёнными ровно эти системы, остальные выключить. */
  showOnlySystems(ids: SystemId[]): void;
  select(id: string | null): void;
  hidePart(id: string): void;
  isolate(id: string | null): void;
  focus(id: string): void;
  /** Search hit: make the part actually visible (system on, unhidden, isolation off), then focus it. */
  reveal(id: string, system: SystemId): void;
  /**
   * Камера к структуре БЕЗ выделения (викторина не должна подсказывать ответ карточкой).
   * `accept` — все id той же структуры, любой из них считается видимой целью.
   */
  flyTo(id: string, accept?: string[]): void;
  /** Перекадрировать камеру на всё тело, не трогая ограничение/подсветки/выбор. */
  reframe(): void;
  setRestrict(ids: string[] | null): void;
  setHighlights(map: Record<string, HighlightKind>): void;
  clearQuiz(): void;
  reset(): void;
}

export function defaultVisibleSystems(): Record<SystemId, boolean> {
  return Object.fromEntries(SYSTEMS.map((s) => [s.id, s.defaultVisible])) as Record<SystemId, boolean>;
}

export function isPartVisible(
  state: Pick<AtlasState, "visibleSystems" | "hiddenParts" | "isolatedPartId" | "restrictTo">,
  partId: string,
  system: SystemId,
): boolean {
  if (state.restrictTo) return !!state.restrictTo[partId];
  if (state.isolatedPartId) return state.isolatedPartId === partId;
  if (state.hiddenParts[partId]) return false;
  return state.visibleSystems[system];
}

const initial = () => ({
  visibleSystems: defaultVisibleSystems(),
  hiddenParts: {} as Record<string, true>,
  selectedPartId: null,
  isolatedPartId: null,
  focusPartId: null,
  focusNonce: 0,
  focusAccept: null as string[] | null,
  resetNonce: 0,
  restrictTo: null as Record<string, true> | null,
  highlights: {} as Record<string, HighlightKind>,
  explode: 0,
  view: "three-quarter" as AtlasView,
  viewNonce: 0,
  autoRotate: false,
  explodeLayoutSize: null as ExplodeLayoutSize | null,
});


export const useAtlasStore = create<AtlasState>((set) => ({
  ...initial(),
  setSystemVisible: (id, visible) =>
    set((s) => ({
      visibleSystems: { ...s.visibleSystems, [id]: visible },
      selectedPartId: null,
      isolatedPartId: null,
    })),
  toggleSystem: (id) =>
    set((s) => ({
      visibleSystems: { ...s.visibleSystems, [id]: !s.visibleSystems[id] },
      selectedPartId: null,
      isolatedPartId: null,
    })),
  showOnlySystems: (ids) => {
    const on = new Set<SystemId>(ids);
    set({
      visibleSystems: Object.fromEntries(SYSTEMS.map((s) => [s.id, on.has(s.id)])) as Record<
        SystemId,
        boolean
      >,
      selectedPartId: null,
      isolatedPartId: null,
    });
  },
  hideAllSystems: () =>
    set({
      visibleSystems: Object.fromEntries(SYSTEMS.map((s) => [s.id, false])) as Record<SystemId, boolean>,
      selectedPartId: null,
      isolatedPartId: null,
    }),
  select: (id) => set({ selectedPartId: id }),
  hidePart: (id) =>
    set((s) => ({
      hiddenParts: { ...s.hiddenParts, [id]: true },
      selectedPartId: s.selectedPartId === id ? null : s.selectedPartId,
    })),
  // изоляция показывает одну структуру в её месте — разнесённой модели это не нужно
  isolate: (id) => set((s) => ({ isolatedPartId: id, explode: id ? 0 : s.explode })),
  focus: (id) =>
    set((s) => ({
      focusPartId: id,
      selectedPartId: id,
      focusNonce: s.focusNonce + 1,
      focusAccept: [id],
      explode: 0,
    })),
  reveal: (id, system) =>
    set((s) => {
      const hiddenParts = { ...s.hiddenParts };
      delete hiddenParts[id];
      return {
        visibleSystems: { ...s.visibleSystems, [system]: true },
        hiddenParts,
        isolatedPartId: null,
        focusPartId: id,
        selectedPartId: id,
        focusNonce: s.focusNonce + 1,
        focusAccept: [id],
        explode: 0,
      };
    }),
  flyTo: (id, accept) =>
    set((s) => ({
      focusPartId: id,
      focusNonce: s.focusNonce + 1,
      focusAccept: accept ?? [id],
      explode: 0,
    })),
  reframe: () => set((s) => ({ resetNonce: s.resetNonce + 1 })),
  setRestrict: (ids) =>
    set({ restrictTo: ids ? Object.fromEntries(ids.map((i) => [i, true as const])) : null }),
  setHighlights: (map) => set({ highlights: { ...map } }),
  // focusPartId тоже гасим: эффект фокуса в CameraRig срабатывает при монтировании
  // (focusPartId && focusNonce > 0), и без этого атлас после теста улетал бы
  // к последней цели викторины вместо общего кадра
  clearQuiz: () =>
    set({ restrictTo: null, highlights: {}, selectedPartId: null, focusPartId: null, focusAccept: null }),
  setExplode: (value) =>
    set((s) => {
      const explode = Math.min(1, Math.max(0, value));
      return { explode, view: explode > 0.8 ? "front" : s.view, autoRotate: false };
    }),
  setView: (view) => set((s) => ({ view, viewNonce: s.viewNonce + 1, autoRotate: false })),
  toggleAutoRotate: () => set((s) => ({ autoRotate: !s.autoRotate })),
  setExplodeLayoutSize: (size) => set({ explodeLayoutSize: size }),
  // explodeLayoutSize — кэш сцены: после сброса набор видимых деталей может не
  // измениться, и BodyMeshes размер заново не запишет
  reset: () =>
    set((s) => ({ ...initial(), explodeLayoutSize: s.explodeLayoutSize, resetNonce: s.resetNonce + 1 })),
}));
