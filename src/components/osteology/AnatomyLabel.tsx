import { latinWords, stressOf, transcribe, type StressMap } from '@/lib/latin';
import stressDictionary from '../../../content/latin-stress.json';
import boneStress from '../../../content/bone-latin-stress.json';
import type { BoneLandmark } from '@/lib/osteology/types';

export function AnatomyLabel({landmark}:{landmark:BoneLandmark}) {
  const map={...stressDictionary,...boneStress} as StressMap;
  const missing=latinWords(landmark.la).filter(w=>stressOf(w,map)===null);
  return <div className="space-y-1" data-testid="surface-label">
    <p className="font-semibold">{landmark.ru}</p>
    <p className="italic">{landmark.la}</p>
    <p className="text-sm">[{transcribe(landmark.la,map)}]</p>
    {!!missing.length&&<p className="text-xs opacity-75">Ударение ещё не проверено: {missing.join(', ')}</p>}
  </div>;
}
