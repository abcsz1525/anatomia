"""Approximate middle-ear shapes. No CT measurements or validated wall relief."""
import json,math,pathlib
out=pathlib.Path(__file__).resolve().parents[1]/'public/models/temporal-reconstruction/v1'
d=json.loads((out/'canals.json').read_text(encoding='utf8'));d['items']=[x for x in d['items'] if x.get('group')!='middle-ear']
def ball(p,s):return dict(shape='ellipsoid',points=[p],scale=s,radius=.005)
def tube(p,r=.006):return dict(points=p,radius=r)
def add(key,ru,la,color,parts,note):
 points=[p for part in parts for p in part.get('points',[])];points=points or [[.015,-.145,.075]]
 d['items'].append(dict(id='canal-middle-'+key,group='middle-ear',shape='compound',parts=parts,points=points,radius=.02,ru=ru,la=la,en=la,color=color,source='editorial',pointer=[],position=points[0],labelPosition=points[0],accuracy='approximate',accuracyNote='Приблизительная учебная реконструкция. Форма, размеры и положение заданы по общим анатомическим ориентирам, без КТ-сегментации и экспертной проверки. '+note))
add('malleus','Молоточек','Malleus','#d88c42',[ball([.055,-.065,.09],[.018,.023,.017]),tube([[.055,-.065,.09],[.060,-.105,.09],[.075,-.17,.09],[.080,-.205,.085]],.007),tube([[.062,-.115,.09],[.085,-.12,.09]],.004)],'Условно выделены головка, шейка, рукоятка и латеральный отросток. Суставные поверхности и связки не детализированы.')
add('incus','Наковальня','Incus','#b5a465',[ball([.027,-.067,.069],[.019,.019,.02]),tube([[.027,-.067,.069],[.025,-.08,.015]],.007),tube([[.027,-.067,.069],[.008,-.105,.062],[-.025,-.14,.075]],.006),ball([-.025,-.14,.075],[.007,.006,.006])],'Условно показаны тело, короткая и длинная ножки и чечевицеобразный отросток.')
oval=[-.085,-.14,.075]
add('stapes','Стремечко','Stapes','#ba7b9b',[ball([-.031,-.14,.075],[.009,.009,.009]),tube([[-.031,-.14,.075],[-.057,-.135,.054],[-.084,-.14,.051]],.004),tube([[-.031,-.14,.075],[-.057,-.145,.096],[-.084,-.14,.099]],.004),ball(oval,[.003,.011,.024])],'Две ножки соединяют головку с основанием в области окна преддверия. Контакт с наковальней и основание приблизительны.')
center=[.015,-.145,.075];scale=[.10,.105,.08]
def medial_x(y,z):return center[0]-scale[0]*math.sqrt(max(.001,1-((y-center[1])/scale[1])**2-((z-center[2])/scale[2])**2))
def rim(y,z,ry,rz):
 return [[medial_x(y+ry*math.sin(t),z+rz*math.cos(t))-.001,y+ry*math.sin(t),z+rz*math.cos(t)] for t in [i*2*math.pi/64 for i in range(65)]]
add('oval-window','Окно преддверия (овальное окно)','Fenestra vestibuli','#5fadd5',[tube(rim(-.14,.075,.012,.025),.0025)],'Овальный край на лабиринтной стенке; основание стремечка располагается у окна. Кольцевая связка не моделируется.')
add('round-window','Окно улитки (круглое окно)','Fenestra cochleae','#da6571',[tube(rim(-.19,.08,.011,.011),.0025)],'Условный край окна ниже окна преддверия. Ниша и вторичная барабанная перепонка не реконструированы.')
walls=[('membranous','Перепончатая стенка','Paries membranaceus',0,1,'#a5b7ca'),('labyrinthine','Лабиринтная стенка','Paries labyrinthicus',0,-1,'#b197d2'),('tegmental','Покрышечная стенка','Paries tegmentalis',1,1,'#e5b36b'),('jugular','Яремная стенка','Paries jugularis',1,-1,'#a2bb87'),('carotid','Сонная стенка','Paries caroticus',2,1,'#d58c83'),('mastoid','Сосцевидная стенка','Paries mastoideus',2,-1,'#8bb8ba')]
for key,ru,la,axis,sign,color in walls:
 other=[i for i in range(3) if i!=axis]
 def surface(u,v):
  q=[0.,0.,0.];q[axis]=sign;q[other[0]]=u;q[other[1]]=v;n=math.sqrt(sum(a*a for a in q))
  return [center[i]+scale[i]*q[i]/n for i in range(3)]
 vertices=[];N=32
 for a in range(N):
  for b in range(N):
   u=-1+2*a/N;v=-1+2*b/N;h=2/N
   quad=[surface(u,v),surface(u+h,v),surface(u+h,v+h),surface(u,v+h)]
   for ids in [(0,1,2),(0,2,3)]:
    tri=[quad[i] for i in ids];y=sum(p[1] for p in tri)/3;z=sum(p[2] for p in tri)/3
    if axis==0 and sign==-1 and (((y+.14)/.012)**2+((z-.075)/.025)**2<1 or ((y+.19)/.011)**2+((z-.08)/.011)**2<1):continue
    vertices.extend(c for p in tri for c in p)
 note='Условный сектор оболочки барабанной полости; рельеф и толщина стенки не воспроизведены.'
 if key=='membranous':note+=' Латеральная стенка включает область барабанной перепонки и не является сплошной костью.'
 if key=='labyrinthine':note+=' Для двух окон оставлены схематические проёмы; мыс и другие возвышения не детализированы.'
 if key=='mastoid':note+=' Вход в сосцевидную пещеру пока не реконструирован.'
 if key=='carotid':note+=' Отверстия мышечно-трубного канала не вырезаны в этой условной оболочке.'
 add('wall-'+key,ru,la,color,[dict(shape='mesh',vertices=vertices,points=[surface(-1,-1),surface(1,1),surface(0,0)],radius=.01)],note)
 d['items'][-1]['wall']=True
for item in d['items']:
 if item['id']=='canal-lab-tympanic':item['accuracyNote']='Приблизительный объём барабанной полости. Стенки, окна и слуховые косточки представлены отдельными учебными схемами; детали рельефа и перепонки не восстановлены.'
d['stage']=5;d['middleEarReference']='https://www.ncbi.nlm.nih.gov/books/NBK482338/'
(out/'canals.json').write_text(json.dumps(d,ensure_ascii=False,indent=2),encoding='utf8')
print('Added 3 ossicles, 2 windows, 6 walls; total:',len(d['items']))
