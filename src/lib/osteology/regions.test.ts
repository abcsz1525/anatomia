import { describe, expect, it } from 'vitest';
import { brushFaces, parseRegions, surfaceTopology } from './regions';

describe('surface regions',()=>{
  it('paints connected triangles without crossing to a nearby disconnected surface',()=>{
    const p=new Float32Array([0,0,0, 1,0,0, 0,1,0, 1,0,0, 1,1,0, 0,1,0, 0,0,0.001, 1,0,0.001, 0,1,0.001]);
    const t=surfaceTopology(p);
    expect(brushFaces(t,0,[0.3,0.3,0],2).sort()).toEqual([0,1]);
    expect(brushFaces(t,0,[0.3,0.3,0],0.01)).toEqual([0]);
  });
  it('rejects regions for another geometry, unknown names and out-of-range triangles',()=>{
    const data={version:1,boneId:'left',sourceHash:'hash',regions:{head:[0,1,1]}};
    expect(parseRegions(data,'left','hash',3,['head'])).toEqual({head:[0,1]});
    expect(()=>parseRegions(data,'right','hash',2,['head'])).toThrow();
    expect(()=>parseRegions(data,'left','other',2,['head'])).toThrow();
    expect(()=>parseRegions(data,'left','hash',1,['head'])).toThrow();
    expect(()=>parseRegions(data,'left','hash',2,[])).toThrow();
    expect(()=>parseRegions({...data,regions:{head:[NaN]}},'left','hash',2,['head'])).toThrow();
  });
});
