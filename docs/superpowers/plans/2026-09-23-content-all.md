# План 2a.2: перевод всех остальных систем — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Все 2234 структуры модели получают латынь (TA2), русский (Сапин) и тему; «Перевод в работе» исчезает из атласа; тесты покрывают ангиологию, неврологию, спланхнологию и органы чувств.

**Architecture:** Тот же конвейер, что в Плане 2a: `content/structures.csv` → `pnpm build:content` (валидация) → `public/content/*.json`. Курсовыми становятся все 15 систем модели (правило полноты). Дерево тем расширяется четырьмя разделами второго курса. Темы назначаются по анатомическому смыслу, потому что системы BodyParts3D неточны (желудочки мозга в `cardiac`, мышцы глотки в `respiratory`, слёзная кость в `sensory`).

**Tech Stack:** без новых зависимостей.

**Spec:** `docs/superpowers/specs/2026-09-22-anatomia-mvp-design.md` §2 (расширение рамок: перевод всех систем), §5.

## Global Constraints

- Правила CSV как в Плане 2a: `id`,`en` байт-в-байт из `content/source/names-<system>.tsv`; `la`/`ru` без стороны; `ru` с заглавной; темы — только листья `topics.json`; сортировка по id (`LC_ALL=C`); поля с запятой в кавычках; синонимы через `;`.
- Латынь TA2: `Arteria axillaris`, `Ramus deltoideus arteriae thoracoacromialis`, `Vena saphena magna`, `Nervus opticus`, `Ganglion ciliare`, `Gyrus precentralis`, `Ventriculus lateralis`, `Valva mitralis, cuspis anterior`, `Bronchus segmentalis apicalis`, `Lobus caudatus hepatis`, `Ductus choledochus`, `Ren`, `Vesica urinaria`, `Glandula pinealis`, `Splen`, `Cornea`, `Auricula`. Русский по Сапину: `Подмышечная артерия`, `Большая подкожная вена ноги`, `Зрительный нерв`, `Ресничный узел`, `Предцентральная извилина`, `Боковой желудочек`, `Митральный клапан, передняя створка`, `Верхушечный сегментарный бронх`, `Хвостатая доля печени`, `Общий жёлчный проток`, `Почка`, `Мочевой пузырь`, `Шишковидное тело`, `Селезёнка`, `Роговица`, `Ушная раковина`.
- Каждый лист темы (кроме `other`) — ≥ 4 различных `la`. Если партия обнаруживает, что лист не набирает 4, исполнитель сливает его с соседом и правит `topics.json`, объясняя в отчёте.
- «Set of …» меши — множественное число (`Venae intercostales anteriores`/`Передние межрёберные вены`), как в 2a.
- Dev-сервер пользователя на :3000 не трогать. Коммиты по явным путям с трейлером `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`.

## Дерево тем второго курса (добавить в `content/topics.json`)

```
angiology       Ангиология / Angiologia
  heart              Сердце / Cor                          — клапаны, стенки, полости; сосочковые мышцы (из other)
  arteries-head-neck Артерии головы и шеи / Arteriae capitis et colli — включая мозговые артерии
  arteries-trunk     Артерии груди, живота и таза / Arteriae trunci
  arteries-limbs     Артерии конечностей / Arteriae membrorum
  veins-head-neck    Вены головы и шеи / Venae capitis et colli
  veins-trunk        Вены груди, живота и таза / Venae trunci — включая воротную и печёночные вены
  veins-limbs        Вены конечностей / Venae membrorum
neurology       Неврология / Neurologia
  cns                Головной и спинной мозг / Encephalon et medulla spinalis — извилины, ядра, белое вещество, ствол, мозжечок, желудочки (из cardiac), сосудистое сплетение, намёт мозжечка, центральный канал
  cranial-nerves     Черепные нервы и глазница / Nervi craniales — зрительный, глазодвигательный, блоковый, глазной нерв и ветви, ресничный узел
splanchnology   Спланхнология / Splanchnologia
  respiratory        Дыхательная система / Systema respiratorium — трахея, бронхи, бронхиальные деревья (сегментарные)
  digestive          Пищеварительная система / Systema digestorium — язык, железы, глотка и её мышцы (из respiratory), пищевод…, печень и протоки, брыжейки; дёсны (из other)
  urogenital         Мочеполовая система / Systema urogenitale
  glands             Эндокринные и лимфоидные органы / Glandulae — шишковидное тело, гипофиз, надпочечник, селезёнка, тимус
sense           Органы чувств и кожа / Organa sensuum
  eye                Орган зрения / Organum visus — глазное яблоко, слёзный аппарат, хрящи век, общее сухожильное кольцо
  ear-skin           Ухо и кожа / Auris et cutis — ушная раковина, кожа, бровь, волосы, губа
```
Уже переведённые части других систем (слёзная кость, носовые хрящи, надгортанник, удерживатель сгибателей) остаются в своих темах.

