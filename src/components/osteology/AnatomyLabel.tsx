import { latinWords, stressOf, transcribe, type StressMap } from '@/lib/latin';
import stressDictionary from '../../../content/latin-stress.json';
import boneStress from '../../../content/bone-latin-stress.json';
import draftStress from '../../../content/bone-latin-stress-draft.json';
import type { BoneLandmark } from '@/lib/osteology/types';

const checked={...stressDictionary,...boneStress} as StressMap;
const map={...draftStress,...checked} as StressMap;

export function AnatomyLabel({landmark}:{landmark:BoneLandmark}) {
  const missing=latinWords(landmark.la).filter(w=>stressOf(w,map)===null);
  const provisional=latinWords(landmark.la).filter(w=>stressOf(w,checked)===null&&stressOf(w,map)!==null);
  return <div className="space-y-1" data-testid="surface-label">
    <p className="font-semibold">{landmark.ru}</p>
    <p className="italic">{landmark.la}</p>
    <p className="text-sm">[{transcribe(landmark.la,map)}]</p>
    {landmark.accuracy==='approximate'&&<div className="text-sm text-amber-900"><p className="font-semibold">Приблизительная область</p><p>{landmark.accuracyNote}</p></div>}
    {!!provisional.length&&<p className="text-xs text-amber-900">Предварительное ударение по правилам чтения: {provisional.join(', ')}. Словарная проверка ещё не выполнена.</p>}
    {!!missing.length&&<p className="text-xs opacity-75">Ударение ещё не проверено: {missing.join(', ')}</p>}
  </div>;
}
