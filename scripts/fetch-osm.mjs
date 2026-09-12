#!/usr/bin/env node
/**
 * Cache OSM roads + building footprints into public/maps/{city-id}.json
 * and a GeoJSON sidecar. Uses Overpass (vector extract). Never scrapes Google.
 *
 *   npm run maps              # NY + Boston (playable packs)
 *   npm run maps -- chicago   # any id in scripts/city-bboxes.json
 *   npm run maps -- --all-stubs  # bboxes only; skips fetch
 *
 * Street data © OpenStreetMap contributors.
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const bboxes = JSON.parse(await readFile(join(root, "scripts/city-bboxes.json"), "utf8"));
const args = process.argv.slice(2).filter((a) => a !== "--all-stubs");
const defaultIds = ["new-york", "boston"];
const ids = args.length ? args : defaultIds;

const KEEP_HW = new Set([
  "motorway",
  "trunk",
  "primary",
  "secondary",
  "tertiary",
  "unclassified",
  "residential",
  "living_street",
  "pedestrian",
  "busway",
  "primary_link",
  "secondary_link",
  "tertiary_link",
]);

const OVERPASS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
];

function kindOf(highway) {
  if (highway === "motorway" || highway === "trunk" || highway === "primary") return "avenue";
  if (highway === "pedestrian" || highway === "living_street" || highway === "footway") return "walk";
  if (highway === "secondary" || highway === "tertiary") return "street";
  return "street";
}

function round(n, p = 6) {
  const m = 10 ** p;
  return Math.round(n * m) / m;
}

function overpassQl(b) {
  const bbox = `${b.south},${b.west},${b.north},${b.east}`;
  return `[out:json][timeout:90];
(
  way["highway"~"^(motorway|trunk|primary|secondary|tertiary|unclassified|residential|living_street|pedestrian|busway|primary_link|secondary_link|tertiary_link)$"](${bbox});
  way["building"](${bbox});
);
out tags geom;`;
}

async function overpass(b) {
  const body = overpassQl(b);
  let lastErr = "";
  for (const url of OVERPASS) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
          "User-Agent": "TitanStreets/1.0 (OSM street cache; educational; no Google scrape)",
        },
        body: `data=${encodeURIComponent(body)}`,
      });
      if (!res.ok) {
        lastErr = `${url} ${res.status}`;
        continue;
      }
      return await res.json();
    } catch (err) {
      lastErr = String(err);
    }
  }
  throw new Error(lastErr || "Overpass failed");
}

function simplifyLine(coords, minDeg = 0.00003) {
  if (coords.length < 3) return coords;
  const out = [coords[0]];
  for (let i = 1; i < coords.length - 1; i++) {
    const prev = out[out.length - 1];
    const c = coords[i];
    if (Math.abs(c[0] - prev[0]) + Math.abs(c[1] - prev[1]) < minDeg) continue;
    out.push(c);
  }
  const last = coords[coords.length - 1];
  const prev = out[out.length - 1];
  if (prev[0] !== last[0] || prev[1] !== last[1]) out.push(last);
  return out.length >= 2 ? out : coords;
}

function parseOverpass(json) {
  const roads = [];
  const buildings = [];
  for (const el of json.elements ?? []) {
    if (el.type !== "way" || !el.geometry?.length) continue;
    const tags = el.tags ?? {};
    const coords = [];
    for (const g of el.geometry) {
      const lon = round(g.lon);
      const lat = round(g.lat);
      const last = coords[coords.length - 1];
      if (last && last[0] === lon && last[1] === lat) continue;
      coords.push([lon, lat]);
    }
    if (tags.highway && KEEP_HW.has(tags.highway) && coords.length >= 2) {
      roads.push({
        id: String(el.id),
        name: tags.name ?? "",
        highway: tags.highway,
        kind: kindOf(tags.highway),
        coords: simplifyLine(coords),
      });
    } else if (tags.building && tags.building !== "no" && coords.length >= 3) {
      if (coords[0][0] === coords[coords.length - 1][0] && coords[0][1] === coords[coords.length - 1][1]) {
        coords.pop();
      }
      if (coords.length < 3) continue;
      const levels = Number(tags["building:levels"] || tags.levels || 0);
      const height = Number(String(tags.height || "").replace(/m$/i, ""));
      buildings.push({
        id: String(el.id),
        name: tags.name ?? "",
        levels: Number.isFinite(levels) && levels > 0 ? levels : undefined,
        height: Number.isFinite(height) && height > 4 ? height : undefined,
        coords: simplifyLine(coords, 0.00004),
      });
    }
  }
  return { roads, buildings };
}

function toGeoJson(pack) {
  const features = [];
  for (const r of pack.roads) {
    features.push({
      type: "Feature",
      properties: { kind: "road", id: r.id, name: r.name, highway: r.highway, streetKind: r.kind },
      geometry: { type: "LineString", coordinates: r.coords },
    });
  }
  for (const b of pack.buildings ?? []) {
    const ring = [...b.coords, b.coords[0]];
    features.push({
      type: "Feature",
      properties: { kind: "building", id: b.id, name: b.name, levels: b.levels ?? null, height: b.height ?? null },
      geometry: { type: "Polygon", coordinates: [ring] },
    });
  }
  for (const lm of pack.landmarks ?? []) {
    features.push({
      type: "Feature",
      properties: { kind: "landmark", id: lm.id, name: lm.name, landmarkKind: lm.kind },
      geometry: { type: "Point", coordinates: [lm.lon, lm.lat] },
    });
  }
  return {
    type: "FeatureCollection",
    name: pack.name,
    attribution: pack.attribution,
    bbox: pack.bbox,
    origin: pack.origin,
    features,
  };
}

await mkdir(join(root, "public/maps"), { recursive: true });

if (process.argv.includes("--all-stubs")) {
  console.log(`${Object.keys(bboxes).length} city bboxes in scripts/city-bboxes.json (no fetch)`);
  process.exit(0);
}

for (const id of ids) {
  const b = bboxes[id];
  if (!b) {
    console.error(`Unknown city ${id}. Add a bbox in scripts/city-bboxes.json`);
    continue;
  }
  console.log(`Overpass extract ${id} (${b.south},${b.west},${b.north},${b.east})`);
  let roads = [];
  let buildings = [];
  try {
    const json = await overpass(b);
    const parsed = parseOverpass(json);
    roads = parsed.roads;
    buildings = parsed.buildings;
  } catch (err) {
    console.error(`  Overpass failed: ${err}. Keeping existing pack if present.`);
    try {
      const prev = JSON.parse(await readFile(join(root, "public/maps", `${id}.json`), "utf8"));
      roads = prev.roads ?? [];
      buildings = prev.buildings ?? [];
    } catch {
      continue;
    }
  }
  if (buildings.length > 900) buildings = buildings.slice(0, 900);
  const pack = {
    id,
    name: b.name,
    attribution: "© OpenStreetMap contributors",
    bbox: [b.west, b.south, b.east, b.north],
    origin: b.origin,
    landmarks: b.landmarks,
    roads,
    buildings,
  };
  const out = join(root, "public/maps", `${id}.json`);
  const geo = join(root, "public/maps", `${id}.geojson`);
  const jsonText = JSON.stringify(pack);
  const gj = JSON.stringify(toGeoJson(pack));
  await writeFile(out, jsonText);
  await writeFile(geo, gj);
  if (id === "new-york") {
    await writeFile(join(root, "public/maps", "nyc-roads.geojson"), gj);
  }
  console.log(
    `  ${roads.length} roads, ${buildings.length} footprints, ${(Buffer.byteLength(jsonText) / 1024).toFixed(1)} KB`,
  );
}
