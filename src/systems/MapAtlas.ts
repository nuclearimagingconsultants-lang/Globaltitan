import type { StreetGraph, StreetSeg, WorldPt } from "../world/streetPack";
import { worldExtent } from "../world/CityWorld";

export const MAP_FILTERS = ["all", "story", "crime", "dungeon", "job", "collectible", "comic"] as const;
export type MapFilter = (typeof MAP_FILTERS)[number];

export type PinKind = "story" | "crime" | "dungeon" | "job" | "collectible" | "rival" | "landmark" | "gate" | "comic";

export type MapPin = {
  id: string;
  kind: PinKind;
  filter: Exclude<MapFilter, "all">;
  x: number;
  z: number;
  title: string;
  blurb: string;
  typeLabel: string;
  trackable: boolean;
  objectiveId?: string;
  travelCityId?: string;
};

export type MapCam = {
  cx: number;
  cz: number;
  ppm: number;
};

export type MapSnapshot = {
  segs: StreetSeg[] | null;
  extent: number;
  pins: MapPin[];
  route: WorldPt[];
  player: { x: number; z: number; yaw: number };
  showMarkers: boolean;
  trackedId: string | null;
  navTitle: string;
  navDist: number;
  navBearing: number;
  navAlong: string;
  cityNight: boolean;
};

export const PIN_STYLE: Record<PinKind, { fill: string; letter: string; label: string }> = {
  story: { fill: "#f0c400", letter: "S", label: "Story" },
  crime: { fill: "#ff5533", letter: "C", label: "Crime" },
  dungeon: { fill: "#c9a227", letter: "D", label: "Dungeon" },
  job: { fill: "#7ec8ff", letter: "J", label: "Job" },
  collectible: { fill: "#b46aff", letter: "B", label: "Bestiary" },
  rival: { fill: "#e74c3c", letter: "R", label: "Razorback" },
  landmark: { fill: "#d7c4ae", letter: "L", label: "Landmark" },
  gate: { fill: "#f0c400", letter: "G", label: "Gate" },
  comic: { fill: "#ff8a3d", letter: "K", label: "Comic" },
};

export type LegendRow = {
  id: string;
  swatch: string;
  mark: string;
  title: string;
  meaning: string;
  filter: MapFilter | null;
};

/** Icon → meaning for the toggleable legend (L). Filters still apply separately. */
export const MAP_LEGEND: LegendRow[] = [
  { id: "you", swatch: "#7dff6a", mark: "▲", title: "You", meaning: "Banner or Hulk. Green arrow faces yaw.", filter: null },
  { id: "story", swatch: "#f0c400", mark: "●", title: "Story", meaning: "Objectives and plot beats on this street.", filter: "story" },
  { id: "crime", swatch: "#ff5533", mark: "●", title: "Crime", meaning: "Live street job. Smash the crew.", filter: "crime" },
  { id: "dungeon", swatch: "#c9a227", mark: "●", title: "Dungeon", meaning: "Capital gate. H when street jobs are done.", filter: "dungeon" },
  { id: "job", swatch: "#7ec8ff", mark: "●", title: "Job", meaning: "Civilian shift, diner, or walk-up.", filter: "job" },
  { id: "collectible", swatch: "#b46aff", mark: "●", title: "Bestiary", meaning: "Wild catch. Soften, then H as Banner.", filter: "collectible" },
  { id: "rival", swatch: "#e74c3c", mark: "●", title: "Razorback", meaning: "Stalking rival. Do not let him ride.", filter: "story" },
  { id: "landmark", swatch: "#d7c4ae", mark: "●", title: "Landmark", meaning: "Named plaza, park, or OSM anchor.", filter: "story" },
  { id: "gate", swatch: "#f0c400", mark: "●", title: "Gate", meaning: "Skyline Heroes east / Iron Warrens west.", filter: "story" },
  { id: "comic", swatch: "#ff8a3d", mark: "◼", title: "Comic Story", meaning: "Unread issue. H to enter a short playable arc.", filter: "comic" },
  { id: "route", swatch: "#7dff6a", mark: "╌", title: "Tracked route", meaning: "Dashed path to the pin you tracked.", filter: null },
];

export function pinKindTitle(kind: PinKind): string {
  return PIN_STYLE[kind].label;
}

export function pinMatches(pin: MapPin, filter: MapFilter): boolean {
  if (filter === "all") return true;
  return pin.filter === filter;
}

export function worldToScreen(cam: MapCam, x: number, z: number, w: number, h: number): { x: number; y: number } {
  return {
    x: w / 2 + (x - cam.cx) * cam.ppm,
    y: h / 2 - (z - cam.cz) * cam.ppm,
  };
}

