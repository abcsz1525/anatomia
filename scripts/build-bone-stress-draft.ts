import fs from 'node:fs';
import {guessStress,latinWords} from '../src/lib/latin';
const root='public/models/bone-details/v1';
const checked={...JSON.parse(fs.readFileSync('content/latin-stress.json','utf8')),...JSON.parse(fs.readFileSync('content/bone-latin-stress.json','utf8'))};
const words=new Set<string>();
for(const b of JSON.parse(fs.readFileSync(`${root}/index.json`,'utf8'))){
  const d=JSON.parse(fs.readFileSync(`${root}/${b.id}.json`,'utf8'));
  for(const l of d.landmarks)for(const w of latinWords(l.la))if(!checked[w])words.add(w);
}
// Inflected forms whose vowel length is inherited from a known stem/ending.
// All entries remain explicitly provisional in the UI, including these overrides.
const overrides:Record<string,1|2|3>={auditivae:2,extensorum:2,foramina:3,frontalium:3,incisurae:2,majoris:2,minoris:2,sphenoideorum:2,sublime:2,tendinum:3,vermiana:2};
const draft=Object.fromEntries([...words].sort().map(w=>[w,overrides[w]??guessStress(w)]));
fs.writeFileSync('content/bone-latin-stress-draft.json',JSON.stringify(draft,null,2)+'\n');
console.log(`${words.size} provisional pronunciation entries`);
