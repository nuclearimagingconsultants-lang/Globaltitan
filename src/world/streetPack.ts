import { shellOrExtra } from "../data/cityShells";

export type LonLat = [number, number];

export type StreetKind = "avenue" | "street" | "walk";

export type LandmarkJson = {
  id: string;
  name: string;
  kind: string;
  lon: number;
  lat: number;
};

export type StreetRoadJson = {
  id: string;
  name: string;
  highway: string;
  kind: StreetKind;
  coords: LonLat[];
};

export type StreetPackJson = {
  id: string;
  name: string;
  attribution: string;
  bbox: [number, number, number, number];
  origin: LonLat;
  landmarks: LandmarkJson[];
  roads: StreetRoadJson[];
  buildings?: BuildingJson[];
};

export type BuildingJson = {
  id: string;
  name?: string;
  levels?: number;
  height?: number;
  coords: LonLat[];
};

export type WorldPt = { x: number; z: number };

export type StreetSeg = {
  ax: number;
  az: number;
  bx: number;
  bz: number;
  mx: number;
  mz: number;
  dx: number;
  dz: number;
  length: number;
  width: number;
  name: string;
  kind: StreetKind;
};

export type LandmarkWorld = {
  id: string;
  name: string;
  kind: string;
  x: number;
  z: number;
};

export type Footprint = {
  id: string;
  name: string;
  cx: number;
  cz: number;
  w: number;
  d: number;
  yaw: number;
  h: number;
};

export type StreetRoute = {
  name: string;
  pts: WorldPt[];
  length: number;
};

const cache = new Map<string, StreetGraph | null>();

export function roadWidth(kind: StreetKind, highway: string): number {
  if (kind === "avenue" || highway === "primary" || highway === "trunk") return 16.5;
  if (kind === "walk") return 7.2;
  if (highway === "secondary") return 13.5;
  return 11.2;
}

export class StreetGraph {
  readonly id: string;
  readonly name: string;
  readonly attribution: string;
  readonly originLon: number;
  readonly originLat: number;
  readonly segs: StreetSeg[] = [];
  readonly routes: StreetRoute[] = [];
  readonly landmarks: LandmarkWorld[] = [];
  readonly footprints: Footprint[] = [];
  readonly minX: number;
  readonly maxX: number;
  readonly minZ: number;
  readonly maxZ: number;
  readonly extent: number;
  private readonly mPerLon: number;
  private readonly mPerLat = 110540;

  constructor(json: StreetPackJson) {
    this.id = json.id;
    this.name = json.name;
    this.attribution = json.attribution;
    this.originLon = json.origin[0];
    this.originLat = json.origin[1];
    this.mPerLon = 111320 * Math.cos((this.originLat * Math.PI) / 180);
    let minX = Infinity;
    let maxX = -Infinity;
    let minZ = Infinity;
    let maxZ = -Infinity;
    for (const road of json.roads) {
      const pts: WorldPt[] = [];
      let routeLen = 0;
      for (const c of road.coords) {
        const p = this.project(c[0], c[1]);
        pts.push(p);
        minX = Math.min(minX, p.x);
        maxX = Math.max(maxX, p.x);
        minZ = Math.min(minZ, p.z);
        maxZ = Math.max(maxZ, p.z);
      }
      const width = roadWidth(road.kind, road.highway);
      for (let i = 1; i < pts.length; i++) {
        const a = pts[i - 1]!;
        const b = pts[i]!;
        const dx = b.x - a.x;
        const dz = b.z - a.z;
        const length = Math.hypot(dx, dz);
        if (length < 2.4) continue;
        routeLen += length;
        this.segs.push({
          ax: a.x,
          az: a.z,
          bx: b.x,
          bz: b.z,
          mx: (a.x + b.x) * 0.5,
          mz: (a.z + b.z) * 0.5,
          dx,
          dz,
          length,
          width,
          name: road.name,
          kind: road.kind,
        });
      }
      if (pts.length >= 2 && routeLen > 12) this.routes.push({ name: road.name, pts, length: routeLen });
    }
    for (const lm of json.landmarks) {
      const p = this.project(lm.lon, lm.lat);
      this.landmarks.push({ id: lm.id, name: lm.name, kind: lm.kind, x: p.x, z: p.z });
    }
    for (const b of json.buildings ?? []) {
      const fp = this.footprintOf(b);
      if (fp) this.footprints.push(fp);
    }
    this.minX = minX;
    this.maxX = maxX;
    this.minZ = minZ;
    this.maxZ = maxZ;
    this.extent = Math.max(Math.abs(minX), Math.abs(maxX), Math.abs(minZ), Math.abs(maxZ), 80) + 48;
  }

