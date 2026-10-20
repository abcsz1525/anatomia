"""Offline orthographic geometry inspection, not an anatomical validation."""
import sys,pathlib,json
ROOT=pathlib.Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT.parent/".anatomy-source/python-tools"))
import numpy as np
from PIL import Image,ImageDraw
p=ROOT/"public/models/openear/theta"
m=json.loads((p/"manifest.json").read_text())
item=next(x for x in m["items"] if x["id"]=="bone")
n=item["vertexCount"]
raw=np.fromfile(p/"bone.bin",dtype="<f4")
tri=raw[:n*3].reshape(-1,3,3)
normal=raw[n*3:].reshape(-1,3,3)[:,0]
out=Image.new("RGB",(1500,1000),"#edf0f1")
for k,(axis,sign) in enumerate([(0,1),(0,-1),(1,1),(1,-1),(2,1),(2,-1)]):
    a,b=[i for i in range(3) if i!=axis]
    depth=tri[:,:,axis].mean(1)*sign
    # Painter's projection. All faces are kept, matching the double-sided viewer.
    light=np.abs(normal[:,axis])*.7+.3
    coords=tri[:,:,[a,b]]*210
    coords[:,:,0]=250+coords[:,:,0]
    coords[:,:,1]=250-coords[:,:,1]
    im=Image.new("RGB",(500,500),"#edf0f1");d=ImageDraw.Draw(im)
    for f in np.argsort(depth):
        color=tuple((np.array([218,199,167])*light[f]).astype(int))
        d.polygon([tuple(x) for x in coords[f]],fill=color)
    d.text((10,10),f"axis {axis} sign {sign}",fill="black")
    out.paste(im,((k%3)*500,(k//3)*500))
out.save(ROOT/"content/verification/openear-six-views.png")
