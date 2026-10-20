"""Authored schematic centerlines, not segmented lumen or measured canal walls."""
import json,pathlib
root=pathlib.Path(__file__).resolve().parents[1]
out=root/'public/models/temporal-reconstruction/v1'
report=json.loads((out/'reconstruction.json').read_text(encoding='utf8'))
cuts={c['suffix']:c for c in report['cuts']}
def entry(key):
 c=cuts[key]
 # Midpoint of the short entrance recess, not its external cutter endpoint.
 return [(a+b)/2 for a,b in zip(c['start'],c['end'])]
iam=entry('anatomy-internal-acoustic');sty=entry('anatomy-stylomastoid')
fundus=[-.24,-.13,-.025];genu=[-.12,-.09,.075];second=[.10,-.16,-.10]
rows=[
 ('carotid','Сонный канал','Canalis caroticus',.025,'#dc6849',[entry('anatomy-carotid-canal'),[-.10,-.13,.19],[-.24,-.10,.20],[-.43,-.10,.21],entry('atlas-gap-inner-carotid')],'Восходящая часть, изгиб и направление к верхушке пирамиды.'),
 ('internal-acoustic','Внутренний слуховой проход','Meatus acusticus internus',.035,'#3b82f6',[iam,[-.31,-.13,-.06],fundus],'Ход от внутреннего слухового отверстия к дну прохода. Отдельные поля дна не реконструированы.'),
 ('facial','Лицевой канал','Canalis nervi facialis',.014,'#22a679',[fundus,genu,[-.015,-.11,.04],second,[.12,-.28,-.08],sty],'Схема лабиринтного, барабанного и сосцевидного отделов; первое коленце и второй изгиб приблизительны.'),
 ('greater-petrosal','Канал большого каменистого нерва','Canalis nervi petrosi majoris',.008,'#e6ac28',[genu,[-.23,-.06,.08],entry('anatomy-petrosal-hiatus')],'Схематическая ветвь от области коленца лицевого канала к расщелине.'),
 ('tensor','Полуканал мышцы, напрягающей барабанную перепонку','Semicanalis musculi tensoris tympani',.012,'#9b65d8',[entry('recon-musculotubal-tensor'),[-.30,-.06,.18],[-.12,-.07,.10]],'Верхний полуканал мышечно-трубного канала; барабанная полость показана только направлением окончания.'),
 ('auditory-tube','Полуканал слуховой трубы','Semicanalis tubae auditivae',.019,'#d678ae',[entry('recon-musculotubal-tube'),[-.30,-.13,.20],[-.12,-.16,.13]],'Нижний полуканал мышечно-трубного канала. Хрящевая часть трубы не моделируется.'),
 ('vestibular','Водопровод преддверия','Aqueductus vestibuli',.008,'#38b8bd',[entry('recon-vestibular-aqueduct'),[-.25,-.14,-.13],[-.17,-.15,-.06]],'Приблизительное направление к преддверию; сам лабиринт не реконструирован.'),
 ('cochlear','Каналец улитки','Canaliculus cochleae',.007,'#a58b4e',[entry('recon-cochlear-canaliculus'),[-.25,-.20,.015],[-.23,-.16,.06]],'Приблизительное направление к улитке; улитка не реконструирована.'),
 ('tympanic','Барабанный каналец','Canaliculus tympanicus',.007,'#bd6971',[entry('recon-tympanic-canaliculus'),[-.12,-.23,.065],[-.13,-.17,.055]],'Схематический ход к области нижней стенки барабанной полости.'),
 ('mastoid','Сосцевидный каналец','Canaliculus mastoideus',.007,'#6e8aa5',[entry('recon-mastoid-canaliculus'),[.005,-.27,-.14],[.10,-.25,-.11],[.20,-.25,-.09]],'Схематический ход от яремной области к барабанно-сосцевидной щели; положение пересечения с лицевым каналом не подтверждено.'),
 ('chorda','Каналец барабанной струны','Canaliculus chordae tympani',.006,'#da9a48',[[.12,-.26,-.08],[.10,-.20,.005],[.09,-.19,.15],entry('recon-chorda-tympani')],'Условная траектория барабанной струны: костные участки и открытый участок в барабанной полости не разделены. Это не единый костный канал.'),
 ('lesser-petrosal','Канал малого каменистого нерва','Canalis nervi petrosi minoris',.007,'#8b9b49',[[-.13,-.17,.055],[-.19,-.09,.09],entry('atlas-gap-lesser-petrosal')],'Схематическое направление от барабанной области к расщелине; вариантная анатомия не воспроизведена.'),
]
items=[]
for key,ru,la,radius,color,points,note in rows:
 items.append(dict(id='canal-'+key,ru=ru,la=la,en=la,source='editorial',pointer=[],labelPosition=points[0],position=points[0],accuracy='approximate',accuracyNote='Приблизительная учебная траектория по общим ориентирам атласа. Цветная трубка изображает условный просвет, а не подтверждённую стенку канала. Координаты и диаметр не получены из КТ. '+note,points=points,radius=radius,color=color))
(out/'canals.json').write_text(json.dumps(dict(stage=3,representation='schematic-lumen-centerlines',reference='https://www.anatomystandard.com/ossa-et-juncturae/cranium/os-temporale.html',items=items),ensure_ascii=False,indent=2),encoding='utf8')
print('Saved',len(items),'approximate canal paths')
