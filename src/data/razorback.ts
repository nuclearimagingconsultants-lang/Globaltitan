/** Tune these to change how often Razorback shows up. Seconds and metres. */
export const RAZOR_VARS = {
  minRoamSec: 6 * 60,
  maxRoamSec: 10 * 60,
  spawnChance: 0.35,
  spawnMinM: 40,
  spawnMaxM: 80,
  cooldownSec: 3 * 60,
  stalkSec: 60,
  fightCapSec: 4 * 60,
  koPoseSec: 20,
  bleedPct: 0.01,
  bleedSec: 5,
  regenPerSec: 0.03,
  healWindowSec: 2,
  berserkHp: 0.3,
  berserkSpeed: 1.4,
  judoMul: 3,
  boxingDodge: 0.55,
  heavyDodge: 0.5,
  wreckChanceBonus: 0.07,
  wreckWindowSec: 90,
  rideMash: 7,
  testKey: "KeyP",
};

export const RAZOR_LANDMARKS: { id: string; label: string; x: number; z: number }[] = [
  { id: "stoop", label: "the walk-up stoop", x: 9, z: 16 },
  { id: "diner", label: "the all-night diner", x: 16, z: 5 },
  { id: "pier", label: "Pier Freight", x: -18, z: -11 },
];

export const RAZOR_TAUNTS = [
  "Same time next week, big man.",
  "You hit like a bus. I dodge buses.",
  "Keep the jacket. I like the holes.",
];

export const RAZOR_FIXIT = [
  "Nice hat, Fixit. Mine's sharper.",
  "Grey and talky. Still slow.",
];

export type RivalrySave = {
  encounters: number;
  wins: number;
  losses: number;
  clawMarks: number;
  tougher: number;
  lastFightAt: number;
  landmarkDay: number;
  landmarks: string[];
};

export function defaultRivalry(): RivalrySave {
  return {
    encounters: 0,
    wins: 0,
    losses: 0,
    clawMarks: 0,
    tougher: 0,
    lastFightAt: 0,
    landmarkDay: 1,
    landmarks: [],
  };
}

export function trickTier(encounters: number): number {
  return Math.floor(encounters / 5);
}
