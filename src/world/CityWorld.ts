import * as THREE from "three";
import type { CityDef, Aabb, JobType } from "../data/types";
import { JOBS } from "../data/jobs";

export type LifeSite = {
  id: string;
  kind: "apartment" | "diner" | "job";
  jobType?: JobType;
  label: string;
  pos: THREE.Vector3;
};
import { loadAsphalt, loadBrick } from "./loadMaps";
import { createRng, hashString, irange, range } from "./rng";
import { themeFor, type CityTheme } from "./themes";
import { makeFacade, makeGlass, makeGrass, makeSidewalk, std } from "./textures";
import { chunkKey, type SmashDelta } from "./streaming";
import { type StreetGraph } from "./streetPack";

export const BLOCK = 30;
export const ROAD = 12;
export const CELL = BLOCK + ROAD;
export const GRID = 7;

let liveExtent = (GRID * CELL) / 2;

export function worldExtent(): number {
  return liveExtent;
}

export function setWorldExtent(n: number): void {
  liveExtent = n;
}

export type SpawnPoint = { x: number; z: number };

type WorldOcc = { x: number; z: number };

type StructurePart = {
  mesh: THREE.InstancedMesh | THREE.Mesh;
  index?: number;
  x: number;
  y: number;
  z: number;
  sx: number;
  sy: number;
  sz: number;
  yaw?: number;
  unique?: boolean;
};

type Structure = {
  id: string;
  chunk: string;
  collider: Aabb;
  parts: StructurePart[];
  hp: number;
  maxHp: number;
  origH: number;
  cx: number;
  cz: number;
  destroyed: boolean;
  lifted: boolean;
};

export type LiftedBlock = {
  mesh: THREE.Object3D;
  w: number;
  d: number;
  h: number;
};

export type AtmosMix = {
  nightMul: number;
  fogMul: number;
  sunMul: number;
};

type LotJob = {
  cx: number;
  cz: number;
  w: number;
  d: number;
  h: number;
  yaw: number;
  brick: boolean;
  zone: "mid" | "heroes" | "villains";
  awning: boolean;
  side: -1 | 1;
};

type FlyingBlock = {
  mesh: THREE.Object3D;
  vel: THREE.Vector3;
  life: number;
};

export class CityWorld {
  readonly group = new THREE.Group();
  readonly theme: CityTheme;
  readonly colliders: Aabb[] = [];
  readonly crimeSpawns: SpawnPoint[] = [];
  readonly plaza = new THREE.Vector3(0, 0, 0);
  readonly playerSpawn = new THREE.Vector3(6, 0, 10);
  readonly dungeonDoor = new THREE.Vector3(0, 0, 12);
  readonly sites: LifeSite[] = [];
  readonly city: CityDef;
  readonly graph: StreetGraph | null;
  readonly extent: number;
  /** Maps overlay path: no OSM lots / roads. Smashables are overlay hitboxes. */
  mapsLite = false;
  private readonly placeholderGroup = new THREE.Group();
  private curbMesh: THREE.Mesh | null = null;
  private readonly structures: Structure[] = [];
  private readonly scratch = new THREE.Object3D();
  private readonly dirtyInst = new Set<THREE.InstancedMesh>();
  private readonly craterRoot = new THREE.Group();
  private readonly craters: THREE.Object3D[] = [];
  private craterCursor = 0;
  private readonly craterMat = new THREE.MeshLambertMaterial({ color: 0x3a2a1c });
  private readonly pitMat = new THREE.MeshLambertMaterial({ color: 0x241810 });
  private readonly rubbleMat = new THREE.MeshLambertMaterial({ color: 0x6a5a4a });
  private readonly crackMat = new THREE.MeshLambertMaterial({ color: 0x2e2a26 });
  private readonly liftedMat = new THREE.MeshLambertMaterial({ color: 0x8a8074 });
  private readonly flying: FlyingBlock[] = [];
  private physicsChunks: Set<string> | null = null;
  ghost = false;
  private structSerial = 0;
  onSmashDebris: ((origin: THREE.Vector3, count: number, power: "smash" | "super") => void) | null = null;
  private atmosT = 0;
  private fogObj: THREE.Fog | null = null;
  private readonly fogCol = new THREE.Color();
  private readonly skyCol = new THREE.Color();
  private readonly nightFog = new THREE.Color(0x0c1018);
  private readonly nightSky = new THREE.Color(0x0a0e16);
  private readonly hemiNight = new THREE.Color(0x4a5870);
  private readonly sunNight = new THREE.Color(0x6a80b0);
  private weather: AtmosMix | null = null;
  private lotJobs: LotJob[] = [];
  private lotCursor = 0;
  private lotKit: {
    towers: THREE.InstancedMesh[];
    brickTowers: THREE.InstancedMesh;
    podia: THREE.InstancedMesh;
    cornices: THREE.InstancedMesh;
    awnings: THREE.InstancedMesh;
    heroTowers: THREE.InstancedMesh;
    villainTowers: THREE.InstancedMesh;
    ny: boolean;
  } | null = null;

  constructor(city: CityDef, graph: StreetGraph | null = null, opts?: { lite?: boolean }) {
    this.city = city;
    this.graph = graph;
    this.theme = themeFor(city);
    this.mapsLite = Boolean(opts?.lite);
    this.extent = this.mapsLite ? 420 : (graph?.extent ?? (GRID * CELL) / 2);
    setWorldExtent(this.extent);
    const rng = createRng(hashString(`city:${city.id}`));
    if (this.mapsLite) {
      this.buildLite(rng);
    } else if (graph) {
      this.buildFromGraph(graph, rng);
    } else {
      this.buildGround();
      this.buildRoads();
      this.buildBlocks(rng);
      this.buildPlaza(rng);
      this.buildLamps(rng);
      this.buildLandmark(rng);
      this.buildStreetLife(rng);
      this.buildLifeSites();
      this.buildNightBus();
      this.collectSpawns(rng);
    }
    this.group.add(this.craterRoot);
  }

  /** Grey hub ghosts / green door — hide once Drop-in is the live NY overlay. */
  hideHubPlaceholders(): void {
    this.placeholderGroup.visible = false;
  }

  setCurbVisible(on: boolean): void {
    if (this.curbMesh) this.curbMesh.visible = on;
  }

  setWeather(mix: AtmosMix | null): void {
    this.weather = mix;
    this.atmosT = 0;
  }

  applyAtmosphere(scene: THREE.Scene, hemi: THREE.HemisphereLight, sun: THREE.DirectionalLight, nightAmt = 0): void {
    if (this.mapsLite) {
      scene.background = null;
      scene.fog = null;
      hemi.intensity = 0.92;
      hemi.color.setHex(0xe8eef4);
      hemi.groundColor.setHex(0x6a6860);
      sun.intensity = 0.55;
      sun.color.setHex(0xffeedd);
      sun.castShadow = false;
      return;
    }
    const now = performance.now();
    if (this.fogObj && now - this.atmosT < 250) return;
    this.atmosT = now;
    const t = this.theme;
    const wx = this.weather;
    const night = Math.min(1, (t.night || nightAmt > 0.45 ? Math.max(nightAmt, t.night ? 0.7 : 0) : nightAmt) + (wx?.nightMul ?? 0));
    this.fogCol.setHex(t.fog).lerp(this.nightFog, night);
    this.skyCol.setHex(t.sky).lerp(this.nightSky, night);
    const fogMul = wx?.fogMul ?? 0;
    const sunMul = wx?.sunMul ?? 1;
    const near = THREE.MathUtils.lerp(t.fogNear ?? 110, 36, night) * (1 - fogMul * 0.35);
    const far = THREE.MathUtils.lerp(t.fogFar ?? 420, 170, night) * (1 - fogMul * 0.32);
    if (!this.fogObj) {
      this.fogObj = new THREE.Fog(this.fogCol, near, far);
    } else {
      this.fogObj.color.copy(this.fogCol);
      this.fogObj.near = near;
      this.fogObj.far = far;
    }
    scene.fog = this.fogObj;
    scene.background = this.skyCol;
    hemi.intensity = THREE.MathUtils.lerp(2.05, 0.78, night) * (0.7 + 0.3 * sunMul);
    hemi.color.setHex(t.hemiSky).lerp(this.hemiNight, night);
    hemi.groundColor.setHex(t.hemiGround);
    sun.color.setHex(t.sunColor).lerp(this.sunNight, night);
    sun.intensity = THREE.MathUtils.lerp(Math.max(2.55, t.sunIntensity * 1.55), 0.4, night) * sunMul;
    sun.position.set(t.sunDir[0] * 90, t.sunDir[1] * 90, t.sunDir[2] * 90);
    sun.castShadow = false;
  }

  nearestSite(from: THREE.Vector3, max = 6.4): LifeSite | null {
    let best: LifeSite | null = null;
    let bestD = max;
    for (const s of this.sites) {
      const d = s.pos.distanceTo(from);
      if (d < bestD) {
        bestD = d;
        best = s;
      }
    }
    return best;
  }

  circleHits(b: Aabb, x: number, z: number, radius: number): boolean {
    const nearestX = Math.max(b.minX, Math.min(x, b.maxX));
    const nearestZ = Math.max(b.minZ, Math.min(z, b.maxZ));
    return Math.hypot(x - nearestX, z - nearestZ) < radius;
  }

  floorAt(x: number, z: number, radius: number, feetY: number): number {
    if (this.ghost) return 0;
    let floor = 0;
    const step = feetY > 14 ? 9.2 : 5.4;
    for (const b of this.colliders) {
      if (!this.colliderLive(b)) continue;
      if (!this.circleHits(b, x, z, radius * 0.78)) continue;
      if (feetY >= b.height - step) floor = Math.max(floor, b.height);
    }
    return floor;
  }

  wallAt(x: number, z: number, radius: number, feetY: number): Aabb | null {
    let best: Aabb | null = null;
    let bestH = 0;
    for (const b of this.colliders) {
      if (!this.colliderLive(b)) continue;
      if (!this.circleHits(b, x, z, radius)) continue;
      if (feetY >= b.height - 2.4) continue;
      if (b.height > bestH) {
        best = b;
        bestH = b.height;
      }
    }
    return best;
  }

