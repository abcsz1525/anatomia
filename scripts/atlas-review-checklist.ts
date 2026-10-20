/** Independently maintained teaching checklist, NOT a claim to exhaust TA2.
 * Terms are regexes to accept older Latin synonyms in the authored model.
 * A term is satisfied by a named region, never by a directional zone.
 */
export const checklist:Record<string,string[]>={
 femur:['Caput','Fovea capitis','Collum','Trochanter major','Trochanter minor','Fossa trochanterica','Linea intertrochanterica','Crista intertrochanterica','Tuberositas glutea','Linea pectinea','Linea aspera','Labium mediale','Labium laterale','Linea supracondylaris medialis','Linea supracondylaris lateralis','Condylus medialis','Condylus lateralis','Epicondylus medialis','Epicondylus lateralis','Tuberculum adductorium','Fossa intercondylaris','Facies patellaris','Facies poplitea'],
 tibia:['Condylus medialis','Condylus lateralis','Tuberositas tibiae','Eminentia intercondylaris','Tuberculum intercondylare mediale','Tuberculum intercondylare laterale','Area intercondylaris anterior','Area intercondylaris posterior','Facies articularis fibularis','Linea musculi solei','Malleolus medialis','Incisura fibularis','Facies articularis inferior','Sulcus malleolaris'],
 fibula:['Caput','Apex capitis','Collum','Corpus','Facies articularis capitis','Malleolus lateralis','Fossa malleoli','Facies articularis malleoli','Sulcus malleolaris'],
 patella:['Basis','Apex','Facies anterior','Facies posterior','Facies articularis medialis','Facies articularis lateralis','Crista verticalis'],
 talus:['Caput','Collum','Corpus','Trochlea','Facies malleolaris medialis','Facies malleolaris lateralis','Facies articularis navicularis','Facies articularis calcanea anterior','Facies articularis calcanea media','Facies articularis calcanea posterior','Sulcus ossis tali','Processus posterior','Processus lateralis','Tuberculum mediale','Tuberculum laterale','Sulcus tendinis'],
 calcaneus:['Tuber calcanei','Processus medialis tuberis','Processus lateralis tuberis','Sustentaculum tali','Sulcus calcanei','Facies articularis talaris anterior','Facies articularis talaris media','Facies articularis talaris posterior','Facies articularis cuboidea','Trochlea fibularis','Sulcus tendinis flexoris','Sulcus tendinis musculi fibularis brevis','Sulcus tendinis musculi fibularis longi'],
 'navicular-bone':['Tuberositas','Facies articularis talaris','Facies articularis cuneiformis medialis','Facies articularis cuneiformis intermedia','Facies articularis cuneiformis lateralis'],
 'cuboid-bone':['Tuberositas','Sulcus tendinis','Facies articularis calcanea','Facies articularis ossis metatarsalis quarti','Facies articularis ossis metatarsalis quinti','Facies articularis ossis cuneiformis lateralis'],
 'medial-cuneiform-bone':['Facies articularis navicularis','Facies articularis ossis metatarsalis primi','Facies articularis ossis metatarsalis secundi','Facies articularis ossis cuneiformis intermedii'],
 'intermediate-cuneiform-bone':['Facies articularis navicularis','Facies articularis ossis metatarsalis secundi','Facies articularis ossis cuneiformis medialis','Facies articularis ossis cuneiformis lateralis'],
 'lateral-cuneiform-bone':['Facies articularis navicularis','Facies articularis ossis metatarsalis secundi','Facies articularis ossis metatarsalis tertii','Facies articularis ossis metatarsalis quarti','Facies articularis ossis cuneiformis intermedii','Facies articularis ossis cuboidei'],
 humerus:['Caput','Collum anatomicum','Collum chirurgicum','Tuberculum majus','Tuberculum minus','Crista tuberculi majoris','Crista tuberculi minoris','Sulcus intertubercularis','Tuberositas deltoidea','Sulcus nervi radialis','Crista supracondylaris lateralis','Crista supracondylaris medialis','Epicondylus lateralis','Epicondylus medialis','Sulcus nervi ulnaris','Trochlea','Capitulum','Fossa radialis','Fossa coronoidea','Fossa olecrani'],
 radius:['Caput','Fovea articularis','Circumferentia articularis','Collum','Tuberositas radii','Tuberculum dorsale','Processus styloideus','Incisura ulnaris','Facies articularis carpea','Sulci tendinum'],
 ulna:['Olecranon','Processus coronoideus','Incisura trochlearis','Incisura radialis','Tuberositas','Crista supinatoria','Fossa supinatoria','Facies anterior','Caput','Circumferentia articularis','Processus styloideus'],
 scapula:['Spina','Acromion','Processus coracoideus','Fossa glenoidea','Collum','Tuberculum supraglenoideum','Tuberculum infraglenoideum','Fossa subscapularis','Fossa supraspinata','Fossa infraspinata','Incisura scapulae','Incisura spinoglenoidea','Facies articularis clavicularis'],
 clavicle:['Extremitas sternalis','Extremitas acromialis','Facies articularis sternalis','Facies articularis acromialis','Tuberculum conoideum','Linea trapezoidea','Sulcus musculi subclavii','Impressio ligamenti costoclavicularis'],
 'hip-bone':['Crista iliaca','Spina iliaca anterior superior','Spina iliaca anterior inferior','Spina iliaca posterior superior','Spina iliaca posterior inferior','Fossa iliaca','Linea arcuata','Linea glutea anterior','Linea glutea posterior','Linea glutea inferior','Facies auricularis','Tuberositas iliaca','Acetabulum','Facies lunata','Fossa acetabuli','Incisura acetabuli','Foramen obturatum','Tuber ischiadicum','Spina ischiadica','Incisura ischiadica major','Incisura ischiadica minor','Tuberculum pubicum','Crista pubica','Pecten','Sulcus obturatorius','Facies symphysialis'],
 'scaphoid-bone':['Tuberculum','pro radio','pro osse lunato','pro osse capitato','pro osse trapezio','pro osse trapezoideo'],
 'lunate-bone':['pro radio','pro osse scaphoideo','pro osse triquetro','pro osse capitato'],
 'triquetrum-bone':['pro osse lunato','pro osse hamato','pro osse pisiformi'],
 'pisiform-bone':['pro osse triquetro'],
 'trapezium-bone':['Tuberculum','Sulcus tendinis','pro osse scaphoideo','pro osse trapezoideo','pro osse metacarpali I$','pro osse metacarpali II$'],
 'trapezoid-bone':['pro osse scaphoideo','pro osse trapezio','pro osse capitato','pro osse metacarpali II'],
 'capitate-bone':['Caput','Collum','Corpus','pro osse lunato','pro osse scaphoideo','pro osse trapezoideo','pro osse hamato','pro osse metacarpali II$','pro osse metacarpali III$','pro osse metacarpali IV$'],
 'hamate-bone':['Hamulus','pro osse triquetro','pro osse capitato','pro osse metacarpali IV','pro osse metacarpali V'],
 mandible:['Corpus mandibulae','Basis mandibulae','Pars alveolaris','Foramen mentale','Protuberantia mentalis','Tuberculum mentale','Spina mentalis superior','Spina mentalis inferior','Linea obliqua','Linea mylohyoidea','Fossa digastrica','Fovea sublingualis','Fovea submandibularis','Sulcus mylohyoideus','Fovea pterygoidea','Processus condylaris','Ramus mandibulae','Caput mandibulae','Collum mandibulae','Processus coronoideus','Incisura mandibulae','Foramen mandibulae','Lingula','Tuberositas masseterica','Tuberositas pterygoidea'],
 maxilla:['Corpus','Processus frontalis','Processus zygomaticus','Processus palatinus','Processus alveolaris','Foramen infraorbitale','Sulcus infraorbitalis','Fossa canina','Tuber maxillae','Spina nasalis anterior','Hiatus maxillaris','Sulcus lacrimalis','Crista lacrimalis anterior','Crista conchalis','Crista ethmoidalis','Sulcus palatinus major','Foramina alveolaria','Canalis incisivus'],
 'palatine-bone':['Lamina horizontalis','Lamina perpendicularis','Processus pyramidalis','Processus orbitalis','Processus sphenoidalis','Incisura sphenopalatina','Foramen palatinum majus','Foramina palatina minora','Spina nasalis posterior','Crista conchalis','Crista ethmoidalis','Sulcus palatinus major','Crista nasalis'],
 'temporal-bone':['Pars squamosa','Pars petrosa','Pars tympanica','Processus mastoideus','Processus styloideus','Processus zygomaticus','Fossa mandibularis','Tuberculum articulare','Meatus acusticus externus','Meatus acusticus internus','Apertura externa canalis carotici','Apertura interna canalis carotici','Foramen stylomastoideum','Fossa jugularis','Sulcus sinus sigmoidei','Hiatus canalis nervi petrosi majoris','Hiatus canalis nervi petrosi minoris','Impressio trigeminalis','Fissura petrotympanica','Foramen mastoideum'],
 'sphenoid-bone':['Corpus','Ala major','Ala minor','Sella turcica','Fossa hypophysialis','Dorsum sellae','Tuberculum sellae','Canalis opticus','Foramen rotundum','Foramen ovale','Foramen spinosum','Fissura orbitalis superior','Processus pterygoideus','Lamina lateralis','Lamina medialis','Hamulus','Fossa pterygoidea','Fossa scaphoidea','Canalis pterygoideus','Sulcus carotidis','Crista infratemporalis'],
 'occipital-bone':['Foramen magnum','Condylus','Canalis hypoglossus','Canalis condylaris','Protuberantia occipitalis externa','Protuberantia occipitalis interna','Crista occipitalis externa','Crista occipitalis interna','Linea nuchalis superior','Linea nuchalis inferior','Incisura jugularis','Tuberculum pharyngeum','Sulcus sinus transversi'],
 'frontal-bone':['Glabella','Arcus superciliaris','Incisura supraorbitalis','Fossa glandulae lacrimalis','Fovea trochlearis','Crista frontalis','Foramen caecum','Incisura ethmoidea','Processus zygomaticus','Spina nasalis'],
 'parietal-bone':['Eminentia parietalis','Linea temporalis superior','Linea temporalis inferior','Foramen parietale','Sulcus arteriae meningeae','Sulcus sinus sagittalis superioris'],
 'ethmoid-bone':['Crista galli','Lamina cribrosa','Foramina cribrosa','Lamina perpendicularis','Labyrinthus','Lamina orbitalis','Concha nasalis media','Concha nasalis superior','Processus uncinatus','Bulla ethmoidalis'],
 'zygomatic-bone':['Processus frontalis','Processus temporalis','Foramen zygomaticofaciale','Foramen zygomaticotemporale','Foramen zygomaticoorbitale'],
 'lacrimal-bone':['Crista lacrimalis posterior','Sulcus lacrimalis','Hamulus lacrimalis'],
 'nasal-bone':['Sulcus ethmoidalis','Margo frontalis','Margo maxillaris'],
 'inferior-nasal-concha-bone':['Processus lacrimalis','Processus ethmoidalis','Processus maxillaris'],
 vomer:['Ala vomeris','Sulcus vomeris'],
 malleus:['Caput','Collum','Manubrium','Processus anterior','Processus lateralis','Facies articularis'],
 incus:['Corpus','Crus longum','Crus breve','Processus lenticularis','Facies articularis mallearis'],
 stapes:['Caput stapedis','Collum stapedis','Crus anterius','Crus posterius','Basis','Facies articularis'],
 'hyoid-bone':['Corpus','Cornu majus','Cornu minus'],
 'atlas-c1':['Arcus anterior','Arcus posterior','Massa lateralis','Tuberculum anterius','Tuberculum posterius','Fovea dentis','Sulcus arteriae vertebralis','Foramen transversarium','Facies articularis superior','Facies articularis inferior'],
 'axis-c2':['Dens axis','Apex dentis','Facies articularis anterior dentis','Facies articularis posterior dentis','Corpus vertebrae','Foramen vertebrale','Processus spinosus','Processus transversus','Foramen transversarium','Facies articulares superiores','Facies articularis inferior','Processus articularis inferior'],
 sacrum:['Basis','Apex','Promontorium','Ala','Canalis sacralis','Hiatus sacralis','Cornu sacrale','Foramina sacralia anteriora','Foramina sacralia posteriora','Crista sacralis mediana','Crista sacralis medialis','Crista sacralis lateralis','Facies auricularis','Tuberositas','Lineae transversae'],
 coccyx:['Basis','Apex','Cornu','Processus transversus'],
 'manubrium-of-sternum':['Incisura jugularis','Incisura clavicularis','Incisura costalis I','Incisura costalis II'],
 'body-of-sternum':['Incisurae costales','Angulus sterni','Lineae transversae'],
 'xiphoid-process':['Basis','Apex'],
 'sesamoid-bones-of-foot':['Facies articulares'],
};
export function requirements(id:string):{family:string;terms:string[]}{
 const family=id.replace(/-[lr]$/,'');
 if(checklist[family])return {family,terms:checklist[family]};
 if(id.includes('phalanx'))return {family:'phalanges',terms:['Basis','Corpus',...(id.startsWith('distal')?['Tuberositas']:['Caput','Trochlea|Facies articularis capitis']), 'Facies articularis basis']};
 if(id.includes('metatarsal-bone'))return {family:'metatarsals',terms:['Basis','Corpus','Caput','Collum','Facies articularis capitis',...(id.startsWith('fifth')?['Tuberositas']:[])]};
 if(id.includes('metacarpal-bone')){
  const partners:Record<string,string[]>={first:['osse trapezio'],second:['osse trapezio','osse trapezoideo','osse capitato','osse metacarpali III'],third:['osse capitato','osse metacarpali II','osse metacarpali IV'],fourth:['osse hamato','osse capitato','osse metacarpali III','osse metacarpali V'],fifth:['osse hamato','osse metacarpali IV']};
  const facets=partners[id.split('-')[0]].map(s=>'Facies articularis pro '+s+'$');
  return {family:'metacarpals',terms:['Basis','Corpus','Caput','Collum','Facies articularis capitis','Facies articularis basis',...(id.startsWith('third')?['Processus styloideus']:[]),...facets]};
 }
 if(id.includes('-rib-')){
  const n=id.split('-')[0],floating=['eleventh','twelfth'].includes(n);
  return {family:'ribs',terms:['Caput','Corpus','Facies articularis capitis|Facies articulares capitis',...(!floating?['Collum','Tuberculum costae','Facies articularis tuberculi']:[]),...(!['first','tenth','eleventh','twelfth'].includes(n)?['Crista capitis']:[]),...(!['first','twelfth'].includes(n)?['Sulcus costae','Angulus costae']:[]),...(n==='first'?['Tuberculum musculi scaleni','Sulcus arteriae subclaviae','Sulcus venae subclaviae']:[])]};
 }
 if(id.startsWith('vertebra-')){
  const level=id.split('-')[1];
  return {family:'vertebrae',terms:['Corpus','Arcus','Pediculus','Lamina','Foramen vertebrale','Processus spinosus','Processus transversus','Processus articularis superior','Processus articularis inferior','Facies articularis superior','Facies articularis inferior',...(level[0]==='c'?['Foramen transversarium','Processus uncinatus']:level[0]==='t'?['Fovea costalis',...(+level.slice(1)<11?['Fovea costalis processus transversi']:[])]:['Processus mammillaris','Processus accessorius'])]};
 }
 throw Error('No independent checklist for '+id);
}
const K='https://www.kenhub.com/en/library/anatomy/';
export function reference(family:string):string{
 const pages:Record<string,string>={mandible:'the-mandible',maxilla:'the-maxilla','palatine-bone':'the-palatine-bone','temporal-bone':'the-temporal-bone','sphenoid-bone':'the-sphenoid-bone',malleus:'auditory-ossicles',incus:'auditory-ossicles',stapes:'auditory-ossicles',metacarpals:'the-metacarpal-bones',phalanges:'the-phalanges',vertebrae:'the-vertebral-column-spine',ribs:'the-ribs',ulna:'the-radius-and-the-ulna',radius:'the-radius-and-the-ulna','ethmoid-bone':'the-ethmoid-bone'};
 if(pages[family])return K+pages[family];
 if(/scaphoid|lunate|triquetrum|pisiform|trapezium|trapezoid|capitate|hamate/.test(family))return K+'carpal-bones';
 const O='https://openstax.org/books/anatomy-and-physiology-2e/pages/';
 if(/^(femur|tibia|fibula|patella|talus|calcaneus|metatarsals|navicular-bone|cuboid-bone|.*cuneiform-bone|sesamoid-bones-of-foot)$/.test(family))return O+'8-4-bones-of-the-lower-limb';
 if(family==='humerus')return O+'8-2-bones-of-the-upper-limb';
 if(/clavicle|scapula/.test(family))return O+'8-1-the-pectoral-girdle';
 if(family==='hip-bone')return O+'8-3-the-pelvic-girdle-and-pelvis';
 if(/sacrum|coccyx|atlas-c1|axis-c2/.test(family))return O+'7-3-the-vertebral-column';
 if(/sternum|xiphoid/.test(family))return O+'7-4-the-thoracic-cage';
 return O+'7-2-the-skull';
}
