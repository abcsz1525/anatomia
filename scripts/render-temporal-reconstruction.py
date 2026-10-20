"""Static inspection of the reconstruction: depth-sorted triangles, not browser QA."""
import sys,pathlib,json
R=pathlib.Path(__file__).resolve().parents[1];sys.path.insert(0,str(R.parent/'.anatomy-source/python-tools'))
import numpy as np
from PIL import Image,ImageDraw
out=Image.new('RGB',(1600,1200),'#edf0f1')
for col,folder,name in [(0,R/'public/models/bone-details/v1','temporal-bone-l'),(1,R/'public/models/temporal-reconstruction/v1','bone')]:
 d=json.loads((folder/('temporal-bone-l.json' if col==0 else 'detail.json')).read_text(encoding='utf8'));a=np.fromfile(folder/(name+'.bin'),dtype='<f4');tri=a[:d['vertexCount']*3].reshape(-1,3,3);n=a[d['vertexCount']*3:].reshape(-1,3,3).mean(1)
 for row,(normal,right,up,title) in enumerate([(np.array([1,0,0]),np.array([0,0,1]),np.array([0,1,0]),'Lateral (+X)'),(np.array([0,-1,0]),np.array([1,0,0]),np.array([0,0,1]),'Inferior (-Y)')]):
  im=Image.new('RGB',(800,600),'#edf0f1');draw=ImageDraw.Draw(im);coords=np.stack([400+(tri@right)*290,300-(tri@up)*290],axis=2);depth=tri.mean(1)@normal
  for f in np.argsort(depth):
   shade=.35+.65*abs(n[f]@normal);draw.polygon([tuple(x) for x in coords[f]],fill=tuple((np.array([226,207,174])*shade).astype(int)))
  draw.text((20,20),('Original' if col==0 else 'Approximate reconstruction')+' / '+title,fill='black');out.paste(im,(col*800,row*600))
out.save(R/'content/verification/temporal-reconstruction-comparison.png')
