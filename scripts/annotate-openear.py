"""Transfer identifiable canal-wall regions; keep unverified labels on the old mesh."""
import sys,pathlib,json
ROOT=pathlib.Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT.parent/".anatomy-source/python-tools"))
import numpy as np
from scipy.spatial import cKDTree
OUT=ROOT/"public/models/openear/theta"
manifest=json.loads((OUT/"manifest.json").read_text())
old=json.loads((ROOT/"public/models/bone-details/v1/temporal-bone-l.json").read_text(encoding="utf8"))
names={
 "01_scala_tympany":("Барабанная лестница","Scala tympani","#61b7ce"),
 "02_scala_vestibuli":("Лестница преддверия и преддверный лабиринт","Scala vestibuli","#9894d6"),
 "04_malleus":("Молоточек","Malleus","#eccb74"),
 "05_incus":("Наковальня","Incus","#e7a078"),
 "06_stapes":("Стремя","Stapes","#c1a071"),
 "07_facial_nerve":("Лицевой нерв","Nervus facialis","#edcc4c"),
 "08_chorda_tympani":("Барабанная струна","Chorda tympani","#f6e392"),
 "09_cochleovestibular_nerve":("Преддверно-улитковый нерв","Nervus vestibulocochlearis","#ecc075"),
 "10_external_auditory_canal":("Наружный слуховой проход — объём сегментации","Meatus acusticus externus","#76bcae"),
 "11_tympanic_drum":("Барабанная перепонка","Membrana tympanica","#d393b1"),
 "12_sinus_dura":("Синус и твёрдая мозговая оболочка — объединённый сегмент","Sinus et dura mater","#829cce"),
 "13_carotis_interna":("Внутренняя сонная артерия","Arteria carotis interna","#d98580"),
}
for item in manifest["items"]:
 if item["id"]=="bone":continue
 ru,la,color=names[item["id"]]
 item.update(ru=ru,la=la,color=color,accuracy="approximate",accuracyNote="Сегмент OpenEar THETA. Русская подпись добавлена в проекте; границы оптимизированной сетки не прошли независимую анатомическую проверку.")
 if item["id"]=="02_scala_vestibuli":item["accuracyNote"]+=" Исходный файл включает преддверные структуры; они не разделены на отдельные образования."
bone=next(x for x in manifest["items"] if x["id"]=="bone")
positions=np.fromfile(OUT/"bone.bin",dtype="<f4",count=bone["vertexCount"]*3).reshape(-1,3,3)
centers=positions.mean(1)
regions={}
transferred=[]
# Segmentation-adjacent walls only; these masks do not assert the complete canal.
for mesh_id,suffix,distance in [
 ("10_external_auditory_canal","anatomy-external-acoustic",0.9),
 ("09_cochleovestibular_nerve","anatomy-internal-acoustic",0.9),
]:
 item=next(x for x in manifest["items"] if x["id"]==mesh_id)
 points=np.fromfile(OUT/(mesh_id+".bin"),dtype="<f4",count=item["vertexCount"]*3).reshape(-1,3)
 distances,_=cKDTree(points[::2]).query(centers)
 faces=np.where(distances<distance*manifest["scale"])[0]
 landmark=next(x for x in old["landmarks"] if x["id"].endswith(suffix)).copy()
 landmark.update(accuracy="approximate",accuracyNote="Приблизительный перенос на OpenEar THETA: выбраны участки костной стенки рядом с авторским сегментом "+("наружного слухового прохода." if "external" in suffix else "преддверно-улиткового нерва. Это ориентир канала, а не подтверждённые границы его апертуры."),position=centers[faces].mean(0).tolist())
 regions[landmark["id"]]=faces.tolist()
 transferred.append(landmark)
manifest["regions"]=transferred
manifest["retainedOnOriginal"]=[x for x in old["landmarks"] if not x["id"].endswith(("anatomy-external-acoustic","anatomy-internal-acoustic")) and "-direction-zone-" not in x["id"]]
manifest["specimenNotice"]="Препарированный образец височной области: границы распила и соседние костные фрагменты сохранены. Это не полная изолированная височная кость."
manifest["meshProcessing"]={"method":"vertex clustering and smooth normals","boneGridMm":0.4,"note":"Мелкие детали могут быть изменены оптимизацией; оригинальная сетка сохранена отдельно."}
(OUT/"manifest.json").write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding="utf8")
(OUT/"regions.json").write_text(json.dumps(regions),encoding="utf8")
print({x["ru"]:len(regions[x["id"]]) for x in transferred})
