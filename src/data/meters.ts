import type { HulkKind } from "./types";
import { isWorldBreaker } from "./hulkForms";

/** Contact Rage and Gamma. Tune the anger loop here. */
export const METERS = {
  rageMax: 100,
  gammaMax: 100,
  lightLand: 2,
  heavyLand: 5,
  lightTaken: 3,
  heavyTaken: 8,
  property: 1,
  car: 3,
  roar: 6,
  bystander: 10,
  absorb: 12,
  absorbRed: 18,
  zonePerSec: 3,
  rageDecayDelay: 5,
  rageDecay: 2,
  bruceRageDecay: 2,
  gammaChargeDiv: 20,
  savageCharge: 1.45,
  gammaDecayDelay: 8,
  gammaDecay: 1,
  healGammaPerPct: 0.5,
  leapPer100m: 4,
  specialLight: 5,
  specialMid: 10,
  specialHeavy: 15,
  powerMin: 8,
  powerMax: 15,
  fixitCap: 79,
  redFloor: 30,
  redLitHeat: 12,
  lockedWanted: 1,
  splashR: 6.2,
  splashDmg: 4.2,
  splashEvery: 0.65,
  zoneLife: 18,
  zoneR: 14,
  meltdownGamma: 40,
  meltdownRage: 50,
};

export type GammaBand = "bruce" | "control" | "locked" | "overcharged" | "meltdown";
export type RageTier = "calm" | "angry" | "furious" | "worldbreaker" | "meltdown";

export function rageTier(rage: number, raging: boolean): RageTier {
  if (raging || rage >= 100) return "meltdown";
  if (rage >= 80) return "worldbreaker";
  if (rage >= 50) return "furious";
  if (rage >= 20) return "angry";
  return "calm";
}

export function rageTierLabel(tier: RageTier): string {
  if (tier === "calm") return "Calm";
  if (tier === "angry") return "Angry";
  if (tier === "furious") return "Furious";
  if (tier === "worldbreaker") return "Worldbreaker";
  return "Meltdown";
}

/** Lift / smash radius scale from Rage tiers. */
export function liftMul(tier: RageTier): number {
  if (tier === "calm") return 1;
  if (tier === "angry") return 1.1;
  if (tier === "furious") return 1.22;
  if (tier === "worldbreaker") return 1.38;
  return 1.52;
}

export function wantedStars(wanted: number): number {
  if (wanted <= 4) return 0;
  return Math.min(5, Math.max(1, Math.ceil(wanted / 20)));
}

export function gammaBand(gamma: number): GammaBand {
  if (gamma >= 100) return "meltdown";
  if (gamma >= 80) return "overcharged";
  if (gamma >= 50) return "locked";
  if (gamma >= 20) return "control";
  return "bruce";
}

export function bandLabel(band: GammaBand): string {
  if (band === "bruce") return "Bruce window";
  if (band === "control") return "Controllable";
  if (band === "locked") return "Locked";
  if (band === "overcharged") return "Overcharged";
  return "Meltdown";
}

export function healMul(band: GammaBand): number {
  if (band === "bruce") return 0;
  if (band === "control") return 1;
  if (band === "locked") return 2;
  return 3;
}

export function powerCostMul(band: GammaBand): number {
  if (band === "overcharged" || band === "meltdown") return 0;
  if (band === "locked") return 0.7;
  return 1;
}

export function powersAllowed(band: GammaBand): boolean {
  return band !== "bruce";
}

export function formSwitchAllowed(band: GammaBand): boolean {
  return band === "bruce" || band === "control";
}

export function chargeRate(kind: HulkKind, rage: number): number {
  const base = rage / METERS.gammaChargeDiv;
  return isWorldBreaker(kind) ? base * METERS.savageCharge : base;
}

export function spendMul(kind: HulkKind): number {
  return kind === "maestro" ? 0.5 : 1;
}

export function gammaCap(kind: HulkKind): number {
  return kind === "fixit" ? METERS.fixitCap : METERS.gammaMax;
}

export function specialCost(id: number): number {
  if (id <= 3) return METERS.specialLight;
  if (id <= 6) return METERS.specialMid;
  return METERS.specialHeavy;
}
