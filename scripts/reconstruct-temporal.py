"""Local educational temporal-bone reconstruction, NOT a validated specimen.
Atlas relationships guide approximate entrance locations; no complete canal paths.
"""
import sys,pathlib,json,hashlib
ROOT=pathlib.Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT.parent/'.anatomy-source/python-tools'))
import numpy as np,trimesh
from scipy.spatial import cKDTree
P=ROOT/'public/models/bone-details/v1';OUT=ROOT/'public/models/temporal-reconstruction/v1';OUT.mkdir(parents=True,exist_ok=True)
d=json.loads((P/'temporal-bone-l.json').read_text(encoding='utf8'));old=json.loads((P/'temporal-bone-l.surfaces.json').read_text(encoding='utf8'))['regions']
a=np.fromfile(P/'temporal-bone-l.bin',dtype='<f4')[:d['vertexCount']*3].reshape(-1,3);oldtri=a.reshape(-1,3,3)
mesh=trimesh.Trimesh(vertices=a,faces=np.arange(len(a)).reshape(-1,3),process=True)
assert mesh.is_watertight
# Refine existing exterior; this alone does NOT create anatomical detail.
mesh=mesh.subdivide()
trimesh.smoothing.filter_taubin(mesh,lamb=.2,nu=.21,iterations=6)
# Conservative reshaping of the distal styloid; retains original attachment.
v=mesh.vertices.copy();w=np.clip((-.50-v[:,1])/.27,0,1)*np.exp(-((v[:,0]+.045)**2+(v[:,2]-.09)**2)/.012)
v[:,1]-=.018*w;mesh.vertices=v
before=mesh.copy();cuts=[]
# Coordinates are normalized Z-Anatomy axes: +x left/lateral, +y superior, +z anterior.
# These finite blind recesses represent ENTRANCES, not through-canals.
settings=[
 ('anatomy-external-acoustic',[.46,-.145,.10],[.15,-.145,.10],.062),
 ('anatomy-carotid-canal',[-.092,-.40,.21],[-.092,-.15,.21],.040),
 ('anatomy-stylomastoid',[.14,-.55,-.055],[.14,-.30,-.055],.022),
]
# Stage 2: approximate entrance recesses, not validated deep canal paths.
extras=[
 ('anatomy-internal-acoustic',None,None,None,.045,.085),
 ('atlas-gap-inner-carotid',None,None,None,.026,.055),
 ('anatomy-petrosal-hiatus',None,None,None,.017,.028),
 ('atlas-gap-lesser-petrosal',None,None,None,.014,.025),
 ('atlas-gap-mastoid-foramen',None,None,None,.022,.05),
 ('recon-vestibular-aqueduct','Наружная апертура водопровода преддверия','Apertura externa aqueductus vestibuli',[-.30,-.16,-.19],.014,.028),
 ('recon-cochlear-canaliculus','Наружная апертура канальца улитки','Apertura externa canaliculi cochleae',[-.25,-.27,-.035],.012,.025),
 ('recon-tympanic-canaliculus','Барабанный каналец','Canaliculus tympanicus',[-.13,-.29,.065],.012,.025),
 ('recon-mastoid-canaliculus','Сосцевидный каналец','Canaliculus mastoideus',[-.085,-.29,-.14],.012,.025),
 ('recon-musculotubal-tensor','Полуканал мышцы, напрягающей барабанную перепонку','Semicanalis musculi tensoris tympani',[-.46,-.055,.24],.014,.04),
 ('recon-musculotubal-tube','Полуканал слуховой трубы','Semicanalis tubae auditivae',[-.46,-.12,.27],.020,.05),
 ('recon-chorda-tympani','Каналец барабанной струны','Canaliculus chordae tympani',[.08,-.22,.29],.010,.025),
]
for suffix,ru,la,target,radius,depth in extras:
 if target is None:
  label=next(x for x in d['landmarks'] if x['id'].endswith(suffix))
  target=oldtri[old[label['id']]].mean((0,1))
 else:
  d['landmarks'].append(dict(id='temporal-bone-l-'+suffix,ru=ru,la=la,en=la,labelPosition=target,pointer=[],source='editorial'))
 # Constrain anchors to the atlas-facing surface instead of a nearby wrong side.
 if suffix in ['anatomy-internal-acoustic','recon-vestibular-aqueduct','atlas-gap-mastoid-foramen']:direction=np.array([0,0,-1])
 elif suffix in ['atlas-gap-inner-carotid','recon-musculotubal-tensor','recon-musculotubal-tube']:direction=np.array([0,0,1])
 elif 'petrosal' in suffix:direction=np.array([0,1,0])
 else:direction=np.array([0,-1,0])
 candidates=np.flatnonzero(before.face_normals@direction>.55)
 face=int(candidates[cKDTree(before.triangles_center[candidates]).query(target)[1]])
 point=before.triangles_center[face];normal=before.face_normals[face]
 settings.append((suffix,(point+normal*.045).tolist(),(point-normal*depth).tolist(),radius))
for suffix,start,end,radius in settings:
 cutter=trimesh.creation.cylinder(radius=radius,segment=np.array([start,end]),sections=64)
 previous=float(mesh.volume);mesh=trimesh.boolean.difference([mesh,cutter],engine='manifold')
 assert mesh.is_watertight and mesh.volume>0 and mesh.volume<previous
 cuts.append(dict(suffix=suffix,start=start,end=end,radius=radius,removedVolume=previous-float(mesh.volume)))
