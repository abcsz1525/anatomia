"""Schematic mastoid air spaces; not a CT-derived pneumatization pattern."""
import json,math,pathlib
out=pathlib.Path(__file__).resolve().parents[1]/'public/models/temporal-reconstruction/v1'
d=json.loads((out/'canals.json').read_text(encoding='utf8'))
d['items']=[x for x in d['items'] if x.get('group')!='mastoid']
def ball(p,s):return dict(shape='ellipsoid',points=[p],scale=s,radius=.005)
def tube(points,r):return dict(points=points,radius=r)
def add(key,ru,la,color,parts,note):
 pts=[p for part in parts for p in part['points']]
 d['items'].append(dict(id='canal-mastoid-'+key,group='mastoid',shape='compound',parts=parts,points=pts,radius=.035,ru=ru,la=la,en=la,color=color,source='editorial',pointer=[],position=pts[0],labelPosition=pts[0],accuracy='approximate',accuracyNote='Приблизительная учебная реконструкция по атласным ориентирам. Цветной объём обозначает воздушное пространство, не костную стенку. Размеры и положение не измерены по КТ. '+note))
antrum=[.14,-.10,-.20]
aditus=[[.03,-.075,.025],[.065,-.075,-.045],[.10,-.085,-.12],antrum]
add('antrum','Сосцевидная пещера','Antrum mastoideum','#dba838',[ball(antrum,[.065,.05,.075])],'Пещера показана позади верхнего отдела барабанной полости; она сообщается с ним через вход в пещеру и с системой ячеек.')
add('aditus','Вход в сосцевидную пещеру','Aditus ad antrum','#4eacc5',[tube(aditus,.023)],'Схематический короткий ход от эпитимпанума к пещере. В оболочке задневерхней части барабанной полости оставлен приблизительный проём.')
# Fixed illustrative layout, not an assertion about normal number or morphology.
cells=[([.21,-.13,-.27],[.038,.032,.045],-1),([.13,-.16,-.31],[.032,.039,.043],-1),([.25,-.20,-.31],[.040,.044,.034],0),([.19,-.23,-.36],[.034,.038,.045],1),([.28,-.27,-.39],[.042,.035,.039],2),([.17,-.30,-.43],[.030,.039,.036],3),([.24,-.33,-.46],[.037,.035,.044],4),([.30,-.36,-.44],[.028,.035,.033],4),([.21,-.40,-.48],[.030,.036,.031],6),([.27,-.44,-.47],[.029,.035,.030],7),([.15,-.22,-.24],[.028,.033,.030],1),([.30,-.18,-.25],[.030,.028,.032],0)]
parts=[]
for center,size,parent in cells:
 parts.append(ball(center,size))
 origin=antrum if parent<0 else cells[parent][0]
 parts.append(tube([origin,[(a+b)/2 for a,b in zip(origin,center)],center],.010))
add('cells','Сосцевидные ячейки','Cellulae mastoideae','#b48ad6',parts,'Показана условная сеть из 12 объёмов с сообщениями. Число, форма и степень пневматизации индивидуально изменчивы; эта схема не воспроизводит конкретный препарат. Межъячеистые костные перегородки не моделируются.')
# Cut an approximate opening through existing wall sectors along the aditus.
def distance(p,a,b):
 ab=[y-x for x,y in zip(a,b)];ap=[y-x for x,y in zip(a,p)]
 t=max(0,min(1,sum(x*y for x,y in zip(ap,ab))/sum(x*x for x in ab)))
 return math.sqrt(sum((p[i]-a[i]-t*ab[i])**2 for i in range(3)))
for item in d['items']:
 if item.get('wall'):
  for part in item['parts']:
   v=part.get('vertices',[]);kept=[]
   for i in range(0,len(v),9):
    tri=v[i:i+9];c=[sum(tri[j::3])/3 for j in range(3)]
    if min(distance(c,a,b) for a,b in zip(aditus,aditus[1:]))>=.027:kept.extend(tri)
   part['vertices']=kept
 if item['id']=='canal-middle-wall-mastoid':item['accuracyNote']=item['accuracyNote'].replace('Вход в сосцевидную пещеру пока не реконструирован.','Добавлен схематический проём входа в сосцевидную пещеру; границы приблизительные.')
d.update(stage=6,mastoidReference='https://pmc.ncbi.nlm.nih.gov/articles/PMC6081290/')
assert len({i['id'] for i in d['items']})==len(d['items'])
(out/'canals.json').write_text(json.dumps(d,ensure_ascii=False,indent=2),encoding='utf8')
print('Added antrum, aditus and illustrative cell network;',len(d['items']),'internal structures')
