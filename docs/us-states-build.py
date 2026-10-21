# Builds js/53-us-states.js from the US Census "cartographic boundary" state file (public domain).
# Download: https://www2.census.gov/geo/tiger/GENZ2023/shp/cb_2023_us_state_5m.zip, unzip, then:
#   python docs/us-states-build.py path/to/cb_2023_us_state_5m > js/53-us-states.js   (writes the whole file)
# Keeps the 48 states + DC, drops tiny islands, simplifies the outlines (~1 km) and stores them as whole numbers of 0.01°.
import struct, sys
sys.stdout.reconfigure(encoding="utf-8", newline="\n")

base = sys.argv[1]
TOL = 0.006          # simplify: drop corners closer than this (degrees) to the straight line
MIN_AREA = 0.0004    # drop islands smaller than this (square degrees, ~4 km²); nearest-coast fallback still finds them
SKIP = {"AK", "HI", "PR", "VI", "GU", "MP", "AS"}

def read_dbf(path):
    d = open(path, "rb").read()
    n, hlen, rlen = struct.unpack("<IHH", d[4:12])
    fields, p = [], 32
    while d[p] != 0x0D:
        fields.append((d[p:p + 11].split(b"\0")[0].decode(), d[p + 16])); p += 32
    rows = []
    for i in range(n):
        r, q, row = d[hlen + i * rlen + 1: hlen + (i + 1) * rlen], 0, {}
        for name, ln in fields:
            row[name] = r[q:q + ln].decode("latin-1").strip(); q += ln
        rows.append(row)
    return rows

def read_shp(path):
    d, p, out = open(path, "rb").read(), 100, []
    while p < len(d):
        clen = struct.unpack(">I", d[p + 4:p + 8])[0] * 2
        rec = d[p + 8:p + 8 + clen]; p += 8 + clen
        nparts, npts = struct.unpack("<II", rec[36:44])
        parts = list(struct.unpack("<%di" % nparts, rec[44:44 + 4 * nparts])) + [npts]
        pts = struct.unpack("<%dd" % (2 * npts), rec[44 + 4 * nparts:44 + 4 * nparts + 16 * npts])
        out.append([[(pts[2 * k], pts[2 * k + 1]) for k in range(parts[j], parts[j + 1])] for j in range(nparts)])
    return out

def area(r):
    return abs(sum(r[i][0] * r[i - 1][1] - r[i - 1][0] * r[i][1] for i in range(len(r)))) / 2

def dp(pts, tol):
    keep, stack = [False] * len(pts), [(0, len(pts) - 1)]
    keep[0] = keep[-1] = True
    while stack:
        a, b = stack.pop()
        (x1, y1), (x2, y2), best, bi = pts[a], pts[b], -1, -1
        dx, dy = x2 - x1, y2 - y1; L = (dx * dx + dy * dy) ** 0.5
        for i in range(a + 1, b):
            x, y = pts[i]
            dd = abs(dy * (x - x1) - dx * (y - y1)) / L if L else ((x - x1) ** 2 + (y - y1) ** 2) ** 0.5
            if dd > best: best, bi = dd, i
        if best > tol:
            keep[bi] = True; stack += [(a, bi), (bi, b)]
    return [p for p, k in zip(pts, keep) if k]

rows, shapes, states = read_dbf(base + ".dbf"), read_shp(base + ".shp"), {}
for row, rings in zip(rows, shapes):
    st = row["STUSPS"]
    if st in SKIP: continue
    enc = []
    for ring in rings:
        if area(ring) < MIN_AREA: continue
        q = []
        for x, y in dp(ring[:-1], TOL):
            p = (round(x * 100), round(y * 100))
            if not q or q[-1] != p: q.append(p)
        if len(q) < 3: continue
        flat, px, py = [], 0, 0
        for x, y in q:
            flat += [x - px, y - py]; px, py = x, y
        enc.append(",".join(map(str, flat)))
    states[st] = ";".join(enc)

print("// ---- US state outlines (US plan step 1) ----")
print("// Built by docs/us-states-build.py from the US Census cartographic boundary file cb_2023_us_state_5m (public domain).")
print("// 48 states + DC, simplified (~1 km). Each ring: lng,lat in 0.01° steps, first pair absolute, then differences.")
print("const US_STATE_RINGS = {")
for st in sorted(states):
    print('  %s: "%s",' % (st, states[st]))
