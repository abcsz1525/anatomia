import {Mesh,Plane,Vector3,type Raycaster,type Intersection} from 'three';

export type SectionSide='none'|'left'|'right'|'anterior'|'posterior'|'superior'|'inferior';

// Positive model X is anatomical left, positive Y superior, positive Z anterior.
export function sectionPlane(side:SectionSide,offset:number):Plane|null {
 if(side==='none')return null;
 const vectors:Record<Exclude<SectionSide,'none'>,[number,number,number]>={left:[-1,0,0],right:[1,0,0],anterior:[0,0,-1],posterior:[0,0,1],superior:[0,-1,0],inferior:[0,1,0]};
 const normal=new Vector3(...vectors[side]);
 return new Plane(normal,Math.max(-1,Math.min(1,offset)));
}

// GPU clipping does not affect Three.js raycasting. Discard clipped hits so an
// invisible outer wall cannot intercept a click on an exposed internal surface.
export function sectionRaycast(plane:Plane|null) {
 return function(this:Mesh,raycaster:Raycaster,hits:Intersection[]) {
  const start=hits.length;
  Mesh.prototype.raycast.call(this,raycaster,hits);
  if(plane)for(let i=hits.length-1;i>=start;i--)if(plane.distanceToPoint(hits[i].point)<-1e-7)hits.splice(i,1);
 };
}
