export type SystemId =
  | "skeletal"
  | "connective"
  | "muscular"
  | "arterial"
  | "venous"
  | "cardiac"
  | "nervous"
  | "sensory"
  | "digestive"
  | "respiratory"
  | "urinary"
  | "reproductive"
  | "endocrine"
  | "lymphatic"
  | "integumentary";

export type Bounds = [[number, number, number], [number, number, number]];

export interface AtlasPart {
  id: string;
  name: string;
  conceptId: string;
  system: SystemId;
  chunk: number;
  positions: number;
  normals: number;
  indices: number;
  vertexCount: number;
  indexCount: number;
  bounds: Bounds;
}

export interface AtlasChunk {
  url: string;
  bytes: number;
  gzip: string;
  gzipBytes: number;
}

export interface AtlasManifest {
  version: string;
  parts: AtlasPart[];
  chunks: AtlasChunk[];
  triangles: number;
}

export interface PartGeometry {
  positions: Float32Array;
  normals: Float32Array;
  indices: Uint32Array;
}
