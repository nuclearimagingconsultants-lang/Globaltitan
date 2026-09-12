/** 100 m city chunks. Distances in world metres (1 unit = 1 m). */
export const CHUNK_M = 100;
export const LOAD_M = 300;
export const UNLOAD_M = 400;
export const LOAD_UNDER_LOAD_M = 220;
export const NEAR_M = 160;
export const LOOKAHEAD_S = 1.15;
export const LOOKAHEAD_LEAP_S = 2.2;
export const MAX_CHUNK_OPS_PER_FRAME = 2;
export const SPAWN_SPREAD_MIN = 3;
export const SPAWN_SPREAD_MAX = 5;
/** Smash deltas older than this (ms) time-heal and are not reapplied. */
export const SMASH_HEAL_MS = 180_000;

export type ChunkBand = "near" | "mid" | "far" | "unloaded";

export type SmashDelta = {
  id: string;
  hp: number;
  destroyed: boolean;
};

export function chunkIndex(v: number): number {
  return Math.floor((v + CHUNK_M * 0.5) / CHUNK_M);
}

export function chunkKey(x: number, z: number): string {
  return `${chunkIndex(x)},${chunkIndex(z)}`;
}

export function chunkCenter(ix: number, iz: number): { x: number; z: number } {
  return { x: ix * CHUNK_M, z: iz * CHUNK_M };
}

export function parseChunkKey(key: string): { ix: number; iz: number } {
  const [a, b] = key.split(",");
  return { ix: Number(a), iz: Number(b) };
}

export function horizDist(ax: number, az: number, bx: number, bz: number): number {
  return Math.hypot(ax - bx, az - bz);
}

export function bandForDist(d: number, loadM: number): ChunkBand {
  if (d <= NEAR_M) return "near";
  if (d <= loadM * 0.72) return "mid";
  return "far";
}