  resolveCircle(
    x: number,
    z: number,
    radius: number,
    feetY?: number,
    passWalls = false,
  ): { x: number; z: number } {
    let px = x;
    let pz = z;
    const step = 3.2;
    for (let i = 0; i < 2; i++) {
      for (const b of this.colliders) {
        if (passWalls) continue;
        if (!this.colliderLive(b)) continue;
        if (feetY !== undefined && feetY >= b.height - step) continue;
        const nearestX = Math.max(b.minX, Math.min(px, b.maxX));
        const nearestZ = Math.max(b.minZ, Math.min(pz, b.maxZ));
        let dx = px - nearestX;
        let dz = pz - nearestZ;
        const dist = Math.hypot(dx, dz);
        if (dist < radius) {
          if (dist < 1e-4) {
            dx = px - (b.minX + b.maxX) * 0.5;
            dz = pz - (b.minZ + b.maxZ) * 0.5;
            const d2 = Math.hypot(dx, dz) || 1;
            dx /= d2;
            dz /= d2;
            px += dx * radius;
            pz += dz * radius;
          } else {
            const push = (radius - dist) / dist;
            px += dx * push;
            pz += dz * push;
          }
        }
      }
    }
    const limit = worldExtent() - 2;
    px = Math.max(-limit, Math.min(limit, px));
    pz = Math.max(-limit, Math.min(limit, pz));
    return { x: px, z: pz };
  }

  smashEnvironment(origin: THREE.Vector3, radius: number, power: "smash" | "super", demo = 1): number {
    let hits = 0;
    const superS = power === "super";
    const dmg = (superS ? 110 : 42) * demo;
    const reach = superS ? radius * 1.15 : radius * 0.9;
    for (const s of this.structures) {
      if (s.destroyed) continue;
      const dist = Math.hypot(s.cx - origin.x, s.cz - origin.z);
      const pad = (s.collider.maxX - s.collider.minX + s.collider.maxZ - s.collider.minZ) * 0.22;
      if (dist > reach + pad) continue;
      const falloff = 1 - Math.min(0.55, (dist / (reach + pad)) * 0.45);
      s.hp -= dmg * falloff;
      hits += 1;
      this.squashStructure(s);
    }
    if (superS) this.carveCrater(origin.x, origin.z, Math.max(6, radius * 0.62));
    else this.carveCrack(origin.x, origin.z, Math.max(2.4, radius * 0.28));
    if (hits) this.onSmashDebris?.(origin, superS ? 4 : 2, power);
    this.flushInstances();
    return hits;
  }

  setPhysicsChunks(keys: Set<string> | null): void {
    this.physicsChunks = keys;
  }

  structureChunks(): string[] {
    return [...new Set(this.structures.map((s) => s.chunk))];
  }

  exportSmashDeltas(key: string): SmashDelta[] {
    return this.structures
      .filter((s) => s.chunk === key && (s.destroyed || s.hp < s.maxHp))
      .map((s) => ({ id: s.id, hp: s.hp, destroyed: s.destroyed }));
  }

  applySmashDeltas(deltas: SmashDelta[]): void {
    const byId = new Map(this.structures.map((s) => [s.id, s]));
    for (const d of deltas) {
      const s = byId.get(d.id);
      if (!s) continue;
      s.hp = d.hp;
      s.destroyed = d.destroyed;
      if (d.destroyed) this.squashStructure(s);
    }
    this.flushInstances();
  }

