import type { CityDef } from "../data/types";
import type { MapFilter, MapPin } from "../systems/MapAtlas";
import { PIN_STYLE, pinMatches } from "../systems/MapAtlas";
import type { StreetGraph } from "../world/streetPack";

type LatLng = { lat: number; lng: number };

type MapsApi = {
  Map: new (el: HTMLElement, opts: Record<string, unknown>) => GoogleMapHandle;
  Marker: new (opts: Record<string, unknown>) => GoogleMarkerHandle;
  SymbolPath?: { CIRCLE: unknown };
  event?: {
    trigger: (target: unknown, name: string) => void;
    addListener?: (target: unknown, name: string, fn: () => void) => unknown;
    addListenerOnce?: (target: unknown, name: string, fn: () => void) => unknown;
  };
};

type GoogleMapHandle = {
  setCenter: (ll: LatLng) => void;
  setZoom: (z: number) => void;
  panTo: (ll: LatLng) => void;
  setMapTypeId: (id: string) => void;
  setOptions: (opts: Record<string, unknown>) => void;
};

type GoogleMarkerHandle = {
  setMap: (map: GoogleMapHandle | null) => void;
  setPosition: (ll: LatLng) => void;
  setTitle: (title: string) => void;
  setIcon?: (icon: unknown) => void;
  setOpacity?: (n: number) => void;
  addListener?: (name: string, fn: () => void) => unknown;
};

declare global {
  interface Window {
    google?: { maps: MapsApi };
    __titanMapsReady?: () => void;
    gm_authFailure?: () => void;
  }
}

export type BasemapType = "roadmap" | "hybrid";

