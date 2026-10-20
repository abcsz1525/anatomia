import {expect,it} from 'vitest';
import {Mesh,MeshBasicMaterial,SphereGeometry,Raycaster,Vector3} from 'three';
import {visibleHit} from './visible-hit';

it('selects the visible solid behind a faint shell and blocks geometry behind the solid',()=>{
 const geometry=new SphereGeometry(.4,16,12);
 const objects=[.13,1,1].map((opacity,i)=>{
  const mesh=new Mesh(geometry,new MeshBasicMaterial({transparent:opacity<1,opacity}));
  mesh.position.z=2-i;mesh.updateMatrixWorld();return mesh;
 });
 const ray=new Raycaster(new Vector3(0,0,4),new Vector3(0,0,-1));
 const hits=ray.intersectObjects(objects);
 expect(hits[0].object).toBe(objects[0]);
 expect(visibleHit(hits)[0].object).toBe(objects[1]);
 // Selecting a wall makes it opaque in the viewer, so it must become pickable.
 objects[0].material.transparent=false;
 expect(visibleHit(ray.intersectObjects(objects))[0].object).toBe(objects[0]);
 objects.forEach(o=>o.material.dispose());geometry.dispose();
});

it('allows an isolated translucent structure and ignores invisible materials',()=>{
 const geometry=new SphereGeometry(.4,16,12);
 const material=new MeshBasicMaterial({transparent:true,opacity:.3});
 const mesh=new Mesh(geometry,material);mesh.updateMatrixWorld();
 const ray=new Raycaster(new Vector3(0,0,4),new Vector3(0,0,-1));
 expect(visibleHit(ray.intersectObject(mesh))[0].object).toBe(mesh);
 material.opacity=0;expect(visibleHit(ray.intersectObject(mesh))).toEqual([]);
 material.opacity=1;material.visible=false;expect(visibleHit(ray.intersectObject(mesh))).toEqual([]);
 material.dispose();geometry.dispose();
});
