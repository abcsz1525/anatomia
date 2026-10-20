import {Mesh, type Intersection, type Material} from 'three';

// Transparent anatomical shells are context, not opaque click blockers.
// Pick the surface contributing most at this ray, stopping at opaque geometry.
export function visibleHit<T extends Intersection>(hits:T[]):T[] {
 let transmission=1, strongest=0, winner:T|undefined;
 const seen=new Set<string>();
 for(const hit of [...hits].sort((a,b)=>a.distance-b.distance)) {
  const mesh=hit.object as Mesh;
  if(!mesh.isMesh)continue;
  const material:Material|undefined=Array.isArray(mesh.material)?mesh.material[hit.face?.materialIndex??0]:mesh.material;
  if(!material?.visible)continue;
  if(seen.has(mesh.uuid))continue;
  seen.add(mesh.uuid);
  const opacity=material.transparent?Math.max(0,Math.min(1,material.opacity)):1;
  const contribution=transmission*opacity;
  if(contribution>strongest){strongest=contribution;winner=hit;}
  transmission*=1-opacity;
  if(transmission===0)break;
 }
 return winner?[winner]:[];
}
