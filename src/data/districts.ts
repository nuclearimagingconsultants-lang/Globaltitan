export const District = {
  Neutral: "neutral",
  Heroes: "heroes",
  Villains: "villains",
} as const;

export type DistrictId = (typeof District)[keyof typeof District];

/** East of this world X is Skyline Heroes (NY OSM: toward 6th / Times Square). */
export const HERO_GATE_X = 240;
/** West of this world X is the Iron Warrens (NY OSM: toward 10th / 11th / the tunnel). */
export const VILLAIN_GATE_X = -160;

export type StreetHeroDef = {
  id: string;
  name: string;
  role: string;
  blurb: string;
  color: number;
  accent: number;
};

export type StreetVillainDef = {
  id: string;
  name: string;
  title: string;
  blurb: string;
  color: number;
  accent: number;
};

export const SKYLINE_HEROES: StreetHeroDef[] = [
  {
    id: "holt",
    name: "Regent Holt",
    role: "Crown flyer",
    color: 0xc9a227,
    accent: 0x8a1a28,
    blurb: "Nuclear-forged plate, three plans, never late to a street job.",
  },
  {
    id: "vesper",
    name: "Vesper Gale",
    role: "Street warden",
    color: 0x3aa8b8,
    accent: 0xe8f4f6,
    blurb: "She reads a block the way other people read weather.",
  },
  {
    id: "brick",
    name: "Brick Saint",
    role: "Block guardian",
    color: 0xb56a32,
    accent: 0x3a2a22,
    blurb: "If the facade is still standing, he got there first.",
  },
];

export const IRON_WARRENS: StreetVillainDef[] = [
  {
    id: "lode",
    name: "Lodestone",
    title: "Borough iron",
    color: 0x6a7078,
    accent: 0xc45a18,
    blurb: "Owns every ferrous scrap on the west side. The street bends toward him.",
  },
  {
    id: "choir",
    name: "The Choir",
    title: "Many mouths",
    color: 0x5a3a68,
    accent: 0xe8c8ff,
    blurb: "A fractured mind. Each mouth argues a different way to end you.",
  },
  {
    id: "rime",
    name: "Rime",
    title: "Absolute zero",
    color: 0x8ec8dc,
    accent: 0xe8f6ff,
    blurb: "Cold enough to still a nuclear heart. The pavement frost-cracks around her.",
  },
];

export const DISTRICT_COPY: Record<
  DistrictId,
  { name: string; tag: string; toast: string; sky: number; fog: number; hemiSky: number; hemiGround: number; sun: number; sunI: number }
> = {
  neutral: {
    name: "Midtown",
    tag: "Open streets",
    toast: "",
    sky: 0x9aa7b8,
    fog: 0xb8c2cc,
    hemiSky: 0xc5d0dc,
    hemiGround: 0x4a4638,
    sun: 0xffe2b0,
    sunI: 1.35,
  },
  heroes: {
    name: "Skyline Heroes",
    tag: "Gold-hour watch",
    toast: "Skyline Heroes — the watch is live. Press H to team up.",
    sky: 0xffb070,
    fog: 0xffd0a0,
    hemiSky: 0xffd8a8,
    hemiGround: 0x6a4a28,
    sun: 0xffc878,
    sunI: 1.7,
  },
  villains: {
    name: "Iron Warrens",
    tag: "Hostile ground",
    toast: "Iron Warrens — Lodestone's block. Smash or leave.",
    sky: 0x141018,
    fog: 0x241820,
    hemiSky: 0x3a2838,
    hemiGround: 0x1a1014,
    sun: 0x88a0c0,
    sunI: 0.55,
  },
};

export function districtAt(x: number, cityId: string): DistrictId {
  if (cityId !== "new-york") return District.Neutral;
  if (x > HERO_GATE_X) return District.Heroes;
  if (x < VILLAIN_GATE_X) return District.Villains;
  return District.Neutral;
}
