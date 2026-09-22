import { create } from "zustand";
import { SYSTEMS } from "@/lib/atlas/systems";
import type { SystemId } from "@/lib/atlas/types";

export interface AtlasState {
  visibleSystems: Record<SystemId, boolean>;
  hiddenParts: Record<string, true>;
  selectedPartId: string | null;
  isolatedPartId: string | null;
  focusPartId: string | null;
  focusNonce: number;
  resetNonce: number;
  setSystemVisible(id: SystemId, visible: boolean): void;
  toggleSystem(id: SystemId): void;
  select(id: string | null): void;
  hidePart(id: string): void;
  isolate(id: string | null): void;
  focus(id: string): void;
  /** Search hit: make the part actually visible (system on, unhidden, isolation off), then focus it. */
  reveal(id: string, system: SystemId): void;
  reset(): void;
}

export function defaultVisibleSystems(): Record<SystemId, boolean> {
  return Object.fromEntries(SYSTEMS.map((s) => [s.id, s.defaultVisible])) as Record<SystemId, boolean>;
}

export function isPartVisible(
  state: Pick<AtlasState, "visibleSystems" | "hiddenParts" | "isolatedPartId">,
  partId: string,
  system: SystemId,
): boolean {
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
  resetNonce: 0,
});


export const useAtlasStore = create<AtlasState>((set) => ({
  ...initial(),
  setSystemVisible: (id, visible) =>
    set((s) => ({ visibleSystems: { ...s.visibleSystems, [id]: visible } })),
  toggleSystem: (id) =>
    set((s) => ({ visibleSystems: { ...s.visibleSystems, [id]: !s.visibleSystems[id] } })),
  select: (id) => set({ selectedPartId: id }),
  hidePart: (id) =>
    set((s) => ({
      hiddenParts: { ...s.hiddenParts, [id]: true },
      selectedPartId: s.selectedPartId === id ? null : s.selectedPartId,
    })),
  isolate: (id) => set({ isolatedPartId: id }),
  focus: (id) => set((s) => ({ focusPartId: id, selectedPartId: id, focusNonce: s.focusNonce + 1 })),
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
      };
    }),
  reset: () => set((s) => ({ ...initial(), resetNonce: s.resetNonce + 1 })),
}));
