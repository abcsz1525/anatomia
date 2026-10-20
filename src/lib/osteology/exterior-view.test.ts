import {expect,it} from 'vitest';
import {exteriorView} from './exterior-view';

it('turns toward a back surface hidden behind a front wall',()=>{
  const positions=new Float32Array([
    -1,-1,1, 1,-1,1, 0,1,1,
    -1,-1,-1, 1,-1,-1, 0,1,-1,
  ]);
  expect(exteriorView(positions,[1],'')).toBe('posterior');
  expect(exteriorView(positions,[0],'')).toBe('anterior');
});
it('uses opposite medial/lateral names on paired bones',()=>{
  const positions=new Float32Array([
    1,-1,-1, 1,1,-1, 1,0,1,
    -1,-1,-1, -1,1,-1, -1,0,1,
  ]);
  expect(exteriorView(positions,[0],'left')).toBe('lateral');
  expect(exteriorView(positions,[0],'right')).toBe('medial');
  expect(exteriorView(positions,[1],'right')).toBe('lateral');
});
it('handles empty and stale masks without an invalid camera',()=>{
  expect(exteriorView(new Float32Array(9),[],'left')).toBe('anterior');
  expect(exteriorView(new Float32Array(9),[-1,100],'left')).toBe('anterior');
});
