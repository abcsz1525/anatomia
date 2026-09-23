import type { Side } from "./types";

const SIDE_RE = /\b(left|right)\b/i;

// Латинское название само несёт сторону (dexter/sinistra и падежные формы):
// «Arteria gastrica sinistra», «Cavitas ventriculi dextri». В таких строках
// сторона — часть анатомического термина, а не признак меша, поэтому бейдж
// «(слева)/(справа)» не нужен: имя уже её называет.
export const LATIN_SIDE = /\b(dext(er|ra|rum|ri)|sinist(er|ra|rum|ri))\b/i;

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
//
// Здесь остались только геометрические правки манифеста и случаи, где
// сторону из en не видно в la: всё, что la называет прямо (dexter/sinistra),
// теперь снимает правило LATIN_SIDE в sideFor.
export const SIDE_OVERRIDES: Record<string, Side> = {
  FJ1469: "right",
  FJ1469M: "left",
  FJ2632: "left",
  FJ2641: "left",
  FJ2645: "left",
  FJ2646: "left",
  FJ2647: "left",
  // "Right fibular vein" FJ2190 is actually the perforating veins of the
  // LEFT thigh (x > 0 in the model).
  FJ2190: "left",
  // The superior colliculus brachia are swapped upstream: FJ1735 ("Brachium
  // of left superior colliculus") is actually the right one, and its mirror
  // FJ1736 ("Brachium of right superior colliculus") is the left one
  // (x > 0 is left in this model).
  FJ1735: "right",
  FJ1736: "left",
  // The middle pharyngeal constrictors are swapped upstream: FJ2742 ("Right
  // middle pharyngeal constrictor") is actually the left one, and FJ2754
  // ("Left middle pharyngeal constrictor") is actually the right one.
  FJ2742: "left",
  FJ2754: "right",
  // Полулунные заслонки, у которых la не называет сторону (valvula semilunaris
  // anterior/posterior), а en BodyParts3D называет: сердце непарное, бейджа нет.
  FJ2417: "",
  FJ2431: "",
};

export function sideFor(id: string, en: string, la: string): Side {
  return SIDE_OVERRIDES[id] ?? (LATIN_SIDE.test(la) ? "" : detectSide(en));
}

export function stripSide(en: string): string {
  const s = en.replace(SIDE_RE, "").replace(/\s{2,}/g, " ").trim();
  return s.charAt(0).toUpperCase() + s.slice(1);
}
