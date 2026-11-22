"""Parametric CAD for the CUMSM 506 manual treadmill (CadQuery -> trimesh -> JS mesh bundle).

All dimensions in mm. CadQuery frame: X = part length, Y = width, Z = up.
Three.js mapping applied at export: (x, y, z)_cq -> (x, z, -y) metres.
Each B-rep face is tessellated separately so normals stay smooth inside a face
and sharp across edges (no "melted" box corners).
"""
import base64
import json
import sys

import cadquery as cq
import numpy as np
import trimesh

OUT_JS = sys.argv[1] if len(sys.argv) > 1 else "parts.js"
OUT_JSON = sys.argv[2] if len(sys.argv) > 2 else "bom.json"

HOLE = 8.5  # M8 clearance (ISO 273 medium)


def box(l, w, h, x=0, y=0, z=0):
    return cq.Workplane("XY").box(l, w, h).translate((x, y, z))


def cyl(d, length, axis="Z", x=0, y=0, z=0):
    wp = {"Z": "XY", "Y": "XZ", "X": "YZ"}[axis]
    c = cq.Workplane(wp).circle(d / 2).extrude(length / 2, both=True)
    return c.translate((x, y, z))


def sq_tube(length, a, t, vholes=(), hholes=()):
    """Square hollow section along X; vholes through top/bottom walls, hholes through side walls."""
    s = box(length, a, a).cut(box(length + 2, a - 2 * t, a - 2 * t))
    for x in vholes:
        s = s.cut(cyl(HOLE, a + 4, "Z", x=x))
    for x in hholes:
        s = s.cut(cyl(HOLE, a + 4, "Y", x=x))
    return s


def tube_vh(length, a, t, vholes=(), hholes=()):
    return sq_tube(length, a, t, vholes, hholes)


# ---------------- frame (reclaimed mild steel) ----------------
RAIL_V = [-725, 725, -687.5, -592.5, 592.5, 687.5, -500, 0, 500]
RAIL_H = [-665, -615]
parts = {}
parts["rail"] = tube_vh(1500, 40, 3, RAIL_V, RAIL_H)
parts["rail_raw"] = tube_vh(1500, 40, 3)  # before drilling
parts["cross"] = tube_vh(500, 40, 3, [-230, 230])
parts["bearer"] = tube_vh(1100, 40, 3, [-500, 0, 500])
# upright post 940 long, modelled along X (bottom at -470)
post = tube_vh(940, 25, 2, vholes=[457.5], hholes=[-443, -408])
parts["post"] = post
parts["crossbar"] = tube_vh(600, 25, 2, hholes=[-268.5, 268.5])
# bracket plate: 100 (x) x 6 (thickness, y) x 130 (height, z); centre height 0.125 m
plate = box(100, 6, 130)
for (px, pz) in [(-25, -45), (25, -45), (0, 15), (0, 50)]:
    plate = plate.cut(cyl(HOLE, 10, "Y", x=px, z=pz))
plate = plate.edges("|Y").fillet(6)
parts["plate"] = plate

# ---------------- running gear ----------------
# UCP204-style pillow block: base 127 x 38 x 14, shaft height 33.3, bore 20
pb = box(127, 38, 14, z=7)
pb = pb.union(cyl(64, 38, "Y", z=33.3)).union(box(70, 38, 22, z=20))
pb = pb.cut(cyl(47, 40, "Y", z=33.3))  # insert seat
for x in (-47.5, 47.5):
    pb = pb.cut(cq.Workplane("XY").slot2D(14, HOLE, 0).extrude(20).translate((x, 0, -2)))
pb = pb.edges("|Y").fillet(2.0)
parts["pillow"] = pb
insert = cyl(47, 31, "Y", z=33.3).cut(cyl(20.2, 40, "Y", z=33.3))
insert = insert.union(cyl(26, 44, "Y", z=33.3).cut(cyl(20.2, 50, "Y", z=33.3)))
parts["insert"] = insert
parts["nipple"] = cyl(6, 9, "Z", z=69).union(cyl(8, 3, "Z", z=75))
# roller: 48.3 OD x 3.2 wall pipe drum 400 long, 20 mm shaft 520 long, end caps
drum = cyl(48.3, 400, "Y").cut(cyl(41.9, 402, "Y"))
for y in (-197, 197):
    drum = drum.union(cyl(41.9, 6, "Y", y=y))
parts["drum"] = drum
parts["shaft"] = cyl(20, 520, "Y")
# MDF deck 1200 x 460 x 18
parts["deck"] = box(1200, 460, 18).edges("|Z").fillet(3)
# waste-tyre rubber foot pad 60 x 650 x 20 with nut pockets
pad = box(60, 650, 20)
for y in (-230, 230):
    pad = pad.cut(cyl(30, 30, "Z", y=y, z=6))
