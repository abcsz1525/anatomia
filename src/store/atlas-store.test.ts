import { beforeEach, describe, expect, it } from "vitest";
import { isPartVisible, useAtlasStore } from "./atlas-store";

beforeEach(() => useAtlasStore.getState().reset());

describe("atlas store", () => {
  it("starts with 1st-year systems visible", () => {
    const v = useAtlasStore.getState().visibleSystems;
    expect(v.skeletal).toBe(true);
    expect(v.muscular).toBe(true);
    expect(v.arterial).toBe(false);
  });

  it("toggles and sets system visibility", () => {
    const s = useAtlasStore.getState();
    s.toggleSystem("arterial");
    expect(useAtlasStore.getState().visibleSystems.arterial).toBe(true);
    s.setSystemVisible("arterial", false);
    expect(useAtlasStore.getState().visibleSystems.arterial).toBe(false);
  });

  it("select, hide, isolate, focus", () => {
    const s = useAtlasStore.getState();
    s.select("FJ1");
    expect(useAtlasStore.getState().selectedPartId).toBe("FJ1");
    s.hidePart("FJ1");
    expect(useAtlasStore.getState().hiddenParts.FJ1).toBe(true);
    expect(useAtlasStore.getState().selectedPartId).toBeNull(); // hiding deselects
    s.isolate("FJ2");
    expect(useAtlasStore.getState().isolatedPartId).toBe("FJ2");
    const before = useAtlasStore.getState().focusNonce;
    s.focus("FJ3");
    const after = useAtlasStore.getState();
    expect(after.focusPartId).toBe("FJ3");
    expect(after.selectedPartId).toBe("FJ3");
    expect(after.focusNonce).toBe(before + 1);
  });

  it("reset restores defaults", () => {
    const s = useAtlasStore.getState();
    s.toggleSystem("venous");
    s.hidePart("FJ9");
    s.isolate("FJ9");
    const nonce = useAtlasStore.getState().resetNonce;
    s.reset();
    const st = useAtlasStore.getState();
    expect(st.resetNonce).toBe(nonce + 1);
    expect(st.visibleSystems.venous).toBe(false);
    expect(st.hiddenParts).toEqual({});
    expect(st.isolatedPartId).toBeNull();
    expect(st.selectedPartId).toBeNull();
  });

  it("isPartVisible combines system, hidden and isolation", () => {
    const base = { visibleSystems: useAtlasStore.getState().visibleSystems, hiddenParts: {}, isolatedPartId: null };
    expect(isPartVisible(base, "FJ1", "skeletal")).toBe(true);
    expect(isPartVisible(base, "FJ1", "arterial")).toBe(false);
    expect(isPartVisible({ ...base, hiddenParts: { FJ1: true } }, "FJ1", "skeletal")).toBe(false);
    expect(isPartVisible({ ...base, isolatedPartId: "FJ2" }, "FJ1", "skeletal")).toBe(false);
    expect(isPartVisible({ ...base, isolatedPartId: "FJ2" }, "FJ2", "arterial")).toBe(true); // isolated part shows even if its system is off
  });
});
