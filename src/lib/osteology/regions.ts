import type { Point3 } from './types';

export type SurfaceRegions = Record<string, number[]>;
/** One shared ordering for rendering and picking overlapping regions. */
export function faceRegions(regions:SurfaceRegions, visibleIds:string[]) {
  const visible=new Set(visibleIds),result=new Map<number,string[]>();
  for(const [id,faces] of Object.entries(regions))if(visible.has(id))for(const f of faces)result.set(f,[...(result.get(f)??[]),id]);
  for(const ids of result.values())ids.sort((a,b)=>regions[a].length-regions[b].length||a.localeCompare(b));
  return result;
}
export function nextSurface(ids:string[],selected:string|null) {
  return ids.length?ids[(ids.indexOf(selected??'')+1)%ids.length]:null;
}
export const regionKey = (bone: string, hash: string) => `anatomia.regions.v1.${hash}.${bone}`;

/** Shared-vertex adjacency keeps a brush from jumping to a nearby opposite surface. */
export function surfaceTopology(positions: Float32Array) {
  const centers: Point3[] = [], vertices = new Map<string, number[]>();
  const neighbors: Set<number>[] = [];
  for (let f = 0; f < positions.length / 9; f++) {
    neighbors.push(new Set());
    centers.push([0, 1, 2].map(a => (positions[f*9+a]+positions[f*9+3+a]+positions[f*9+6+a])/3) as Point3);
    for (let v=0; v<3; v++) {
      const key = Array.from(positions.subarray(f*9+v*3,f*9+v*3+3), x=>x.toFixed(6)).join(',');
      const faces=vertices.get(key)??[]; faces.push(f); vertices.set(key,faces);
    }
  }
  for (const faces of vertices.values()) for (const a of faces) for (const b of faces) if(a!==b) neighbors[a].add(b);
  return { centers, neighbors };
}

export function brushFaces(topology: ReturnType<typeof surfaceTopology>, seed: number, point: Point3, radius: number) {
  if (!topology.centers[seed]) return [];
  const found:number[]=[], seen=new Set<number>(), queue=[seed];
  while(queue.length) {
    const face=queue.pop()!;
    if(seen.has(face))continue; seen.add(face);
    const c=topology.centers[face];
    if(face!==seed && Math.hypot(c[0]-point[0],c[1]-point[1],c[2]-point[2])>radius)continue;
    found.push(face); for(const n of topology.neighbors[face]) if(!seen.has(n))queue.push(n);
  }
  return found;
}

export function parseRegions(value: unknown, boneId:string, sourceHash:string, faceCount:number, ids:string[]):SurfaceRegions {
  if(!value || typeof value!=='object')throw new Error('Некорректный файл областей');
  const d=value as {version?:number;boneId?:string;sourceHash?:string;regions?:SurfaceRegions};
  if(d.version!==1 || d.boneId!==boneId || d.sourceHash!==sourceHash)throw new Error('Области относятся к другой кости или версии модели');
  if(!d.regions || typeof d.regions!=='object' || Array.isArray(d.regions))throw new Error('Некорректные области');
  const output:SurfaceRegions={};
  for(const [id,faces] of Object.entries(d.regions)) {
    if(!ids.includes(id) || !Array.isArray(faces) || faces.length>faceCount || !faces.every(f=>Number.isInteger(f)&&f>=0&&f<faceCount))throw new Error('Неизвестное образование или повреждённая поверхность');
    output[id]=[...new Set(faces)];
  }
  return output;
}