parts["pad"] = pad
# handrail grip sleeve (rubber) and display console
parts["grip"] = cyl(33, 110, "X").cut(cyl(25.5, 120, "X")).edges().fillet(1.5)
console = box(120, 70, 45, z=22.5).edges("|Y").fillet(8)
console = console.cut(box(96, 10, 30, y=-34, z=24))
parts["console"] = console
parts["screen"] = box(94, 2, 28, y=-31, z=24)

# ---------------- fasteners (ISO 4017 M8 hex bolt, ISO 4032 nut, ISO 7089 washer) ----------------
def hex_prism(af, h):
    return cq.Workplane("XY").polygon(6, af / np.cos(np.pi / 6)).extrude(h)


for L in (45, 60, 75, 100):
    head = hex_prism(13, 5.3).edges(">Z").chamfer(0.8)
    shank = cq.Workplane("XY").circle(4).extrude(-L).edges("<Z").chamfer(0.8)
    b = head.union(shank)
    # rolled thread suggestion: shallow grooves on last 22 mm
    for k in range(10):
        zc = -L + 2 + k * 2.0
        b = b.cut(cq.Workplane("XY").circle(4.2).circle(3.55).extrude(0.6).translate((0, 0, zc)))
    parts[f"bolt{L}"] = b  # head top at z=+5.3, bearing face z=0, shank to -L
parts["nut"] = hex_prism(13, 6.5).cut(cyl(8, 20, "Z")).edges(">Z or <Z").chamfer(0.6).translate((0, 0, -3.25))
parts["washer"] = cyl(16, 1.6, "Z").cut(cyl(8.4, 4, "Z"))

# ---------------- hand tools ----------------
# 13 mm combination spanner, length 170, along X, jaw at +X, ring at -X
sp = cq.Workplane("XY").center(0, 0).rect(120, 12).extrude(5, both=True)
sp = sp.union(cyl(26, 7, "Z", x=78)).union(cyl(24, 7, "Z", x=-78))
sp = sp.cut(box(24, 13.2, 20, x=90))  # open jaw
sp = sp.cut(cq.Workplane("XY").polygon(12, 15.0).extrude(10, both=True).translate((-78, 0, 0)))
parts["spanner"] = sp


# ---------------- export ----------------
def face_mesh(shape, tol=0.08, ang=0.15):
    vs, ns, idx = [], [], []
    off = 0
    for f in shape.Faces():
        v, t = f.tessellate(tol, ang)
        if not t:
            continue
        v = np.array([(p.x, p.y, p.z) for p in v], dtype=np.float64)
        t = np.array(t, dtype=np.int64)
        m = trimesh.Trimesh(v, t, process=False)
        n = m.vertex_normals.copy()
        # make face-local normals agree with the B-rep outward normal
        c = f.Center()
        try:
            ref = f.normalAt(c)
            ref = np.array([ref.x, ref.y, ref.z])
            tn = m.face_normals.mean(axis=0)
            if np.dot(tn, ref) < 0:
                t = t[:, ::-1]
                n = -n
        except Exception:
            pass
        vs.append(v)
        ns.append(n)
        idx.append(t + off)
        off += len(v)
    v = np.concatenate(vs)
    n = np.concatenate(ns)
    i = np.concatenate(idx)
    # CadQuery (x,y,z) mm -> three (x, z, -y) m
    v3 = np.stack([v[:, 0], v[:, 2], -v[:, 1]], 1) * 0.001
    n3 = np.stack([n[:, 0], n[:, 2], -n[:, 1]], 1)
    return v3.astype(np.float32), n3.astype(np.float32), i.astype(np.uint32)


b64 = lambda a: base64.b64encode(a.tobytes()).decode()
bundle, bom = {}, {}
STEEL = 7850e-9  # kg/mm3
for name, wp in parts.items():
    shape = wp.val() if hasattr(wp, "val") else wp
    if len(wp.vals()) > 1:
        shape = cq.Compound.makeCompound(wp.vals())
    v, n, i = face_mesh(shape)
    bundle[name] = {"p": b64(v), "n": b64(n), "i": b64(i)}
    tm = trimesh.Trimesh(v.astype(np.float64), i.reshape(-1, 3), process=True)
    bom[name] = {
        "volume_cm3": round(shape.Volume() / 1000, 2),
        "steel_mass_kg_if_steel": round(shape.Volume() * STEEL, 3),
        "triangles": int(len(i) // 3),
        "bbox_m": [round(float(x), 4) for x in (tm.bounds[1] - tm.bounds[0])],
    }
    print(f"{name:10s} tris={len(i)//3:6d} vol={shape.Volume()/1000:9.1f} cm3")

with open(OUT_JS, "w") as fh:
    fh.write("window.PARTS=" + json.dumps(bundle, separators=(",", ":")) + ";\n")
with open(OUT_JSON, "w") as fh:
    json.dump(bom, fh, indent=1)
print("wrote", OUT_JS, OUT_JSON)