const TYPE_KEY = "titan-streets-map-type";
const DARK_STYLE = [
  { elementType: "geometry", stylers: [{ color: "#1c1814" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#d7c4ae" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#1c1814" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#3a3e44" }] },
  { featureType: "road.arterial", elementType: "geometry", stylers: [{ color: "#4a4e54" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#5a5e64" }] },
  { featureType: "road", elementType: "labels.text.fill", stylers: [{ color: "#cfc4b4" }] },
  { featureType: "poi", stylers: [{ visibility: "off" }] },
  { featureType: "transit", stylers: [{ visibility: "simplified" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#1a2830" }] },
  { featureType: "landscape", elementType: "geometry", stylers: [{ color: "#241c16" }] },
];

let loadPromise: Promise<MapsApi | null> | null = null;
let map: GoogleMapHandle | null = null;
let apiRef: MapsApi | null = null;
let playerMarker: GoogleMarkerHandle | null = null;
const pinMarkers = new Map<string, { marker: GoogleMarkerHandle; pin: MapPin }>();
let hostEl: HTMLElement | null = null;
let mapType: BasemapType = readSavedType();
let lastView = "";
let onTrack: ((pin: MapPin) => void) | null = null;
let resizeObs: ResizeObserver | null = null;
let mapsBlocked = false;
const failListeners = new Set<() => void>();
let errorWatch: MutationObserver | null = null;

function readSavedType(): BasemapType {
  try {
    const v = localStorage.getItem(TYPE_KEY);
    if (v === "hybrid" || v === "roadmap") return v;
  } catch {
    /* ignore */
  }
  return "roadmap";
}

/** Browser key. Vite inlines `VITE_GOOGLE_MAPS_API_KEY` from `.env` or process env. */
function mapsKey(): string {
  const raw = (import.meta.env.VITE_GOOGLE_MAPS_API_KEY ?? "").trim();
  if (!raw || raw === "undefined" || raw === "null") return "";
  return raw;
}

export function googleMapsKeyPresent(): boolean {
  return mapsKey().length > 12;
}

/** Key is present and Maps JS has not reported billing / auth failure. */
export function googleMapsUsable(): boolean {
  return googleMapsKeyPresent() && !mapsBlocked;
}

export function mapsFootnote(mapOpen: boolean, tilesLive: boolean): string {
  if (tilesLive) {
    return "Google Map tiles (Maps JavaScript API). Playable 3D streets from OpenStreetMap. © OpenStreetMap contributors.";
  }
  if (googleMapsUsable() && !mapOpen) {
    return "Google tiles ready — open this map (M) to load them. 3D streets © OpenStreetMap contributors.";
  }
  if (mapsBlocked || googleMapsKeyPresent()) {
    return "Google Maps could not load (billing, key, or quota). Street graph © OpenStreetMap contributors.";
  }
  return "Street geometry © OpenStreetMap contributors. Set VITE_GOOGLE_MAPS_API_KEY (or GOOGLE_MAPS_API_KEY) for Google tiles on this map.";
}

export function onBasemapAuthFailure(fn: () => void): () => void {
  failListeners.add(fn);
  return () => failListeners.delete(fn);
}

function installAuthGuard(): void {
  window.gm_authFailure = () => blockGoogleMaps("gm_authFailure");
}

function blockGoogleMaps(reason: string): void {
  if (mapsBlocked) return;
  mapsBlocked = true;
  console.warn(`[titan-streets] Google Maps blocked (${reason}). Falling back to OSM.`);
  tearDownBasemap();
  for (const fn of failListeners) fn();
}

function isGoogleErrorOverlay(root: ParentNode): boolean {
  if (root.querySelector(".gm-err-container, .gm-err-content")) return true;
  const t = root instanceof HTMLElement ? root.innerText : "";
  return t.includes("can't load Google Maps correctly") || t.includes("Do you own this website");
}

function dismissGoogleErrorUi(): void {
  document.querySelectorAll(".gm-err-container, .gm-err-content").forEach((el) => {
    el.parentElement?.remove();
    el.remove();
  });
  for (const el of document.querySelectorAll("div")) {
    const t = el.textContent ?? "";
    if (t.includes("can't load Google Maps correctly") && t.includes("Do you own this website")) {
      el.remove();
      return;
    }
  }
}

function tearDownBasemap(): void {
  errorWatch?.disconnect();
  errorWatch = null;
  pinMarkers.forEach((row) => row.marker.setMap(null));
  pinMarkers.clear();
  playerMarker?.setMap(null);
  playerMarker = null;
  map = null;
  apiRef = null;
  resizeObs?.disconnect();
  resizeObs = null;
  if (hostEl) {
    hostEl.replaceChildren();
    hostEl.hidden = true;
  }
  dismissGoogleErrorUi();
}

function watchHostErrors(el: HTMLElement): void {
  errorWatch?.disconnect();
  const check = () => {
    if (isGoogleErrorOverlay(el)) blockGoogleMaps("map-error-overlay");
  };
  check();
  errorWatch = new MutationObserver(check);
  errorWatch.observe(el, { childList: true, subtree: true });
  window.setTimeout(() => {
    errorWatch?.disconnect();
    errorWatch = null;
    check();
  }, 8000);
}

function revealHost(el: HTMLElement): void {
  el.hidden = false;
  void el.offsetWidth;
}

function waitForTiles(api: MapsApi, target: GoogleMapHandle, ms = 7000): Promise<boolean> {
  return new Promise((resolve) => {
    if (mapsBlocked) {
      resolve(false);
      return;
    }
    let settled = false;
    const finish = (ok: boolean) => {
      if (settled) return;
      settled = true;
      resolve(ok && !mapsBlocked);
    };
    api.event?.addListenerOnce?.(target, "tilesloaded", () => finish(true));
    window.setTimeout(() => finish(!mapsBlocked), ms);
  });
}

installAuthGuard();

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    mapsBlocked = false;
    loadPromise = null;
    tearDownBasemap();
  });
}

export function currentBasemapType(): BasemapType {
  return mapType;
}

export function loadGoogleMaps(): Promise<MapsApi | null> {
  if (!googleMapsUsable()) return Promise.resolve(null);
  if (window.google?.maps) return Promise.resolve(window.google.maps);
  if (loadPromise) return loadPromise;
  const pending = new Promise<MapsApi | null>((resolve) => {
    const existing = document.querySelector<HTMLScriptElement>("script[data-titan-maps]");
    if (existing) {
      existing.addEventListener("load", () => resolve(window.google?.maps ?? null));
      existing.addEventListener("error", () => resolve(null));
      return;
    }
    const timer = window.setTimeout(() => resolve(window.google?.maps ?? null), 8000);
    window.__titanMapsReady = () => {
      window.clearTimeout(timer);
      resolve(window.google?.maps ?? null);
    };
    const script = document.createElement("script");
    script.dataset.titanMaps = "1";
    script.async = true;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(mapsKey())}&callback=__titanMapsReady&v=weekly&loading=async`;
    script.onerror = () => {
      window.clearTimeout(timer);
      resolve(null);
    };
    document.head.appendChild(script);
  });
  loadPromise = pending.then((api) => {
    apiRef = api;
    if (!api) loadPromise = null;
    return api;
  });
  return loadPromise;
}

function applyType(target: GoogleMapHandle, type: BasemapType): void {
  target.setMapTypeId(type);
  target.setOptions({ styles: type === "roadmap" ? DARK_STYLE : [] });
}

function bumpResize(): void {
  if (!map || !apiRef) return;
  apiRef.event?.trigger(map, "resize");
}

export async function showCityBasemap(
  el: HTMLElement,
  city: CityDef,
  graph: StreetGraph | null,
  player?: { x: number; z: number } | null,
): Promise<boolean> {
  hostEl = el;
  if (mapsBlocked) {
    el.hidden = true;
    return false;
  }
  revealHost(el);
  const api = await loadGoogleMaps();
  if (!api || mapsBlocked) {
    el.hidden = true;
    return false;
  }
  apiRef = api;
  const origin = graph
    ? { lat: graph.originLat, lng: graph.originLon }
    : { lat: city.lat, lng: city.lon };
  const zoom = graph ? 16 : 13;
  if (!map) {
    map = new api.Map(el, {
      center: origin,
      zoom,
      mapTypeId: mapType,
      disableDefaultUI: true,
      zoomControl: false,
      streetViewControl: false,
      mapTypeControl: false,
      fullscreenControl: false,
      clickableIcons: false,
      keyboardShortcuts: false,
      gestureHandling: "none",
      styles: mapType === "roadmap" ? DARK_STYLE : [],
      backgroundColor: "#1c1814",
      minZoom: 11,
      maxZoom: 19,
    });
    applyType(map, mapType);
    resizeObs?.disconnect();
    resizeObs = new ResizeObserver(() => bumpResize());
    resizeObs.observe(el);
  } else {
    map.panTo(origin);
    map.setZoom(zoom);
    applyType(map, mapType);
  }
  bumpResize();
  requestAnimationFrame(() => {
    bumpResize();
    map?.setCenter(origin);
    map?.setZoom(zoom);
  });
  watchHostErrors(el);
  await waitForTiles(api, map);
  if (mapsBlocked) {
    el.hidden = true;
    return false;
  }
  if (player && graph) updatePlayerBasemap(graph, player.x, player.z);
  else if (playerMarker) playerMarker.setMap(null);
  lastView = "";
  return true;
}

export function setBasemapType(type: BasemapType): void {
  mapType = type;
  try {
    localStorage.setItem(TYPE_KEY, type);
  } catch {
    /* ignore */
  }
  if (map && !mapsBlocked) {
    applyType(map, type);
    bumpResize();
  }
}

export function setBasemapTrackHandler(fn: ((pin: MapPin) => void) | null): void {
  onTrack = fn;
}

export function syncBasemapView(lat: number, lng: number, zoom: number): void {
  if (!map || mapsBlocked) return;
  const z = Math.max(11, Math.min(19, Math.round(zoom)));
  const key = `${lat.toFixed(5)},${lng.toFixed(5)},${z}`;
  if (key === lastView) return;
  lastView = key;
  map.setCenter({ lat, lng });
  map.setZoom(z);
}

function pinIcon(api: MapsApi, fill: string, hot: boolean): Record<string, unknown> {
  return {
    path: api.SymbolPath?.CIRCLE ?? 0,
    scale: hot ? 8 : 6,
    fillColor: fill,
    fillOpacity: 1,
    strokeColor: hot ? "#fff6e8" : "#1c1814",
    strokeWeight: hot ? 2 : 1,
  };
}

export function syncBasemapPins(
  graph: StreetGraph | null,
  pins: MapPin[],
  filter: MapFilter,
  trackedId: string | null,
): void {
  if (!map || !apiRef || !graph || mapsBlocked) return;
  const api = apiRef;
  const want = new Set<string>();
  for (const pin of pins) {
    if (!pinMatches(pin, filter)) continue;
    want.add(pin.id);
    const ll = graph.unproject(pin.x, pin.z);
    const pos = { lat: ll.lat, lng: ll.lon };
    const style = PIN_STYLE[pin.kind];
    const hot = pin.id === trackedId;
    const prev = pinMarkers.get(pin.id);
    if (prev) {
      prev.marker.setPosition(pos);
      prev.marker.setTitle(`${pin.title} · ${pin.typeLabel}`);
      prev.marker.setIcon?.(pinIcon(api, style.fill, hot));
      prev.marker.setOpacity?.(hot ? 1 : 0.92);
      prev.pin = pin;
      continue;
    }
    const marker = new api.Marker({
      map,
      position: pos,
      title: `${pin.title} · ${pin.typeLabel}`,
      icon: pinIcon(api, style.fill, hot),
      zIndex: hot ? 20 : 10,
      clickable: true,
    });
    marker.addListener?.("click", () => onTrack?.(pinMarkers.get(pin.id)?.pin ?? pin));
    pinMarkers.set(pin.id, { marker, pin });
  }
  for (const [id, row] of pinMarkers) {
    if (want.has(id)) continue;
    row.marker.setMap(null);
    pinMarkers.delete(id);
  }
}

export function updatePlayerBasemap(graph: StreetGraph | null, x: number, z: number): void {
  if (!map || !graph || !apiRef || mapsBlocked) return;
  const ll = graph.unproject(x, z);
  const pos = { lat: ll.lat, lng: ll.lon };
  if (!playerMarker) {
    playerMarker = new apiRef.Marker({
      map,
      position: pos,
      title: "You",
      zIndex: 40,
      icon: {
        path: apiRef.SymbolPath?.CIRCLE ?? 0,
        scale: 5,
        fillColor: "#7dff6a",
        fillOpacity: 1,
        strokeColor: "#10200c",
        strokeWeight: 2,
      },
    });
  } else {
    playerMarker.setMap(map);
    playerMarker.setPosition(pos);
  }
}

export function basemapHost(): HTMLElement | null {
  return hostEl;
}

export function basemapReady(): boolean {
  return Boolean(map) && !mapsBlocked;
}
