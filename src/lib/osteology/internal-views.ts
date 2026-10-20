import type { SectionSide } from './section';

type InternalView = {
  view: 'posterior' | 'medial' | 'lateral';
  section: SectionSide;
  offset: number;
};

// Presets verified against the bundled geometry. Cuts expose existing surfaces;
// they do not represent anatomical boundaries or change the region masks.
export const internalViews: Readonly<Record<string, InternalView>> = {
  'sphenoid-bone-pterygoid-canal-17': {view:'posterior',section:'posterior',offset:0.12},
  'sacrum-sacral-canal-7': {view:'posterior',section:'posterior',offset:0.35},
  'ethmoid-bone-anatomy-left-superior-concha': {view:'lateral',section:'left',offset:0.32},
  'ethmoid-bone-anatomy-right-superior-concha': {view:'medial',section:'right',offset:0.32},
  'ethmoid-bone-atlas-gap-bulla-1': {view:'lateral',section:'left',offset:0.32},
  'ethmoid-bone-atlas-gap-bulla--1': {view:'medial',section:'right',offset:0.32},
};
