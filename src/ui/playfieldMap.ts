import { loadGoogleMaps, googleMapsUsable, onBasemapAuthFailure } from "./googleBasemap";
import type { MapHub } from "../data/cities";

type LatLng = { lat: number; lng: number };

type PlayMap = {
  setCenter: (ll: LatLng) => void;
  panTo: (ll: LatLng) => void;
  setZoom: (z: number) => void;
  setHeading?: (deg: number) => void;
  setTilt?: (deg: number) => void;
  setMapTypeId: (id: string) => void;
  setOptions: (opts: Record<string, unknown>) => void;
};

type PlayMarker = {
  setMap: (map: PlayMap | null) => void;
  setPosition: (ll: LatLng) => void;
  setTitle: (title: string) => void;
  setIcon?: (icon: unknown) => void;
};

type MapsApi = {
  Map: new (el: HTMLElement, opts: Record<string, unknown>) => PlayMap;
  Marker: new (opts: Record<string, unknown>) => PlayMarker;
  SymbolPath?: { CIRCLE: unknown };
  event?: { trigger: (target: unknown, name: string) => void };
};

export type PlayMarkerDef = {
  id: string;
  lat: number;
  lng: number;
  title: string;
  color: string;
};

let map: PlayMap | null = null;
let apiRef: MapsApi | null = null;
let host: HTMLElement | null = null;
let lastKey = "";
let markers = new Map<string, PlayMarker>();
let mountedHub = "";
let hidden = false;

onBasemapAuthFailure(() => {
  hidePlayfield();
  map = null;
  apiRef = null;
});

function bump(): void {
  if (!map || !apiRef) return;
  apiRef.event?.trigger(map, "resize");
}

export async function mountPlayfieldMap(el: HTMLElement, hub: MapHub): Promise<boolean> {
  host = el;
  if (!googleMapsUsable()) {
    el.hidden = true;
    return false;
  }
  const api = (await loadGoogleMaps()) as MapsApi | null;
  if (!api || !googleMapsUsable()) {
    el.hidden = true;
    return false;
  }
  apiRef = api;
  const center = { lat: hub.lat, lng: hub.lon };
  const zoom = hub.zoom;
  el.hidden = hidden;
  if (!map) {
    map = new api.Map(el, {
      center,
      zoom,
      mapTypeId: "roadmap",
      disableDefaultUI: true,
      zoomControl: false,
      streetViewControl: false,
      mapTypeControl: false,
      fullscreenControl: false,
      clickableIcons: false,
      keyboardShortcuts: false,
      gestureHandling: "none",
      backgroundColor: "#1c1814",
      minZoom: 14,
      maxZoom: 20,
      tilt: 47,
      heading: 0,
      isFractionalZoomEnabled: true,
    });
  } else {
    map.panTo(center);
    map.setZoom(zoom);
  }
  mountedHub = hub.id;
  lastKey = "";
  bump();
  requestAnimationFrame(bump);
  return true;
}

export function warmPlayfield(hub: MapHub): void {
  if (!map || hidden) return;
  map.panTo({ lat: hub.lat, lng: hub.lon });
}

export function syncPlayfield(
  lat: number,
  lng: number,
  zoom: number,
  headingDeg: number,
  tiltDeg: number,
): void {
  if (!map || hidden) return;
  const z = Math.max(14, Math.min(20, zoom));
  const h = ((headingDeg % 360) + 360) % 360;
  const t = Math.max(0, Math.min(67.5, tiltDeg));
  const key = `${lat.toFixed(5)},${lng.toFixed(5)},${z.toFixed(2)},${h.toFixed(0)},${t.toFixed(0)}`;
  if (key === lastKey) return;
  lastKey = key;
  map.panTo({ lat, lng });
  map.setZoom(z);
  try {
    map.setHeading?.(h);
    map.setTilt?.(t);
  } catch {
    /* raster roadmap without a vector mapId may ignore heading/tilt */
  }
}

export function syncPlayMarkers(items: PlayMarkerDef[]): void {
  if (!map || !apiRef || hidden) return;
  const want = new Set(items.map((i) => i.id));
  for (const item of items) {
    const pos = { lat: item.lat, lng: item.lng };
    const prev = markers.get(item.id);
    if (prev) {
      prev.setPosition(pos);
      prev.setTitle(item.title);
      continue;
    }
    const marker = new apiRef.Marker({
      map,
      position: pos,
      title: item.title,
      clickable: false,
      zIndex: 8,
      icon: {
        path: apiRef.SymbolPath?.CIRCLE ?? 0,
        scale: 6,
        fillColor: item.color,
        fillOpacity: 0.95,
        strokeColor: "#1c1814",
        strokeWeight: 1,
      },
    });
    markers.set(item.id, marker);
  }
  for (const [id, row] of markers) {
    if (want.has(id)) continue;
    row.setMap(null);
    markers.delete(id);
  }
}

export function hidePlayfield(): void {
  hidden = true;
  if (host) host.hidden = true;
}

export function showPlayfield(): void {
  hidden = false;
  if (host && map) {
    host.hidden = false;
    requestAnimationFrame(bump);
  }
}

export function playfieldReady(): boolean {
  return Boolean(map) && googleMapsUsable();
}

export function playfieldHubId(): string {
  return mountedHub;
}

export function setPlayfieldType(type: "roadmap" | "hybrid"): void {
  if (!map) return;
  map.setMapTypeId(type);
}
