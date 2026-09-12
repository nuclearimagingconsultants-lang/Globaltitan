import type { CityDef, LandmarkKind } from "../data/types";
import { createRng, hashString } from "./rng";

export type CityTheme = {
  sky: number;
  fog: number;
  fogNear: number;
  fogFar: number;
  hemiSky: number;
  hemiGround: number;
  sunColor: number;
  sunIntensity: number;
  sunDir: [number, number, number];
  buildings: number[];
  accent: number;
  window: number;
  road: number;
  sidewalk: number;
  grass: number;
  plaza: number;
  vehicles: number[];
  neon: number[];
  night: boolean;
  landmark: LandmarkKind;
};

const FEATURED: Record<string, Partial<CityTheme>> = {
  "new-york": {
    sky: 0xb8d4f0,
    fog: 0xc8daf0,
    fogNear: 140,
    fogFar: 520,
    night: false,
    hemiSky: 0xdceaf8,
    hemiGround: 0x4a5560,
    sunColor: 0xfff2dc,
    sunIntensity: 1.75,
    sunDir: [0.38, 0.88, 0.22],
    buildings: [0x8a929c, 0xa8b0b8, 0x6a727c, 0xb4bcc4, 0x7a8288],
    accent: 0xc9a227,
    window: 0xffe7a8,
    road: 0x2b2c30,
    sidewalk: 0x8b8d90,
    grass: 0x3d5c38,
    plaza: 0x6a7078,
    vehicles: [0xf0c400, 0xd8d8d8, 0x2c3d6b, 0xb42318],
    landmark: "towers",
  },
  tokyo: {
    sky: 0x0b1020,
    fog: 0x1a1430,
    night: true,
    fogNear: 40,
    fogFar: 220,
    hemiSky: 0x2a1850,
    hemiGround: 0x1a1020,
    sunColor: 0xff66cc,
    sunIntensity: 0.45,
    sunDir: [0.2, 0.7, -0.4],
    buildings: [0x1c1e28, 0x2a2438, 0x141820, 0x242030, 0x303040],
    accent: 0xff2d8b,
    window: 0x66f0ff,
    road: 0x16161c,
    sidewalk: 0x3a3a48,
    grass: 0x1d3328,
    plaza: 0x2a2438,
    vehicles: [0xff2d8b, 0x22e0ff, 0xf5f5f5, 0x111111],
    neon: [0xff2d8b, 0x22e0ff, 0xffee55, 0xbb66ff],
    landmark: "neon",
  },
  london: {
    sky: 0x8b97a3,
    fog: 0xa8b2bb,
    night: false,
    hemiSky: 0xb0bbc4,
    hemiGround: 0x5a5044,
    sunColor: 0xd8d2c4,
    sunIntensity: 0.85,
    buildings: [0x8b4a3a, 0x6a5344, 0xc4b8a4, 0x4d5560, 0x9a6a52],
    accent: 0xb22222,
    window: 0xffd9a0,
    road: 0x2a2a2c,
    sidewalk: 0x8a8680,
    grass: 0x3f5a34,
    plaza: 0x7a746c,
    vehicles: [0xb22222, 0x111111, 0xc8c4b8, 0x2d4a7a],
    landmark: "clock",
  },
  dubai: {
    sky: 0xf2d7a0,
    fog: 0xf3e0b8,
    night: false,
    fogFar: 280,
    hemiSky: 0xffe6b0,
    hemiGround: 0xc4a06a,
    sunColor: 0xfff0c8,
    sunIntensity: 1.7,
    sunDir: [0.55, 0.95, 0.15],
    buildings: [0xd8c4a0, 0xb8c4d0, 0xe8d8b0, 0x8aa0b0, 0xf0e6c8],
    accent: 0xd4af37,
    window: 0x9ad4ff,
    road: 0x3a3834,
    sidewalk: 0xc8b898,
    grass: 0x5a7a40,
    plaza: 0xd8c8a0,
    vehicles: [0xf5f5f5, 0xd4af37, 0x111111, 0x1a3a5c],
    landmark: "spire",
  },
  "rio-de-janeiro": {
    sky: 0x6ec4e8,
    fog: 0xa8d8c8,
    night: false,
    hemiSky: 0x9ad4f0,
    hemiGround: 0x4a7a40,
    sunColor: 0xfff3c0,
    sunIntensity: 1.45,
    buildings: [0xf26b6b, 0xf2c14e, 0x4ecdc4, 0xf784a8, 0xffffff],
    accent: 0x2ecc71,
    window: 0xfff4c8,
    road: 0x33332f,
    sidewalk: 0xe8d8c0,
    grass: 0x2f8a44,
    plaza: 0xe8c878,
    vehicles: [0xf26b6b, 0xf2c14e, 0x2d6cdf, 0xffffff],
    landmark: "mountain",
  },
  miami: {
    sky: 0xff9ed2,
    fog: 0xffc1e0,
    night: true,
    fogNear: 50,
    fogFar: 240,
    hemiSky: 0xff80c8,
    hemiGround: 0x204060,
    sunColor: 0xff66aa,
    sunIntensity: 0.55,
    buildings: [0x80ffe8, 0xff80c0, 0x40c0ff, 0xf5f0e6, 0xffc878],
    accent: 0xff66aa,
    window: 0xfff0a8,
    road: 0x2a2430,
    sidewalk: 0xd8c8c0,
    grass: 0x2f8a50,
    plaza: 0xffc0d8,
    vehicles: [0xff66aa, 0x40ffe0, 0xffffff, 0x222233],
    neon: [0xff66aa, 0x40ffe0, 0xffee66],
    landmark: "generic",
  },
  "los-angeles": {
    sky: 0xffb070,
    fog: 0xffc898,
    night: false,
    hemiSky: 0xffc898,
    hemiGround: 0x8a6a40,
    sunColor: 0xffd090,
    sunIntensity: 1.4,
    sunDir: [-0.6, 0.5, 0.2],
    buildings: [0xe8d8c0, 0xc4b49a, 0x8aa0a8, 0xf0e0c8, 0x6a7068],
    accent: 0xff6a2a,
    window: 0xffe0a0,
    road: 0x353430,
    sidewalk: 0xb8b0a4,
    grass: 0x6a8a40,
    plaza: 0xc8b890,
    vehicles: [0xffffff, 0xff6a2a, 0x2a2a2a, 0x3a70c0],
    landmark: "hollywood",
  },
  paris: {
    sky: 0xc8d4e0,
    fog: 0xd4dce6,
    buildings: [0xc4b49a, 0xa89880, 0xd8c8b0, 0x6a6058, 0xe8dcc8],
    accent: 0xc9a227,
    landmark: "lattice",
  },
};

