"""Inspect/download only selected files from the CC BY 4.0 OpenEar archives.
Reads ZIP directory and members with HTTP ranges; never downloads the CT volumes.
"""
import io, json, pathlib, sys, urllib.request, zipfile

ROOT = pathlib.Path(__file__).resolve().parents[2] / ".anatomy-source" / "openear"
ROOT.mkdir(parents=True, exist_ok=True)

def get(url, start=None, end=None):
    headers = {"User-Agent": "Anatomia-local-model-review/1.0"}
    if start is not None:
        headers["Range"] = f"bytes={start}-{end}"
    with urllib.request.urlopen(urllib.request.Request(url, headers=headers), timeout=90) as r:
        if start is not None and r.status != 206:
            raise RuntimeError(f"Server did not honor byte range: {r.status}")
        return r.read()

record = json.loads(get("https://zenodo.org/api/records/1473724"))
(ROOT / "record.json").write_text(json.dumps(record, indent=2), encoding="utf8")
assert record["metadata"]["license"]["id"] == "cc-by-4.0"
name = sys.argv[1] if len(sys.argv) > 1 else "ALPHA"
entry = next(f for f in record["files"] if f["key"] == name + ".zip")

class RemoteZip(io.RawIOBase):
    def __init__(self):
        self.pos = 0
    def seekable(self): return True
    def readable(self): return True
    def tell(self): return self.pos
    def seek(self, offset, whence=0):
        self.pos = offset if whence == 0 else self.pos + offset if whence == 1 else entry["size"] + offset
        return self.pos
    def read(self, size=-1):
        size = entry["size"] - self.pos if size < 0 else min(size, entry["size"] - self.pos)
        if size <= 0: return b""
        result = get(entry["links"]["self"], self.pos, self.pos + size - 1)
        self.pos += len(result)
        return result

with zipfile.ZipFile(RemoteZip()) as archive:
    members = [{"name": f.filename, "bytes": f.file_size} for f in archive.infolist()]
    (ROOT / (name + "-files.json")).write_text(json.dumps(members, indent=2))
    for f in members:
        if any(s in f["name"].lower() for s in [".stl", ".ply", ".obj", ".pdf", ".txt"]):
            print(f, flush=True)
    if len(sys.argv) > 2:
        for f in archive.infolist():
            if sys.argv[2].lower() in f.filename.lower() and not f.is_dir():
                target = ROOT / name / pathlib.PurePosixPath(f.filename).name
                target.parent.mkdir(exist_ok=True)
                target.write_bytes(archive.read(f))
                print("Saved", str(target), flush=True)