export function screenToWorld(cam: MapCam, sx: number, sy: number, w: number, h: number): WorldPt {
  return {
    x: cam.cx + (sx - w / 2) / cam.ppm,
    z: cam.cz - (sy - h / 2) / cam.ppm,
  };
}

export function minimapCam(player: { x: number; z: number }, size: number, radius = 180): MapCam {
  return { cx: player.x, cz: player.z, ppm: (size / 2 - 8) / radius };
}

export function fitCityCam(snap: MapSnapshot, w: number, h: number): MapCam {
  const pad = 28;
  if (snap.segs && snap.segs.length) {
    let minX = Infinity;
    let maxX = -Infinity;
    let minZ = Infinity;
    let maxZ = -Infinity;
    for (const s of snap.segs) {
      minX = Math.min(minX, s.ax, s.bx);
      maxX = Math.max(maxX, s.ax, s.bx);
      minZ = Math.min(minZ, s.az, s.bz);
      maxZ = Math.max(maxZ, s.az, s.bz);
    }
    const span = Math.max(80, maxX - minX, maxZ - minZ);
    return {
      cx: (minX + maxX) * 0.5,
      cz: (minZ + maxZ) * 0.5,
      ppm: Math.min((w - pad * 2) / span, (h - pad * 2) / span),
    };
  }
  const ext = snap.extent || worldExtent();
  return { cx: 0, cz: 0, ppm: Math.min((w - pad * 2) / (ext * 2), (h - pad * 2) / (ext * 2)) };
}

export function hitTestPin(
  cam: MapCam,
  pins: MapPin[],
  sx: number,
  sy: number,
  w: number,
  h: number,
  filter: MapFilter,
  radius = 14,
): MapPin | null {
  let best: MapPin | null = null;
  let bestD = radius;
  for (const pin of pins) {
    if (!pinMatches(pin, filter)) continue;
    const p = worldToScreen(cam, pin.x, pin.z, w, h);
    const d = Math.hypot(p.x - sx, p.y - sy);
    if (d < bestD) {
      bestD = d;
      best = pin;
    }
  }
  return best;
}

export type DrawOpts = {
  w: number;
  h: number;
  cam: MapCam;
  clipCircle?: boolean;
  transparent?: boolean;
  hoverId?: string | null;
  selectedId?: string | null;
  filter?: MapFilter;
  showLegend?: boolean;
  labels?: boolean;
  /** Official Google tiles underneath — skip OSM strokes and pin discs (Google markers draw those). */
  basemap?: boolean;
};

