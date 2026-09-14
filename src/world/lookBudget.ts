/**
 * GTA5-tier *technique* budget for Titan Streets (original art only).
 * Numbers are the measurable visual targets — not Rockstar content.
 */

export const LOOK_BUDGET = {
  /** Default preset: laptop visual target. FrameGuard still owns hitches. */
  defaultQuality: "medium" as const,
  /** Fog near as a fraction of camera far — city stays readable. */
  fogNearMul: 0.32,
  /** Fog far just inside the far clip so the clip plane never reads as a black void. */
  fogFarMul: 0.94,
  /** Packed lots per city block (was 1–2). */
  lotsMin: 3,
  lotsMax: 4,
  /** Far skyline impostor count (was 16). */
  farShellCount: 48,
  farShellRings: 2,
  /** Impostor buildings per streamed chunk (was 2–3). */
  impostorMin: 4,
  impostorMax: 6,
  /** Procedural hero maps. No transmission SSS (RTX 3050 freeze). */
  skinMapSize: 512,
  clothMapSize: 256,
  noTransmission: true,
  bloomMedium: 0.2,
  bloomHigh: 0.34,
  bloomCinematic: 0.44,
  ssaoKernel: 6,
  shadowMapMedium: 512,
  shadowMapHigh: 1024,
  /** Street dressing instance caps (instanced, no unique meshes). */
  dumpsters: 72,
  bollards: 160,
  planters: 56,
  kiosks: 36,
  parkedCars: 28,
  hydrants: 48,
  curbTrees: 64,
} as const;

export function fogRange(farClip: number, night: number, fogMul = 0): { near: number; far: number } {
  const far = Math.max(120, farClip * LOOK_BUDGET.fogFarMul) * (1 - fogMul * 0.28);
  const near = Math.max(28, far * LOOK_BUDGET.fogNearMul) * (night > 0.45 ? 0.72 : 1);
  return { near, far: Math.max(near + 40, far) };
}