  project(lon: number, lat: number): WorldPt {
    return {
      x: (lon - this.originLon) * this.mPerLon,
      z: (lat - this.originLat) * this.mPerLat,
    };
  }

  unproject(x: number, z: number): { lon: number; lat: number } {
    return {
      lon: this.originLon + x / this.mPerLon,
      lat: this.originLat + z / this.mPerLat,
    };
  }

  landmark(kind: string): LandmarkWorld | undefined {
    return this.landmarks.find((l) => l.kind === kind);
  }

  landmarkById(id: string): LandmarkWorld | undefined {
    return this.landmarks.find((l) => l.id === id);
  }

  private footprintOf(b: BuildingJson): Footprint | null {
    if (!b.coords || b.coords.length < 3) return null;
    const pts = b.coords.map((c) => this.project(c[0], c[1]));
    let ux = pts[1]!.x - pts[0]!.x;
    let uz = pts[1]!.z - pts[0]!.z;
    let best = Math.hypot(ux, uz);
    for (let i = 1; i < pts.length; i++) {
      const dx = pts[(i + 1) % pts.length]!.x - pts[i]!.x;
      const dz = pts[(i + 1) % pts.length]!.z - pts[i]!.z;
      const len = Math.hypot(dx, dz);
      if (len > best) {
        best = len;
        ux = dx;
        uz = dz;
      }
    }
    if (best < 2.4) {
      ux = 1;
      uz = 0;
      best = 1;
    }
    ux /= best;
    uz /= best;
    const vx = -uz;
    const vz = ux;
    let minU = Infinity;
    let maxU = -Infinity;
    let minV = Infinity;
    let maxV = -Infinity;
    let sx = 0;
    let sz = 0;
    for (const p of pts) {
      sx += p.x;
      sz += p.z;
      const u = p.x * ux + p.z * uz;
      const v = p.x * vx + p.z * vz;
      minU = Math.min(minU, u);
      maxU = Math.max(maxU, u);
      minV = Math.min(minV, v);
      maxV = Math.max(maxV, v);
    }
    const w = maxU - minU;
    const d = maxV - minV;
    if (w < 5.5 || d < 5.5 || w * d < 48) return null;
    const hTag = b.height && b.height > 6 ? b.height : b.levels && b.levels > 0 ? b.levels * 3.5 : Math.min(48, 12 + Math.sqrt(w * d) * 0.35);
    return {
      id: b.id,
      name: b.name ?? "",
      cx: sx / pts.length,
      cz: sz / pts.length,
      w: Math.min(72, w),
      d: Math.min(72, d),
      yaw: Math.atan2(ux, uz),
      h: Math.min(220, Math.max(10, hTag)),
    };
  }

  nearest(x: number, z: number): { x: number; z: number; name: string; tx: number; tz: number; dist: number; width: number } {
    let best = 1e9;
    let ox = x;
    let oz = z;
    let name = "";
    let tx = 0;
    let tz = 1;
    let width = 12;
    for (const s of this.segs) {
      const t = Math.max(0, Math.min(1, ((x - s.ax) * s.dx + (z - s.az) * s.dz) / (s.length * s.length)));
      const px = s.ax + s.dx * t;
      const pz = s.az + s.dz * t;
      const d = Math.hypot(x - px, z - pz);
      if (d < best) {
        best = d;
        ox = px;
        oz = pz;
        name = s.name;
        tx = s.dx / s.length;
        tz = s.dz / s.length;
        width = s.width;
      }
    }
    return { x: ox, z: oz, name, tx, tz, dist: best, width };
  }

  sidewalk(x: number, z: number, side = 1, extra = 3.2): WorldPt {
    const n = this.nearest(x, z);
    const px = -n.tz;
    const pz = n.tx;
    const mag = Math.hypot(px, pz) || 1;
    return {
      x: n.x + (px / mag) * (n.width * 0.5 + extra) * side,
      z: n.z + (pz / mag) * (n.width * 0.5 + extra) * side,
    };
  }

