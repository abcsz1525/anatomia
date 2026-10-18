export type Point3 = [number, number, number];
export interface BoneSummary {
  id: string; en: string; ru: string; la: string; side: string;
  partIds: string[]; landmarkCount: number; searchText: string;
}
export interface BoneLandmark {
  id: string; en: string; ru: string; la: string;
  labelPosition: Point3;
  /** Original authored leader geometry, in the same frame as the bone. */
  pointer: number[];
  source: "z-anatomy" | "manual" | "editorial";
  /** Manual anchors are actual surface hits; they are not anatomically reviewed. */
  position?: Point3;
}
export interface BoneDetail {
  id: string; en: string; ru: string; la: string; side: string;
  sourceName: string; sourceHash: string; vertexCount: number;
  geometryUrl: string; landmarks: BoneLandmark[];
  /** Hash of the exact refined triangle buffer used by bundled surface indices. */
  regionHash?: string;
  regionsUrl?: string;
}
export interface ManualLandmarks {
  version: 1; boneId: string; sourceHash: string; landmarks: BoneLandmark[];
}
