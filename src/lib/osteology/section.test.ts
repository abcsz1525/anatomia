import {expect,it} from 'vitest';
import {BufferAttribute,BufferGeometry,DoubleSide,Mesh,MeshBasicMaterial,Raycaster,Vector3,type Intersection} from 'three';
import {sectionPlane,sectionRaycast} from './section';

it('exposes an internal triangle to picking when the front wall is clipped',()=>{
 const geometry=new BufferGeometry();
 geometry.setAttribute('position',new BufferAttribute(new Float32Array([
  -1,-1,1,1,-1,1,0,1,1,
  -1,-1,0,1,-1,0,0,1,0,
 ]),3));
 const material=new MeshBasicMaterial({side:DoubleSide}),mesh=new Mesh(geometry,material);
 mesh.updateMatrixWorld();const ray=new Raycaster(new Vector3(0,0,3),new Vector3(0,0,-1));
 mesh.raycast=sectionRaycast(null);
 expect(ray.intersectObject(mesh).map(h=>h.faceIndex)).toEqual([0,1]);
 mesh.raycast=sectionRaycast(sectionPlane('anterior',.5));
 expect(ray.intersectObject(mesh).map(h=>h.faceIndex)).toEqual([1]);
 // Preserve hits belonging to another object when filtering this mesh.
 const previous={point:new Vector3(0,0,2)} as Intersection;const hits=[previous];mesh.raycast(ray,hits);
 expect(hits[0]).toBe(previous);expect(hits).toHaveLength(2);
 geometry.dispose();material.dispose();
});

it('keeps opposite halves for left and right cuts and restores the whole mesh',()=>{
 expect(sectionPlane('none',0)).toBeNull();
 expect(sectionPlane('left',0)!.distanceToPoint(new Vector3(1,0,0))).toBeLessThan(0);
 expect(sectionPlane('right',0)!.distanceToPoint(new Vector3(1,0,0))).toBeGreaterThan(0);
 expect(sectionPlane('superior',0)!.distanceToPoint(new Vector3(0,1,0))).toBeLessThan(0);
 expect(sectionPlane('inferior',0)!.distanceToPoint(new Vector3(0,1,0))).toBeGreaterThan(0);
});