export function themeFor(city: CityDef): CityTheme {
  // Featured cities (NY smash) beat shell palette — avoids sandy/desert wash under bloom
  const featuredFirst = FEATURED[city.id];
  if (featuredFirst && featuredFirst.sky != null) {
    return {
      sky: featuredFirst.sky!,
      fog: featuredFirst.fog ?? 0xc8daf0,
      fogNear: featuredFirst.fogNear ?? 140,
      fogFar: featuredFirst.fogFar ?? 520,
      hemiSky: featuredFirst.hemiSky ?? featuredFirst.sky!,
      hemiGround: featuredFirst.hemiGround ?? 0x4a5560,
      sunColor: featuredFirst.sunColor ?? 0xfff2dc,
      sunIntensity: featuredFirst.sunIntensity ?? 1.85,
      sunDir: featuredFirst.sunDir ?? [0.38, 0.88, 0.22],
      buildings: featuredFirst.buildings ?? [0x8a929c, 0xa8b0b8, 0x6a727c, 0xb4bcc4, 0x7a8288],
      accent: featuredFirst.accent ?? 0xc9a227,
      window: featuredFirst.window ?? 0xffe7a8,
      road: featuredFirst.road ?? 0x2b2c30,
      sidewalk: featuredFirst.sidewalk ?? 0x8b8d90,
      grass: featuredFirst.grass ?? 0x3d5c38,
      plaza: featuredFirst.plaza ?? 0x6a7078,
      vehicles: featuredFirst.vehicles ?? [0xf0c400, 0xd8d8d8, 0x2c3d6b, 0xb42318],
      neon: featuredFirst.neon ?? [],
      night: Boolean(featuredFirst.night),
      landmark: featuredFirst.landmark ?? city.landmark,
    };
  }

  const pal = city.palette;
  if (pal) {
    const featured = FEATURED[city.id];
    return {
      sky: pal.sky,
      fog: pal.fog,
      fogNear: pal.night ? 45 : 110,
      fogFar: pal.night ? 230 : 460,
      hemiSky: pal.sky,
      hemiGround: pal.grass,
      sunColor: pal.night ? 0xaaccff : 0xffeed0,
      sunIntensity: pal.night ? 0.45 : 1.35,
      sunDir: featured?.sunDir ?? [0.38, 0.88, 0.22],
      buildings: pal.buildings,
      accent: pal.accent,
      window: pal.window,
      road: pal.road,
      sidewalk: pal.sidewalk,
      grass: pal.grass,
      plaza: pal.plaza,
      vehicles: featured?.vehicles ?? [pal.accent, 0xd8d8d8, 0x2c3d6b, 0xb42318],
      neon: pal.neon ?? [],
      night: Boolean(pal.night),
      landmark: city.landmark,
    };
  }
  const rng = createRng(hashString(`theme:${city.id}`));
  const night = city.lat > 50 ? rng() < 0.35 : rng() < 0.25;
  const arid = city.lon < -100 && city.lat < 38 && city.lat > 28;
  const tropical = city.lat < 26;
  const nordic = city.lat > 55 || city.id === "anchorage";

  let base: CityTheme;
  if (night) {
    base = {
      sky: 0x0e1624,
      fog: 0x152033,
      fogNear: 45,
      fogFar: 230,
      hemiSky: 0x243050,
      hemiGround: 0x141820,
      sunColor: 0xaaccff,
      sunIntensity: 0.35,
      sunDir: [-0.3, 0.75, 0.4],
      buildings: [0x2a3038, 0x3a4048, 0x202428, 0x4a5058, 0x32363c],
      accent: 0x66d0ff,
      window: 0xffd27a,
      road: 0x18181c,
      sidewalk: 0x3e4044,
      grass: 0x1c3324,
      plaza: 0x2c3034,
      vehicles: [0xeeeeee, 0xc0392b, 0x2980b9, 0x111111],
      neon: [0x66d0ff, 0xff66aa, 0xffee66],
      night: true,
      landmark: city.landmark,
    };
  } else if (arid) {
    base = {
      sky: 0xe8d8a8,
      fog: 0xf0e2b8,
      fogNear: 60,
      fogFar: 270,
      hemiSky: 0xffe8b8,
      hemiGround: 0xc0a070,
      sunColor: 0xfff0c8,
      sunIntensity: 1.55,
      sunDir: [0.5, 0.9, 0.2],
      buildings: [0xd8c4a0, 0xc4b090, 0xe8d8b8, 0xa89870, 0xf0e6c8],
      accent: 0xc9a227,
      window: 0x9ad0ff,
      road: 0x3a3630,
      sidewalk: 0xc8b898,
      grass: 0x6a8a44,
      plaza: 0xd4c4a0,
      vehicles: [0xf5f0e6, 0x111111, 0xb8860b, 0x2c3e50],
      neon: [],
      night: false,
      landmark: city.landmark,
    };
  } else if (tropical) {
    base = {
      sky: 0x5eb6e0,
      fog: 0x9ad4c8,
      fogNear: 55,
      fogFar: 250,
      hemiSky: 0x8fd0f0,
      hemiGround: 0x3a7a40,
      sunColor: 0xfff4c8,
      sunIntensity: 1.4,
      sunDir: [0.4, 0.85, -0.2],
      buildings: [0xf2a1a1, 0xf2d16b, 0x7ad1c4, 0xf5f5f0, 0x7aa0d8],
      accent: 0x2ecc71,
      window: 0xfff0c0,
      road: 0x32322e,
      sidewalk: 0xe0d4c0,
      grass: 0x2f8a44,
      plaza: 0xe8d090,
      vehicles: [0xf39c12, 0xe74c3c, 0xffffff, 0x27ae60],
      neon: [],
      night: false,
      landmark: city.landmark,
    };
  } else if (nordic) {
    base = {
      sky: 0xc5d4e0,
      fog: 0xd8e2ea,
      fogNear: 50,
      fogFar: 240,
      hemiSky: 0xd8e6f0,
      hemiGround: 0x6a7068,
      sunColor: 0xe8f0ff,
      sunIntensity: 0.95,
      sunDir: [0.2, 0.55, 0.6],
      buildings: [0xd0d6dc, 0x8a9098, 0xe8ece8, 0x5a6058, 0xb8c0c4],
      accent: 0x3d7ea6,
      window: 0xffe6b0,
      road: 0x2c2e30,
      sidewalk: 0xb8bcc0,
      grass: 0x4a6a40,
      plaza: 0xc8ccd0,
      vehicles: [0xe74c3c, 0x2c3e50, 0xecf0f1, 0x27ae60],
      neon: [],
      night: false,
      landmark: city.landmark,
    };
  } else {
    base = {
      sky: 0x87a0b8,
      fog: 0xb0c0cc,
      fogNear: 55,
      fogFar: 250,
      hemiSky: 0xc0d0dc,
      hemiGround: 0x4a4a40,
      sunColor: 0xffe8c0,
      sunIntensity: 1.2,
      sunDir: [0.4, 0.8, 0.25],
      buildings: [0x6a7078, 0x8a8074, 0x4a5058, 0xb0a898, 0x5c646c],
      accent: 0xc0392b,
      window: 0xffdca8,
      road: 0x2a2a2c,
      sidewalk: 0x8a8c90,
      grass: 0x456838,
      plaza: 0x7a7e80,
      vehicles: [0xc0392b, 0x2980b9, 0xf1c40f, 0x2c3e50],
      neon: [],
      night: false,
      landmark: city.landmark,
    };
  }

  const featured = FEATURED[city.id];
  const merged: CityTheme = {
    ...base,
    ...featured,
    buildings: featured?.buildings ?? base.buildings,
    vehicles: featured?.vehicles ?? base.vehicles,
    neon: featured?.neon ?? base.neon,
    sunDir: featured?.sunDir ?? base.sunDir,
    landmark: featured?.landmark ?? city.landmark,
  };

  if (!featured) {
    const tinted = merged.buildings.map((c, i) => shift(c, (rng() - 0.5) * 12 + i));
    merged.buildings = tinted;
  }
  return merged;
}

function shift(color: number, amt: number): number {
  const r = Math.min(255, Math.max(0, ((color >> 16) & 255) + amt));
  const g = Math.min(255, Math.max(0, ((color >> 8) & 255) + amt * 0.6));
  const b = Math.min(255, Math.max(0, (color & 255) + amt * 0.4));
  return (r << 16) | (g << 8) | b;
}
