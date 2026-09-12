import type { CityDef } from "../data/types";

export type WeatherSnap = {
  cityId: string;
  tempC: number;
  code: number;
  cloud: number;
  wind: number;
  label: string;
  nightMul: number;
  fogMul: number;
  sunMul: number;
  fetchedAt: number;
};

const cache = new Map<string, WeatherSnap>();
const inflight = new Map<string, Promise<WeatherSnap | null>>();
const TTL = 10 * 60 * 1000;

const LABELS: Record<number, string> = {
  0: "Clear",
  1: "Mainly clear",
  2: "Partly cloudy",
  3: "Overcast",
  45: "Fog",
  48: "Rime fog",
  51: "Drizzle",
  61: "Rain",
  71: "Snow",
  80: "Showers",
  95: "Thunder",
};

function labelOf(code: number): string {
  return LABELS[code] ?? (code >= 50 && code < 70 ? "Wet" : code >= 70 ? "Snow" : "Cloud");
}

function mixFrom(code: number, cloud: number): Pick<WeatherSnap, "nightMul" | "fogMul" | "sunMul" | "label"> {
  const overcast = Math.max(cloud / 100, code >= 3 && code < 50 ? 0.55 : 0);
  const wet = code >= 51 && code < 80;
  const storm = code >= 80;
  return {
    label: labelOf(code),
    nightMul: storm ? 0.22 : wet ? 0.12 : overcast * 0.18,
    fogMul: storm ? 0.45 : wet ? 0.28 : overcast * 0.2,
    sunMul: storm ? 0.45 : wet ? 0.62 : 1 - overcast * 0.45,
  };
}

export function weatherCached(cityId: string): WeatherSnap | null {
  const hit = cache.get(cityId);
  if (!hit) return null;
  if (Date.now() - hit.fetchedAt > TTL) return hit;
  return hit;
}

/** Open-Meteo current conditions. Never call from the render tick. */
export function pullWeather(city: CityDef): Promise<WeatherSnap | null> {
  const fresh = cache.get(city.id);
  if (fresh && Date.now() - fresh.fetchedAt < TTL) return Promise.resolve(fresh);
  const pending = inflight.get(city.id);
  if (pending) return pending;
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${city.lat}&longitude=${city.lon}&current=temperature_2m,weather_code,cloud_cover,wind_speed_10m`;
  const job = fetch(url)
    .then((r) => (r.ok ? r.json() : null))
    .then((json: { current?: { temperature_2m?: number; weather_code?: number; cloud_cover?: number; wind_speed_10m?: number } } | null) => {
      inflight.delete(city.id);
      if (!json?.current) return cache.get(city.id) ?? null;
      const code = json.current.weather_code ?? 1;
      const cloud = json.current.cloud_cover ?? 30;
      const mix = mixFrom(code, cloud);
      const snap: WeatherSnap = {
        cityId: city.id,
        tempC: json.current.temperature_2m ?? 18,
        code,
        cloud,
        wind: json.current.wind_speed_10m ?? 4,
        fetchedAt: Date.now(),
        ...mix,
      };
      cache.set(city.id, snap);
      return snap;
    })
    .catch(() => {
      inflight.delete(city.id);
      return cache.get(city.id) ?? null;
    });
  inflight.set(city.id, job);
  return job;
}
