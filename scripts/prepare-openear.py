"""Prepare the licensed OpenEar THETA specimen for the local study viewer."""
import sys, pathlib, json, hashlib
ROOT = pathlib.Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT.parent / ".anatomy-source/python-tools"))
import numpy as np
from plyfile import PlyData

SRC = ROOT.parent / ".anatomy-source/openear/THETA"
OUT = ROOT / "public/models/openear/theta"
OUT.mkdir(parents=True, exist_ok=True)

def load(path):
    d = PlyData.read(str(path), known_list_len={"face":{"vertex_indices":3}})
    v = np.column_stack([d["vertex"][a] for a in ["x", "y", "z"]]).astype(np.float64)
    f = np.asarray(d["face"]["vertex_indices"], dtype=np.int32)
    return v, f

v, f = load(SRC / "Bone.ply")
print("Source", len(v), len(f), v.min(0), v.max(0), flush=True)
center = (v.min(0) + v.max(0)) / 2
scale = 2 / np.ptp(v, axis=0).max()
# Keep the authored specimen axes for review before any anatomical orientation.
items = []
for path in sorted(SRC.glob("*.ply")):
    vertices, faces = (v, f) if path.name == "Bone.ply" else load(path)
    count = len(faces)
    if count > 300000:
        # Bounded-memory vertex clustering. Avoid multi-GB QEM allocations on
        # the original 7.4M-face scan. Keep the original PLY for future LODs.
        for cell in [0.2, 0.25, 0.3, 0.4]:
            grid=np.floor((vertices-vertices.min(0))/cell).astype(np.int64)
            key=grid[:,0]+grid[:,1]*2048+grid[:,2]*2048*2048
            _, inv=np.unique(key,return_inverse=True)
            weights=np.bincount(inv)
            reduced=np.column_stack([np.bincount(inv,weights=vertices[:,a])/weights for a in range(3)])
            reduced_faces=inv[faces]
            valid=(reduced_faces[:,0]!=reduced_faces[:,1])&(reduced_faces[:,1]!=reduced_faces[:,2])&(reduced_faces[:,0]!=reduced_faces[:,2])
            reduced_faces=reduced_faces[valid]
            _,keep=np.unique(np.sort(reduced_faces,axis=1),axis=0,return_index=True)
            reduced_faces=reduced_faces[np.sort(keep)]
            print("Grid",cell,"faces",len(reduced_faces),flush=True)
            if len(reduced_faces)<=700000: break
        vertices,faces=reduced,reduced_faces.astype(np.int32)
    vertices = (vertices-center)*scale
    positions = vertices[faces].astype("<f4")
    face_normals = np.cross(positions[:,1]-positions[:,0], positions[:,2]-positions[:,0])
    vertex_normals=np.zeros_like(vertices)
    for corner in range(3): np.add.at(vertex_normals,faces[:,corner],face_normals)
    vertex_normals/=np.maximum(np.linalg.norm(vertex_normals,axis=1,keepdims=True),1e-20)
    normals=vertex_normals[faces].astype("<f4")
    slug = path.stem.lower()
    raw = positions.tobytes()+normals.tobytes()
    (OUT / (slug+".bin")).write_bytes(raw)
    items.append({"id":slug,"file":"/models/openear/theta/"+slug+".bin","vertexCount":len(faces)*3,"originalFaces":count,"sha256":hashlib.sha256(raw).hexdigest(),"sourceSha256":hashlib.sha256(path.read_bytes()).hexdigest(),"center":vertices.mean(0).tolist(),"bounds":[vertices.min(0).tolist(),vertices.max(0).tolist()]})
    print(slug, count, "->", len(faces), flush=True)
(OUT / "manifest.json").write_text(json.dumps({"source":"OpenEar THETA","license":"CC-BY-4.0","url":"https://zenodo.org/records/1473724","center":center.tolist(),"scale":scale,"items":items},indent=2))