  pointOnRoute(route: StreetRoute, dist: number): { x: number; z: number; yaw: number } {
    let d = ((dist % route.length) + route.length) % route.length;
    for (let i = 1; i < route.pts.length; i++) {
      const a = route.pts[i - 1]!;
      const b = route.pts[i]!;
      const len = Math.hypot(b.x - a.x, b.z - a.z);
      if (d <= len) {
        const t = len < 0.01 ? 0 : d / len;
        return {
          x: a.x + (b.x - a.x) * t,
          z: a.z + (b.z - a.z) * t,
          yaw: Math.atan2(b.x - a.x, b.z - a.z),
        };
      }
      d -= len;
    }
    const last = route.pts[route.pts.length - 1]!;
    const prev = route.pts[route.pts.length - 2] ?? last;
    return { x: last.x, z: last.z, yaw: Math.atan2(last.x - prev.x, last.z - prev.z) };
  }

  findPath(ax: number, az: number, bx: number, bz: number): WorldPt[] {
    this.ensureNet();
    const net = this.net!;
    const start = this.closestNode(ax, az);
    const goal = this.closestNode(bx, bz);
    if (!start || !goal || start === goal) {
      return [{ x: ax, z: az }, { x: bx, z: bz }];
    }
    const open: string[] = [start];
    const came = new Map<string, string>();
    const gScore = new Map<string, number>([[start, 0]]);
    const hOf = (k: string) => {
      const n = net.get(k)!;
      return Math.hypot(n.x - net.get(goal)!.x, n.z - net.get(goal)!.z);
    };
    const fScore = new Map<string, number>([[start, hOf(start)]]);
    const inOpen = new Set<string>([start]);
    while (open.length) {
      let bi = 0;
      let best = Infinity;
      for (let i = 0; i < open.length; i++) {
        const f = fScore.get(open[i]!) ?? Infinity;
        if (f < best) {
          best = f;
          bi = i;
        }
      }
      const cur = open.splice(bi, 1)[0]!;
      inOpen.delete(cur);
      if (cur === goal) break;
      const node = net.get(cur)!;
      for (const e of node.edges) {
        const tentative = (gScore.get(cur) ?? Infinity) + e.w;
        if (tentative >= (gScore.get(e.to) ?? Infinity)) continue;
        came.set(e.to, cur);
        gScore.set(e.to, tentative);
        fScore.set(e.to, tentative + hOf(e.to));
        if (!inOpen.has(e.to)) {
          open.push(e.to);
          inOpen.add(e.to);
        }
      }
    }
    if (!came.has(goal) && start !== goal) {
      return [{ x: ax, z: az }, { x: bx, z: bz }];
    }
    const chain: WorldPt[] = [];
    let k: string | undefined = goal;
    while (k) {
      const n = net.get(k)!;
      chain.push({ x: n.x, z: n.z });
      k = came.get(k);
    }
    chain.reverse();
    const first = this.nearest(ax, az);
    const last = this.nearest(bx, bz);
    return [{ x: first.x, z: first.z }, ...chain, { x: last.x, z: last.z }];
  }

  private net: Map<string, { x: number; z: number; edges: { to: string; w: number }[] }> | null = null;

  private nodeKey(x: number, z: number): string {
    return `${Math.round(x / 4) * 4},${Math.round(z / 4) * 4}`;
  }

  private ensureNet(): void {
    if (this.net) return;
    const net = new Map<string, { x: number; z: number; edges: { to: string; w: number }[] }>();
    const bump = (x: number, z: number) => {
      const k = this.nodeKey(x, z);
      if (!net.has(k)) net.set(k, { x: Math.round(x / 4) * 4, z: Math.round(z / 4) * 4, edges: [] });
      return k;
    };
    for (const s of this.segs) {
      const a = bump(s.ax, s.az);
      const b = bump(s.bx, s.bz);
      if (a === b) continue;
      net.get(a)!.edges.push({ to: b, w: s.length });
      net.get(b)!.edges.push({ to: a, w: s.length });
    }
    this.net = net;
  }

  private closestNode(x: number, z: number): string {
    this.ensureNet();
    let best = "";
    let d = Infinity;
    for (const [k, n] of this.net!) {
      const dd = (n.x - x) ** 2 + (n.z - z) ** 2;
      if (dd < d) {
        d = dd;
        best = k;
      }
    }
    return best;
  }
}

const COMPASS = ["north", "northeast", "east", "southeast", "south", "southwest", "west", "northwest"];

export function compassLabel(dx: number, dz: number): string {
  const dist = Math.hypot(dx, dz);
  const ang = Math.atan2(dx, -dz);
  const i = (((Math.round(ang / (Math.PI / 4)) % 8) + 8) % 8);
  return `${Math.max(1, Math.round(dist))}m ${COMPASS[i]}`;
}