print("};")
print(r"""
const STATE_NAMES = { AL: "Alabama", AR: "Arkansas", AZ: "Arizona", CA: "California", CO: "Colorado", CT: "Connecticut",
  DC: "Washington, D.C.", DE: "Delaware", FL: "Florida", GA: "Georgia", IA: "Iowa", ID: "Idaho", IL: "Illinois", IN: "Indiana",
  KS: "Kansas", KY: "Kentucky", LA: "Louisiana", MA: "Massachusetts", MD: "Maryland", ME: "Maine", MI: "Michigan",
  MN: "Minnesota", MO: "Missouri", MS: "Mississippi", MT: "Montana", NC: "North Carolina", ND: "North Dakota", NE: "Nebraska",
  NH: "New Hampshire", NJ: "New Jersey", NM: "New Mexico", NV: "Nevada", NY: "New York", OH: "Ohio", OK: "Oklahoma",
  OR: "Oregon", PA: "Pennsylvania", RI: "Rhode Island", SC: "South Carolina", SD: "South Dakota", TN: "Tennessee", TX: "Texas",
  UT: "Utah", VA: "Virginia", VT: "Vermont", WA: "Washington", WI: "Wisconsin", WV: "West Virginia", WY: "Wyoming" };

// Offshore / lake spots are outside every outline: they get the nearest state within this many km (null = open sea or another country).
const STATE_NEAR_KM = 200;
// Rough outlines of the neighbours (lng,lat), only used for spots outside every state outline, so a spot off Bimini,
// Havana, Toronto or Tijuana gets null instead of the nearest state. On land they may overlap the US (states are checked first);
// across shared waters (Great Lakes, Juan de Fuca, Florida Straits, Gulf Stream) they follow the border roughly.
const NOT_US = [
  // Canada
  [[-130, 48.2], [-124.73, 48.49], [-123.3, 48.25], [-123.2, 48.45], [-123.25, 48.7], [-123.0, 48.83], [-123.1, 49.0], [-95.15, 49.0],
   [-95.15, 49.38], [-94.83, 49.32], [-94.65, 48.75], [-93.0, 48.6], [-91.5, 48.1], [-89.6, 48.0], [-88.37, 48.3], [-86.5, 47.6],
   [-85.5, 47.3], [-84.8, 46.9], [-84.5, 46.5], [-83.5, 45.9], [-82.5, 45.35], [-82.15, 43.6], [-82.42, 43.0], [-82.5, 42.6],
   [-83.1, 42.3], [-83.15, 41.95], [-82.7, 41.7], [-81.5, 42.05], [-80.5, 42.4], [-79.6, 42.6], [-79.05, 42.9], [-79.05, 43.25],
   [-78.0, 43.6], [-77.0, 43.65], [-76.4, 44.1], [-75.8, 44.4], [-75.0, 44.95], [-74.7, 45.0], [-71.5, 45.0], [-71.1, 45.3],
   [-70.3, 45.9], [-70.0, 46.7], [-69.2, 47.45], [-68.3, 47.35], [-67.8, 47.07], [-67.78, 45.9], [-67.4, 45.6], [-66.95, 44.8],
   [-67.0, 44.4], [-66.0, 42.5], [-60, 42.5], [-60, 60], [-130, 60]],
  // Mexico
  [[-120, 32.0], [-118.6, 32.4], [-117.12, 32.53], [-114.7, 32.75], [-111.07, 31.4], [-108.2, 31.4], [-106.5, 31.85], [-104.5, 30.1],
   [-103.1, 29.1], [-101.4, 29.85], [-100.5, 28.8], [-99.45, 27.6], [-98.8, 26.45], [-97.45, 26.0], [-97.14, 25.96], [-94, 25.9],
   [-94, 14], [-120, 14]],
  // Bahamas + Cuba (Gulf Stream / Florida Straits middle)
  [[-79.6, 27.6], [-79.6, 24.4], [-80.6, 24.3], [-81.5, 24.1], [-83.0, 24.05], [-84.5, 23.8], [-86, 23.4], [-86, 20], [-70, 20], [-70, 27.6]]
];
let usStateShapes = null;

function inRing(r, lat, lng) {
  let inside = false;
  for (let i = 0, j = r.length - 1; i < r.length; j = i++)
    if ((r[i][1] > lat) !== (r[j][1] > lat) && lng < (r[j][0] - r[i][0]) * (lat - r[i][1]) / (r[j][1] - r[i][1]) + r[i][0]) inside = !inside;
  return inside;
}

function usStateLoad() {
  if (usStateShapes) return usStateShapes;
  usStateShapes = Object.entries(US_STATE_RINGS).map(([st, txt]) => {
    const box = [180, 90, -180, -90];
    const rings = txt.split(";").map(r => {
      const n = r.split(",").map(Number), ring = [];
      let x = 0, y = 0;
      for (let i = 0; i < n.length; i += 2) {
        x += n[i]; y += n[i + 1];
        const p = [x / 100, y / 100]; ring.push(p);
        box[0] = Math.min(box[0], p[0]); box[1] = Math.min(box[1], p[1]); box[2] = Math.max(box[2], p[0]); box[3] = Math.max(box[3], p[1]);
      }
      return ring;
    });
    return { st, box, rings };
  });
  return usStateShapes;
}

// Which state is this spot in? stateOf(26.2, -80.1) → "FL"; open sea / far outside the US → null.
function stateOf(lat, lng) {
  lat = +lat; lng = +lng;
  if (!isFinite(lat) || !isFinite(lng)) return null;
  const shapes = usStateLoad();
  for (const s of shapes) {
    if (lng < s.box[0] || lng > s.box[2] || lat < s.box[1] || lat > s.box[3]) continue;
    if (s.rings.filter(r => inRing(r, lat, lng)).length % 2) return s.st;
  }
  if (NOT_US.some(r => inRing(r, lat, lng))) return null;
  // not inside any outline (water, small island, or just across a border): nearest coast/border within STATE_NEAR_KM
  const kx = 111.32 * Math.cos(lat * Math.PI / 180), ky = 110.57, padX = STATE_NEAR_KM / kx, padY = STATE_NEAR_KM / ky;
  let best = null, bestD = STATE_NEAR_KM;
  for (const s of shapes) {
    if (lng < s.box[0] - padX || lng > s.box[2] + padX || lat < s.box[1] - padY || lat > s.box[3] + padY) continue;
    for (const r of s.rings)
      for (let i = 0, j = r.length - 1; i < r.length; j = i++) {
        const ax = (r[j][0] - lng) * kx, ay = (r[j][1] - lat) * ky, bx = (r[i][0] - lng) * kx, by = (r[i][1] - lat) * ky;
        const dx = bx - ax, dy = by - ay, len = dx * dx + dy * dy;
        const t = len ? Math.max(0, Math.min(1, -(ax * dx + ay * dy) / len)) : 0;
        const d = Math.hypot(ax + t * dx, ay + t * dy);
        if (d < bestD) { bestD = d; best = s.st; }
      }
  }
  return best;
}""")
