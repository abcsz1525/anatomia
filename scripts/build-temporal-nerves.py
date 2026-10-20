"""Approximate intratemporal nerves based on atlas relationships incl. MedUniver."""
import json,pathlib
out=pathlib.Path(__file__).resolve().parents[1]/'public/models/temporal-reconstruction/v1'
d=json.loads((out/'canals.json').read_text(encoding='utf8'));d['items']=[x for x in d['items'] if x.get('group')!='nerves']
by={x['id']:x for x in d['items']}
def tube(points,r):return dict(points=points,radius=r)
def add(key,ru,la,color,parts,note):
 pts=[p for part in parts for p in part['points']]
 d['items'].append(dict(id='canal-nerve-'+key,group='nerves',shape='compound',parts=parts,points=pts,radius=.012,ru=ru,la=la,en=la,color=color,source='editorial',pointer=[],position=pts[0],labelPosition=pts[0],accuracy='approximate',accuracyNote='Приблизительная учебная траектория, сверенная с описаниями MedUniver. Координаты, толщина и окончания не получены из КТ/МРТ и не проверены анатомом. При выборе нерва скрываются цветные слепки лицевого канала, внутреннего слухового прохода и хода барабанной струны. '+note))
iam=by['canal-internal-acoustic']['points'];fac=by['canal-facial']['points']
# In the meatus VII runs anterior/superior to VIII; transition into facial canal.
vii_iam=[[p[0],p[1]+.012,p[2]+.012] for p in iam[:-1]]
add('facial','Лицевой нерв (VII)','Nervus facialis','#e4b736',[tube(vii_iam+fac,.006)],'Показан путь от внутреннего слухового прохода через лабиринтный, барабанный и сосцевидный отделы до шилососцевидного отверстия. Промежуточный нерв, узел коленца и внечерепные ветви отдельно не выделены.')
branch=fac[-2]
chorda=[branch,[.10,-.21,-.055],[.075,-.14,.005],[.045,-.115,.075],[.040,-.12,.12],[.055,-.18,.20],by['canal-chorda']['points'][-1]]
add('chorda','Барабанная струна','Chorda tympani','#f3d46a',[tube(chorda,.003)],'Ветвь начинается от нисходящего отдела VII нерва выше его выхода, проходит через барабанную полость между косточками к каменисто-барабанной щели. Свободный участок в полости не является костным каналом. Продолжение к язычному нерву не показано.')
viii=[[p[0],p[1]-.007,p[2]-.007] for p in iam]
fork=viii[-1];vest=by['canal-lab-vestibule']['points'][0]
cochlear=[fork,[-.24,-.16,.025],[-.225,-.155,.075]]
upper=[fork,[-.20,-.12,-.05],[-.17,-.12,-.06]]
lower=[fork,[-.21,-.16,-.07],[-.18,-.17,-.08]]
parts=[tube(viii,.009),tube(cochlear,.005),tube(upper,.004),tube(lower,.004)]
parts.extend([tube([upper[-1],by['canal-lab-'+key]['bulbs'][0]],.0025) for key in ['anterior','lateral']])
parts.extend([tube([lower[-1],by['canal-lab-posterior']['bulbs'][0]],.0025),tube([upper[-1],vest],.0025)])
add('vestibulocochlear','Преддверно-улитковый нерв (VIII)','Nervus vestibulocochlearis','#e6cf84',parts,'Общий ствол разделён на схематическую улитковую ветвь и верхнюю/нижнюю преддверные ветви к лабиринту. Ганглии, отверстия дна прохода, рецепторные окончания и стволовые ядра не восстановлены; направления ветвей условные.')
genu=fac[1]
add('geniculate','Узел коленца','Ganglion geniculi','#d99c42',[dict(shape='ellipsoid',points=[genu],scale=[.014,.010,.012],radius=.006)],'Условный объём чувствительного узла в области первого коленца лицевого нерва. Форма и границы узла приблизительные; двигательные волокна VII нерва не показаны как переключающиеся в узле.')
greater=by['canal-greater-petrosal']['points']
assert greater[0]==genu
add('greater-petrosal','Большой каменистый нерв','Nervus petrosus major','#e5c466',[tube(greater,.0035)],'Схематический участок от области узла коленца до расщелины канала большого каменистого нерва. Дальнейший ход по передней поверхности пирамиды, соединение с глубоким каменистым нервом и крыловидный канал не восстановлены.')
# Position between the modeled VII and VIII roots within the internal meatus.
intermediate=[[p[0],p[1]+.0025,p[2]+.0025] for p in iam]
intermediate += [[(fac[0][i]+genu[i])/2+([0,.002,-.003][i]) for i in range(3)],genu]
add('intermediate','Промежуточный нерв','Nervus intermedius','#edce91',[tube(intermediate,.002)],'Условный корешок между VII и VIII нервами во внутреннем слуховом проходе и его продолжение к узлу коленца. Разделение корешков, место слияния с VII нервом и ход отдельных волокон приблизительны; стволовой участок не показан.')
for item in d['items']:
 if item['id']=='canal-nerve-facial':item['accuracyNote']=item['accuracyNote'].replace('Промежуточный нерв, узел коленца и внечерепные ветви отдельно не выделены.','Промежуточный нерв и узел коленца представлены отдельными схемами; внечерепные ветви не восстановлены.')
 item['accuracyNote']=item.get('accuracyNote','').replace('и хода барабанной струны.',', хода барабанной струны и большого каменистого канала.')
new_ids={'canal-nerve-geniculate','canal-nerve-greater-petrosal','canal-nerve-intermediate'}
d['items']=[x for x in d['items'] if x['id'] in new_ids]+[x for x in d['items'] if x['id'] not in new_ids]
d.update(stage=9,nerveReferences=['https://meduniver.com/Medical/Anatom/472.html','https://meduniver.com/Medical/Anatom/605.html','https://meduniver.com/Medical/Anatom/preddverno-ulitkovii_nerv.html','https://meduniver.com/Medical/otorinolaringologia_bolezni_lor_organov/xirurgicheskaia_anatomia_nervov_uxa.html','https://pubmed.ncbi.nlm.nih.gov/8791922/'])
assert len({i['id'] for i in d['items']})==len(d['items'])
(out/'canals.json').write_text(json.dumps(d,ensure_ascii=False,indent=2),encoding='utf8')
print('Added VII, chorda tympani and VIII;',len(d['items']),'internal structures')
