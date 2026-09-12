import { FATE_UNLOCK_AT } from "./bossFate";
import { canonicalKind, isWorldBreaker } from "./hulkForms";
import type { HulkKind, SaveData } from "./types";

/** Property-destroyed dollars. Nothing here is bought with cash. */
export const SMASH = {
  property: 220,
  vehicle: 1850,
  building: 4200,
  crimeClear: 2400,
  bystanderMenace: 0,
  civilianSaved: 400,
  echo: 1200,
  rampageSec: 120,
  rampageTarget: 28000,
  tickPerSec: 9,
  heatCap: 3,
  heatCd: 9,
};

export type WantedTierId = "clear" | "patrol" | "tactical" | "buster" | "cannon" | "titan";

export type WantedTier = {
  stars: number;
  id: WantedTierId;
  unit: string;
  line: string;
};

/** Fan prototype heat ladder. No licensed cop-show branding. */
export const WANTED_TIERS: WantedTier[] = [
  { stars: 1, id: "patrol", unit: "NYPD", line: "Street patrol closing." },
  { stars: 2, id: "tactical", unit: "SWAT", line: "Tactical van. Shields up." },
  { stars: 3, id: "buster", unit: "Hulkbusters", line: "Hulkbusters on the block." },
  { stars: 4, id: "cannon", unit: "Gamma cannons", line: "Gamma cannons spinning up." },
  { stars: 5, id: "titan", unit: "Red Hulk / Abomination", line: "Titan hunt — Red Hulk and Abomination." },
];

export function wantedTier(stars: number): WantedTier | null {
  if (stars <= 0) return null;
  return WANTED_TIERS[Math.min(5, stars) - 1] ?? null;
}

/** Rage Rep is earned from lifetime DAMAGE$, never purchased. */
export function rageRepFromDamage(damage: number): number {
  return Math.floor(Math.max(0, damage) / 50);
}

export type RepUnlockId = "midtown" | "heroes" | "fixit" | "villains" | "red" | "immortal" | "maestro" | "powers";

export type RepUnlock = {
  id: RepUnlockId;
  rep: number;
  label: string;
};

export const REP_UNLOCKS: RepUnlock[] = [
  { id: "midtown", rep: 0, label: "Midtown streets" },
  { id: "heroes", rep: 80, label: "Skyline Heroes district" },
  { id: "fixit", rep: 180, label: "Joe Fixit form" },
  { id: "villains", rep: 280, label: "Iron Warrens district" },
  { id: "red", rep: 400, label: "Red Hulk form" },
  { id: "immortal", rep: 550, label: "Immortal form" },
  { id: "maestro", rep: 700, label: "Maestro form" },
  { id: "powers", rep: 900, label: "Borrowed powers" },
];

export function unlockAt(id: RepUnlockId): number {
  return REP_UNLOCKS.find((u) => u.id === id)?.rep ?? 0;
}

export function hasUnlock(rep: number, id: RepUnlockId): boolean {
  return rep >= unlockAt(id);
}

export function formUnlocked(kind: HulkKind, saveOrRep: SaveData | number): boolean {
  const k = canonicalKind(kind);
  const rep = typeof saveOrRep === "number" ? saveOrRep : saveOrRep.reputation;
  const extra = typeof saveOrRep === "number" ? [] : saveOrRep.unlockedForms ?? [];
  const killed = typeof saveOrRep === "number" ? 0 : saveOrRep.bossesKilled?.length ?? 0;
  const spared = typeof saveOrRep === "number" ? 0 : saveOrRep.bossesSpared?.length ?? 0;
  if (isWorldBreaker(k) || k === "bruce") return true;
  if (k === "fixit") return hasUnlock(rep, "fixit");
  if (k === "red") return hasUnlock(rep, "red");
  if (k === "immortal") return hasUnlock(rep, "immortal");
  if (k === "maestro") return hasUnlock(rep, "maestro");
  if (k === "feral") return hasUnlock(rep, "immortal");
  if (k === "hell" || k === "mephisto") return killed >= FATE_UNLOCK_AT || extra.includes("hell") || extra.includes("mephisto");
  if (k === "cosmic" || k === "ironstrange") return spared >= FATE_UNLOCK_AT || extra.includes("cosmic") || extra.includes("ironstrange");
  return false;
}

export function formLockLine(kind: HulkKind, saveOrRep: SaveData | number): string {
  if (formUnlocked(kind, saveOrRep)) return "";
  const k = canonicalKind(kind);
  if (k === "hell" || k === "mephisto") return `${FATE_UNLOCK_AT} kills`;
  if (k === "cosmic" || k === "ironstrange") return `${FATE_UNLOCK_AT} spares`;
  if (k === "feral") return `Rage Rep ${unlockAt("immortal")}`;
  const id: RepUnlockId =
    k === "fixit" ? "fixit" : k === "red" ? "red" : k === "immortal" ? "immortal" : "maestro";
  return `Rage Rep ${unlockAt(id)}`;
}

export type MissionBeat =
  | "trigger"
  | "cutscene"
  | "travel"
  | "setup"
  | "escalation"
  | "setpiece"
  | "cooldown"
  | "report";

export const BEAT_LABEL: Record<MissionBeat, string> = {
  trigger: "TRIGGER",
  cutscene: "CUTSCENE",
  travel: "TRAVEL",
  setup: "SETUP",
  escalation: "ESCALATION",
  setpiece: "SET-PIECE",
  cooldown: "COOL-DOWN",
  report: "SMASH REPORT",
};

export type SmashMedal = "bronze" | "silver" | "gold";

export type SmashReport = {
  title: string;
  damage: number;
  vehicles: number;
  buildings: number;
  heroCivilians: number;
  menaceCivilians: number;
  timeSec: number;
  styleSwitches: number;
  medal: SmashMedal;
  beat: string;
};

export type GammaEchoId = "X" | "G" | "N" | "T";

export const GAMMA_ECHOES: { id: GammaEchoId; name: string; color: number; ox: number; oz: number }[] = [
  { id: "X", name: "Echo X", color: 0xff3344, ox: 9, oz: 7 },
  { id: "G", name: "Echo G", color: 0x44ff66, ox: -8, oz: 11 },
  { id: "N", name: "Echo N", color: 0x44ddff, ox: 14, oz: -6 },
  { id: "T", name: "Echo T", color: 0xf0c400, ox: -11, oz: -5 },
];

export function medalFor(report: Omit<SmashReport, "medal" | "beat">, target = SMASH.rampageTarget): SmashMedal {
  const pace = report.damage / Math.max(12, report.timeSec);
  if (report.damage >= target * 0.85 || pace > 420 || (report.buildings >= 4 && report.styleSwitches >= 2)) return "gold";
  if (report.damage >= target * 0.4 || report.buildings >= 2 || report.vehicles >= 3) return "silver";
  return "bronze";
}
