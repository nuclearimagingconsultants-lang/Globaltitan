import rosterJson from "../../data/CAPITAL_BOSS_ROSTER.json";
import { CITIES, EXTRA_CITIES } from "./cities";
import type { CityId } from "./types";

export type BossEncounter = {
  hp: number;
  move: string;
  tint: number;
};

export type ThreatRankRow = {
  rank: number;
  id: string;
  workingName: string;
  ipAlias: string;
  remapKey: string;
  originalFace: boolean;
  screenshotGap: boolean;
  encounter: BossEncounter;
};

export type CapitalBossRow = {
  cityId: string;
  cityName: string;
  campaignOrder: number;
  threatRank: number | null;
  bossId: string;
  workingName: string;
  ipAlias: string;
  remapKey: string;
  originalFace: boolean;
  postBoss: string;
  debugSelect: boolean;
  encounter: BossEncounter;
};

export type CapitalBossRosterFile = {
  version: number;
  notes: string;
  debugChain: string[];
  killSpare: { everyCapital: boolean; unlockAt: number };
  threats: ThreatRankRow[];
  cities: CapitalBossRow[];
};

export const CAPITAL_BOSS_ROSTER = rosterJson as CapitalBossRosterFile;

const byCity = new Map(CAPITAL_BOSS_ROSTER.cities.map((row) => [row.cityId, row]));

/** Worldbreaker IP-alias remap hook. Currently identity — working Marvel names. */
export function remapBossName(row: CapitalBossRow | ThreatRankRow): string {
  return row.ipAlias || row.workingName;
}

export function capitalBossFor(cityId: CityId): CapitalBossRow | null {
  return byCity.get(cityId) ?? null;
}

export function capitalBossLabel(cityId: CityId, fallback: string): string {
  const row = capitalBossFor(cityId);
  return row ? remapBossName(row) : fallback;
}

export function debugBossChain(): CapitalBossRow[] {
  const ids = CAPITAL_BOSS_ROSTER.debugChain;
  const head = ids.map((id) => byCity.get(id)).filter((row): row is CapitalBossRow => Boolean(row));
  const rest = CAPITAL_BOSS_ROSTER.cities.filter((row) => !ids.includes(row.cityId));
  return [...head, ...rest];
}

function assertRoster(): void {
  const file = CAPITAL_BOSS_ROSTER;
  if (file.threats.length !== 70) throw new Error(`Expected 70 threat ranks, got ${file.threats.length}`);
  if (file.cities.length !== 73) throw new Error(`Expected 73 city bosses, got ${file.cities.length}`);
  const ny = capitalBossFor("new-york");
  if (!ny || ny.bossId !== "TBD_NY_CapitalBoss") throw new Error("NY capital boss must be TBD_NY_CapitalBoss");
  if (ny.postBoss !== "Razorback") throw new Error("NY post-boss must be Razorback");
  const la = capitalBossFor("los-angeles");
  if (!la || la.workingName !== "Toad" || la.threatRank !== 70) throw new Error("LA capital boss must be Toad #70");
  const chi = capitalBossFor("chicago");
  if (!chi || chi.workingName !== "Stilt-Man" || chi.threatRank !== 69) throw new Error("Chicago must be Stilt-Man #69");
  const hou = capitalBossFor("houston");
  if (!hou || hou.workingName !== "Leap-Frog" || hou.threatRank !== 68) throw new Error("Houston must be Leap-Frog #68");
  const anc = capitalBossFor("anchorage");
  if (!anc || anc.workingName !== "Beyonder" || anc.threatRank !== 1) throw new Error("Anchorage must be Beyonder #01");
  const bos = capitalBossFor("boston");
  if (!bos || bos.workingName !== "Trapster") throw new Error("Boston must start Trapster climb");
  for (const n of [46, 47, 48, 49, 50]) {
    const t = file.threats.find((row) => row.rank === n);
    if (!t?.screenshotGap || t.workingName !== `TBD_ThreatRank_${n}`) {
      throw new Error(`Threat rank ${n} must be a screenshot-gap stub`);
    }
  }
  const known = new Set([...CITIES, ...EXTRA_CITIES].map((c) => c.id));
  for (const row of file.cities) {
    if (!known.has(row.cityId)) throw new Error(`Roster city missing from hubs: ${row.cityId}`);
    if (!row.originalFace) throw new Error(`Roster must keep original faces: ${row.cityId}`);
  }
}

assertRoster();
