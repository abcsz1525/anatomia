"""Approximate tympanic membrane and middle-ear muscle/tendon schematics."""
import json,math,pathlib
out=pathlib.Path(__file__).resolve().parents[1]/'public/models/temporal-reconstruction/v1'
d=json.loads((out/'canals.json').read_text(encoding='utf8'));d['items']=[i for i in d['items'] if i.get('group')!='ear-muscles']
def tube(p,r):return dict(points=p,radius=r)
def add(key,ru,la,color,parts,note):
 pts=[p for part in parts for p in part['points']]
 d['items'].append(dict(id='canal-muscle-'+key,group='ear-muscles',shape='compound',parts=parts,points=pts,radius=.012,color=color,ru=ru,la=la,en=la,source='editorial',pointer=[],position=pts[0],labelPosition=pts[0],accuracy='approximate',accuracyNote='Приблизительная учебная реконструкция: форма, размеры и места прикрепления заданы схематически, без измерений КТ и экспертной проверки. '+note))
umbo=[.080,-.205,.085]
def membrane(r,t):
 rim=[.110,-.16+.066*math.cos(t),.085+.052*math.sin(t)]
 return [a+r*(b-a) for a,b in zip(umbo,rim)]
vertices=[]
for k in range(12):
 for j in range(80):
  q=[membrane(k/12,j*2*math.pi/80),membrane((k+1)/12,j*2*math.pi/80),membrane((k+1)/12,(j+1)*2*math.pi/80),membrane(k/12,(j+1)*2*math.pi/80)]
  for ids in ([(0,1,2)] if k==0 else [(0,1,2),(0,2,3)]):vertices.extend(c for i in ids for c in q[i])
rim=[membrane(1,j*2*math.pi/80) for j in range(81)]
add('membrane','Барабанная перепонка','Membrana tympanica','#89bfc9',[dict(shape='mesh',vertices=vertices,points=[umbo]+rim,radius=.003),tube(rim,.002)],'Схема тонкой воронкообразной перепонки с пупком у конца рукоятки молоточка. Натянутая и ненатянутая части, слои ткани и точный наклон отдельно не восстановлены.')
tensor_end=[-.12,-.07,.10];tensor_attach=[.060,-.11,.09]
add('tensor','Мышца, напрягающая барабанную перепонку','Musculus tensor tympani','#c96663',[tube([[-.42,-.057,.225],[-.30,-.06,.18],[-.20,-.065,.14],tensor_end],.009)],'Условное брюшко в полуканале мышцы. Внеполуканальная область начала не реконструирована. Сухожилие к верхней части рукоятки молоточка показано отдельно.')
add('tensor-tendon','Сухожилие мышцы, напрягающей барабанную перепонку','Tendo musculi tensoris tympani','#d9bc8b',[tube([tensor_end,[-.08,-.075,.09],[-.04,-.10,.085],tensor_attach],.0035)],'Приблизительный поворот в области улиткообразного отростка и прикрепление к молоточку. Сам улиткообразный отросток пока не детализирован.')
stap_end=[.005,-.16,.005];stap_attach=[-.037,-.14,.068]
add('stapedius','Стременная мышца','Musculus stapedius','#b85b70',[tube([[.015,-.20,-.035],[.012,-.18,-.02],stap_end],.007)],'Схематическое брюшко у задней стенки в области пирамидального возвышения. Костная оболочка возвышения не реконструирована; сухожилие к шейке стремечка показано отдельно.')
add('stapedius-tendon','Сухожилие стременной мышцы','Tendo musculi stapedii','#e1c794',[tube([stap_end,[-.014,-.15,.035],stap_attach],.0025)],'Схематический ход вперёд к задней поверхности шейки стремечка. Точка прикрепления приблизительная.')
for item in d['items']:
 if item['id']=='canal-lab-tympanic':item['accuracyNote']='Приблизительный объём барабанной полости. Косточки, стенки, окна, перепонка и мышцы показаны отдельными учебными схемами; тонкий рельеф и тканевые слои не восстановлены.'
d.update(stage=7,muscleReferences=['https://www.ncbi.nlm.nih.gov/mesh/68013719','https://www.ncbi.nlm.nih.gov/mesh/68013198'])
assert len({i['id'] for i in d['items']})==len(d['items'])
(out/'canals.json').write_text(json.dumps(d,ensure_ascii=False,indent=2),encoding='utf8')
print('Saved membrane, 2 muscles, 2 tendons;',len(d['items']),'internal structures')
