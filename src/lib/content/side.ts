import type { Side } from "./types";

const SIDE_RE = /\b(left|right)\b/i;

export function detectSide(en: string): Side {
  const m = SIDE_RE.exec(en);
  if (!m) return "";
  return m[1].toLowerCase() as Side;
}

// BodyParts3D mislabels this pair: FJ1469 ("Left flexor pollicis brevis")
// is actually the mesh on the RIGHT (x = −0.279 in the model), and its
// mirror FJ1469M ("Right flexor pollicis brevis") is the left one. Override
// the manifest text rather than trust it for these two ids.
//
// The LAD's "First/Second/Third right anterior branch … of left coronary
// artery" meshes: "right" there names the right ventricle they supply, and
// detectSide takes the first match, so pin them to the left coronary side.
export const SIDE_OVERRIDES: Record<string, Side> = {
  FJ1469: "right",
  FJ1469M: "left",
  FJ2632: "left",
  FJ2641: "left",
  FJ2645: "left",
  FJ2646: "left",
  FJ2647: "left",
  // "Posterior vein of left ventricle": "left" names the chamber, not the
  // body side — the vein is unpaired, so no side.
  FJ2701: "",
  FJ2702: "",
  FJ2706: "",
  FJ2707: "",
  FJ2708: "",
  FJ2709: "",
  FJ2710: "",
  FJ2711: "",
  FJ2712: "",
  FJ2713: "",
  // "Right fibular vein" FJ2190 is actually the perforating veins of the
  // LEFT thigh (x > 0 in the model).
  FJ2190: "left",
};

export function sideFor(id: string, en: string): Side {
  return SIDE_OVERRIDES[id] ?? detectSide(en);
}

export function stripSide(en: string): string {
  const s = en.replace(SIDE_RE, "").replace(/\s{2,}/g, " ").trim();
  return s.charAt(0).toUpperCase() + s.slice(1);
}
