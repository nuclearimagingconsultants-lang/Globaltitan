import type { BorrowedPower } from "./types";

export const GADGETS = [
  { id: 1, name: "Scanner", blurb: "Ping hostiles and crimes through walls." },
  { id: 2, name: "Tranq", blurb: "Dart the nearest thug. Long stun." },
  { id: 3, name: "EMP", blurb: "Kill cars and radios in a short radius." },
  { id: 4, name: "Hack", blurb: "Open a route and freeze nearby crews." },
  { id: 5, name: "Adrenaline", blurb: "Sprint heal. Short burst of speed." },
  { id: 6, name: "Shield", blurb: "Personal barrier. Most incoming drops." },
  { id: 7, name: "Decoy", blurb: "Dummy that pulls aggro off you." },
  { id: 8, name: "Repair", blurb: "Patch a car or yourself." },
  { id: 9, name: "Anger Trigger", blurb: "Instant Hulk. Double damage for 20s." },
] as const;

export const BORROWED: Record<
  BorrowedPower,
  { name: string; short: string; color: number; blurb: string }
> = {
  omega: {
    name: "Eye of the Omega",
    short: "OMEGA",
    color: 0xff3344,
    blurb: "X Sightfire. Hold carves. Overuse blinds.",
  },
  vengeance: {
    name: "Spirit of Vengeance",
    short: "VENGEANCE",
    color: 0xff6611,
    blurb: "G Hellbrand when hands are empty. Shift fire-chain. Hold G stares. Then Bruce, exhausted.",
  },
  will: {
    name: "Emerald Will",
    short: "WILL",
    color: 0x33dd66,
    blurb: "N Willforge. Enter builds. Space flies. Refills only out of damage.",
  },
  king: {
    name: "Silent King",
    short: "KING",
    color: 0x88ccff,
    blurb: "T Hushvoice. T+Enter cone. Hold T mega shout once a day — 20% self-hit.",
  },
};

export const POWER_VARS = {
  meterMax: 100,
  omegaDrain: 22,
  omegaCarve: 38,
  omegaBlindSec: 4.2,
  stareHold: 0.85,
  exhaustSec: 10,
  willFlight: 18,
  willRefill: 14,
  kingCone: 16,
  angerSec: 20,
  gadgetCd: [0, 8, 7, 9, 8, 10, 12, 14, 11, 22] as number[],
};