  grabNearest(x: number, z: number, radius: number): LiftedBlock | null {
    const best = this.pickStructure(x, z, radius);
    if (!best) return null;
    best.lifted = true;
    best.destroyed = true;
    best.hp = 0;
    best.collider.height = 0.4;
    for (const part of best.parts) this.writePart(part, 0.02);
    this.flushInstances();
    const w = Math.max(4.5, Math.min(14, best.collider.maxX - best.collider.minX));
    const d = Math.max(4.5, Math.min(14, best.collider.maxZ - best.collider.minZ));
    const h = Math.max(6, Math.min(22, best.origH * 0.42));
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), this.liftedMat);
    mesh.castShadow = false;
    const pile = new THREE.Mesh(
      new THREE.BoxGeometry(w * 0.7, 1.2, d * 0.7),
      this.rubbleMat,
    );
    pile.position.set(best.cx, 0.6, best.cz);
    pile.userData.rubble = true;
    this.add(pile);
    return { mesh, w, d, h };
  }

  nearStructure(x: number, z: number, radius: number): boolean {
    return this.pickStructure(x, z, radius) !== null;
  }

  private pickStructure(x: number, z: number, radius: number): Structure | null {
    let best: Structure | null = null;
    let bestD = radius;
    for (const s of this.structures) {
      if (s.destroyed || s.lifted) continue;
      const d = Math.hypot(s.cx - x, s.cz - z);
      const pad = (s.collider.maxX - s.collider.minX + s.collider.maxZ - s.collider.minZ) * 0.28;
      if (d > bestD + pad) continue;
      best = s;
      bestD = d;
    }
    return best;
  }

  /** Next landable roof in a facing cone — skip the lot you are standing on. */
  roofAhead(x: number, z: number, y: number, fx: number, fz: number, maxDist = 96): { x: number; z: number; h: number } | null {
    const fl = Math.hypot(fx, fz) || 1;
    const nx = fx / fl;
    const nz = fz / fl;
    let best: { x: number; z: number; h: number } | null = null;
    let bestScore = 1e9;
    for (const s of this.structures) {
      if (s.destroyed || s.lifted) continue;
      const onThis = this.circleHits(s.collider, x, z, 2.2) && y > s.origH - 5;
      if (onThis) continue;
      const dx = s.cx - x;
      const dz = s.cz - z;
      const dist = Math.hypot(dx, dz);
      if (dist < 7 || dist > maxDist) continue;
      const along = dx * nx + dz * nz;
      if (along < 5) continue;
      const cone = along / dist;
      if (cone < 0.28) continue;
      if (s.origH < 7) continue;
      const score = dist - along * 0.35 - cone * 8;
      if (score < bestScore) {
        bestScore = score;
        const pull = Math.min(0.28, 4 / Math.max(8, dist));
        best = { x: s.cx - dx * pull, z: s.cz - dz * pull, h: s.origH };
      }
    }
    return best;
  }

  dropGentle(block: LiftedBlock, origin: THREE.Vector3): void {
    block.mesh.position.copy(origin);
    block.mesh.position.y = Math.max(0.4, origin.y + 0.2);
    this.group.add(block.mesh);
  }

  throwBlock(block: LiftedBlock, origin: THREE.Vector3, facing: THREE.Vector3, speed: number): void {
    block.mesh.position.copy(origin);
    block.mesh.position.y = Math.max(4, origin.y + block.h * 0.45);
    this.group.add(block.mesh);
    this.flying.push({
      mesh: block.mesh,
      vel: new THREE.Vector3(facing.x * speed, 16 + speed * 0.12, facing.z * speed),
      life: 3.2,
    });
  }

  updateThrown(dt: number): number {
    let impacts = 0;
    for (let i = this.flying.length - 1; i >= 0; i--) {
      const f = this.flying[i]!;
      f.life -= dt;
      f.vel.y -= 38 * dt;
      f.mesh.position.addScaledVector(f.vel, dt);
      f.mesh.rotation.x += dt * 1.8;
      f.mesh.rotation.z += dt * 1.1;
      const floor = this.floorAt(f.mesh.position.x, f.mesh.position.z, 2.4, f.mesh.position.y);
      if (f.mesh.position.y <= floor + 1.2 || f.life <= 0) {
        this.carveCrater(f.mesh.position.x, f.mesh.position.z, 8);
        impacts += 1 + this.smashEnvironment(f.mesh.position, 10, "super", 0.7);
        this.group.remove(f.mesh);
        this.flying.splice(i, 1);
      }
    }
    return impacts;
  }

  colliderLive(b: Aabb): boolean {
    if (this.ghost) return false;
    if (!this.physicsChunks) return true;
    const key = chunkKey((b.minX + b.maxX) * 0.5, (b.minZ + b.maxZ) * 0.5);
    return this.physicsChunks.has(key) || key === chunkKey(0, 0);
  }

  private addStructure(parts: StructurePart[], collider: Aabb): void {
    const origH = collider.height;
    const cx = (collider.minX + collider.maxX) * 0.5;
    const cz = (collider.minZ + collider.maxZ) * 0.5;
    this.colliders.push(collider);
    this.structSerial += 1;
    this.structures.push({
      id: `${this.city.id}-${this.structSerial}`,
      chunk: chunkKey(cx, cz),
      collider,
      parts,
      hp: 75 + origH * 1.6,
      maxHp: 75 + origH * 1.6,
      origH,
      cx,
      cz,
      destroyed: false,
      lifted: false,
    });
  }

  private registerUnique(mesh: THREE.Mesh, collider: Aabb): void {
    this.addStructure(
      [
        {
          mesh,
          x: mesh.position.x,
          y: mesh.position.y,
          z: mesh.position.z,
          sx: mesh.scale.x,
          sy: mesh.scale.y,
          sz: mesh.scale.z,
          unique: true,
        },
      ],
      collider,
    );
  }

  private squashStructure(s: Structure): void {
    const dead = s.hp <= 0;
    if (dead) s.destroyed = true;
    const k = dead ? 0.12 : Math.max(0.2, s.hp / s.maxHp);
    s.collider.height = Math.max(1.15, s.origH * k);
    for (const part of s.parts) this.writePart(part, k);
    if (dead && !s.parts.some((p) => p.mesh.userData.rubble)) {
      const pile = new THREE.Mesh(new THREE.BoxGeometry(Math.max(3, (s.collider.maxX - s.collider.minX) * 0.7), 1.4, Math.max(3, (s.collider.maxZ - s.collider.minZ) * 0.7)), this.rubbleMat);
      pile.position.set(s.cx, 0.7, s.cz);
      pile.rotation.y = s.cx * 0.15;
      pile.userData.rubble = true;
      this.add(pile);
    }
  }

  private writePart(part: StructurePart, k: number): void {
    if (part.unique) {
      const mesh = part.mesh as THREE.Mesh;
      mesh.position.set(part.x, part.y * k, part.z);
      mesh.scale.set(part.sx, part.sy * k, part.sz);
      return;
    }
    if (part.index === undefined || !(part.mesh instanceof THREE.InstancedMesh)) return;
    this.scratch.position.set(part.x, part.y * k, part.z);
    this.scratch.scale.set(part.sx, part.sy * k, part.sz);
    this.scratch.rotation.set(0, part.yaw ?? 0, 0);
    this.scratch.updateMatrix();
    part.mesh.setMatrixAt(part.index, this.scratch.matrix);
    this.dirtyInst.add(part.mesh);
  }

  private flushInstances(): void {
    for (const mesh of this.dirtyInst) mesh.instanceMatrix.needsUpdate = true;
    this.dirtyInst.clear();
  }

  private carveCrater(x: number, z: number, radius: number): void {
    const i = this.craterCursor++ % 18;
    let scar = this.craters[i];
    if (!scar) {
      const g = new THREE.Group();
      const dish = new THREE.Mesh(new THREE.CircleGeometry(1, 18), this.craterMat);
      dish.rotation.x = -Math.PI / 2;
      const pit = new THREE.Mesh(new THREE.ConeGeometry(0.72, 1, 10), this.pitMat);
      pit.rotation.x = Math.PI;
      pit.position.y = -0.15;
      g.add(dish, pit);
      this.craterRoot.add(g);
      scar = g;
      this.craters[i] = scar;
    }
    scar.position.set(x, 0.07, z);
    scar.scale.set(radius, 1.2 + radius * 0.08, radius);
    scar.rotation.y = x * 0.2 + z * 0.13;
  }

  private carveCrack(x: number, z: number, radius: number): void {
    const i = 18 + (this.craterCursor % 8);
    this.craterCursor += 1;
    let scar = this.craters[i];
    if (!scar) {
      const ring = new THREE.Mesh(new THREE.RingGeometry(0.45, 1, 16), this.crackMat);
      ring.rotation.x = -Math.PI / 2;
      this.craterRoot.add(ring);
      scar = ring;
      this.craters[i] = scar;
    }
    scar.position.set(x, 0.08, z);
    scar.scale.set(radius, 1, radius);
  }

  dispose(): void {
    this.group.traverse((obj: THREE.Object3D) => {
      const mesh = obj as THREE.Mesh;
      if (mesh.geometry) mesh.geometry.dispose();
      const mat = mesh.material as THREE.Material | THREE.Material[] | undefined;
      if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
      else if (mat) mat.dispose();
    });
    this.group.clear();
    this.colliders.length = 0;
    this.structures.length = 0;
    this.craters.length = 0;
    this.dirtyInst.clear();
  }

  private add(obj: THREE.Object3D): void {
    this.group.add(obj);
  }

  private buildGround(): void {
    const grass = makeGrass();
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(GRID * CELL + 90, GRID * CELL + 90),
      std(grass, this.theme.grass),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.03;
    ground.receiveShadow = true;
    this.add(ground);
  }

  private buildRoads(): void {
    const half = (GRID * CELL) / 2;
    const asphalt = loadAsphalt();
    const roadMat = new THREE.MeshPhongMaterial({
      map: asphalt.map,
      color: 0x8a8c90,
      shininess: 22,
      specular: 0x3a4a58,
    });
    const walk = makeSidewalk();
    const walkMat = std(walk, this.theme.sidewalk);

    const roadGeo = new THREE.PlaneGeometry(1, 1);
    for (let i = 0; i < GRID; i++) {
      const c = -half + i * CELL + BLOCK + ROAD / 2;
      const h = new THREE.Mesh(roadGeo, roadMat);
      h.scale.set(GRID * CELL + ROAD, ROAD, 1);
      h.rotation.x = -Math.PI / 2;
      h.position.set(0, 0.012, c);
      h.receiveShadow = true;
      this.add(h);
      const v = new THREE.Mesh(roadGeo, roadMat);
      v.scale.set(ROAD, GRID * CELL + ROAD, 1);
      v.rotation.x = -Math.PI / 2;
      v.position.set(c, 0.012, 0);
      v.receiveShadow = true;
      this.add(v);
    }

    for (let iz = 0; iz < GRID; iz++) {
      for (let ix = 0; ix < GRID; ix++) {
        if (this.isPlaza(ix, iz)) continue;
        const x = -half + ix * CELL + BLOCK / 2;
        const z = -half + iz * CELL + BLOCK / 2;
        const slab = new THREE.Mesh(new THREE.PlaneGeometry(BLOCK + 2.2, BLOCK + 2.2), walkMat);
        slab.rotation.x = -Math.PI / 2;
        slab.position.set(x, 0.02, z);
        slab.receiveShadow = true;
        this.add(slab);
      }
    }
  }

  private isPlaza(ix: number, iz: number): boolean {
    return ix === Math.floor(GRID / 2) && iz === Math.floor(GRID / 2);
  }

  private buildBlocks(rng: () => number): void {
    const half = (GRID * CELL) / 2;
    const brickMap = loadBrick();
    const palettes = this.theme.buildings.slice(0, 2);
    const facades = palettes.map((c, i) =>
      makeFacade(c, this.theme.window, this.theme.night, hashString(`${this.city.id}:${i}`)),
    );
    const officeMats = facades.map((f) => std(f, 0xffffff));
    const brickMat = new THREE.MeshLambertMaterial({
      map: brickMap,
      color: 0xddd0c4,
    });
    const glass = makeGlass(this.theme.window, this.theme.night);
    const corniceMat = new THREE.MeshLambertMaterial({ color: 0xcfc8bc });
    const awningMat = new THREE.MeshLambertMaterial({ color: this.theme.accent });

    const bodyGeo = new THREE.BoxGeometry(1, 1, 1);

    const dummy = new THREE.Object3D();
    const max = GRID * GRID * 5;
    const towers = officeMats.map((mat) => {
      const inst = new THREE.InstancedMesh(bodyGeo, mat, max);
      inst.count = 0;
      inst.castShadow = false;
      inst.receiveShadow = true;
      this.add(inst);
      return inst;
    });
    const brickTowers = new THREE.InstancedMesh(bodyGeo, brickMat, max);
    brickTowers.count = 0;
    brickTowers.castShadow = false;
    brickTowers.receiveShadow = true;
    this.add(brickTowers);

    const ny = this.city.id === "new-york";
    const heroFacade = makeFacade(0xc8a868, 0xffe7a8, false, hashString(`${this.city.id}:hero`));
    const villainFacade = makeFacade(0x2a2228, 0x66d0ff, true, hashString(`${this.city.id}:villain`));
    const heroTowers = new THREE.InstancedMesh(bodyGeo, std(heroFacade, 0xffffff), max);
    const villainTowers = new THREE.InstancedMesh(bodyGeo, std(villainFacade, 0xffffff), max);
    const heroCornices = new THREE.InstancedMesh(bodyGeo, new THREE.MeshLambertMaterial({ color: 0xe8d090 }), max);
    const villainCornices = new THREE.InstancedMesh(bodyGeo, new THREE.MeshLambertMaterial({ color: 0x3a3038 }), max);
    const heroAwnings = new THREE.InstancedMesh(bodyGeo, new THREE.MeshLambertMaterial({ color: 0xc9a227 }), max);
    const villainAwnings = new THREE.InstancedMesh(bodyGeo, new THREE.MeshLambertMaterial({ color: 0x8a2030 }), max);
    for (const m of [heroTowers, villainTowers, heroCornices, villainCornices, heroAwnings, villainAwnings]) {
      m.count = 0;
      m.castShadow = false;
      m.receiveShadow = true;
      if (ny) this.add(m);
    }

    const podia = new THREE.InstancedMesh(bodyGeo, glass, max);
    podia.count = 0;
    podia.castShadow = false;
    podia.receiveShadow = true;
    this.add(podia);

    const cornices = new THREE.InstancedMesh(bodyGeo, corniceMat, max);
    cornices.count = 0;
    cornices.castShadow = false;
    this.add(cornices);

    const awnings = new THREE.InstancedMesh(bodyGeo, awningMat, max);
    awnings.count = 0;
    this.add(awnings);

    const props = new THREE.InstancedMesh(bodyGeo, new THREE.MeshLambertMaterial({ color: 0x666870 }), max);
    props.count = 0;
    props.castShadow = false;
    this.add(props);
    const tankMat = new THREE.MeshLambertMaterial({ color: 0x8a9098 });
    const tanks = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.55, 0.55, 1, 10), tankMat, max);
    tanks.count = 0;
    tanks.castShadow = false;
    this.add(tanks);

    const place = (mesh: THREE.InstancedMesh, x: number, y: number, z: number, sx: number, sy: number, sz: number): number => {
      dummy.position.set(x, y, z);
      dummy.scale.set(sx, sy, sz);
      dummy.rotation.set(0, 0, 0);
      dummy.updateMatrix();
      const idx = mesh.count;
      mesh.setMatrixAt(idx, dummy.matrix);
      mesh.count += 1;
      return idx;
    };

    for (let iz = 0; iz < GRID; iz++) {
      for (let ix = 0; ix < GRID; ix++) {
        if (this.isPlaza(ix, iz)) continue;
        const originX = -half + ix * CELL;
        const originZ = -half + iz * CELL;
          const lots = irange(rng, 1, 2);
        for (let n = 0; n < lots; n++) {
          const inset = 1.4 + rng() * 1.1;
          const w = range(rng, 7.2, BLOCK / 2 - 0.6);
          const d = range(rng, 7.2, BLOCK / 2 - 0.6);
          const h = this.heightFor(rng, ix, iz);
          const lx = originX + inset + rng() * Math.max(0.4, BLOCK - w - inset * 2);
          const lz = originZ + inset + rng() * Math.max(0.4, BLOCK - d - inset * 2);
          const cx = lx + w / 2;
          const cz = lz + d / 2;
          const brick = rng() < 0.38;
          const zone = ny ? (ix >= 5 ? "heroes" : ix <= 1 ? "villains" : "mid") : "mid";
          const tower =
            zone === "heroes"
              ? heroTowers
              : zone === "villains"
                ? villainTowers
                : brick
                  ? brickTowers
                  : towers[n % towers.length]!;
          const corniceMesh = zone === "heroes" ? heroCornices : zone === "villains" ? villainCornices : cornices;
          const awningMesh = zone === "heroes" ? heroAwnings : zone === "villains" ? villainAwnings : awnings;
          const podiumH = 3.15;
          const parts: StructurePart[] = [];
          const pi = place(podia, cx, podiumH / 2, cz, w * 0.98, podiumH, d * 0.98);
          parts.push({ mesh: podia, index: pi, x: cx, y: podiumH / 2, z: cz, sx: w * 0.98, sy: podiumH, sz: d * 0.98 });
          const ti = place(tower, cx, podiumH + (h - podiumH) / 2, cz, w * 0.92, h - podiumH, d * 0.92);
          parts.push({
            mesh: tower,
            index: ti,
            x: cx,
            y: podiumH + (h - podiumH) / 2,
            z: cz,
            sx: w * 0.92,
            sy: h - podiumH,
            sz: d * 0.92,
          });
          const ci = place(corniceMesh, cx, h + 0.18, cz, w * 1.02, 0.38, d * 1.02);
          parts.push({ mesh: corniceMesh, index: ci, x: cx, y: h + 0.18, z: cz, sx: w * 1.02, sy: 0.38, sz: d * 1.02 });
          if (rng() < 0.55) {
            const ai = place(awningMesh, cx, 3.35, cz + d * 0.52, w * 0.72, 0.12, 1.1);
            parts.push({ mesh: awningMesh, index: ai, x: cx, y: 3.35, z: cz + d * 0.52, sx: w * 0.72, sy: 0.12, sz: 1.1 });
          }
          if (rng() < 0.45) {
            const px = cx + (rng() - 0.5) * w * 0.4;
            const pz = cz + (rng() - 0.5) * d * 0.4;
            const ri = place(props, px, h + 1.1, pz, 1.6, 1.4, 2.2);
            parts.push({ mesh: props, index: ri, x: px, y: h + 1.1, z: pz, sx: 1.6, sy: 1.4, sz: 2.2 });
          }
          if (rng() < 0.4) {
            const tx = cx + (rng() - 0.5) * w * 0.35;
            const tz = cz + (rng() - 0.5) * d * 0.35;
            const ki = place(tanks, tx, h + 1.35, tz, 1.4, 1.8, 1.4);
            parts.push({ mesh: tanks, index: ki, x: tx, y: h + 1.35, z: tz, sx: 1.4, sy: 1.8, sz: 1.4 });
          }
          if (rng() < 0.28) {
            const setback = h * 0.28;
            const si = place(tower, cx, h + setback / 2, cz, w * 0.55, setback, d * 0.55);
            parts.push({ mesh: tower, index: si, x: cx, y: h + setback / 2, z: cz, sx: w * 0.55, sy: setback, sz: d * 0.55 });
          }
          this.addStructure(parts, {
            minX: cx - w / 2,
            maxX: cx + w / 2,
            minZ: cz - d / 2,
            maxZ: cz + d / 2,
            height: h + 4,
          });
        }
      }
    }
    for (const m of towers) m.instanceMatrix.needsUpdate = true;
    brickTowers.instanceMatrix.needsUpdate = true;
    podia.instanceMatrix.needsUpdate = true;
    cornices.instanceMatrix.needsUpdate = true;
    awnings.instanceMatrix.needsUpdate = true;
    if (ny) {
      heroTowers.instanceMatrix.needsUpdate = true;
      villainTowers.instanceMatrix.needsUpdate = true;
      heroCornices.instanceMatrix.needsUpdate = true;
      villainCornices.instanceMatrix.needsUpdate = true;
      heroAwnings.instanceMatrix.needsUpdate = true;
      villainAwnings.instanceMatrix.needsUpdate = true;
    }
    props.instanceMatrix.needsUpdate = true;
    tanks.instanceMatrix.needsUpdate = true;
  }

  private heightFor(rng: () => number, ix: number, iz: number): number {
    const mid = Math.floor(GRID / 2);
    const center = Math.hypot(ix - mid, iz - mid);
    const downtown = Math.max(0, 1.3 - center * 0.22);
    // NY smash: taller Midtown glass so DROP IN never reads as flat desert scrub
    const nyBoost = this.city.id === 'new-york' ? 1.12 : 1;
    let h = (range(rng, 16, 26) + downtown * range(rng, 22, 72)) * nyBoost;
    if (center < 1.6 && rng() < (this.city.id === 'new-york' ? 0.45 : 0.22)) h += range(rng, 28, 48) * nyBoost;
    if (this.theme.landmark === "hollywood") h *= 0.72;
    if (this.city.id === "paris") h *= 0.85;
    if (this.city.id === "london") h = Math.min(h, 26) * 0.9 + 8;
    if (this.theme.night && this.theme.landmark === "neon") h += 6;
    return h;
  }

  private buildPlaza(rng: () => number): void {
    const walk = makeSidewalk();
    const pad = new THREE.Mesh(new THREE.CircleGeometry(16, 32), std(walk, this.theme.plaza));
    pad.rotation.x = -Math.PI / 2;
    pad.position.y = 0.03;
    pad.receiveShadow = true;
    this.add(pad);

    const ring = new THREE.Mesh(
      new THREE.RingGeometry(15.2, 16.4, 48),
      new THREE.MeshLambertMaterial({ color: this.theme.accent }),
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.04;
    this.add(ring);

    const grass = makeGrass();
    const lawn = new THREE.Mesh(new THREE.CircleGeometry(7.4, 28), std(grass, this.theme.grass));
    lawn.rotation.x = -Math.PI / 2;
    lawn.position.y = 0.05;
    this.add(lawn);

    const stone = new THREE.MeshLambertMaterial({ color: 0x8a9098 });
    const plinth = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.8, 1.1, 12), stone);
    plinth.position.set(0, 0.55, -2);
    plinth.castShadow = true;
    this.add(plinth);
    const figure = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.55, 2.2, 6, 10),
      new THREE.MeshLambertMaterial({ color: this.theme.accent }),
    );
    figure.position.set(0, 2.6, -2);
    figure.castShadow = true;
    this.add(figure);
    this.registerUnique(plinth, { minX: -1.8, maxX: 1.8, minZ: -3.8, maxZ: -0.2, height: 5 });

    const kiosk = new THREE.Mesh(new THREE.BoxGeometry(4.2, 3.4, 2.2), new THREE.MeshLambertMaterial({ color: 0x2a2420 }));
    kiosk.position.set(0, 1.7, 12);
    this.add(kiosk);
    const lintel = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.35, 0.4), new THREE.MeshLambertMaterial({ color: this.theme.accent }));
    lintel.position.set(0, 3.3, 13.1);
    this.add(lintel);
    const mouth = new THREE.Mesh(new THREE.BoxGeometry(2.2, 2.4, 0.3), new THREE.MeshLambertMaterial({ color: 0x0a0808 }));
    mouth.position.set(0, 1.4, 13.2);
    this.add(mouth);
    this.registerUnique(kiosk, { minX: -2.2, maxX: 2.2, minZ: 10.8, maxZ: 13.2, height: 3.4 });

    const benchMat = new THREE.MeshLambertMaterial({ color: 0x4a3428 });
    const benches = irange(rng, 4, 5);
    for (let i = 0; i < benches; i++) {
      const a = (i / benches) * Math.PI * 2;
      const bench = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.42, 0.62), benchMat);
      bench.position.set(Math.cos(a) * 10, 0.28, Math.sin(a) * 10);
      bench.rotation.y = -a;
      bench.receiveShadow = true;
      this.add(bench);
    }

    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + 0.18;
      const h = 26 + (i % 3) * 12;
      const x = Math.cos(a) * 34;
      const z = Math.sin(a) * 34;
      const facade = makeFacade(this.theme.buildings[i % this.theme.buildings.length]!, this.theme.window, this.theme.night, 40 + i);
      const tower = new THREE.Mesh(new THREE.BoxGeometry(8.2, h, 8.2), std(facade));
      tower.position.set(x, h / 2, z);
      tower.castShadow = false;
      tower.receiveShadow = true;
      this.add(tower);
      this.registerUnique(tower, { minX: x - 4.1, maxX: x + 4.1, minZ: z - 4.1, maxZ: z + 4.1, height: h });
    }
  }

  private buildLamps(rng: () => number): void {
    const half = (GRID * CELL) / 2;
    const poleMat = new THREE.MeshLambertMaterial({ color: 0x2a2a30 });
    const bulbMat = new THREE.MeshLambertMaterial({
      color: this.theme.night ? 0xffe6a8 : 0xf6f1d8,
      emissive: new THREE.Color(this.theme.night ? 0xffc266 : 0x665533),
      emissiveIntensity: this.theme.night ? 1.4 : 0.2,
    });
    const poles = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.07, 0.1, 6.4, 8), poleMat, 220);
    const bulbs = new THREE.InstancedMesh(new THREE.SphereGeometry(0.2, 10, 10), bulbMat, 220);
    const arms = new THREE.InstancedMesh(new THREE.BoxGeometry(0.08, 0.08, 1.1), poleMat, 220);
    poles.count = bulbs.count = arms.count = 0;
    const dummy = new THREE.Object3D();
    for (let iz = 0; iz < GRID; iz++) {
      for (let ix = 0; ix < GRID; ix++) {
        if (rng() < 0.4) continue;
        const x = -half + ix * CELL + BLOCK + ROAD / 2;
        const z = -half + iz * CELL + BLOCK + ROAD / 2;
        for (const [ox, oz] of [
          [3.6, 3.6],
          [-3.6, 3.6],
        ] as const) {
          dummy.position.set(x + ox, 3.2, z + oz);
          dummy.scale.set(1, 1, 1);
          dummy.rotation.set(0, 0, 0);
          dummy.updateMatrix();
          poles.setMatrixAt(poles.count++, dummy.matrix);
          dummy.position.set(x + ox, 6.45, z + oz + 0.35);
          dummy.updateMatrix();
          bulbs.setMatrixAt(bulbs.count++, dummy.matrix);
          dummy.position.set(x + ox, 6.35, z + oz + 0.2);
          dummy.updateMatrix();
          arms.setMatrixAt(arms.count++, dummy.matrix);
        }
      }
    }
    poles.instanceMatrix.needsUpdate = true;
    bulbs.instanceMatrix.needsUpdate = true;
    arms.instanceMatrix.needsUpdate = true;
    this.add(poles);
    this.add(bulbs);
    this.add(arms);
  }

  private buildLandmark(rng: () => number): void {
    const kind = this.theme.landmark;
    const ox = this.mapsLite ? this.plaza.x : 0;
    const oz = this.mapsLite ? this.plaza.z : 0;
    const mat = new THREE.MeshLambertMaterial({
      color: this.theme.buildings[0],
      transparent: this.mapsLite,
      opacity: this.mapsLite ? 0.42 : 1,
      depthWrite: !this.mapsLite,
    });
    const put = (mesh: THREE.Mesh, x: number, y: number, z: number) => {
      mesh.position.set(ox + x, y, oz + z);
      this.add(mesh);
    };
    if (kind === "towers") {
      for (const [x, z, h] of [
        [18, -22, 42],
        [28, -14, 34],
        [36, -20, 52],
      ] as const) {
        const m = new THREE.Mesh(new THREE.BoxGeometry(7, h, 7), mat);
        put(m, x, h / 2, z);
        if (!this.mapsLite) this.registerUnique(m, { minX: ox + x - 3.5, maxX: ox + x + 3.5, minZ: oz + z - 3.5, maxZ: oz + z + 3.5, height: h });
      }
    } else if (kind === "neon") {
      const colors = this.theme.neon.length ? this.theme.neon : [0xff2d8b, 0x22e0ff];
      for (let i = 0; i < 6; i++) {
        const sign = new THREE.Mesh(
          new THREE.BoxGeometry(8, 2.2, 0.18),
          new THREE.MeshLambertMaterial({
            color: colors[i % colors.length],
            emissive: new THREE.Color(colors[i % colors.length]!),
            emissiveIntensity: 1.4,
          }),
        );
        const a = (i / 6) * Math.PI * 2;
        put(sign, Math.cos(a) * 18, 11 + (i % 3) * 3, Math.sin(a) * 18);
        sign.lookAt(ox, sign.position.y, oz);
      }
    } else if (kind === "clock" || kind === "capitol" || kind === "temple") {
      const shaft = new THREE.Mesh(new THREE.BoxGeometry(6.2, 30, 6.2), new THREE.MeshLambertMaterial({ color: this.theme.accent }));
      put(shaft, -16, 15, 18);
      const cap = new THREE.Mesh(new THREE.SphereGeometry(kind === "temple" ? 3.4 : 2.2, 12, 8), new THREE.MeshLambertMaterial({ color: 0xc9a227 }));
      put(cap, -16, kind === "temple" ? 34 : 32, 18);
    } else if (kind === "spire" || kind === "obelisk" || kind === "lighthouse") {
      const geo = kind === "obelisk" ? new THREE.BoxGeometry(3.2, 52, 3.2) : new THREE.CylinderGeometry(0.5, kind === "lighthouse" ? 4.2 : 6.8, 64, 8);
      const spire = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ color: this.theme.window }));
      put(spire, 22, 32, -18);
    } else if (kind === "mountain" || kind === "volcano" || kind === "glacier") {
      const col = kind === "glacier" ? 0xd8e8f0 : kind === "volcano" ? 0x5a3a30 : this.theme.grass;
      const m1 = new THREE.Mesh(new THREE.ConeGeometry(22, 36, 6), new THREE.MeshLambertMaterial({ color: col }));
      put(m1, -40, 16, -28);
    } else if (kind === "lattice" || kind === "arch") {
      const iron = new THREE.MeshLambertMaterial({ color: kind === "arch" ? 0xc0c8d0 : 0x9a7a48 });
      if (kind === "arch") {
        const a = new THREE.Mesh(new THREE.TorusGeometry(16, 1.1, 8, 28, Math.PI), iron);
        a.rotation.z = Math.PI;
        put(a, 24, 16, 12);
      } else {
        let y = 0;
        let s = 10;
        for (let i = 0; i < 5; i++) {
          const box = new THREE.Mesh(new THREE.BoxGeometry(s, 7, s), iron);
          put(box, 20, y + 3.5, 16);
          y += 7;
          s *= 0.72;
        }
      }
    } else if (kind === "hollywood") {
      const hill = new THREE.Mesh(
        new THREE.SphereGeometry(22, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2.4),
        new THREE.MeshLambertMaterial({ color: 0x8a7a4a }),
      );
      hill.scale.set(1.4, 0.7, 1);
      put(hill, -36, -4, -16);
    } else if (kind === "canal") {
      const water = new THREE.Mesh(new THREE.PlaneGeometry(14, 80), new THREE.MeshLambertMaterial({ color: 0x2a6a7a }));
      water.rotation.x = -Math.PI / 2;
      put(water, -18, 0.04, 0);
    } else if (kind === "pyramid") {
      const py = new THREE.Mesh(new THREE.ConeGeometry(16, 28, 4), new THREE.MeshLambertMaterial({ color: 0x2a2428 }));
      put(py, 20, 14, -16);
    } else if (kind === "bridge") {
      const deck = new THREE.Mesh(new THREE.BoxGeometry(48, 1.2, 8), new THREE.MeshLambertMaterial({ color: 0xc9a227 }));
      put(deck, 0, 8, 20);
    } else if (kind === "fountain" || kind === "balloon") {
      const bowl = new THREE.Mesh(new THREE.CylinderGeometry(6, 7, 2, 16), new THREE.MeshLambertMaterial({ color: this.theme.accent }));
      put(bowl, 8, 1, 8);
      const up = new THREE.Mesh(new THREE.SphereGeometry(kind === "balloon" ? 5 : 2.4, 12, 10), new THREE.MeshLambertMaterial({ color: this.theme.window }));
      put(up, 8, kind === "balloon" ? 14 : 5, 8);
    } else if (kind === "mission" || kind === "fort") {
      const hall = new THREE.Mesh(new THREE.BoxGeometry(18, 8, 12), new THREE.MeshLambertMaterial({ color: this.theme.buildings[1] ?? mat.color.getHex() }));
      put(hall, 14, 4, -10);
    } else if (kind === "mill" || kind === "brewery" || kind === "crane") {
      const stack = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 2.2, 28, 8), new THREE.MeshLambertMaterial({ color: this.theme.accent }));
      put(stack, 16, 14, -12);
    } else if (kind === "rose") {
      const crown = new THREE.Mesh(new THREE.SphereGeometry(6, 10, 8), new THREE.MeshLambertMaterial({ color: this.theme.grass }));
      put(crown, 12, 8, -10);
    } else if (kind === "opera" || kind === "tomb" || kind === "speedway") {
      const hall = new THREE.Mesh(new THREE.BoxGeometry(22, 10, 14), new THREE.MeshLambertMaterial({ color: this.theme.accent }));
      put(hall, 16, 5, -12);
    } else {
      const h = range(rng, 22, 34);
      const m = new THREE.Mesh(new THREE.BoxGeometry(8, h, 8), new THREE.MeshLambertMaterial({ color: this.theme.accent }));
      put(m, 20, h / 2, -18);
    }
  }

  private buildStreetLife(rng: () => number): void {
    const half = (GRID * CELL) / 2;
    const trunkMat = new THREE.MeshLambertMaterial({ color: 0x4a3424 });
    const leafMat = new THREE.MeshLambertMaterial({ color: 0x2f7a38 });
    const trunks = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.16, 0.22, 2.4, 7), trunkMat, 160);
    const leaves = new THREE.InstancedMesh(new THREE.SphereGeometry(1.25, 6, 5), leafMat, 160);
    trunks.count = leaves.count = 0;
    const dummy = new THREE.Object3D();
    for (let i = 0; i < 28; i++) {
      const x = range(rng, -half + 10, half - 10);
      const z = range(rng, -half + 10, half - 10);
      if (Math.hypot(x, z) < 20) continue;
      dummy.position.set(x, 1.2, z);
      dummy.scale.set(1, 1, 1);
      dummy.rotation.set(0, 0, 0);
      dummy.updateMatrix();
      trunks.setMatrixAt(trunks.count++, dummy.matrix);
      dummy.position.set(x, 3.1, z);
      dummy.scale.set(1 + rng() * 0.35, 0.9 + rng() * 0.3, 1 + rng() * 0.35);
      dummy.updateMatrix();
      leaves.setMatrixAt(leaves.count++, dummy.matrix);
    }
    trunks.instanceMatrix.needsUpdate = true;
    leaves.instanceMatrix.needsUpdate = true;
    trunks.castShadow = false;
    leaves.castShadow = false;
    this.add(trunks);
    this.add(leaves);

    const signMat = new THREE.MeshLambertMaterial({ color: 0xc9a227, emissive: 0x442200, emissiveIntensity: 0.2 });
    const signs = new THREE.InstancedMesh(new THREE.BoxGeometry(1.8, 0.7, 0.08), signMat, 80);
    signs.count = 0;
    for (let i = 0; i < 18; i++) {
      dummy.position.set(range(rng, -half + 8, half - 8), 3.4, range(rng, -half + 8, half - 8));
      dummy.scale.set(1, 1, 1);
      dummy.rotation.set(0, rng() * Math.PI, 0);
      dummy.updateMatrix();
      signs.setMatrixAt(signs.count++, dummy.matrix);
    }
    signs.instanceMatrix.needsUpdate = true;
    this.add(signs);

    const hydrant = new THREE.MeshLambertMaterial({ color: 0xb42318 });
    const hydrants = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.16, 0.2, 0.7, 8), hydrant, 40);
    hydrants.count = 0;
    for (let i = 0; i < 22; i++) {
      dummy.position.set(range(rng, -half + 8, half - 8), 0.35, range(rng, -half + 8, half - 8));
      dummy.scale.set(1, 1, 1);
      dummy.rotation.set(0, 0, 0);
      dummy.updateMatrix();
      hydrants.setMatrixAt(hydrants.count++, dummy.matrix);
    }
    hydrants.instanceMatrix.needsUpdate = true;
    this.add(hydrants);
  }

  private buildLite(rng: () => number): void {
    const g = this.graph;
    const bus = g?.landmark("bus");
    const plaza = g?.landmark("plaza") ?? g?.landmarks[0];
    const door = g?.landmark("dungeon");
    this.playerSpawn.set(bus?.x ?? 0, 0, bus?.z ?? 0);
    this.plaza.set(plaza?.x ?? 22, 0, plaza?.z ?? 28);
    this.dungeonDoor.set(door?.x ?? -14, 0, door?.z ?? 32);
    const curb = new THREE.Mesh(
      new THREE.CircleGeometry(48, 48),
      new THREE.MeshLambertMaterial({ color: this.theme.road }),
    );
    curb.rotation.x = -Math.PI / 2;
    curb.position.y = -0.04;
    curb.visible = false;
    this.curbMesh = curb;
    this.add(curb);
    this.placeholderGroup.name = "hub-placeholders";
    this.add(this.placeholderGroup);
    const colors = this.theme.buildings;
    const spots: Array<[number, number, number, number]> = [
      [14, 8, 9, 14],
      [-16, 10, 8, 16],
      [8, -18, 10, 12],
      [-22, -12, 7, 11],
      [28, 4, 8, 18],
      [-8, 24, 11, 9],
      [18, 22, 7, 10],
      [-28, 6, 9, 13],
      [4, 36, 8, 8],
      [32, -16, 10, 10],
    ];
    spots.forEach(([cx, cz, w, h], i) => {
      const ghost = new THREE.MeshLambertMaterial({
        color: colors[i % colors.length]!,
        transparent: true,
        opacity: 0.18,
        depthWrite: false,
      });
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, w * 0.85), ghost);
      mesh.position.set(this.plaza.x + cx, h * 0.5, this.plaza.z + cz);
      this.placeholderGroup.add(mesh);
    });
    this.buildLifeSites();
    this.buildLandmark(rng);
    const hatch = new THREE.Mesh(
      new THREE.BoxGeometry(1.1, 2.6, 1.1),
      new THREE.MeshLambertMaterial({ color: 0x7dff6a, transparent: true, opacity: 0.55 }),
    );
    hatch.position.set(this.dungeonDoor.x, 1.3, this.dungeonDoor.z);
    this.placeholderGroup.add(hatch);
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2 + rng() * 0.2;
      const r = 48 + rng() * 70;
      this.crimeSpawns.push({ x: this.playerSpawn.x + Math.cos(a) * r, z: this.playerSpawn.z + Math.sin(a) * r });
    }
  }

  private buildLifeSites(): void {
    const kiosks: Array<{ kind: LifeSite["kind"]; jobType?: JobType; label: string; x: number; z: number; color: number }> = [
      { kind: "apartment", label: "Walk-up", x: 9, z: 16, color: 0x6a8ab0 },
      { kind: "diner", label: "All-night diner", x: 16, z: 5, color: 0xc45a2a },
      { kind: "job", jobType: "lab", label: JOBS[0]!.site, x: -11, z: 14, color: 0x4aa06a },
      { kind: "job", jobType: "cafe", label: JOBS[1]!.site, x: 18, z: -7, color: 0xc4a06a },
      { kind: "job", jobType: "warehouse", label: JOBS[2]!.site, x: -18, z: -11, color: 0x6a6458 },
      { kind: "job", jobType: "office", label: JOBS[3]!.site, x: 7, z: -17, color: 0x8a9aaa },
    ];
    for (const k of kiosks) {
      const pos = new THREE.Vector3(k.x, 0, k.z);
      const g = new THREE.Group();
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.55, 2.1, 0.55), new THREE.MeshLambertMaterial({ color: k.color }));
      post.position.y = 1.05;
      g.add(post);
      const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 8), new THREE.MeshBasicMaterial({ color: k.color }));
      lamp.position.y = 2.25;
      g.add(lamp);
      const pad = new THREE.Mesh(
        new THREE.CircleGeometry(1.15, 16),
        new THREE.MeshLambertMaterial({ color: 0x2a241c }),
      );
      pad.rotation.x = -Math.PI / 2;
      pad.position.y = 0.04;
      g.add(pad);
      g.position.copy(pos);
      this.group.add(g);
      this.sites.push({
        id: `${k.kind}-${k.jobType ?? k.kind}`,
        kind: k.kind,
        jobType: k.jobType,
        label: k.label,
        pos,
      });
    }
  }

  /** Grey-line coach at the New York curb — the scientist's arrival. */
  private buildNightBus(): void {
    if (this.city.id !== "new-york") return;
    const g = new THREE.Group();
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(3.1, 2.2, 8.4),
      new THREE.MeshLambertMaterial({ color: 0x3a3e46 }),
    );
    body.position.y = 1.25;
    g.add(body);
    const stripe = new THREE.Mesh(
      new THREE.BoxGeometry(3.18, 0.18, 8.5),
      new THREE.MeshLambertMaterial({ color: 0xc45a2a }),
    );
    stripe.position.y = 1.7;
    g.add(stripe);
    const glass = new THREE.Mesh(
      new THREE.BoxGeometry(2.7, 0.7, 7.2),
      new THREE.MeshLambertMaterial({ color: 0x8ec8e8, transparent: true, opacity: 0.45 }),
    );
    glass.position.y = 2.15;
    g.add(glass);
    const sign = new THREE.Mesh(
      new THREE.BoxGeometry(2.4, 0.28, 0.12),
      new THREE.MeshBasicMaterial({ color: 0xffc44a }),
    );
    sign.position.set(0, 2.55, 4.22);
    g.add(sign);
    for (const z of [-2.8, 2.6] as const) {
      for (const x of [-1.35, 1.35] as const) {
        const wheel = new THREE.Mesh(
          new THREE.CylinderGeometry(0.42, 0.42, 0.28, 10),
          new THREE.MeshLambertMaterial({ color: 0x1a1a1c }),
        );
        wheel.rotation.z = Math.PI / 2;
        wheel.position.set(x, 0.42, z);
        g.add(wheel);
      }
    }
    g.position.set(14.5, 0, 18);
    g.rotation.y = -0.35;
    this.group.add(g);
  }

  private collectSpawns(rng: () => number): void {
    const half = (GRID * CELL) / 2;
    for (let iz = 0; iz < GRID; iz++) {
      for (let ix = 0; ix < GRID; ix++) {
        if (this.isPlaza(ix, iz)) continue;
        const x = -half + ix * CELL + BLOCK + ROAD / 2 + range(rng, -3, 3);
        const z = -half + iz * CELL + BLOCK + ROAD / 2 + range(rng, -3, 3);
        if (Math.hypot(x, z) < 28) continue;
        this.crimeSpawns.push({ x, z });
      }
    }
  }

  private buildFromGraph(graph: StreetGraph, rng: () => number): void {
    const span = this.extent * 2 + 80;
    const grass = makeGrass();
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(span, span), std(grass, this.theme.grass));
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.03;
    ground.receiveShadow = true;
    this.add(ground);

    this.buildGraphRoads(graph);
    this.placeGraphAnchors(graph);
    this.prepareGraphLots(graph, rng);
    this.pump(12);
    this.buildPlazaAt(graph, rng);
    this.buildGraphLamps(graph, rng);
    this.buildGraphLife(graph, rng);
    this.buildLifeSitesGraph(graph);
    this.buildNightBusGraph(graph);
    this.collectSpawnsGraph(graph, rng);
  }

  /** Place a few nearby lots per call. Never sync-builds the whole district. */
  pump(budgetMs = 4): boolean {
    if (!this.lotKit || this.lotCursor >= this.lotJobs.length) return false;
    const t0 = performance.now();
    let n = 0;
    while (this.lotCursor < this.lotJobs.length && (n === 0 || performance.now() - t0 < budgetMs) && n < 6) {
      this.placeLot(this.lotJobs[this.lotCursor]!);
      this.lotCursor += 1;
      n += 1;
    }
    this.flushLotMeshes();
    return this.lotCursor < this.lotJobs.length;
  }

  private buildGraphRoads(graph: StreetGraph): void {
    const asphalt = loadAsphalt();
    const roadMat = new THREE.MeshPhongMaterial({ map: asphalt.map, color: 0x8a8c90, shininess: 22, specular: 0x3a4a58 });
    const walkMat = std(makeSidewalk(), this.theme.sidewalk);
    const slab = new THREE.BoxGeometry(1, 0.05, 1);
    const n = graph.segs.length;
    const roads = new THREE.InstancedMesh(slab, roadMat, n);
    const walks = new THREE.InstancedMesh(slab, walkMat, n);
    roads.count = 0;
    walks.count = 0;
    roads.receiveShadow = true;
    walks.receiveShadow = true;
    const dummy = new THREE.Object3D();
    for (const s of graph.segs) {
      dummy.position.set(s.mx, 0.02, s.mz);
      dummy.scale.set(s.width, 1, s.length + 0.6);
      dummy.rotation.set(0, Math.atan2(s.dx, s.dz), 0);
      dummy.updateMatrix();
      roads.setMatrixAt(roads.count++, dummy.matrix);
      dummy.position.y = 0.028;
      dummy.scale.set(s.width + 3.6, 1, s.length + 0.8);
      dummy.updateMatrix();
      walks.setMatrixAt(walks.count++, dummy.matrix);
    }
    roads.instanceMatrix.needsUpdate = true;
    walks.instanceMatrix.needsUpdate = true;
    this.add(walks);
    this.add(roads);
  }

  private placeGraphAnchors(graph: StreetGraph): void {
    const spawnLm = graph.landmark("bus") ?? graph.landmarks[0];
    const plazaLm = graph.landmark("plaza") ?? spawnLm;
    const doorLm = graph.landmark("dungeon") ?? plazaLm;
    const spawn = spawnLm ? graph.sidewalk(spawnLm.x, spawnLm.z, 1, 4) : { x: 6, z: 10 };
    this.playerSpawn.set(spawn.x, 0, spawn.z);
    if (plazaLm) this.plaza.set(plazaLm.x, 0, plazaLm.z);
    if (doorLm) this.dungeonDoor.set(doorLm.x, 0, doorLm.z);
  }

  private prepareGraphLots(graph: StreetGraph, rng: () => number): void {
    const brickMap = loadBrick();
    const palettes = this.theme.buildings.slice(0, 2);
    const facades = palettes.map((c, i) => makeFacade(c, this.theme.window, this.theme.night, hashString(`${this.city.id}:${i}`)));
    const officeMats = facades.map((f) => std(f, 0xffffff));
    const brickMat = new THREE.MeshLambertMaterial({ map: brickMap, color: 0xddd0c4 });
    const glass = makeGlass(this.theme.window, this.theme.night);
    const corniceMat = new THREE.MeshLambertMaterial({ color: 0xcfc8bc });
    const awningMat = new THREE.MeshLambertMaterial({ color: this.theme.accent });
    const bodyGeo = new THREE.BoxGeometry(1, 1, 1);
    const max = 280;
    const towers = officeMats.map((mat) => {
      const inst = new THREE.InstancedMesh(bodyGeo, mat, max);
      inst.count = 0;
      inst.frustumCulled = true;
      inst.receiveShadow = true;
      this.add(inst);
      return inst;
    });
    const brickTowers = new THREE.InstancedMesh(bodyGeo, brickMat, max);
    const podia = new THREE.InstancedMesh(bodyGeo, glass, max);
    const cornices = new THREE.InstancedMesh(bodyGeo, corniceMat, max);
    const awnings = new THREE.InstancedMesh(bodyGeo, awningMat, max);
    for (const m of [brickTowers, podia, cornices, awnings]) {
      m.count = 0;
      m.frustumCulled = true;
      m.receiveShadow = true;
      this.add(m);
    }

    const ny = this.city.id === "new-york";
    const heroFacade = makeFacade(0xc8a868, 0xffe7a8, false, hashString(`${this.city.id}:hero`));
    const villainFacade = makeFacade(0x2a2228, 0x66d0ff, true, hashString(`${this.city.id}:villain`));
    const heroTowers = new THREE.InstancedMesh(bodyGeo, std(heroFacade, 0xffffff), max);
    const villainTowers = new THREE.InstancedMesh(bodyGeo, std(villainFacade, 0xffffff), max);
    for (const m of [heroTowers, villainTowers]) {
      m.count = 0;
      m.frustumCulled = true;
      if (ny) this.add(m);
    }

    this.lotKit = { towers, brickTowers, podia, cornices, awnings, heroTowers, villainTowers, ny };

    const jobs: LotJob[] = [];
    if (graph.footprints.length) {
      for (const fp of graph.footprints) {
        if (Math.hypot(fp.cx - this.plaza.x, fp.cz - this.plaza.z) < 18) continue;
        const zone: LotJob["zone"] = ny ? (fp.cx > 240 ? "heroes" : fp.cx < -160 ? "villains" : "mid") : "mid";
        jobs.push({
          cx: fp.cx,
          cz: fp.cz,
          w: fp.w,
          d: fp.d,
          h: fp.h,
          yaw: fp.yaw,
          brick: rng() < 0.28,
          zone,
          awning: false,
          side: 1,
        });
      }
    } else {
      const occupied: WorldOcc[] = [];
      const taken = (x: number, z: number, r: number): boolean => {
        for (const o of occupied) {
          if (Math.hypot(o.x - x, o.z - z) < r) return true;
        }
        return false;
      };
      const plazaKeep = 28;
      for (const s of graph.segs) {
        if (jobs.length >= 260) break;
        const step = s.kind === "avenue" ? 22 : 28;
        const n = Math.max(1, Math.floor(s.length / step));
        for (let i = 0; i < n; i++) {
          const t = (i + 0.5) / n;
          const px = s.ax + s.dx * t;
          const pz = s.az + s.dz * t;
          if (Math.hypot(px - this.plaza.x, pz - this.plaza.z) < plazaKeep) continue;
          const inv = 1 / s.length;
          const nx = -s.dz * inv;
          const nz = s.dx * inv;
          for (const side of [-1, 1] as const) {
            if (jobs.length >= 260) break;
            const w = range(rng, 9.2, 14.5);
            const d = range(rng, 8.4, 13.2);
            const cx = px + nx * side * (s.width * 0.5 + d * 0.5 + 2.1);
            const cz = pz + nz * side * (s.width * 0.5 + d * 0.5 + 2.1);
            if (taken(cx, cz, Math.max(w, d) * 0.72)) continue;
            occupied.push({ x: cx, z: cz });
            const downtown = Math.max(0, 1.15 - Math.hypot(cx, cz) / 420);
            let h = range(rng, 18, 28) + downtown * range(rng, 24, 78);
            if (ny && cx > 220) h += 8;
            const zone: LotJob["zone"] = ny ? (cx > 240 ? "heroes" : cx < -160 ? "villains" : "mid") : "mid";
            jobs.push({
              cx,
              cz,
              w,
              d,
              h,
              yaw: 0,
              brick: rng() < 0.34,
              zone,
              awning: rng() < 0.5,
              side,
            });
          }
        }
      }
    }
    jobs.sort((a, b) => {
      const da = Math.hypot(a.cx - this.playerSpawn.x, a.cz - this.playerSpawn.z);
      const db = Math.hypot(b.cx - this.playerSpawn.x, b.cz - this.playerSpawn.z);
      return da - db;
    });
    this.lotJobs = jobs.slice(0, 260);
    this.lotCursor = 0;
  }

  private placeLot(job: LotJob): void {
    const kit = this.lotKit;
    if (!kit) return;
    const { cx, cz, w, d, h, yaw, brick, zone, awning, side } = job;
    const tower =
      zone === "heroes"
        ? kit.heroTowers
        : zone === "villains"
          ? kit.villainTowers
          : brick
            ? kit.brickTowers
            : kit.towers[this.structures.length % kit.towers.length]!;
    const podiumH = Math.min(4.2, Math.max(2.4, h * 0.06));
    const parts: StructurePart[] = [];
    const pi = this.stampInst(kit.podia, cx, podiumH / 2, cz, w * 0.98, podiumH, d * 0.98, yaw);
    parts.push({ mesh: kit.podia, index: pi, x: cx, y: podiumH / 2, z: cz, sx: w * 0.98, sy: podiumH, sz: d * 0.98, yaw });
    const ti = this.stampInst(tower, cx, podiumH + (h - podiumH) / 2, cz, w * 0.92, h - podiumH, d * 0.92, yaw);
    parts.push({
      mesh: tower,
      index: ti,
      x: cx,
      y: podiumH + (h - podiumH) / 2,
      z: cz,
      sx: w * 0.92,
      sy: h - podiumH,
      sz: d * 0.92,
      yaw,
    });
    const ci = this.stampInst(kit.cornices, cx, h + 0.18, cz, w * 1.02, 0.38, d * 1.02, yaw);
    parts.push({ mesh: kit.cornices, index: ci, x: cx, y: h + 0.18, z: cz, sx: w * 1.02, sy: 0.38, sz: d * 1.02, yaw });
    if (awning) {
      const ox = cx + Math.sin(yaw) * d * 0.48 * side;
      const oz = cz + Math.cos(yaw) * d * 0.48 * side;
      const ai = this.stampInst(kit.awnings, ox, 3.35, oz, w * 0.7, 0.12, 1.1, yaw);
      parts.push({ mesh: kit.awnings, index: ai, x: ox, y: 3.35, z: oz, sx: w * 0.7, sy: 0.12, sz: 1.1, yaw });
    }
    const c = Math.abs(Math.cos(yaw));
    const s = Math.abs(Math.sin(yaw));
    const hx = (w / 2) * c + (d / 2) * s;
    const hz = (w / 2) * s + (d / 2) * c;
    this.addStructure(parts, {
      minX: cx - hx,
      maxX: cx + hx,
      minZ: cz - hz,
      maxZ: cz + hz,
      height: h + 4,
    });
  }

  private stampInst(mesh: THREE.InstancedMesh, x: number, y: number, z: number, sx: number, sy: number, sz: number, yaw = 0): number {
    this.scratch.position.set(x, y, z);
    this.scratch.scale.set(sx, sy, sz);
    this.scratch.rotation.set(0, yaw, 0);
    this.scratch.updateMatrix();
    const idx = mesh.count;
    mesh.setMatrixAt(idx, this.scratch.matrix);
    mesh.count += 1;
    return idx;
  }

  private flushLotMeshes(): void {
    const kit = this.lotKit;
    if (!kit) return;
    for (const m of kit.towers) m.instanceMatrix.needsUpdate = true;
    kit.brickTowers.instanceMatrix.needsUpdate = true;
    kit.podia.instanceMatrix.needsUpdate = true;
    kit.cornices.instanceMatrix.needsUpdate = true;
    kit.awnings.instanceMatrix.needsUpdate = true;
    if (kit.ny) {
      kit.heroTowers.instanceMatrix.needsUpdate = true;
      kit.villainTowers.instanceMatrix.needsUpdate = true;
    }
  }

  private buildPlazaAt(graph: StreetGraph, rng: () => number): void {
    const ox = this.plaza.x;
    const oz = this.plaza.z;
    const walk = makeSidewalk();
    const pad = new THREE.Mesh(new THREE.CircleGeometry(16, 32), std(walk, this.theme.plaza));
    pad.rotation.x = -Math.PI / 2;
    pad.position.set(ox, 0.04, oz);
    pad.receiveShadow = true;
    this.add(pad);
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(15.2, 16.4, 48),
      new THREE.MeshLambertMaterial({ color: this.theme.accent }),
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(ox, 0.05, oz);
    this.add(ring);
    const lawn = new THREE.Mesh(new THREE.CircleGeometry(7.4, 28), std(makeGrass(), this.theme.grass));
    lawn.rotation.x = -Math.PI / 2;
    lawn.position.set(ox, 0.06, oz);
    this.add(lawn);
    const stone = new THREE.MeshLambertMaterial({ color: 0x8a9098 });
    const plinth = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.8, 1.1, 12), stone);
    plinth.position.set(ox, 0.55, oz - 2);
    this.add(plinth);
    const figure = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.55, 2.2, 6, 10),
      new THREE.MeshLambertMaterial({ color: this.theme.accent }),
    );
    figure.position.set(ox, 2.6, oz - 2);
    this.add(figure);
    this.registerUnique(plinth, { minX: ox - 1.8, maxX: ox + 1.8, minZ: oz - 3.8, maxZ: oz - 0.2, height: 5 });

    const dx = this.dungeonDoor.x;
    const dz = this.dungeonDoor.z;
    const kiosk = new THREE.Mesh(new THREE.BoxGeometry(4.2, 3.4, 2.2), new THREE.MeshLambertMaterial({ color: 0x2a2420 }));
    kiosk.position.set(dx, 1.7, dz);
    this.add(kiosk);
    const lintel = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.35, 0.4), new THREE.MeshLambertMaterial({ color: this.theme.accent }));
    lintel.position.set(dx, 3.3, dz + 1.1);
    this.add(lintel);
    const mouth = new THREE.Mesh(new THREE.BoxGeometry(2.2, 2.4, 0.3), new THREE.MeshLambertMaterial({ color: 0x0a0808 }));
    mouth.position.set(dx, 1.4, dz + 1.2);
    this.add(mouth);
    const beacon = new THREE.Mesh(
      new THREE.CylinderGeometry(0.28, 0.7, 11, 8),
      new THREE.MeshBasicMaterial({ color: 0x66ffaa, transparent: true, opacity: 0.42, depthWrite: false }),
    );
    beacon.position.set(dx, 6.2, dz + 1.3);
    this.add(beacon);
    const halo = new THREE.Mesh(
      new THREE.RingGeometry(1.4, 2.1, 20),
      new THREE.MeshBasicMaterial({ color: 0x88ffcc, transparent: true, opacity: 0.55, side: THREE.DoubleSide, depthWrite: false }),
    );
    halo.rotation.x = -Math.PI / 2;
    halo.position.set(dx, 0.08, dz + 1.3);
    this.add(halo);
    this.registerUnique(kiosk, { minX: dx - 2.2, maxX: dx + 2.2, minZ: dz - 1.2, maxZ: dz + 1.2, height: 3.4 });

    const benchMat = new THREE.MeshLambertMaterial({ color: 0x4a3428 });
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      const bench = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.42, 0.62), benchMat);
      bench.position.set(ox + Math.cos(a) * 10, 0.28, oz + Math.sin(a) * 10);
      bench.rotation.y = -a;
      this.add(bench);
    }
    void rng;

    for (const lm of graph.landmarks) {
      const post = new THREE.Mesh(
        new THREE.CylinderGeometry(0.18, 0.22, 3.4, 8),
        new THREE.MeshLambertMaterial({ color: lm.kind === "bus" ? 0xc45a2a : 0xc9a227 }),
      );
      post.position.set(lm.x, 1.7, lm.z);
      this.add(post);
      const plate = new THREE.Mesh(
        new THREE.BoxGeometry(Math.min(8, lm.name.length * 0.22), 0.45, 0.08),
        new THREE.MeshBasicMaterial({ color: 0x1a1612 }),
      );
      plate.position.set(lm.x, 3.35, lm.z);
      this.add(plate);
    }
  }

  private buildGraphLamps(graph: StreetGraph, rng: () => number): void {
    const poleMat = new THREE.MeshLambertMaterial({ color: 0x2a2a30 });
    const bulbMat = new THREE.MeshLambertMaterial({
      color: this.theme.night ? 0xffe6a8 : 0xf6f1d8,
      emissive: new THREE.Color(this.theme.night ? 0xffc266 : 0x665533),
      emissiveIntensity: this.theme.night ? 1.4 : 0.2,
    });
    const poles = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.07, 0.1, 6.4, 8), poleMat, 140);
    const bulbs = new THREE.InstancedMesh(new THREE.SphereGeometry(0.2, 10, 10), bulbMat, 140);
    poles.count = bulbs.count = 0;
    const dummy = new THREE.Object3D();
    for (const s of graph.segs) {
      if (rng() < 0.7) continue;
      const inv = 1 / s.length;
      const nx = -s.dz * inv;
      const nz = s.dx * inv;
      dummy.position.set(s.mx + nx * (s.width * 0.5 + 0.8), 3.2, s.mz + nz * (s.width * 0.5 + 0.8));
      dummy.scale.set(1, 1, 1);
      dummy.rotation.set(0, 0, 0);
      dummy.updateMatrix();
      if (poles.count < 140) poles.setMatrixAt(poles.count++, dummy.matrix);
      dummy.position.y = 6.45;
      dummy.updateMatrix();
      if (bulbs.count < 140) bulbs.setMatrixAt(bulbs.count++, dummy.matrix);
    }
    poles.instanceMatrix.needsUpdate = true;
    bulbs.instanceMatrix.needsUpdate = true;
    this.add(poles);
    this.add(bulbs);
  }

  private buildGraphLife(graph: StreetGraph, rng: () => number): void {
    const trunkMat = new THREE.MeshLambertMaterial({ color: 0x4a3424 });
    const leafMat = new THREE.MeshLambertMaterial({ color: 0x2f7a38 });
    const trunks = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.16, 0.22, 2.4, 7), trunkMat, 160);
    const leaves = new THREE.InstancedMesh(new THREE.SphereGeometry(1.25, 6, 5), leafMat, 160);
    trunks.count = leaves.count = 0;
    const dummy = new THREE.Object3D();
    const park = graph.landmark("park");
    for (let i = 0; i < 36; i++) {
      let x: number;
      let z: number;
      if (park && i < 16) {
        x = park.x + range(rng, -18, 18);
        z = park.z + range(rng, -14, 14);
      } else {
        const s = graph.segs[(rng() * graph.segs.length) | 0]!;
        const t = rng();
        const inv = 1 / s.length;
        x = s.ax + s.dx * t + -s.dz * inv * (s.width * 0.5 + 2.2);
        z = s.az + s.dz * t + s.dx * inv * (s.width * 0.5 + 2.2);
      }
      dummy.position.set(x, 1.2, z);
      dummy.scale.set(1, 1, 1);
      dummy.rotation.set(0, 0, 0);
      dummy.updateMatrix();
      trunks.setMatrixAt(trunks.count++, dummy.matrix);
      dummy.position.set(x, 3.1, z);
      dummy.scale.set(1 + rng() * 0.35, 0.9 + rng() * 0.3, 1 + rng() * 0.35);
      dummy.updateMatrix();
      leaves.setMatrixAt(leaves.count++, dummy.matrix);
    }
    trunks.instanceMatrix.needsUpdate = true;
    leaves.instanceMatrix.needsUpdate = true;
    this.add(trunks);
    this.add(leaves);
  }

  private buildLifeSitesGraph(graph: StreetGraph): void {
    const diner = graph.landmark("diner") ?? graph.landmark("bus");
    const bus = graph.landmark("bus");
    const civic = graph.landmark("civic");
    const spots: Array<{ kind: LifeSite["kind"]; jobType?: JobType; label: string; x: number; z: number; color: number }> = [
      {
        kind: "apartment",
        label: "Walk-up",
        x: (bus?.x ?? 0) + 12,
        z: (bus?.z ?? 0) + 8,
        color: 0x6a8ab0,
      },
      {
        kind: "diner",
        label: "All-night diner",
        x: diner?.x ?? 16,
        z: diner?.z ?? 5,
        color: 0xc45a2a,
      },
      { kind: "job", jobType: "lab", label: JOBS[0]!.site, x: (civic?.x ?? -11) + 8, z: civic?.z ?? 14, color: 0x4aa06a },
      { kind: "job", jobType: "cafe", label: JOBS[1]!.site, x: (diner?.x ?? 18) + 10, z: (diner?.z ?? 0) - 6, color: 0xc4a06a },
      { kind: "job", jobType: "warehouse", label: JOBS[2]!.site, x: -42, z: -28, color: 0x6a6458 },
      { kind: "job", jobType: "office", label: JOBS[3]!.site, x: 48, z: 22, color: 0x8a9aaa },
    ];
    for (const k of spots) {
      const curb = graph.sidewalk(k.x, k.z, 1, 3.4);
      k.x = curb.x;
      k.z = curb.z;
      const pos = new THREE.Vector3(k.x, 0, k.z);
      const g = new THREE.Group();
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.55, 2.1, 0.55), new THREE.MeshLambertMaterial({ color: k.color }));
      post.position.y = 1.05;
      g.add(post);
      const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 8), new THREE.MeshBasicMaterial({ color: k.color }));
      lamp.position.y = 2.25;
      g.add(lamp);
      g.position.copy(pos);
      this.group.add(g);
      this.sites.push({ id: `${k.kind}-${k.jobType ?? k.kind}`, kind: k.kind, jobType: k.jobType, label: k.label, pos });
    }
  }

  private buildNightBusGraph(graph: StreetGraph): void {
    if (this.city.id !== "new-york") return;
    const bus = graph.landmark("bus");
    if (!bus) return;
    const n = graph.nearest(bus.x, bus.z);
    const curb = graph.sidewalk(bus.x, bus.z, -1, 5);
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(3.1, 2.2, 8.4), new THREE.MeshLambertMaterial({ color: 0x3a3e46 }));
    body.position.y = 1.25;
    g.add(body);
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(3.18, 0.18, 8.5), new THREE.MeshLambertMaterial({ color: 0xc45a2a }));
    stripe.position.y = 1.7;
    g.add(stripe);
    const glass = new THREE.Mesh(
      new THREE.BoxGeometry(2.7, 0.7, 7.2),
      new THREE.MeshLambertMaterial({ color: 0x8ec8e8, transparent: true, opacity: 0.45 }),
    );
    glass.position.y = 2.15;
    g.add(glass);
    g.position.set(curb.x, 0, curb.z);
    g.rotation.y = Math.atan2(n.tx, n.tz);
    this.group.add(g);
  }

  private collectSpawnsGraph(graph: StreetGraph, rng: () => number): void {
    for (const s of graph.segs) {
      if (rng() > 0.12) continue;
      const t = 0.2 + rng() * 0.6;
      const x = s.ax + s.dx * t;
      const z = s.az + s.dz * t;
      if (Math.hypot(x - this.playerSpawn.x, z - this.playerSpawn.z) < 36) continue;
      if (Math.hypot(x - this.plaza.x, z - this.plaza.z) < 24) continue;
      this.crimeSpawns.push({ x, z });
    }
    if (this.crimeSpawns.length < 6) {
      for (const s of graph.segs.slice(0, 12)) {
        this.crimeSpawns.push({ x: s.mx, z: s.mz });
      }
    }
  }
}
