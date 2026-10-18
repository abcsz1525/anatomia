/** Import authored Z-Anatomy geometry and leader meshes together; never fit
 * landmark coordinates to the reduced BodyParts3D meshes.
 * Usage: node scripts/import-bone-details.mjs ../.anatomy-source
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { Vector3, Matrix4 } from 'three';
import { russianTerm } from './bone-russian.mjs';

const project = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const input = path.resolve(process.argv[2] ?? '../.anatomy-source');
const output = path.join(project, 'public/models/bone-details/v1');
const source = fs.readFileSync(path.join(input, 'SkeletalSystem100.fbx'));
const hash = crypto.createHash('sha256').update(source).digest('hex');
if (hash !== '294a649765cd060a62a4095da52b9c8ef2d97769aa447e196448aa5f7d596dea') {
  throw new Error('Source model changed: review geometry and annotations before importing a new revision');
}
const scene = new FBXLoader().parse(source.buffer.slice(source.byteOffset, source.byteOffset + source.byteLength), '');
scene.updateMatrixWorld(true);
const original = n => n.userData.originalName ?? n.name;
const bare = s => s.replace(/\.[lrstij]$/, '');
const slug = s => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const normalize = s => s.toLowerCase().replace(/[()]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
const translations = new Map(fs.readFileSync(path.join(input, 'translations.txt'), 'utf8').split(/\r?\n/).slice(1).map(row => {
  const [en, la] = row.split(';'); return [normalize(en ?? ''), la ?? ''];
}));
const russianPath = path.join(project, 'content/bone-landmarks-ru.tsv');
const russian = new Map(fs.existsSync(russianPath) ? fs.readFileSync(russianPath, 'utf8').split(/\r?\n/).filter(l => l.includes('\t')).map(l => l.split('\t')) : []);
const content = JSON.parse(fs.readFileSync(path.join(project, 'public/content/structures.json'), 'utf8'));
const manifest = JSON.parse(fs.readFileSync(path.join(project, 'public/models/v1/atlas.json'), 'utf8'));
const ordinals = ['first','second','third','fourth','fifth','sixth','seventh','eighth','ninth','tenth','eleventh','twelfth'];
function canonical(name) {
  let s = name.toLowerCase().replace(/\.(l|r)$/, (_, side) => side === 'l' ? ' left' : ' right');
  s = s.replace(/atlas \(c1\)/, 'atlas').replace(/axis \(c2\)/, 'axis')
    .replace(/triquetral/g, 'triquetrum').replace(/sesamoid bones/g, 'sesamoid bone')
    .replace(/navicular bone of (left|right) foot/g, 'navicular bone $1')
    .replace(/vertebra ([ctl])(\d+)/, (_, region, num) => `${ordinals[+num-1]} ${{c:'cervical',t:'thoracic',l:'lumbar'}[region]} vertebra`)
    .replace(/big toe/g, 'first foot').replace(/little toe/g, 'fifth foot').replace(/toe/g, 'foot')
    .replace(/index finger/g, 'second hand').replace(/middle finger/g, 'third hand').replace(/ring finger/g, 'fourth hand')
    .replace(/little finger/g, 'fifth hand').replace(/thumb/g, 'first hand')
    .replace(/\b(manubrium)$/, '$1 sternum').replace(/\bof\b|\bthe\b|\bbone\b|\bfinger\b/g, '');
  return s.replace(/[^a-z0-9 ]/g,' ').split(/\s+/).filter(Boolean).sort().join(' ');
}
const byKey = new Map();
for (const p of manifest.parts) {
  if (!content[p.id]) continue;
  const key = canonical(p.name);
  byKey.set(key, [...(byKey.get(key) ?? []), p]);
}
const roots = [];
scene.traverse(n => {
  if (!n.isMesh || /\.[ijst]$/.test(original(n)) || !/\.g$/.test(original(n.parent))) return;
  const parent = original(n.parent);
  if (/teeth|cartilages/i.test(parent)) return;
  roots.push(n);
});
fs.mkdirSync(output, { recursive: true });
const index = [], terms = new Map();
for (const bone of roots) {
  const sourceName = original(bone);
  const en = bare(sourceName);
  const id = slug(sourceName);
  const matches = byKey.get(canonical(sourceName)) ?? [];
  const entry = content[matches[0]?.id];
  const side = sourceName.endsWith('.l') ? 'left' : sourceName.endsWith('.r') ? 'right' : '';
  const geometry = bone.geometry.clone().applyMatrix4(bone.matrixWorld);
  geometry.computeBoundingBox();
  const center = geometry.boundingBox.getCenter(new Vector3());
  const size = geometry.boundingBox.getSize(new Vector3());
  const scale = 2 / Math.max(size.x, size.y, size.z);
  const transform = new Matrix4().makeScale(scale, scale, scale).multiply(new Matrix4().makeTranslation(-center.x, -center.y, -center.z));
  geometry.applyMatrix4(transform);
  // FBX contains reflected transforms. Preserve outward faces after baking.
  if (bone.matrixWorld.determinant() < 0) {
    for (const a of [geometry.attributes.position, geometry.attributes.normal].filter(Boolean)) {
      for (let i=0;i<a.count;i+=3) {
        const v = new Vector3().fromBufferAttribute(a,i+1);
        a.setXYZ(i+1,a.getX(i+2),a.getY(i+2),a.getZ(i+2)); a.setXYZ(i+2,v.x,v.y,v.z);
      }
    }
  }
  if (!geometry.attributes.normal) geometry.computeVertexNormals();
  const positions = geometry.attributes.position.array;
  const normals = geometry.attributes.normal.array;
  const binary = Buffer.concat([Buffer.from(positions.buffer, positions.byteOffset, positions.byteLength), Buffer.from(normals.buffer, normals.byteOffset, normals.byteLength)]);
  fs.writeFileSync(path.join(output, `${id}.bin`), binary);
  const landmarks = [];
  bone.traverse(label => {
    if (!/\.[st]$/.test(original(label))) return;
    // Only authored leaders, no invented points, bounding-box anchors or mirrored copies.
    const leader = label.children.find(n => n.isMesh && /\.[ij]$/.test(original(n)));
    if (!leader) return;
    const name = bare(original(label));
    if (normalize(name) === normalize(en)) return;
    const la = translations.get(normalize(name)) ?? '';
    const ru = russian.get(name) ?? '';
    terms.set(name, { en: name, la, ru });
    const labelPosition = label.getWorldPosition(new Vector3()).applyMatrix4(transform).toArray();
    const pointerGeometry = leader.geometry.clone().applyMatrix4(leader.matrixWorld).applyMatrix4(transform);
    const pointer = Array.from(pointerGeometry.attributes.position.array, x => +x.toFixed(6));
    landmarks.push({ id: `${id}-${slug(name)}-${landmarks.length}`, en: name, la, ru, labelPosition, pointer, source: 'z-anatomy' });
    pointerGeometry.dispose();
  });
  const combined = new Set(matches.map(p=>content[p.id].la)).size > 1;
  const ru = (combined ? undefined : entry?.ru) ?? russian.get(en) ?? (russianTerm(en) || en);
  const la = (combined ? undefined : entry?.la) ?? translations.get(normalize(en)) ?? '';
  const data = { id, en, ru, la, side, sourceName, sourceHash: hash, vertexCount: positions.length/3, geometryUrl: `/models/bone-details/v1/${id}.bin`, landmarks };
  fs.writeFileSync(path.join(output, `${id}.json`), JSON.stringify(data));
  index.push({ id, en, ru, la, side, partIds: matches.map(p=>p.id), landmarkCount: landmarks.length, searchText: landmarks.map(l=>`${l.ru} ${l.la} ${l.en}`).join(' ') });
  geometry.dispose();
}
index.sort((a,b)=>a.ru.localeCompare(b.ru,'ru') || a.side.localeCompare(b.side));
const report = { source: 'https://github.com/LluisV/Z-Anatomy', sourceHash: hash, bones: index.length, landmarks: index.reduce((n,b)=>n+b.landmarkCount,0), bonesWithoutLandmarks: index.filter(b=>!b.landmarkCount).map(b=>b.id), unmappedBones: index.filter(b=>!b.partIds.length).map(b=>b.id), untranslatedTerms: [...terms.values()].filter(t=>!t.ru).map(t=>t.en), missingLatin: [...terms.values()].filter(t=>!t.la).map(t=>t.en) };
fs.writeFileSync(path.join(output,'index.json'),JSON.stringify(index));
fs.writeFileSync(path.join(project,'content/bone-detail-links.json'),JSON.stringify(Object.fromEntries(index.flatMap(b=>b.partIds.map(id=>[id,b.id]))),null,2)+'\n');
fs.writeFileSync(path.join(output,'coverage.json'),JSON.stringify(report,null,2)+'\n');
fs.writeFileSync(path.join(input,'landmark-terms.json'),JSON.stringify([...terms.values()],null,2));
console.log(JSON.stringify({...report, bonesWithoutLandmarks:report.bonesWithoutLandmarks.length, untranslatedTerms:report.untranslatedTerms.length},null,2));
