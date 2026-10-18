// Curated terminology used only by the offline importer. Unmatched terms fail
// validation rather than silently receiving an automatic word-by-word translation.
const pairs = text => Object.fromEntries(text.trim().split('\n').map(line => line.split('|')));
const basic = pairs(`
Head|Головка
Neck|Шейка
Body|Тело
Base|Основание
Apex|Верхушка
Anterior border|Передний край
Posterior border|Задний край
Medial border|Медиальный край
Lateral border|Латеральный край
Superior border|Верхний край
Inferior border|Нижний край
Interosseous border|Межкостный край
Anterior surface|Передняя поверхность
Posterior surface|Задняя поверхность
Medial surface|Медиальная поверхность
Lateral surface|Латеральная поверхность
Superior surface|Верхняя поверхность
Inferior surface|Нижняя поверхность
Anteromedial surface|Переднемедиальная поверхность
Anterolateral surface|Переднелатеральная поверхность
Posteromedial surface|Заднемедиальная поверхность
External surface|Наружная поверхность
Internal surface|Внутренняя поверхность
Superior articular surface|Верхняя суставная поверхность
Inferior articular surface|Нижняя суставная поверхность
Superior articular surfaces|Верхние суставные поверхности
Lateral condyle|Латеральный мыщелок
Medial condyle|Медиальный мыщелок
Lateral epicondyle|Латеральный надмыщелок
Medial epicondyle|Медиальный надмыщелок
Tuberosity|Бугристость
Malleolar groove|Лодыжковая борозда
Trochlea|Блок
Condyle|Мыщелок
Costal surface|Рёберная поверхность
Superior angle|Верхний угол
Inferior angle|Нижний угол
Lateral angle|Латеральный угол
Frontal angle|Лобный угол
Occipital angle|Затылочный угол
Mastoid angle|Сосцевидный угол
Sphenoidal angle|Клиновидный угол
Frontal border|Лобный край
Occipital border|Затылочный край
Sagittal border|Сагиттальный край
Squamosal border|Чешуйчатый край
Greater horn|Большой рог
Lesser horn|Малый рог
Tubercle|Бугорок
Spine|Ость
Squamous part|Чешуйчатая часть
Basilar part|Базилярная часть
Lateral part|Латеральная часть
Groove for tendon of flexor hallucis longus|Борозда сухожилия длинного сгибателя большого пальца стопы
Articular circumference of head|Суставная окружность головки
Articular facet of head|Суставная ямка головки
Articular facet of lateral malleolus|Суставная поверхность латеральной лодыжки
Articular facet of medial malleolus|Суставная поверхность медиальной лодыжки
Popliteal surface|Подколенная поверхность
Patellar surface|Надколенниковая поверхность
Anatomical neck|Анатомическая шейка
Surgical neck|Хирургическая шейка
Pectineal line|Гребенчатая линия
Styloid process|Шиловидный отросток
Fovea for ligament of head|Ямка головки
Superior articular process|Верхний суставной отросток
Groove for tendon of fibularis longus muscle|Борозда сухожилия длинной малоберцовой мышцы
Hook|Крючок
Interosseous crest|Межкостный гребень
Occipital margin|Затылочный край
Mastoid border|Сосцевидный край
Jugular notch|Яремная вырезка
Intrajugular process|Внутрияремный отросток
Zygomatic process|Скуловой отросток
Orbital surface|Глазничная поверхность
Temporal surface|Височная поверхность
Nasal spine|Носовая ость
Nasal margin|Носовой край
Parietal margin|Теменной край
Sphenoidal margin|Клиновидный край
Nasal part|Носовая часть
Orbital part|Глазничная часть
Orbital plate|Глазничная пластинка
Vaginal process|Влагалищный отросток
Petrous part|Каменистая часть
Tympanic part|Барабанная часть
Foramen caecum|Слепое отверстие
Acromial facet|Акромиальная суставная поверхность
Medial lip|Медиальная губа
Lateral lip|Латеральная губа
Outer lip|Наружная губа
Inner lip|Внутренняя губа
Anterior tubercle|Передний бугорок
Posterior tubercle|Задний бугорок
Articular facet|Суставная поверхность
Lateral process|Латеральный отросток
Medial process|Медиальный отросток
Posterior process|Задний отросток
Anterior process|Передний отросток
Inferior mental spine|Нижняя подбородочная ость
Superior mental spine|Верхняя подбородочная ость
Oblique line|Косая линия
Body of|Тело
Anterior arch|Передняя дуга
Posterior arch|Задняя дуга
Articular surface|Суставная поверхность
Superior articular facet|Верхняя суставная поверхность
Inferior articular facet|Нижняя суставная поверхность
Lamina|Пластинка
Pedicle|Ножка
Pars interarticularis|Межсуставная часть
Crest of head|Гребень головки
Crest of neck|Гребень шейки
Angle|Угол
Articular facet of tubercle|Суставная поверхность бугорка
Articular facets of head|Суставные поверхности головки
Base of phalanx|Основание фаланги
Head of phalanx|Головка фаланги
Body of phalanx|Тело фаланги
Trochlea of phalanx|Блок фаланги
Tuberosity of distal phalanx|Бугристость дистальной фаланги
Base of metatarsal bone|Основание плюсневой кости
Head of metatarsal bone|Головка плюсневой кости
Body of metatarsal bone|Тело плюсневой кости
Head of metacarpal bone|Головка пястной кости
Body of metacarpal bone|Тело пястной кости
Styloid process of third metacarpal bone|Шиловидный отросток III пястной кости
Intercondylar area|Межмыщелковое поле
Anterior intercondylar area|Переднее межмыщелковое поле
Posterior intercondylar area|Заднее межмыщелковое поле
Medial intercondylar tubercle|Медиальный межмыщелковый бугорок
Lateral intercondylar tubercle|Латеральный межмыщелковый бугорок
Tibial tuberosity|Бугристость большеберцовой кости
Fibular articular facet|Малоберцовая суставная поверхность
Fibular notch|Малоберцовая вырезка
Medial malleolus|Медиальная лодыжка
Articular surface of medial condyle|Суставная поверхность медиального мыщелка
Soleal line|Линия камбаловидной мышцы
Articular facet of medial malleolus|Суставная поверхность медиальной лодыжки
Tubercle of iliotibial tract|Бугорок подвздошно-большеберцового тракта
Posterior malleolus|Задняя лодыжка
Superior articular surface of lateral condyle|Верхняя суставная поверхность латерального мыщелка
Intercondylar eminence|Межмыщелковое возвышение
Tibial plateau|Плато большеберцовой кости
First metatarsal bone|I плюсневая кость
Fifth metatarsal bone|V плюсневая кость
Medial malleolar facet|Медиальная лодыжковая поверхность
Lateral malleolar facet|Латеральная лодыжковая поверхность
Medial tubercle|Медиальный бугорок
Lateral tubercle|Латеральный бугорок
Superior facet of talus|Верхняя поверхность блока таранной кости
Posterior calcaneal articular facet|Задняя пяточная суставная поверхность
Facet for calcaneonavicular part of bifurcate ligament|Площадка для пяточно-ладьевидной части раздвоенной связки
Navicular articular surface|Ладьевидная суставная поверхность
Facet for plantar calcaneonavicular ligament|Площадка для подошвенной пяточно-ладьевидной связки
Talar sulcus|Борозда таранной кости
Middle facet for calcaneus|Средняя пяточная суставная поверхность
Calcaneal sulcus|Борозда пяточной кости
Sustentaculum tali|Опора таранной кости
Tarsal sinus|Пазуха предплюсны
Calcaneal tubercle|Пяточный бугорок
Articular surface for cuboid|Кубовидная суставная поверхность
Calcaneal tuberosity|Пяточный бугор
(Third trochanter)|Третий вертел (вариант)
Gluteal tuberosity|Ягодичная бугристость
Lesser trochanter|Малый вертел
Greater trochanter|Большой вертел
Linea aspera|Шероховатая линия
Intercondylar fossa|Межмыщелковая ямка
Lateral supracondylar line|Латеральная надмыщелковая линия
Medial supracondylar line|Медиальная надмыщелковая линия
Intertrochanteric line|Межвертельная линия
Trochanteric fossa|Вертельная ямка
Groove for popliteus muscle|Борозда подколенной мышцы
Intertrochanteric crest|Межвертельный гребень
Intercondylar line|Межмыщелковая линия
Adductor tubercle|Приводящий бугорок
Quadrate tubercle|Квадратный бугорок
Malleolar fossa|Лодыжковая ямка
Articular facet of lateral malleolus|Суставная поверхность латеральной лодыжки
Apex of head of fibula|Верхушка головки малоберцовой кости
Lateral malleolus|Латеральная лодыжка
Acetabulum|Вертлужная впадина
Posterior superior iliac spine|Задняя верхняя подвздошная ость
(Posterior obturator tubercle)|Задний запирательный бугорок (вариант)
Obturator foramen|Запирательное отверстие
Ischiopubic ramus|Седалищно-лобковая ветвь
Anterior obturator tubercle|Передний запирательный бугорок
Iliac crest|Подвздошный гребень
Hip bone|Тазовая кость
Pubis|Лобковая кость
Pecten pubis|Гребень лобковой кости
Superior pubic ramus|Верхняя ветвь лобковой кости
Inferior pubic ramus|Нижняя ветвь лобковой кости
Pubic tubercle|Лобковый бугорок
Iliac fossa|Подвздошная ямка
Ischial spine|Седалищная ость
Obturator crest|Запирательный гребень
Iliopubic eminence|Подвздошно-лобковое возвышение
Lunate surface|Полулунная поверхность
Ilium|Подвздошная кость
Sacropelvic surface of ilium|Крестцово-тазовая поверхность подвздошной кости
Arcuate line of ilium|Дугообразная линия подвздошной кости
Anterior superior iliac spine|Передняя верхняя подвздошная ость
Supra-acetabular groove|Надвертлужная борозда
Ischial tuberosity|Седалищный бугор
Iliac tubercle|Подвздошный бугорок
Inferior gluteal line|Нижняя ягодичная линия
Ramus of ischium|Ветвь седалищной кости
Symphysial surface of pubis|Симфизиальная поверхность лобковой кости
Intermediate zone|Промежуточная линия подвздошного гребня
Ischium|Седалищная кость
Anterior gluteal line|Передняя ягодичная линия
Gluteal surface of ilium|Ягодичная поверхность подвздошной кости
Acetabular fossa|Ямка вертлужной впадины
Lesser sciatic notch|Малая седалищная вырезка
Greater sciatic notch|Большая седалищная вырезка
Greater sciatic foramen|Большое седалищное отверстие
Lesser sciatic foramen|Малое седалищное отверстие
Anterior inferior iliac spine|Передняя нижняя подвздошная ость
Obturator groove|Запирательная борозда
Posterior gluteal line|Задняя ягодичная линия
Auricular surface of ilium|Ушковидная поверхность подвздошной кости
Acetabular notch|Вырезка вертлужной впадины
Iliac tuberosity|Подвздошная бугристость
Pubic crest|Лобковый гребень
Posterior inferior iliac spine|Задняя нижняя подвздошная ость
Acetabular margin|Край вертлужной впадины
Ala of ilium|Крыло подвздошной кости
Anterior sacral foramina|Передние крестцовые отверстия
Posterior sacral foramina|Задние крестцовые отверстия
Ala of sacrum|Крыло крестца
Median sacral crest|Срединный крестцовый гребень
Intermediate sacral crest|Промежуточный крестцовый гребень
Lateral sacral crest|Латеральный крестцовый гребень
Intervertebral foramina|Межпозвоночные отверстия
Sacral horn|Крестцовый рог
Transverse ridges|Поперечные линии крестца
Sacral canal|Крестцовый канал
Dorsal surface of sacrum|Дорсальная поверхность крестца
Sacral tuberosity|Крестцовая бугристость
Sacral hiatus|Крестцовая щель
Pelvic surface of sacrum|Тазовая поверхность крестца
Promontory|Мыс
Auricular surface of sacrum|Ушковидная поверхность крестца
Anterior articular facet of dens axis|Передняя суставная поверхность зуба осевого позвонка
Posterior articular facet of dens axis|Задняя суставная поверхность зуба осевого позвонка
Apex of dens axis|Верхушка зуба осевого позвонка
Dens axis|Зуб осевого позвонка
Groove for spinal nerve|Борозда спинномозгового нерва
Posterior tubercle of transverse process|Задний бугорок поперечного отростка
Anterior tubercle of transverse process|Передний бугорок поперечного отростка
Foramen transversarium|Отверстие поперечного отростка
Uncinate process of vertebra|Крючковидный отросток позвонка
Cervical vertebra|Шейный позвонок
(Canal for vertebral artery)|Канал позвоночной артерии (вариант)
Lateral mass|Латеральная масса атланта
Groove for vertebral artery|Борозда позвоночной артерии
Facet for dens|Ямка зуба
Transverse ligament tubercle|Бугорок поперечной связки атланта
Vertebra|Позвонок
Superior vertebral notch|Верхняя позвоночная вырезка
Inferior vertebral notch|Нижняя позвоночная вырезка
Vertebral foramen|Позвоночное отверстие
Spinous process|Остистый отросток
Lateral part of transverse process|Латеральная часть поперечного отростка
Costal part of transverse process|Рёберная часть поперечного отростка
Intervertebral surface|Межпозвоночная поверхность
Transverse process|Поперечный отросток
Intervertebral foramen|Межпозвоночное отверстие
Vertebral arch|Дуга позвонка
Vertebral body|Тело позвонка
Annular epiphysis|Кольцевой эпифиз
Uncinate process of first thoracic vertebra|Крючковидный отросток I грудного позвонка
Thoracic vertebra|Грудной позвонок
Superior costal facet|Верхняя рёберная ямка
Inferior costal facet|Нижняя рёберная ямка
Transverse costal facet|Рёберная ямка поперечного отростка
Coccygeal horn|Копчиковый рог
Coccyx|Копчик
Mandibular dental arch|Нижняя зубная дуга
Mylohyoid line|Челюстно-подъязычная линия
Mental protuberance|Подбородочный выступ
Sublingual fossa|Подъязычная ямка
Genion|Генион
Digastric fossa|Двубрюшная ямка
Mental foramen|Подбородочное отверстие
Inferior mental spine|Нижняя подбородочная ость
Superior mental spine|Верхняя подбородочная ость
Mental tubercle|Подбородочный бугорок
(Mandibular symphysis)|Симфиз нижней челюсти (вариант)
Gnathion|Гнатион
Articular facet for malleus|Суставная поверхность для молоточка
Long limb of incus|Длинная ножка наковальни
Lenticular process of incus|Чечевицеобразный отросток наковальни
Articular facet for stapes|Суставная поверхность для стремени
Articular facet of head of stapes|Суставная поверхность головки стремени
Posterior limb of stapes|Задняя ножка стремени
Anterior limb of stapes|Передняя ножка стремени
Articular facet of head of malleus|Суставная поверхность головки молоточка
Handle of malleus|Рукоятка молоточка
Mastoid process|Сосцевидный отросток
Tegmen tympani|Крыша барабанной полости
Arcuate eminence|Дугообразное возвышение
Posterior surface of petrous part|Задняя поверхность каменистой части
Anterior surface of petrous part|Передняя поверхность каменистой части
Mastoid notch|Сосцевидная вырезка
Apex of petrous part|Верхушка каменистой части
Maxillary dental arch|Верхняя зубная дуга
Supreme nuchal line|Наивысшая выйная линия
Jugular process|Яремный отросток
Occipital plane|Затылочная площадка
External occipital protuberance|Наружный затылочный выступ
Occipital condyle|Затылочный мыщелок
Pharyngeal tubercle|Глоточный бугорок
Cerebral fossa|Мозговая ямка
(External occipital crest)|Наружный затылочный гребень (вариант)
Cruciform eminence|Крестообразное возвышение
Superior nuchal line|Верхняя выйная линия
Condylar canal|Мыщелковый канал
Hypoglossal canal|Канал подъязычного нерва
(Vermian fossa)|Ямка червя (вариант)
Condylar fossa|Мыщелковая ямка
Groove for marginal sinus|Борозда краевого синуса
Inferior nuchal line|Нижняя выйная линия
Internal occipital protuberance|Внутренний затылочный выступ
(Internal occipital crest)|Внутренний затылочный гребень (вариант)
Groove for occipital sinus|Борозда затылочного синуса
Foramen magnum|Большое отверстие
Groove for transverse sinus|Борозда поперечного синуса
Cerebellar fossa|Мозжечковая ямка
Superior temporal line|Верхняя височная линия
Inferior temporal line|Нижняя височная линия
Parietal foramen|Теменное отверстие
Parietal eminence|Теменной бугор
Groove for middle meningeal artery|Борозда средней оболочечной артерии
Trochlear fovea|Блоковая ямка
Internal surface of squamous part of frontal bone|Внутренняя поверхность лобной чешуи
External surface of squamous part of frontal bone|Наружная поверхность лобной чешуи
(Supra-orbital notch)|Надглазничная вырезка (вариант)
Opening of frontal sinus|Апертура лобной пазухи
(Trochlear spine)|Блоковая ость (вариант)
Temporal line|Височная линия
Frontal eminence|Лобный бугор
Glabella|Надпереносье
Frontal part of orbital margin|Лобная часть глазничного края
Fossa for lacrimal gland|Ямка слёзной железы
Frontal crest|Лобный гребень
Septum of frontal sinuses|Перегородка лобных пазух
Ethmoidal notch|Решётчатая вырезка
Superciliary arch|Надбровная дуга
(Middle clinoid process)|Средний наклонённый отросток (вариант)
Orbital surface of greater wing|Глазничная поверхность большого крыла
Limbus of sphenoid|Клиновидный край
Posterior clinoid process|Задний наклонённый отросток
Pterygoid process|Крыловидный отросток
Lateral pterygoid plate|Латеральная пластинка крыловидного отростка
Pterygoid notch|Крыловидная вырезка
Sella turcica|Турецкое седло
Squamosal margin of greater wing|Чешуйчатый край большого крыла
Cerebral surface of greater wing|Мозговая поверхность большого крыла
Infratemporal surface of greater wing|Подвисочная поверхность большого крыла
Greater wing|Большое крыло
Groove of pterygoid hamulus|Борозда крыловидного крючка
Parietal margin of greater wing|Теменной край большого крыла
Foramen ovale|Овальное отверстие
Pterygoid canal|Крыловидный канал
Optic canal|Зрительный канал
Dorsum sellae|Спинка седла
Temporal surface of greater wing|Височная поверхность большого крыла
Scaphoid fossa|Ладьевидная ямка
Maxillary surface of greater wing|Верхнечелюстная поверхность большого крыла
Chiasmatic sulcus|Борозда перекрёста
Zygomatic margin of greater wing|Скуловой край большого крыла
Anterior clinoid process|Передний наклонённый отросток
Tuberculum sellae|Бугорок седла
Foramen rotundum|Круглое отверстие
Sphenoidal lingula|Клиновидный язычок
Septum of sphenoidal sinuses|Перегородка клиновидных пазух
Carotid sulcus|Сонная борозда
Lesser wing|Малое крыло
Frontal margin of greater wing|Лобный край большого крыла
Medial pterygoid plate|Медиальная пластинка крыловидного отростка
Pterygospinous process|Крыловидно-остистый отросток
Pterygoid fossa|Крыловидная ямка
Sphenoidal yoke|Клиновидное возвышение
Foramen spinosum|Остистое отверстие
Pterygoid hamulus|Крыловидный крючок
Hypophysial fossa|Гипофизарная ямка
Sulcus of auditory tube|Борозда слуховой трубы
Sphenoidal crest|Клиновидный гребень
Rib|Ребро
Costal groove|Борозда ребра
Clavicular notch|Ключичная вырезка
Manubrium of sternum|Рукоятка грудины
Costal notches|Рёберные вырезки
Sternal angle|Угол грудины
Xiphoid process|Мечевидный отросток
Radial notch|Лучевая вырезка
Trochlear notch|Блоковидная вырезка
Sublime tubercle|Венечный бугорок
Supinator crest|Гребень мышцы-супинатора
Coronoid process of ulna|Венечный отросток локтевой кости
Olecranon|Локтевой отросток
Ulnar styloid process|Шиловидный отросток локтевой кости
Greater tubercle|Большой бугорок
Lesser tubercle|Малый бугорок
Radial fossa|Лучевая ямка
Lateral supracondylar ridge|Латеральный надмыщелковый гребень
Medial supracondylar ridge|Медиальный надмыщелковый гребень
Crest of lesser tubercle|Гребень малого бугорка
Crest of greater tubercle|Гребень большого бугорка
Radial groove|Борозда лучевого нерва
Olecranon fossa|Ямка локтевого отростка
Coronoid fossa|Венечная ямка
Intertubercular sulcus|Межбугорковая борозда
Deltoid tuberosity|Дельтовидная бугристость
Capitulum of humerus|Головка мыщелка плечевой кости
Groove for ulnar nerve|Борозда локтевого нерва
Metacarpal base|Основание пястной кости
Radial styloid process|Шиловидный отросток лучевой кости
Radial tuberosity|Бугристость лучевой кости
Dorsal radial tubercle|Дорсальный бугорок лучевой кости
Suprastyloid crest|Надшиловидный гребень
Pronator tuberosity|Бугристость круглого пронатора
Grooves for extensor tendons|Борозды сухожилий разгибателей
Ulnar notch|Локтевая вырезка
Carpal articular surface|Запястная суставная поверхность
Infraspinous fossa|Подостная ямка
Scapular notch|Вырезка лопатки
Supraglenoid tubercle|Надсуставной бугорок
Coracoid process|Клювовидный отросток
Glenoid fossa|Суставная впадина
Deltoid tubercle|Дельтовидный бугорок
Subscapular fossa|Подлопаточная ямка
Supraspinous fossa|Надостная ямка
Acromial angle|Акромиальный угол
Glenoid process of scapula|Суставной отросток лопатки
Infraglenoid tubercle|Подсуставной бугорок
Acromion|Акромион
Clavicular facet|Ключичная суставная поверхность
Spinoglenoid notch|Остисто-суставная вырезка
Trapezoid line|Трапециевидная линия
Tuberosity for coracoclavicular ligament|Бугристость клювовидно-ключичной связки
Acromial facet|Акромиальная суставная поверхность
Sternal articular surface|Грудинная суставная поверхность
Acromial end|Акромиальный конец
Conoid tubercle|Конусовидный бугорок
Sternal end|Грудинный конец
Groove for subclavius muscle|Борозда подключичной мышцы
Impression for costoclavicular ligament|Вдавление рёберно-ключичной связки
Incus|Наковальня
Stapes|Стремя
Malleus|Молоточек
Sesamoid bones of foot|Сесамовидные кости стопы
`);
const genitives = pairs(`
tibia|большеберцовой кости
fibula|малоберцовой кости
femur|бедренной кости
humerus|плечевой кости
ulna|локтевой кости
radius|лучевой кости
scapula|лопатки
clavicle|ключицы
talus|таранной кости
calcaneus|пяточной кости
cuboid bone|кубовидной кости
navicular bone|ладьевидной кости
scaphoid bone|ладьевидной кости кисти
hamate bone|крючковидной кости
trapezium bone|кости-трапеции
hyoid bone|подъязычной кости
mandible|нижней челюсти
pubis|лобковой кости
ischium|седалищной кости
ilium|подвздошной кости
sacrum|крестца
coccyx|копчика
atlas|атланта
vertebra|позвонка
vertebral arch|дуги позвонка
incus|наковальни
stapes|стремени
malleus|молоточка
temporal bone|височной кости
occipital bone|затылочной кости
parietal bone|теменной кости
frontal bone|лобной кости
sphenoid bone|клиновидной кости
rib|ребра
linea aspera|шероховатой линии
iliac crest|подвздошного гребня
calcaneal tuberosity|пяточного бугра
hand|кисти
foot|стопы
`);
export function russianTerm(name) {
  if (basic[name]) return basic[name];
  for (const [suffix, ru] of Object.entries(genitives)) {
    const end = ` of ${suffix}`;
    if (name.endsWith(end) && basic[name.slice(0,-end.length)]) return `${basic[name.slice(0,-end.length)]} ${ru}`;
  }
  return '';
}