---

### Task 1: Настройка — темы, полнота по всем системам, экспорт имён, контекст тестов

**Files:** Modify `content/topics.json`, `scripts/content-rules.ts` (+test), `scripts/export-names.ts`, `src/lib/quiz/pool.ts` (+test), `content/structures.csv` (5 сосочковых мышц → `heart`, 2 дёсны → `digestive`).

- `COURSE_SYSTEMS` = все 15 id из `SYSTEMS` (`src/lib/atlas/systems.ts`); правило 7 теперь требует все 2234 части. `other` может быть пустой.
- `pnpm export:names` пишет TSV для всех 15 систем; закоммитить новые `content/source/names-*.tsv`.
- `contextIds`: скелет как контекст для тем с родителем ∈ {`myology`, `arthrology`, `angiology`}; для `neurology`, `splanchnology`, `sense` контекста нет (череп закрыл бы мозг и глаз). Тест обновить.
- `pnpm build:content --report` → 747/2234 суммарно (по системам: skeletal 296/296, connective 40/40, muscular 402/402, остальные 0/N, кроме уже переведённых респираторных/сенсорных частей), `other errors: 0`.
- `pnpm test` зелёный (`content-rules.test.ts`, `pool.test.ts` обновлены). `pnpm build` временно падает на prebuild (ожидаемо до Task 9) — dev-сервер не затронут.
- commit `feat(content): second-year topics; completeness over all systems`.

### Task 2: Артерии головы, шеи и мозга (`arteries-head-neck`)
Строки `names-arterial.tsv`: сонные, позвоночная, базилярная, мозговые и их ветви, глазная, лицевая, височная, верхнечелюстная, щитовидные, язычная, затылочная и т.д. Латынь `Arteria cerebri media, pars sphenoidalis`; `Ramus paracentralis arteriae callosomarginalis`; русский `Средняя мозговая артерия, клиновидная часть`; `Парацентральная ветвь каллозомаргинальной артерии`. commit `content: arteries of head, neck and brain (ru/la)`.

### Task 3: Артерии туловища и конечностей (`arteries-trunk`, `arteries-limbs`) — всё оставшееся в `names-arterial.tsv`
Аорта и ветви, межрёберные, чревный ствол и ветви, брыжеечные, почечные, подвздошные, подмышечная/плечевая/лучевая/локтевая/ладонные дуги, бедренная/подколенная/берцовые/подошвенные. После задачи `arterial: 639/639`. commit `content: arteries of trunk and limbs (ru/la)`.

### Task 4: Вены головы, шеи и туловища (`veins-head-neck`, `veins-trunk`)
Яремные, лицевая, синусы твёрдой оболочки (если есть), полые вены, непарная/полунепарная, межрёберные, воротная вена и ветви, печёночные вены и «hepatovenous segment I–IX» (`Segmentum hepatovenosum I` / `Печёночно-венозный сегмент I`? — предпочесть `Vena hepatica, segmentum I`; объяснить выбор), почечные, подвздошные, вены таза и половых органов. commit `content: veins of head, neck and trunk (ru/la)`.

### Task 5: Вены конечностей (`veins-limbs`) — всё оставшееся в `names-venous.tsv`
Подмышечная, плечевые, головная, царская, ладонные/тыльные сети, бедренная, подколенная, большая/малая подкожные, берцовые, подошвенные. После задачи `venous: 404/404`. commit `content: veins of limbs (ru/la)`.

### Task 6: Мозг и черепные нервы (`cns`, `cranial-nerves`) — `names-nervous.tsv` целиком + желудочки мозга из `names-cardiac.tsv` (Third/Fourth/lateral ventricle, Interventricular foramen) + choroid plexus из `names-sensory.tsv` + Tentorium cerebelli
Латынь TA2 для извилин/ядер: `Gyrus precentralis`, `Lobulus parietalis superior`, `Nucleus caudatus`, `Capsula interna`, `Corpus callosum`, `Fornix`, `Commissura anterior`, `Corpus mammillare`, `Hypothalamus`, `Thalamus`, `Corpus geniculatum laterale`, `Colliculus superior`, `Pedunculus cerebri`, `Pons`, `Medulla oblongata`, `Cerebellum`, `Ventriculus lateralis`, `Foramen interventriculare`, `Aqueductus mesencephali`, `Canalis centralis`, `Plexus choroideus ventriculi lateralis`, `Tentorium cerebelli`, `Insula`. Нервы: `Nervus opticus`, `Nervus oculomotorius, ramus superior/inferior`, `Nervus trochlearis`, `Nervus ophthalmicus`, `Nervus frontalis`, `Nervus lacrimalis`, `Nervus nasociliaris`, `Nervi ciliares longi/breves`, `Ganglion ciliare`, `Nervus supraorbitalis`, `Nervus supratrochlearis`, `Nervus infratrochlearis`, `Nervus ethmoidalis anterior/posterior`, `Chiasma opticum`, `Tractus opticus`. После задачи `nervous: 139/139`. commit `content: brain and cranial nerves (ru/la)`.

