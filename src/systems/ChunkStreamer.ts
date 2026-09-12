import * as THREE from "three";
import {
  bandForDist,
  CHUNK_M,
  chunkCenter,
  chunkKey,
  horizDist,
  LOOKAHEAD_LEAP_S,
  LOOKAHEAD_S,
  LOAD_M,
  MAX_CHUNK_OPS_PER_FRAME,
  parseChunkKey,
  SMASH_HEAL_MS,
  SPAWN_SPREAD_MAX,
  SPAWN_SPREAD_MIN,
  UNLOAD_M,
  type SmashDelta,
} from "../world/streaming";
import type { CityWorld } from "../world/CityWorld";

export type StreamedChunk = {
  key: string;
  ix: number;
  iz: number;
  band: "near" | "mid" | "far" | "unloaded";
  group: THREE.Group;
  impostor: boolean;
  pending: boolean;
  wait: number;
};

export class ChunkStreamer {
  readonly group = new THREE.Group();
  readonly farShell = new THREE.Group();
  loadM = LOAD_M;
  unloadM = UNLOAD_M;
  loaded = 0;
  near = 0;
  mid = 0;
  far = 0;
  queued = 0;
  maxOps = MAX_CHUNK_OPS_PER_FRAME;
  private chunks = new Map<string, StreamedChunk>();
  private queue: string[] = [];
  private queuedKeys = new Set<string>();
  private physicsKeys = new Set<string>();
  private impostorGeo = new THREE.BoxGeometry(1, 1, 1);
  private deltas = new Map<string, { at: number; mats: SmashDelta[] }>();
  private world: CityWorld;
  private mat: THREE.MeshLambertMaterial;

  constructor(world: CityWorld) {
    this.world = world;
    this.mat = new THREE.MeshLambertMaterial({ color: world.theme.buildings[0] ?? 0x6d7380 });
    this.group.name = "stream-chunks";
    this.farShell.name = "far-skyline";
    this.buildFarShell(world);
    this.group.add(this.farShell);
    world.group.add(this.group);
    this.seedHub(world);
  }

  tick(px: number, pz: number, vx: number, vz: number, leaping = false): void {
    const look = leaping ? LOOKAHEAD_LEAP_S : LOOKAHEAD_S;
    const ax = px + vx * look;
    const az = pz + vz * look;
    this.enqueueAround(ax, az);
    let ops = 0;
    const cap = Math.min(2, Math.max(1, this.maxOps));
    while (ops < cap && this.queue.length) {
      const key = this.queue.shift()!;
      this.queuedKeys.delete(key);
      const ch = this.chunks.get(key);
      if (!ch || ch.band !== "unloaded" || ch.pending) continue;
      this.beginLoad(ch);
      ops += 1;
    }
    for (const ch of this.chunks.values()) {
      if (ch.pending) {
        ch.wait -= 1;
        if (ch.wait <= 0) this.finishLoad(ch);
        continue;
      }
      if (ch.band === "unloaded") continue;
      const c = chunkCenter(ch.ix, ch.iz);
      const d = horizDist(ax, az, c.x, c.z);
      if (d > this.unloadM) {
        if (ops < cap) {
          this.unload(ch);
          ops += 1;
        }
        continue;
      }
      ch.band = bandForDist(d, this.loadM);
      ch.group.visible = true;
    }
    this.farShell.visible = true;
    this.physicsKeys.clear();
    let near = 0;
    let mid = 0;
    let far = 0;
    let loaded = 0;
    for (const ch of this.chunks.values()) {
      if (ch.band === "unloaded") continue;
      loaded += 1;
      if (ch.band === "near") {
        near += 1;
        this.physicsKeys.add(ch.key);
      } else if (ch.band === "mid") mid += 1;
      else far += 1;
    }
    this.physicsKeys.add(chunkKey(0, 0));
    this.world.setPhysicsChunks(this.physicsKeys);
    this.loaded = loaded;
    this.near = near;
    this.mid = mid;
    this.far = far;
    this.queued = this.queue.length;
  }

  setRadii(load: number, unload: number): void {
    this.loadM = load;
    this.unloadM = Math.max(load + 100, unload);
  }

  dispose(): void {
    this.group.removeFromParent();
    this.chunks.clear();
    this.queue.length = 0;
  }

