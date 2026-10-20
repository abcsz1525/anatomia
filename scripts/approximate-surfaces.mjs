import fs from 'node:fs';
const dir='public/models/bone-details/v1';
export function approximateSurfaces(kind){
 for(const side of ['l','r']){
  const base=`${dir}/${kind}-${side}`,d=JSON.parse(fs.readFileSync(base+'.json')),s=JSON.parse(fs.readFileSync(base+'.surfaces.json'));
  const b=fs.readFileSync(base+'.bin'),p=new Float32Array(b.buffer,b.byteOffset,d.vertexCount*3);
  const pos=f=>[0,1,2].map(k=>(p[f*9+k]+p[f*9+3+k]+p[f*9+6+k])/3).map((v,k)=>k===0&&side==='r'?-v:v);
  const get=en=>s.regions[d.landmarks.find(l=>l.en===en)?.id]??[];
  const cache=new WeakMap();
  const q=(faces,axis,t)=>{let axes=cache.get(faces);if(!axes){axes={};cache.set(faces,axes);}if(axes[axis])return axes[axis][Math.floor((faces.length-1)*t)];const vs=faces.map(f=>pos(f)[axis]).sort((a,b)=>a-b);axes[axis]=vs;return vs[Math.floor((vs.length-1)*t)];};
  const pick=(faces,fn)=>faces.filter(f=>fn(pos(f)));
  function add(key,en,ru,la,faces,variant=false){
   if(!faces.length)throw Error('Empty '+kind+' '+key);
   const id=d.id+'-approx-'+key,point=pos(faces[0]);if(side==='r')point[0]*=-1;
   d.landmarks=d.landmarks.filter(l=>l.id!==id);d.landmarks.push({id,en,ru,la,labelPosition:point,pointer:[],source:'editorial',accuracy:'approximate',accuracyNote:variant?'Условное расположение вариантной фасетки по атласу. Её наличие на исходной модели не подтверждено.':'Схематическая область по атласу. Контур восстановлен приблизительно; соответствующая граница не различима в исходной модели.'});s.regions[id]=faces;
  }
  if(kind==='patella'){
   const medial=get('Medial articular facet of patella'),odd=pick(medial,([x])=>x<=q(medial,0,.18));
   add('odd','Odd facet of patella','Дополнительная медиальная фасетка надколенника (odd)','Facies articularis medialis accessoria patellae',odd);
   for(const [name,ru,la] of [['Medial','медиальной','medialis'],['Lateral','латеральной','lateralis']]){
    const parent=get(name+' articular facet of patella').filter(f=>name!=='Medial'||!odd.includes(f));const lo=q(parent,1,1/3),hi=q(parent,1,2/3);
    for(const [key,r,l,fn] of [['upper','Верхняя','superior',y=>y>hi],['middle','Средняя','media',y=>y>lo&&y<=hi],['lower','Нижняя','inferior',y=>y<=lo]])add(name.toLowerCase()+'-'+key,key+' part of '+name.toLowerCase()+' patellar facet',r+' часть '+ru+' фасетки надколенника',`Pars ${l} faciei articularis ${la} patellae`,pick(parent,([,y])=>fn(y)));
   }
  }
  if(kind==='medial-cuneiform-bone'){
   const parent=get('Lateral surface of medial cuneiform'),edge=q(parent,2,.82);
   add('second-metatarsal','Second metatarsal facet of medial cuneiform','Суставная поверхность для II плюсневой кости','Facies articularis ossis metatarsalis secundi',pick(parent,([,y,z])=>z>=edge&&y>q(parent,1,.35)));
  }
  if(kind==='navicular-bone'){
   const lat=get('Lateral surface of navicular bone'),plant=get('Plantar surface of navicular bone');
   add('cuboid','Cuboid facet of navicular','Суставная фасетка для кубовидной кости (вариант)','Facies articularis ossis cuboidei',pick(lat,([,y,z])=>z>q(lat,2,.55)&&y<q(lat,1,.70)),true);
   add('tibialis-groove','Groove for tibialis posterior tendon of navicular','Борозда сухожилия задней большеберцовой мышцы','Sulcus tendinis musculi tibialis posterioris',pick(plant,([x,,z])=>x<q(plant,0,.45)&&z>q(plant,2,.25)&&z<q(plant,2,.75)));
  }
  if(kind==='cuboid-bone'){
   const groove=get('Groove for tendon of fibularis longus muscle of cuboid bone'),med=get('Medial surface of cuboid');
   add('notch','Lateral notch of cuboid','Латеральная вырезка кубовидной кости','Incisura lateralis ossis cuboidei',pick(groove,([x])=>x>q(groove,0,.80)));
   add('navicular','Navicular facet of cuboid','Суставная фасетка для ладьевидной кости (вариант)','Facies articularis navicularis ossis cuboidei',pick(med,([,y,z])=>z<q(med,2,.25)&&y>q(med,1,.35)),true);
  }
  if(kind==='calcaneus'){
   const lat=get('Lateral surface of calcaneus');const y0=q(lat,1,.50),z0=q(lat,2,.55);const patch=(low,high)=>pick(lat,([,y,z])=>y>low&&y<=high&&z>z0-.22&&z<z0+.25);
   add('fibular-trochlea','Fibular trochlea of calcaneus','Малоберцовый блок пяточной кости','Trochlea fibularis calcanei',patch(y0-.07,y0+.07));
   add('brevis-groove','Groove for fibularis brevis tendon of calcaneus','Борозда сухожилия короткой малоберцовой мышцы','Sulcus tendinis musculi fibularis brevis',patch(y0+.07,y0+.19));
   add('longus-groove','Groove for fibularis longus tendon of calcaneus','Борозда сухожилия длинной малоберцовой мышцы','Sulcus tendinis musculi fibularis longi',patch(y0-.19,y0-.07));
  }
  s.references=[...new Set([...s.references,'https://www.kenhub.com/en/library/anatomy/cuneiform-bones','https://www.kenhub.com/en/library/anatomy/navicular-bone','https://www.kenhub.com/en/library/anatomy/cuboid','https://www.kenhub.com/en/library/anatomy/calcaneus','https://www.ncbi.nlm.nih.gov/books/NBK482427/'])];
  s.review='atlas-referenced; includes explicitly marked schematic approximate regions; not independently expert-reviewed';
  fs.writeFileSync(base+'.json',JSON.stringify(d));fs.writeFileSync(base+'.surfaces.json',JSON.stringify(s));
  const index=JSON.parse(fs.readFileSync(dir+'/index.json')),row=index.find(x=>x.id===d.id);row.landmarkCount=d.landmarks.length;row.searchText=d.landmarks.map(l=>l.ru+' '+l.la+' '+l.en).join(' ');fs.writeFileSync(dir+'/index.json',JSON.stringify(index));console.log(d.id,d.landmarks.length);
 }
}
