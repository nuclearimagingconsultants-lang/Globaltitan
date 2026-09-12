import type { SaveData } from "./types";
import { CITIES } from "./cities";

export type SkillTreeId = "might" | "leap" | "rage";

export type SkillNode = {
  id: string;
  tree: SkillTreeId;
  name: string;
  blurb: string;
  maxRank: number;
  requires?: string;
};

export type TitanMods = {
  damage: number;
  radius: number;
  jump: number;
  climb: number;
  speed: number;
  gravity: number;
  maxHp: number;
  rageGain: number;
  rageTime: number;
  size: number;
  demo: number;
  incoming: number;
  smashCd: number;
};

export const SKILL_TREES: { id: SkillTreeId; name: string; tag: string; tone: string }[] = [
  { id: "might", name: "Smash", tag: "Break the block", tone: "lime" },
  { id: "leap", name: "Mind", tag: "Leap, hang, read the street", tone: "gold" },
  { id: "rage", name: "Gamma", tag: "Heart, temper, hide", tone: "rose" },
];

export const SKILL_NODES: SkillNode[] = [
  { id: "might-heavy", tree: "might", name: "Heavy Hands", blurb: "+18% smash damage per rank.", maxRank: 3 },
  {
    id: "might-shock",
    tree: "might",
    name: "Shockwave",
    blurb: "+16% smash radius per rank.",
    maxRank: 3,
    requires: "might-heavy",
  },
  {
    id: "might-wreck",
    tree: "might",
    name: "Demolition",
    blurb: "Buildings and craters take +35% smash power per rank.",
    maxRank: 3,
    requires: "might-shock",
  },
  {
    id: "might-tempo",
    tree: "might",
    name: "Haymaker Tempo",
    blurb: "Smash recovers 12% faster per rank.",
    maxRank: 3,
    requires: "might-wreck",
  },
  {
    id: "might-titan",
    tree: "might",
    name: "Titan Strike",
    blurb: "Super smash hits a wider block and folds more steel.",
    maxRank: 1,
    requires: "might-tempo",
  },
  { id: "leap-bound", tree: "leap", name: "Skyline Bound", blurb: "+14% leap height per rank.", maxRank: 3 },
  {
    id: "leap-hang",
    tree: "leap",
    name: "Hang Time",
    blurb: "Floatier leaps. −10% gravity per rank.",
    maxRank: 3,
    requires: "leap-bound",
  },
  {
    id: "leap-haul",
    tree: "leap",
    name: "Wall Haul",
    blurb: "+22% climb speed per rank.",
    maxRank: 3,
    requires: "leap-hang",
  },
  {
    id: "leap-stride",
    tree: "leap",
    name: "Street Stride",
    blurb: "+10% run speed per rank.",
    maxRank: 3,
    requires: "leap-haul",
  },
  {
    id: "leap-meteor",
    tree: "leap",
    name: "Meteor Drop",
    blurb: "Landings hit harder and leaps carry farther.",
    maxRank: 1,
    requires: "leap-stride",
  },
  { id: "rage-heart", tree: "rage", name: "Green Heart", blurb: "+16% max health per rank.", maxRank: 3 },
  {
    id: "rage-temper",
    tree: "rage",
    name: "Temper",
    blurb: "+25% rage gain per rank.",
    maxRank: 3,
    requires: "rage-heart",
  },
  {
    id: "rage-fury",
    tree: "rage",
    name: "Longer Fury",
    blurb: "+20% rage duration per rank.",
    maxRank: 3,
    requires: "rage-temper",
  },
  {
    id: "rage-hide",
    tree: "rage",
    name: "Thick Hide",
    blurb: "Take 10% less damage per rank.",
    maxRank: 3,
    requires: "rage-fury",
  },
  {
    id: "rage-monster",
    tree: "rage",
    name: "Monster",
    blurb: "Bigger in and out of rage. Extra health.",
    maxRank: 1,
    requires: "rage-hide",
  },
];

export function xpForLevel(level: number): number {
  return 45 + (level - 1) * 30;
}

export function progressFromXp(xp: number): { level: number; into: number; need: number } {
  let level = 1;
  let remain = Math.max(0, xp);
  while (level < 40) {
    const need = xpForLevel(level);
    if (remain < need) return { level, into: remain, need };
    remain -= need;
    level += 1;
  }
  return { level, into: 0, need: xpForLevel(level) };
}

export function rankOf(save: SaveData, id: string): number {
  return save.skills[id] ?? 0;
}

export function nodeById(id: string): SkillNode | undefined {
  return SKILL_NODES.find((n) => n.id === id);
}

export function canBuy(save: SaveData, id: string): boolean {
  const node = nodeById(id);
  if (!node) return false;
  if (save.skillPoints < 1) return false;
  const rank = rankOf(save, id);
  if (rank >= node.maxRank) return false;
  if (node.requires && rankOf(save, node.requires) < 1) return false;
  return true;
}

export function buySkill(save: SaveData, id: string): boolean {
  if (!canBuy(save, id)) return false;
  save.skills[id] = rankOf(save, id) + 1;
  save.skillPoints -= 1;
  return true;
}

export function computeMods(skills: Record<string, number>): TitanMods {
  const r = (id: string) => skills[id] ?? 0;
  const mods: TitanMods = {
    damage: 1 + r("might-heavy") * 0.18 + (r("leap-meteor") ? 0.1 : 0),
    radius: 1 + r("might-shock") * 0.16 + (r("might-titan") ? 0.28 : 0),
    jump: 1 + r("leap-bound") * 0.14 + (r("leap-meteor") ? 0.12 : 0),
    climb: 1 + r("leap-haul") * 0.22,
    speed: 1 + r("leap-stride") * 0.1,
    gravity: Math.max(0.68, 1 - r("leap-hang") * 0.1),
    maxHp: 1 + r("rage-heart") * 0.16 + (r("rage-monster") ? 0.22 : 0),
    rageGain: 1 + r("rage-temper") * 0.25,
    rageTime: 1 + r("rage-fury") * 0.2,
    size: 1 + (r("rage-monster") ? 0.14 : 0),
    demo: 1 + r("might-wreck") * 0.35 + (r("might-titan") ? 0.45 : 0),
    incoming: Math.max(0.55, 1 - r("rage-hide") * 0.1),
    smashCd: Math.max(0.62, 1 - r("might-tempo") * 0.12),
  };
  return mods;
}

export function spentPoints(save: SaveData): number {
  let n = 0;
  for (const v of Object.values(save.skills)) n += v;
  return n;
}

export function routeCost(save: SaveData): number {
  return 140 + Math.max(0, save.unlockedCities.length - 4) * 50;
}

export function reachableLocked(save: SaveData): Set<string> {
  const open = new Set(save.unlockedCities);
  const next = new Set<string>();
  const last = CITIES.filter((c) => open.has(c.id)).sort((a, b) => b.order - a.order)[0];
  if (last) {
    for (const id of last.unlocks) {
      if (!open.has(id)) next.add(id);
    }
  }
  return next;
}

export function canUnlockRoute(_save: SaveData, _id: string): boolean {
  return false;
}

export const STARTER_CITIES = ["new-york"] as const;