tri=mesh.triangles;centers=tri.mean(1);nearest=cKDTree(oldtri.mean(1)).query(centers)[1]
selected=['mastoid-process-0','styloid-process-of-temporal-bone-1','squamous-part-of-temporal-bone-3','tympanic-part-of-temporal-bone-8','mastoid-notch-10','anatomy-zygomatic-process','anatomy-mandibular-fossa','anatomy-articular-tubercle']
regions={};landmarks=[]
for suffix in selected:
 l=next(x for x in d['landmarks'] if x['id'].endswith(suffix)).copy();idx=old[l['id']];seed=oldtri[idx].reshape(-1,3)
 # Expand process labels over the preserved geometric process, not the old dot.
 if suffix=='styloid-process-of-temporal-bone-1':mask=(centers[:,1]<-.51)&(np.linalg.norm(centers[:,[0,2]]-[-.045,.09],axis=1)<.105)
 elif suffix=='anatomy-zygomatic-process':mask=(centers[:,2]>.51)&(centers[:,1]<.02)&(centers[:,0]>.12)
 elif suffix=='mastoid-process-0':mask=(centers[:,1]<-.32)&(centers[:,2]<-.17)&(centers[:,0]>.14)
 elif suffix=='squamous-part-of-temporal-bone-3':mask=(centers[:,1]>.17)&(centers[:,0]>.25)
 else:mask=np.isin(nearest,idx)
 regions[l['id']]=np.flatnonzero(mask).tolist();l.update(position=centers[mask].mean(0).tolist(),source='editorial',pointer=[],accuracy='approximate',accuracyNote='Учебная реконструкция на основе Z-Anatomy. Наружная форма сглажена; положение и цветные границы приблизительные, независимая анатомическая проверка не выполнена.')
 if 'styloid-process' in suffix:l['accuracyNote']+=' Кончик отростка немного удлинён при реконструкции; размер не является анатомическим измерением.'
 landmarks.append(l)
# New cavity walls plus a narrow entrance rim are independently selectable.
for cut in cuts:
 l=next(x for x in d['landmarks'] if x['id'].endswith(cut['suffix'])).copy();s=np.array(cut['start']);e=np.array(cut['end']);axis=(e-s)/np.linalg.norm(e-s);t=(centers-s)@axis;rad=np.linalg.norm(centers-s-t[:,None]*axis,axis=1)
 mask=(rad<cut['radius']+.022)&(t>-.015)&(t<np.linalg.norm(e-s)+.015)
 ids=np.flatnonzero(mask).tolist();assert len(ids)>5
 # Avoid overlap between newly carved openings and larger exterior labels.
 for key in regions:regions[key]=np.setdiff1d(regions[key],ids).tolist()
 regions[l['id']]=ids
 l.update(position=centers[mask].mean(0).tolist(),source='editorial',pointer=[],accuracy='approximate',accuracyNote='Приблизительно смоделированное входное углубление. Положение, диаметр и глубина заданы вручную по общим ориентирам атласа; полный ход канала и его соединения НЕ реконструированы. Не является подтверждённой анатомией.')
 l['ru']+=' — реконструкция входа';landmarks.append(l)
positions=tri.astype('<f4');normals=mesh.vertex_normals[mesh.faces].astype('<f4');raw=positions.tobytes()+normals.tobytes();sha=hashlib.sha256(raw).hexdigest();(OUT/'bone.bin').write_bytes(raw)
new={**d,'id':'temporal-bone-l-reconstruction','ru':'Левая височная кость — учебная реконструкция','sourceName':'Local reconstruction derived from Z-Anatomy','sourceHash':sha,'regionHash':sha,'vertexCount':len(tri)*3,'geometryUrl':'/models/temporal-reconstruction/v1/bone.bin','regionsUrl':'/models/temporal-reconstruction/v1/regions.json','landmarks':landmarks}
new['entranceViews']={}
for cut in cuts:
 outward=np.array(cut['start'])-np.array(cut['end']);axis=int(np.argmax(abs(outward)))
 view=[('medial','lateral'),('inferior','superior'),('posterior','anterior')][axis][int(outward[axis]>0)]
 new['entranceViews']['temporal-bone-l-'+cut['suffix']]=view
new['entranceViews']['temporal-bone-l-anatomy-internal-acoustic']='posterior'
for label in landmarks:
 assert len(regions[label['id']])>0,label['id']
(OUT/'detail.json').write_text(json.dumps(new,ensure_ascii=False,indent=2),encoding='utf8')
(OUT/'regions.json').write_text(json.dumps(regions),encoding='utf8')
report={'status':'approximate-educational-prototype','baseGeometrySha256':hashlib.sha256((P/'temporal-bone-l.bin').read_bytes()).hexdigest(),'geometrySha256':sha,'facesBefore':len(oldtri),'facesAfter':len(tri),'watertight':bool(mesh.is_watertight),'cuts':cuts,'regions':{k:len(v) for k,v in regions.items()},'references':['https://www.anatomystandard.com/ossa-et-juncturae/cranium/os-temporale.html','https://www.anatomyatlases.org/atlasofanatomy/plate02/03ltemporalouter.shtml'],'notReconstructed':['complete internal canals','middle and inner ear','mastoid air cells','small petrosal foramina'],'license':'CC BY-SA 4.0','note':'Atlas pages consulted as reference only, no atlas images or proprietary meshes included.'}
report['stage']=2
report['notReconstructed']=['complete internal canals','middle and inner ear','mastoid air cells','complete facial canal','verified deep canal connectivity']
(OUT/'reconstruction.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf8')
print(json.dumps({'faces':len(tri),'regions':len(regions),'watertight':mesh.is_watertight,'removedVolumes':[c['removedVolume'] for c in cuts]}))