### Task 7: Дыхательная и пищеварительная системы (`respiratory`, `digestive`)
`names-respiratory.tsv` (кроме уже переведённых): `Trachea`, `Bronchus principalis`, сегментарные бронхиальные деревья (`Bronchus segmentalis apicalis` / `Верхушечный сегментарный бронх`, lingular — `Bronchus lingularis superior/inferior` / `Верхний/Нижний язычковый бронх`), мышцы глотки → `digestive` (`Musculus constrictor pharyngis superior` / `Верхний констриктор глотки`, `Musculus stylopharyngeus`, `Musculus palatopharyngeus`, `Musculus salpingopharyngeus`). `names-digestive.tsv` целиком: `Lingua`, `Glandula sublingualis/submandibularis`, `Oesophagus`, `Gaster`, `Duodenum`, `Jejunum, pars proximalis/media/distalis`, `Ileum …`, `Junctio ileocaecalis`? (лучше `Ostium ileale`/`Илеоцекальный переход` — объяснить), `Appendix vermiformis`, `Colon ascendens/transversum/descendens`, `Taenia libera/mesocolica/omentalis`, `Rectum`, печень: `Lobus caudatus hepatis`, `Vesica biliaris`, `Ductus hepaticus communis`, `Ductus cysticus`, `Ductus choledochus`; ветви жёлчного дерева (`Ramus anterior superior arboris biliaris`? — предпочесть `Ductus segmenti …` с пояснением), `Pancreas`, `Ductus pancreaticus`, `Mesenterium`, `Mesoappendix`, `Mesocolon transversum`. commit `content: respiratory and digestive systems (ru/la)`.

### Task 8: Сердце, мочеполовая, железы, органы чувств, кожа (`heart`, `urogenital`, `glands`, `eye`, `ear-skin`)
Сердце из `names-cardiac.tsv` (кроме желудочков мозга): `Valva mitralis, cuspis anterior/posterior`, `Valva tricuspidalis, cuspis anterior/posterior/septalis`, `Valva aortae, valvula …`, `Valva trunci pulmonalis, valvula …`, `Paries ventriculi`, `Cavitas ventriculi`, `Paries atrii`, `Cavitas atrii`. `names-urinary.tsv`, `names-reproductive.tsv`: `Ren`, `Ureter`, `Vesica urinaria`, `Urethra`, `Testis`, `Epididymis`, `Ductus deferens`, `Vesicula seminalis`, `Prostata`, `Corpus cavernosum penis`, `Corpus spongiosum penis`, `Glans penis`. `names-endocrine.tsv` + `names-lymphatic.tsv` → `glands`. `names-sensory.tsv` (кроме уже переведённых и choroid plexus): `Camera anterior bulbi`, `Choroidea`, `Corona ciliaris`, `Cornea`, `Anulus tendineus communis`, `Iris`, `Canaliculus lacrimalis`, `Glandula lacrimalis`, `Lacus lacrimalis`, `Ductus nasolacrimalis`, `Lens`, `Saccus lacrimalis`, `Pars optica retinae`, `Sclera`, `Zonula ciliaris`, `Tarsus superior/inferior`, `Corpus vitreum`, `Auricula` → `ear-skin`. `names-integumentary.tsv`: `Cutis`, `Supercilium`, `Capilli`, `Labium oris`, `Pubes`. commit `content: heart, urogenital, glands, sense organs, skin (ru/la)`.

### Task 9: Финальная проверка и документация
- `pnpm build:content --report` → каждая система N/N, `other errors: 0`; `pnpm build:content` → `content ok: 2234 structures, <K> topics`; `pnpm build` проходит (prebuild).
- Проверить, что все листовые темы имеют ≥ 4 различных `la` (это делает сборка).
- Headless: `/atlas` клик по вене → карточка с латынью и русским; поиск «подмышечная» находит артерию и вену; `/quiz` показывает новые разделы; одна сессия «назови» по «Артерии конечностей» проходит; e2e 10/10.
- README «Контент»: обновить число структур/тем; спецификация §2: рамки расширены до всех систем; §5: дерево тем.
- commit `docs: all systems translated; topic tree`.

## Self-review
- Полнота: 15 систем → 8 партий + настройка + финал. Нетривиальные переносы (желудочки → cns, мышцы глотки → digestive, сосочковые → heart, дёсны → digestive) названы в задачах.
- Контракты: `COURSE_SYSTEMS` меняет только валидацию; `contextIds` — тест обновлён в Task 1.