/** Point along the nearest real street toward a target (not a straight-line flyover). */
export function followStreet(graph: StreetGraph, x: number, z: number, tx: number, tz: number): string {
  const n = graph.nearest(x, z);
  const dx = tx - x;
  const dz = tz - z;
  const straight = compassLabel(dx, dz);
  if (!n.name) return straight;
  const along = Math.abs(n.tx * dx + n.tz * dz) / (Math.hypot(dx, dz) || 1);
  if (along > 0.42) return `${straight} along ${n.name}`;
  return `${straight} via ${n.name}`;
}

export function geoStub(city: { id: string; name: string; lat: number; lon: number }): StreetGraph {
  const shell = shellOrExtra(city.id, city.name);
  const lon = city.lon;
  const lat = city.lat;
  const pad = 0.01;
  const landmarks = shell.anchors.map((a) => ({
    id: a.id,
    name: a.name,
    kind: a.kind,
    lon: lon + a.dLon,
    lat: lat + a.dLat,
  }));
  const roads = shell.streets.map((s, i) => {
    const shift = s.shift ?? 0;
    const coords: LonLat[] = s.ns
      ? [
          [lon + shift, lat - s.span],
          [lon + shift, lat + s.span],
        ]
      : [
          [lon - s.span, lat + shift],
          [lon + s.span, lat + shift],
        ];
    return {
      id: `${s.ns ? "ns" : "ew"}-${i}`,
      name: s.name,
      highway: s.kind === "avenue" ? "primary" : "secondary",
      kind: s.kind,
      coords,
    };
  });
  return new StreetGraph({
    id: city.id,
    name: city.name,
    attribution: "Maps JS overlay · real downtown bones (no OSM mesh, no Google tiles)",
    bbox: [lat - pad, lon - pad, lat + pad, lon + pad],
    origin: [lon, lat],
    landmarks,
    roads,
    buildings: [],
  });
}

export async function loadStreetPack(cityId: string): Promise<StreetGraph | null> {
  if (cache.has(cityId)) return cache.get(cityId) ?? null;
  try {
    const res = await fetch(`/maps/${cityId}.json`);
    if (!res.ok) {
      cache.set(cityId, null);
      return null;
    }
    const json = (await res.json()) as StreetPackJson;
    const graph = new StreetGraph(json);
    cache.set(cityId, graph);
    return graph;
  } catch {
    cache.set(cityId, null);
    return null;
  }
}

export function streetPackCached(cityId: string): StreetGraph | null | undefined {
  return cache.get(cityId);
}

export function drawStreetPreview(
  ctx: CanvasRenderingContext2D,
  graph: StreetGraph,
  w: number,
  h: number,
  player?: WorldPt | null,
): void {
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = "#14120f";
  ctx.fillRect(0, 0, w, h);
  const pad = 18;
  const spanX = Math.max(80, graph.maxX - graph.minX);
  const spanZ = Math.max(80, graph.maxZ - graph.minZ);
  const sx = (w - pad * 2) / spanX;
  const sz = (h - pad * 2) / spanZ;
  const s = Math.min(sx, sz);
  const mapX = (x: number) => pad + (x - graph.minX) * s;
  const mapY = (z: number) => h - pad - (z - graph.minZ) * s;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  for (const seg of graph.segs) {
    ctx.strokeStyle = seg.kind === "avenue" ? "#6a6e74" : seg.kind === "walk" ? "#4a4e46" : "#3e4248";
    ctx.lineWidth = seg.kind === "avenue" ? 2.4 : 1.3;
    ctx.beginPath();
    ctx.moveTo(mapX(seg.ax), mapY(seg.az));
    ctx.lineTo(mapX(seg.bx), mapY(seg.bz));
    ctx.stroke();
  }
  for (const lm of graph.landmarks) {
    ctx.fillStyle = lm.kind === "dungeon" ? "#c9a227" : lm.kind === "bus" ? "#7dff6a" : "#d7c4ae";
    ctx.beginPath();
    ctx.arc(mapX(lm.x), mapY(lm.z), lm.kind === "plaza" ? 4 : 3, 0, Math.PI * 2);
    ctx.fill();
  }
  if (player) {
    ctx.fillStyle = "#7dff6a";
    ctx.beginPath();
    ctx.arc(mapX(player.x), mapY(player.z), 4, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = "rgba(255,236,214,0.45)";
  ctx.font = "10px Outfit, sans-serif";
  ctx.fillText("© OpenStreetMap contributors", 8, h - 8);
}