export function drawCityMap(ctx: CanvasRenderingContext2D, snap: MapSnapshot, opts: DrawOpts): void {
  const { w, h, cam } = opts;
  const filter = opts.filter ?? "all";
  ctx.clearRect(0, 0, w, h);
  if (opts.clipCircle) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(w / 2, h / 2, w / 2 - 2, 0, Math.PI * 2);
    ctx.clip();
  }
  if (!opts.transparent) {
    ctx.fillStyle = snap.cityNight ? "#12141c" : "#1a1c20";
    ctx.fillRect(0, 0, w, h);
  }

  const viewR = Math.hypot(w, h) / (2 * cam.ppm) + 40;
  if (snap.segs && !opts.basemap) {
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    const mul = Math.min(1.6, cam.ppm / 0.35);
    const layers: { kind: StreetSeg["kind"] | "street"; stroke: string; width: number }[] = [
      { kind: "walk", stroke: "#5a5e56", width: 1.4 },
      { kind: "street", stroke: "#4a4e54", width: 1.4 },
      { kind: "avenue", stroke: "#8a8e94", width: 2.8 },
    ];
    for (const layer of layers) {
      ctx.beginPath();
      ctx.strokeStyle = layer.stroke;
      ctx.lineWidth = Math.max(1, layer.width * mul);
      for (const seg of snap.segs) {
        const kind = seg.kind === "avenue" ? "avenue" : seg.kind === "walk" ? "walk" : "street";
        if (kind !== layer.kind) continue;
        if (Math.hypot(seg.mx - cam.cx, seg.mz - cam.cz) > viewR + seg.length) continue;
        const a = worldToScreen(cam, seg.ax, seg.az, w, h);
        const b = worldToScreen(cam, seg.bx, seg.bz, w, h);
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
      }
      ctx.stroke();
    }
  } else if (!opts.basemap) {
    ctx.strokeStyle = "rgba(80,84,90,0.45)";
    ctx.lineWidth = 1;
    const ext = snap.extent;
    for (let i = -3; i <= 3; i++) {
      const a = worldToScreen(cam, i * (ext / 3), -ext, w, h);
      const b = worldToScreen(cam, i * (ext / 3), ext, w, h);
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
      const c = worldToScreen(cam, -ext, i * (ext / 3), w, h);
      const d = worldToScreen(cam, ext, i * (ext / 3), w, h);
      ctx.beginPath();
      ctx.moveTo(c.x, c.y);
      ctx.lineTo(d.x, d.y);
      ctx.stroke();
    }
  }

  if (snap.showMarkers && snap.route.length > 1) {
    ctx.setLineDash([6, 5]);
    ctx.strokeStyle = "rgba(125, 255, 106, 0.85)";
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    snap.route.forEach((pt, i) => {
      const p = worldToScreen(cam, pt.x, pt.z, w, h);
      if (i === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    });
    ctx.stroke();
    ctx.setLineDash([]);
  }

  if (snap.showMarkers) {
    for (const pin of snap.pins) {
      if (!pinMatches(pin, filter)) continue;
      const p = worldToScreen(cam, pin.x, pin.z, w, h);
      if (p.x < -16 || p.y < -16 || p.x > w + 16 || p.y > h + 16) continue;
      const style = PIN_STYLE[pin.kind];
      const hot = pin.id === opts.hoverId || pin.id === opts.selectedId || pin.id === snap.trackedId;
      if (!opts.basemap) {
        const r = hot ? 8 : 5.5;
        ctx.beginPath();
        ctx.fillStyle = style.fill;
        ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
        ctx.fill();
        if (hot) {
          ctx.strokeStyle = "#fff6e8";
          ctx.lineWidth = 1.6;
          ctx.stroke();
        }
      }
      if (opts.labels && (hot || (!opts.basemap && cam.ppm > 0.45))) {
        ctx.fillStyle = "rgba(255,236,214,0.92)";
        ctx.font = "700 11px Outfit, sans-serif";
        ctx.fillText(pin.title.slice(0, 24), p.x + 8, p.y - 8);
        ctx.font = "10px Outfit, sans-serif";
        ctx.fillStyle = "rgba(255,236,214,0.62)";
        ctx.fillText(style.label, p.x + 8, p.y + 6);
      }
    }
  }

  const pp = worldToScreen(cam, snap.player.x, snap.player.z, w, h);
  ctx.save();
  ctx.translate(pp.x, pp.y);
  ctx.rotate(snap.player.yaw);
  ctx.fillStyle = "#7dff6a";
  ctx.beginPath();
  ctx.moveTo(0, -9);
  ctx.lineTo(6, 8);
  ctx.lineTo(0, 4);
  ctx.lineTo(-6, 8);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  ctx.fillStyle = "rgba(255,236,214,0.82)";
  ctx.font = "700 11px Outfit, sans-serif";
  ctx.fillText("N", w / 2 - 4, opts.clipCircle ? 14 : 16);

  const metres = 100;
  const bar = metres * cam.ppm;
  if (bar > 24 && bar < w * 0.45) {
    const x = opts.clipCircle ? 18 : 12;
    const y = h - (opts.clipCircle ? 16 : 14);
    ctx.strokeStyle = "rgba(255,236,214,0.7)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + bar, y);
    ctx.stroke();
    ctx.fillStyle = "rgba(255,236,214,0.7)";
    ctx.font = "10px Outfit, sans-serif";
    ctx.fillText(`${metres} m`, x, y - 4);
  }

  if (opts.showLegend) {
    ctx.fillStyle = "rgba(255,236,214,0.7)";
    ctx.font = "10px Outfit, sans-serif";
    ctx.fillText("L · Legend", 12, 22);
  }

  if (opts.clipCircle) ctx.restore();
}

export function routeTo(
  graph: StreetGraph | null,
  from: WorldPt,
  to: WorldPt,
): WorldPt[] {
  if (graph) return graph.findPath(from.x, from.z, to.x, to.z);
  return [from, to];
}

export function pathLength(pts: WorldPt[]): number {
  let n = 0;
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1]!;
    const b = pts[i]!;
    n += Math.hypot(b.x - a.x, b.z - a.z);
  }
  return n;
}

export function googleZoomForPpm(ppm: number, lat: number): number {
  const cos = Math.max(0.2, Math.cos((lat * Math.PI) / 180));
  return Math.max(11, Math.min(19, Math.log2(ppm * 156543.03392 * cos)));
}
