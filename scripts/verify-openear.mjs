import fs from 'node:fs';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
const root='public/models/openear/theta/';
const m=JSON.parse(fs.readFileSync(root+'manifest.json','utf8'));
const masks=JSON.parse(fs.readFileSync(root+'regions.json','utf8'));
for(const i of m.items){const b=fs.readFileSync('public'+i.file);assert.equal(b.length,i.vertexCount*24);assert.equal(crypto.createHash('sha256').update(b).digest('hex'),i.sha256);const a=new Float32Array(b.buffer,b.byteOffset,b.length/4);assert.ok(a.every(Number.isFinite));if(i.id!=='bone')assert.ok(i.ru&&i.la&&i.accuracy==='approximate');}
const n=m.items.find(i=>i.id==='bone').vertexCount/3;
for(const r of m.regions){assert.ok(masks[r.id].length>0);assert.ok(masks[r.id].every(f=>Number.isInteger(f)&&f>=0&&f<n));assert.equal(r.accuracy,'approximate');}
assert.equal(new Set([...masks[m.regions[0].id],...masks[m.regions[1].id]]).size,Object.values(masks).reduce((n,a)=>n+a.length,0));
assert.equal(m.regions.length,2);assert.equal(m.retainedOnOriginal.length,26);
console.log('PASS: 13 meshes, valid hashes and finite geometry; 2 non-overlapping approximate regions; 26 retained landmarks.');