  private seedHub(world: CityWorld): void {
    const keys = new Set<string>();
    for (const s of world.structureChunks()) keys.add(s);
    keys.add(chunkKey(0, 0));
    for (const key of keys) {
      const { ix, iz } = parseChunkKey(key);
      this.chunks.set(key, {
        key,
        ix,
        iz,
        band: "near",
        group: this.group,
        impostor: false,
        pending: false,
        wait: 0,
      });
    }
  }

  private enqueueAround(x: number, z: number): void {
    const reach = Math.ceil(this.loadM / CHUNK_M) + 1;
    const icx = Math.floor((x + CHUNK_M * 0.5) / CHUNK_M);
    const icz = Math.floor((z + CHUNK_M * 0.5) / CHUNK_M);
    for (let iz = icz - reach; iz <= icz + reach; iz++) {
      for (let ix = icx - reach; ix <= icx + reach; ix++) {
        const c = chunkCenter(ix, iz);
        if (horizDist(x, z, c.x, c.z) > this.loadM) continue;
        const key = `${ix},${iz}`;
        if (!this.chunks.has(key)) {
          this.chunks.set(key, {
            key,
            ix,
            iz,
            band: "unloaded",
            group: new THREE.Group(),
            impostor: true,
            pending: false,
            wait: 0,
          });
        }
        const ch = this.chunks.get(key)!;
        if (ch.band === "unloaded" && !ch.pending && !this.queuedKeys.has(key)) {
          this.queuedKeys.add(key);
          this.queue.push(key);
        }
      }
    }
  }

  private beginLoad(ch: StreamedChunk): void {
    ch.pending = true;
    const spread = SPAWN_SPREAD_MAX - SPAWN_SPREAD_MIN + 1;
    ch.wait = SPAWN_SPREAD_MIN + Math.abs(ch.ix + ch.iz * 3) % spread;
  }

  private finishLoad(ch: StreamedChunk): void {
    if (!ch.pending) return;
    if (ch.impostor) this.sculptImpostor(ch);
    this.group.add(ch.group);
    ch.pending = false;
    ch.band = "far";
    const saved = this.deltas.get(ch.key);
    if (saved) {
      if (Date.now() - saved.at < SMASH_HEAL_MS) this.world.applySmashDeltas(saved.mats);
      else this.deltas.delete(ch.key);
    }
  }

  private unload(ch: StreamedChunk): void {
    if (!ch.impostor) {
      ch.band = "mid";
      return;
    }
    const dumped = this.world.exportSmashDeltas(ch.key);
    if (dumped.length) this.deltas.set(ch.key, { at: Date.now(), mats: dumped });
    ch.group.removeFromParent();
    ch.group.clear();
    ch.band = "unloaded";
    ch.pending = false;
    ch.wait = 0;
    this.queuedKeys.delete(ch.key);
  }

  private sculptImpostor(ch: StreamedChunk): void {
    const c = chunkCenter(ch.ix, ch.iz);
    const g = ch.group;
    g.clear();
    const seed = Math.abs(ch.ix * 31 + ch.iz * 17);
    const n = 2 + (seed % 2);
    for (let i = 0; i < n; i++) {
      const h = 18 + ((seed + i * 13) % 42);
      const sx = 8 + (i % 3) * 3;
      const sz = 8 + ((i + 1) % 3) * 2;
      const box = new THREE.Mesh(this.impostorGeo, this.mat);
      box.scale.set(sx, h, sz);
      box.position.set(c.x + ((i % 2) * 18 - 8), h * 0.5, c.z + (((i / 2) | 0) * 16 - 8));
      box.castShadow = false;
      g.add(box);
    }
  }

  private buildFarShell(world: CityWorld): void {
    const ring = Math.max(380, world.extent * 0.92);
    const tint = new THREE.MeshLambertMaterial({
      color: new THREE.Color(world.theme.buildings[1] ?? 0x4e5660).offsetHSL(0, 0, -0.08),
    });
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      const h = 22 + (i % 7) * 7;
      const m = new THREE.Mesh(this.impostorGeo, tint);
      m.scale.set(14, h, 10);
      m.position.set(Math.sin(a) * ring, h * 0.5, Math.cos(a) * ring);
      m.lookAt(0, h * 0.5, 0);
      this.farShell.add(m);
    }
  }
}
