"""Schematic cavity casts and bony labyrinth, not CT-derived anatomy."""
import json,math,pathlib
out=pathlib.Path(__file__).resolve().parents[1]/'public/models/temporal-reconstruction/v1'
data=json.loads((out/'canals.json').read_text(encoding='utf8'))
data['items']=[x for x in data['items'] if x.get('group')!='labyrinth']
def add(key,ru,la,color,points,radius=.010,scale=None,note='',bulbs=None):
 item=dict(id='canal-lab-'+key,group='labyrinth',ru=ru,la=la,en=la,color=color,points=points,radius=radius,source='editorial',pointer=[],labelPosition=points[0],position=points[0],accuracy='approximate',accuracyNote='Приблизительная учебная реконструкция по атласным ориентирам. Цветная форма изображает условный объём полости, а не её стенку. Размеры, положение и сопряжения не измерены по КТ. '+note)
 if scale:item.update(shape='ellipsoid',scale=scale)
 if bulbs:item['bulbs']=bulbs
 data['items'].append(item)
v=[-.17,-.15,-.06];common=[-.19,-.04,-.15]
add('tympanic','Барабанная полость','Cavitas tympani','#db78a2',[[.015,-.145,.075]],scale=[.10,.105,.08],note='Условный объём среднего уха, латеральнее лабиринта. Слуховые косточки, окна, барабанная перепонка и рельеф шести стенок не реконструированы.')
add('vestibule','Преддверие','Vestibulum','#e6b83b',[v],scale=[.035,.035,.044],note='Центральная часть костного лабиринта между улиткой и полукружными каналами; мешочек и маточка не выделены.')
spiral=[]
for i in range(161):
 t=i/160;angle=t*5*math.pi;r=.049*(1-t)+.008*t
 spiral.append([-.235+.058*t,-.155+r*math.sin(angle),.065+r*math.cos(angle)])
add('cochlea','Улитка','Cochlea','#e27b48',[v,[-.205,-.15,.025]]+spiral,radius=.009,note='Спираль примерно в 2½ оборота. Лестницы, спиральная пластинка, стержень и перепончатый проток отдельно не показаны.')
add('anterior','Передний полукружный канал','Canalis semicircularis anterior','#538fe0',[[-.16,-.13,-.045],[-.12,-.08,-.055],[-.12,.015,-.085],[-.16,.04,-.13],common],note='Приблизительная вертикальная плоскость. Неампулярная ножка соединена с общей костной ножкой.',bulbs=[[-.155,-.115,-.05]])
add('posterior','Задний полукружный канал','Canalis semicircularis posterior','#9869d2',[[-.18,-.17,-.08],[-.20,-.21,-.15],[-.245,-.17,-.23],[-.26,-.075,-.22],[-.23,-.025,-.19],common],note='Приблизительная задняя вертикальная петля. Неампулярная ножка соединена с общей костной ножкой.',bulbs=[[-.19,-.185,-.105]])
add('lateral','Латеральный полукружный канал','Canalis semicircularis lateralis','#35b5a4',[[-.15,-.14,-.04],[-.09,-.12,-.07],[-.055,-.12,-.14],[-.10,-.13,-.19],[-.16,-.145,-.15],[-.18,-.15,-.08]],note='Приблизительная преимущественно горизонтальная петля. Обе ножки возвращаются в преддверие.',bulbs=[[-.125,-.13,-.055]])
add('common-crus','Общая костная ножка','Crus osseum commune','#78a1ca',[common,[-.19,-.09,-.12],[-.18,-.13,-.085]],radius=.012,note='Общий участок неампулярных ножек переднего и заднего каналов до преддверия.')
for item in data['items']:
 item['accuracyNote']=item['accuracyNote'].replace('сам лабиринт не реконструирован','лабиринт представлен отдельной приблизительной схемой').replace('улитка не реконструирована','улитка представлена отдельной приблизительной схемой')
data.update(stage=4,labyrinthReference='https://www.ncbi.nlm.nih.gov/books/NBK554328/pdf/Bookshelf_NBK554328.pdf')
assert len({x['id'] for x in data['items']})==len(data['items'])
(out/'canals.json').write_text(json.dumps(data,ensure_ascii=False,indent=2),encoding='utf8')
print('Saved 7 cavity/labyrinth structures;',len(data['items']),'internal structures total')
