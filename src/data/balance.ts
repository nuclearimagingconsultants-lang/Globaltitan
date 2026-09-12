import { METERS } from "./meters";

/**
 * Additive balance switch. Legacy is the live build (default).
 * Worldbreaker_v1 is an alternate data table — it does not replace Legacy
 * until the player flips Settings → Balance.
 *
 * PDF §5 / §6 numbers belong only in WORLDBREAKER_METERS. Until that PDF
 * is in the repo, Worldbreaker_v1 copies the current Anger Loop v2 snapshot
 * so the toggle is real infrastructure without rewriting the default fight.
 */
export type BalanceProfile = "Legacy" | "Worldbreaker_v1";

export const BALANCE_PROFILES: BalanceProfile[] = ["Legacy", "Worldbreaker_v1"];

export type MeterTable = typeof METERS;

const LEGACY_METERS: MeterTable = { ...METERS };

/** Anger Loop v2 / Bruce lock — applied only when BalanceProfile=Worldbreaker_v1. */
const WORLDBREAKER_METERS: MeterTable = { ...METERS };

export function applyBalanceProfile(profile: BalanceProfile): void {
  const src = profile === "Worldbreaker_v1" ? WORLDBREAKER_METERS : LEGACY_METERS;
  Object.assign(METERS, src);
}

export function balanceBlurb(profile: BalanceProfile): string {
  if (profile === "Worldbreaker_v1") {
    return "Worldbreaker_v1: Anger Loop v2 + Bruce lock (Gamma &lt; 20). Combat tables overlay Legacy; PDF §6 rows drop in here when filed. Does not rename the app.";
  }
  return "Legacy (default): keep the Anger Loop, smash, and form numbers already in this build.";
}

export function isBalanceProfile(v: string | undefined): v is BalanceProfile {
  return v === "Legacy" || v === "Worldbreaker_v1";
}
