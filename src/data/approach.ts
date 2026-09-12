export type ApproachState = "idle" | "alert" | "stalk" | "engage" | "flank" | "retreat";
export type PackRole = "rusher" | "flanker" | "support";
export type BrainLod = "full" | "cheap" | "none";

/** Metres and seconds. Tune how packs find you and close. */
export const APPROACH = {
  sightM: 26,
  hearSmashM: 44,
  hearStepM: 11,
  commitM: 15,
  spawnMinM: 24,
  spawnMaxM: 52,
  fullBrainM: 50,
  cheapBrainM: 200,
  hesitateMin: 0.5,
  hesitateMax: 1.5,
  aoeBackoff: 1.15,
  fleeHp: 0.24,
  surroundSpread: 2.6,
  windupMelee: 0.52,
  windupRanged: 0.68,
  dangerIdle: 3.5,
  dangerSmash: 7,
  dangerHotspot: 5,
  dangerDecay: 4,
  reinforceAt: 55,
  stalkOrbit: 16,
};

export function assignRoles(count: number): PackRole[] {
  const roles: PackRole[] = [];
  for (let i = 0; i < count; i++) {
    if (count >= 3) {
      if (i % 3 === 0) roles.push("rusher");
      else if (i % 3 === 1) roles.push("flanker");
      else roles.push("support");
    } else if (count === 2) {
      roles.push(i === 0 ? "rusher" : "flanker");
    } else {
      roles.push("rusher");
    }
  }
  return roles;
}

export function brainLod(dist: number): BrainLod {
  if (dist > APPROACH.cheapBrainM) return "none";
  if (dist > APPROACH.fullBrainM) return "cheap";
  return "full";
}

export function hesitateFor(isHulk: boolean, isBruce: boolean): number {
  if (isBruce || !isHulk) return 0;
  return APPROACH.hesitateMin + Math.random() * (APPROACH.hesitateMax - APPROACH.hesitateMin);
}
