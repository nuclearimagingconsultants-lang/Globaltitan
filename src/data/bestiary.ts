import type { CaughtBeastie } from "./types";
import { cityShell } from "./cityShells";
import nyRoster from "./ny-bestiary.json";

export type MoveDef = {
  id: string;
  name: string;
  power: number;
  kind: "melee" | "burst" | "dash" | "guard" | "hex";
};

export type BeastRank = "normal" | "champ" | "unique";

export type SpeciesDef = {
  id: string;
  name: string;
  blurb: string;
  body: string;
  color: number;
  accent: number;
  moves: string[];
  cityId?: string;
  code?: string;
  rank?: BeastRank;
};

export function rankForSlot(index: number): BeastRank {
  if (index < 30) return "normal";
  if (index < 45) return "champ";
  return "unique";
}

export function codeForSlot(index: number): string {
  return `C-${String(index + 1).padStart(2, "0")}`;
}

export function stampRoster(list: SpeciesDef[], cityId: string): SpeciesDef[] {
  return list.map((s, i) => ({
    ...s,
    cityId,
    code: s.code ?? codeForSlot(i),
    rank: s.rank ?? rankForSlot(i),
  }));
}

export function pickWildSpecies(roster: SpeciesDef[], rng: () => number): SpeciesDef {
  const roll = rng();
  const want: BeastRank = roll < 0.7 ? "normal" : roll < 0.92 ? "champ" : "unique";
  const pool = roster.filter((s) => s.rank === want);
  return pool[Math.floor(rng() * pool.length)] ?? roster[Math.floor(rng() * roster.length)]!;
}

export const MOVES: Record<string, MoveDef> = {
  "steam-jet": { id: "steam-jet", name: "Steam Jet", power: 22, kind: "burst" },
  scratch: { id: "scratch", name: "Alley Scratch", power: 16, kind: "melee" },
  hide: { id: "hide", name: "Stoop Hide", power: 8, kind: "guard" },
  pounce: { id: "pounce", name: "Stoop Pounce", power: 20, kind: "dash" },
  pincer: { id: "pincer", name: "Pincer Snap", power: 18, kind: "melee" },
  "taxi-rush": { id: "taxi-rush", name: "Taxi Rush", power: 21, kind: "dash" },
  "shell-up": { id: "shell-up", name: "Shell Up", power: 10, kind: "guard" },
  honk: { id: "honk", name: "Horn Honk", power: 14, kind: "hex" },
  "neon-slash": { id: "neon-slash", name: "Neon Slash", power: 24, kind: "melee" },
  glare: { id: "glare", name: "Marquee Glare", power: 12, kind: "hex" },
  "dust-wing": { id: "dust-wing", name: "Dust Wing", power: 15, kind: "burst" },
  siphon: { id: "siphon", name: "Grate Siphon", power: 13, kind: "hex" },
  "cobble-crush": { id: "cobble-crush", name: "Cobble Crush", power: 23, kind: "melee" },
  "spark-bite": { id: "spark-bite", name: "Third-Rail Bite", power: 22, kind: "melee" },
  slip: { id: "slip", name: "Tile Slip", power: 11, kind: "dash" },
  "hydrant-burst": { id: "hydrant-burst", name: "Hydrant Burst", power: 25, kind: "burst" },
  belch: { id: "belch", name: "Cart Belch", power: 17, kind: "burst" },
  "web-lash": { id: "web-lash", name: "Tape Lash", power: 16, kind: "hex" },
  "drop-kick": { id: "drop-kick", name: "Scaffold Drop", power: 23, kind: "dash" },
  "siren-wail": { id: "siren-wail", name: "Siren Wail", power: 18, kind: "hex" },
  "peck-storm": { id: "peck-storm", name: "Peck Storm", power: 19, kind: "melee" },
  coil: { id: "coil", name: "Coil Bind", power: 20, kind: "hex" },
};

const NY = stampRoster(nyRoster as SpeciesDef[], "new-york");

const BODIES = ["rat", "crab", "lynx", "moth", "beetle", "lizard", "toad", "bird", "fox", "serpent", "fish", "bug", "hound"];
const MOVE_IDS = Object.keys(MOVES);
const PREFIX = [
  "Civic", "Harbor", "Prairie", "Canyon", "Bayou", "Alpine", "Gulf", "Lake", "Desert", "Pine",
  "Iron", "Salt", "Fog", "Grain", "River", "Plaza", "Depot", "Mission", "Dune", "Glacier",
];

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

function seededMoves(seed: number): string[] {
  const out: string[] = [];
  let x = seed;
  while (out.length < 4) {
    x = (x * 1664525 + 1013904223) >>> 0;
    const id = MOVE_IDS[x % MOVE_IDS.length]!;
    if (!out.includes(id)) out.push(id);
  }
  return out;
}

const cache = new Map<string, SpeciesDef[]>();

export function rosterForCity(cityId: string, cityName: string): SpeciesDef[] {
  if (cityId === "new-york") return NY;
  const hit = cache.get(cityId);
  if (hit) return hit;
  const h = hash(cityId);
  const prefix = cityShell(cityId)?.bestiaryPrefix ?? PREFIX[h % PREFIX.length]!;
  const list: SpeciesDef[] = [];
  for (let i = 0; i < 50; i++) {
    const body = BODIES[(h + i * 7) % BODIES.length]!;
    const seed = hash(`${cityId}:${i}:${body}`);
    const color = (seed & 0xffffff) >>> 0;
    const accent = ((seed >>> 8) * 17) & 0xffffff;
    list.push({
      id: `${cityId}-${i + 1}`,
      name: `${prefix} ${body[0]!.toUpperCase()}${body.slice(1)} ${i + 1}`,
      blurb: `A ${cityName} street original. Stage it, name it, take it into the capital dungeon.`,
      body,
      color: color < 0x202020 ? color + 0x404040 : color,
      accent,
      moves: seededMoves(seed),
      cityId,
      code: codeForSlot(i),
      rank: rankForSlot(i),
    });
  }
  cache.set(cityId, list);
  return list;
}

export function speciesById(id: string, cityId: string, cityName: string): SpeciesDef | undefined {
  return rosterForCity(cityId, cityName).find((s) => s.id === id) ?? NY.find((s) => s.id === id);
}

export function stageName(species: SpeciesDef, stage: 1 | 2 | 3): string {
  if (stage === 1) return species.name;
  if (stage === 2) return `${species.name} Prime`;
  return `${species.name} Apex`;
}

export function canEvolve(b: CaughtBeastie): 2 | 3 | null {
  if (b.stage < 2 && (b.level >= 16 || b.wins >= 10)) return 2;
  if (b.stage < 3 && (b.level >= 32 || b.bossKills >= 1)) return 3;
  return null;
}

export function grantBeastXp(b: CaughtBeastie, amount: number): void {
  b.xp += amount;
  while (b.xp >= b.level * 40) {
    b.xp -= b.level * 40;
    b.level += 1;
  }
  const next = canEvolve(b);
  if (next) b.stage = next;
}

export function moveName(id: string): string {
  return MOVES[id]?.name ?? id;
}

export const NY_COUNT = NY.length;
