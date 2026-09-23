import { beforeEach, describe, expect, it } from "vitest";
import { SYSTEMS } from "@/lib/atlas/systems";
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

  it("reveal turns the system on, unhides the part, clears isolation and focuses it", () => {
    const s = useAtlasStore.getState();
    s.hidePart("FJ1");
    s.isolate("FJ2");
    expect(useAtlasStore.getState().visibleSystems.arterial).toBe(false);
    const before = useAtlasStore.getState().focusNonce;

    s.reveal("FJ1", "arterial");

    const st = useAtlasStore.getState();
    expect(st.visibleSystems.arterial).toBe(true);
    expect(st.hiddenParts.FJ1).toBeUndefined();
    expect(st.isolatedPartId).toBeNull();
    expect(st.selectedPartId).toBe("FJ1");
    expect(st.focusPartId).toBe("FJ1");
    expect(st.focusNonce).toBe(before + 1);
    expect(isPartVisible(st, "FJ1", "arterial")).toBe(true);
  });

  it("reveal leaves other hidden parts hidden and builds a new hiddenParts object", () => {
    const s = useAtlasStore.getState();
    s.hidePart("FJ1");
    s.hidePart("FJ7");
    const beforeHidden = useAtlasStore.getState().hiddenParts;

    s.reveal("FJ1", "venous");

    const st = useAtlasStore.getState();
    expect(st.hiddenParts.FJ7).toBe(true);
    expect(st.hiddenParts.FJ1).toBeUndefined();
    expect(st.hiddenParts).not.toBe(beforeHidden); // immutable update
    expect(beforeHidden.FJ1).toBe(true); // previous object untouched
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
    const base = {
      visibleSystems: useAtlasStore.getState().visibleSystems,
      hiddenParts: {},
      isolatedPartId: null,
      restrictTo: null,
    };
    expect(isPartVisible(base, "FJ1", "skeletal")).toBe(true);
    expect(isPartVisible(base, "FJ1", "arterial")).toBe(false);
    expect(isPartVisible({ ...base, hiddenParts: { FJ1: true } }, "FJ1", "skeletal")).toBe(false);
    expect(isPartVisible({ ...base, isolatedPartId: "FJ2" }, "FJ1", "skeletal")).toBe(false);
    expect(isPartVisible({ ...base, isolatedPartId: "FJ2" }, "FJ2", "arterial")).toBe(true); // isolated part shows even if its system is off
  });

  it("restrictTo overrides systems, hidden and isolation", () => {
    const s = useAtlasStore.getState();
    s.hidePart("FJ1");
    s.isolate("FJ9");
    s.setSystemVisible("skeletal", false);
    s.setRestrict(["FJ1", "FJ2"]);
    const st = useAtlasStore.getState();
    expect(isPartVisible(st, "FJ1", "skeletal")).toBe(true);
    expect(isPartVisible(st, "FJ9", "skeletal")).toBe(false);
    expect(isPartVisible(st, "FJ3", "muscular")).toBe(false);
    s.setRestrict(null);
    expect(isPartVisible(useAtlasStore.getState(), "FJ9", "skeletal")).toBe(true); // isolation again
  });

  it("flyTo moves camera without selecting; highlights and clearQuiz", () => {
    const s = useAtlasStore.getState();
    const n = useAtlasStore.getState().focusNonce;
    s.select("FJ5");
    s.flyTo("FJ7");
    let st = useAtlasStore.getState();
    expect(st.focusPartId).toBe("FJ7");
    expect(st.focusNonce).toBe(n + 1);
    expect(st.selectedPartId).toBe("FJ5");
    s.setHighlights({ FJ7: "target", FJ8: "wrong" });
    expect(useAtlasStore.getState().highlights.FJ8).toBe("wrong");
    s.setRestrict(["FJ7"]);
    s.clearQuiz();
    st = useAtlasStore.getState();
    expect(st.restrictTo).toBeNull();
    expect(st.highlights).toEqual({});
    expect(st.selectedPartId).toBeNull();
    // иначе эффект фокуса в CameraRig при следующем монтировании увёл бы
    // камеру к последней цели викторины
    expect(st.focusPartId).toBeNull();
  });

  it("clearQuiz drops the pending focus target", () => {
    const s = useAtlasStore.getState();
    s.flyTo("FJ7");
    const nonce = useAtlasStore.getState().focusNonce;
    expect(useAtlasStore.getState().focusPartId).toBe("FJ7");
    s.clearQuiz();
    const st = useAtlasStore.getState();
    expect(st.focusPartId).toBeNull();
    expect(st.focusNonce).toBe(nonce); // nonce не сбрасывается, гасится только цель
  });

  it("showOnlySystems leaves exactly the listed systems on", () => {
    const s = useAtlasStore.getState();
    expect(useAtlasStore.getState().visibleSystems.muscular).toBe(true);

    s.showOnlySystems(["skeletal", "arterial"]);

    const v = useAtlasStore.getState().visibleSystems;
    expect(v.skeletal).toBe(true);
    expect(v.arterial).toBe(true);
    expect(v.muscular).toBe(false);
    expect(v.connective).toBe(false);
    expect(v.venous).toBe(false);
    // все системы остаются в объекте, панель слоёв рисует их по SYSTEMS
    expect(Object.keys(v).length).toBe(SYSTEMS.length);
    expect(Object.values(v).filter(Boolean).length).toBe(2);
  });

  it("reframe bumps resetNonce and keeps the quiz scene", () => {
    const s = useAtlasStore.getState();
    s.setRestrict(["FJ1", "FJ2"]);
    s.setHighlights({ FJ1: "target" });
    s.select("FJ1");
    const nonce = useAtlasStore.getState().resetNonce;
    s.reframe();
    const st = useAtlasStore.getState();
    expect(st.resetNonce).toBe(nonce + 1);
    expect(st.restrictTo).toEqual({ FJ1: true, FJ2: true });
    expect(st.highlights).toEqual({ FJ1: "target" });
    expect(st.selectedPartId).toBe("FJ1");
  });

  it("reset clears quiz state", () => {
    const s = useAtlasStore.getState();
    s.setRestrict(["FJ1"]);
    s.setHighlights({ FJ1: "correct" });
    s.reset();
    expect(useAtlasStore.getState().restrictTo).toBeNull();
    expect(useAtlasStore.getState().highlights).toEqual({});
  });
});
