import * as THREE from "three";
import { CrimeKind, type CrimeKind as CrimeKindT } from "../data/types";
import type { AudioBus } from "../audio/AudioBus";
import type { Hulk } from "../player/Hulk";
import type { CityWorld } from "../world/CityWorld";
import { pick, createRng, hashString } from "../world/rng";
import { APPROACH, type ApproachState, type PackRole } from "../data/approach";
import { SMASH } from "../data/smashEconomy";
import type { EnemyDirector } from "./EnemyDirector";



export type Enemy = {
  mesh: THREE.Group;
  hp: number;
  maxHp: number;
  kind: "thug" | "armored" | "runner" | "shooter" | "civilian";
  speed: number;
  damage: number;
  windup: number;
  attackCd: number;
  alive: boolean;
  vel: THREE.Vector3;
  stun: number;
  hpFill: THREE.Mesh;
  hpBar: THREE.Group;
  state: ApproachState;
  role: PackRole;
  hesitate: number;
  backoff: number;
  glow: THREE.Mesh;
};

function makeNameSprite(kind: Enemy["kind"]): THREE.Sprite {
  const labels: Record<Enemy["kind"], string> = {
    thug: "THUG",
    armored: "ARMORED",
    runner: "RUNNER",
    shooter: "SHOOTER",
    civilian: "CIV",
  };
  const tint: Record<Enemy["kind"], string> = {
    thug: "#ff8a7a",
    armored: "#e6c35c",
    runner: "#7ab6ff",
    shooter: "#d48cff",
    civilian: "#ffe2b0",
  };
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 48;
  const g = c.getContext("2d")!;
  g.fillStyle = "rgba(8,6,5,0.78)";
  g.fillRect(0, 0, 256, 48);
  g.strokeStyle = tint[kind];
  g.lineWidth = 2;
  g.strokeRect(1, 1, 254, 46);
  g.fillStyle = tint[kind];
  g.font = "700 22px sans-serif";
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillText(labels[kind], 128, 26);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false }));
  spr.scale.set(2.4, 0.45, 1);
  return spr;
}

export type Projectile = {
  mesh: THREE.Mesh;
  vel: THREE.Vector3;
  life: number;
  damage: number;
};

export type CrimeEvent = {
  id: number;
  kind: CrimeKindT;
  title: string;
  position: THREE.Vector3;
  enemies: Enemy[];
  marker: THREE.Mesh;
  ring: THREE.Mesh;
  cleared: boolean;
  rewardCash: number;
  rewardRep: number;
  engaged: boolean;
  intervened: boolean;
};

const KINDS: CrimeKindT[] = [
  CrimeKind.Mugging,
  CrimeKind.Carjacking,
  CrimeKind.GangFight,
  CrimeKind.Heist,
  CrimeKind.StreetChase,
  CrimeKind.ArmedRobbery,
];

const TITLES: Record<CrimeKindT, string> = {
  [CrimeKind.Mugging]: "Mugging in progress",
  [CrimeKind.Carjacking]: "Carjacking",
  [CrimeKind.GangFight]: "Gang fight",
  [CrimeKind.Heist]: "Heist in progress",
  [CrimeKind.StreetChase]: "Street chase",
  [CrimeKind.ArmedRobbery]: "Armed robbery",
};

const COLORS: Record<CrimeKindT, number> = {
  [CrimeKind.Mugging]: 0xf1c40f,
  [CrimeKind.Carjacking]: 0xe67e22,
  [CrimeKind.GangFight]: 0xe74c3c,
  [CrimeKind.Heist]: 0x9b59b6,
  [CrimeKind.StreetChase]: 0x3498db,
  [CrimeKind.ArmedRobbery]: 0xc0392b,
};

export class CrimeSystem {
  readonly group = new THREE.Group();
  events: CrimeEvent[] = [];
  projectiles: Projectile[] = [];
  private nextId = 1;
  private respawn = 0;
  private time = 0;
  private rng: () => number;
  private world: CityWorld;
  director: EnemyDirector | null = null;
  lure: THREE.Vector3 | null = null;
  private playerHint: THREE.Vector3 | null = null;
  private chest = new THREE.Vector3();
  private scratch = new THREE.Vector3();
  private heat: Enemy[] = [];
  private heatCd = 0;
  private heatStub: CrimeEvent | null = null;

  constructor(world: CityWorld) {
    this.world = world;
    this.rng = createRng(hashString(`crime:${world.city.id}:${Date.now()}`));
    this.populate(5);
  }

  get active(): CrimeEvent[] {
    return this.events.filter((e) => !e.cleared);
  }

  nearest(from: THREE.Vector3): CrimeEvent | null {
    let best: CrimeEvent | null = null;
    let bestD = Infinity;
    for (const ev of this.events) {
      if (ev.cleared) continue;
      const d = ev.position.distanceToSquared(from);
      if (d < bestD) {
        bestD = d;
        best = ev;
      }
    }
    return best;
  }

  nearestCivilian(from: THREE.Vector3): { dist: number } | null {
    let best = Infinity;
    for (const ev of this.events) {
      if (ev.cleared) continue;
      for (const en of ev.enemies) {
        if (!en.alive || en.kind !== "civilian") continue;
        const d = en.mesh.position.distanceTo(from);
        if (d < best) best = d;
      }
    }
    return best < 80 ? { dist: best } : null;
  }

  bindDirector(d: EnemyDirector): void {
    this.director = d;
  }

  update(dt: number, player: Hulk, audio: AudioBus): { cleared: CrimeEvent | null; playerHit: number } {
    let playerHit = 0;
    let cleared: CrimeEvent | null = null;
    this.time += dt;
    this.playerHint = player.position;
    const chest = this.chest.set(player.position.x, player.chestY, player.position.z);
    const dir = this.director;

    for (const ev of this.events) {
      if (ev.cleared) continue;
      ev.marker.position.y = 5.2 + Math.sin(this.time * 2.4 + ev.id) * 0.4;
      ev.marker.rotation.y += dt * 1.4;
      let packSize = 0;
      for (const e of ev.enemies) if (e.alive && e.kind !== "civilian") packSize += 1;
      const near = player.position.distanceTo(ev.position);
      if (!ev.intervened && (player.smashActive > 0 && near < 10 || near < 5.5 || (dir && dir.lastSmash < 1.2 && near < APPROACH.hearSmashM * 0.5))) {
        ev.intervened = true;
      }
      if (dir?.notice(near, player, ev.engaged) && ev.intervened) ev.engaged = true;
      ev.ring.material = ev.ring.material as THREE.MeshBasicMaterial;
      (ev.ring.material as THREE.MeshBasicMaterial).opacity = ev.engaged ? 0.55 : 0.28;

      for (const en of ev.enemies) {
        if (!en.alive && en.mesh.visible) {
          en.mesh.rotation.x = Math.min(1.45, en.mesh.rotation.x + dt * 3);
          en.vel.y -= 28 * dt;
          en.mesh.position.addScaledVector(en.vel, dt);
          if (en.mesh.position.y < 0.2) {
            en.mesh.position.y = 0.2;
            en.vel.set(0, 0, 0);
          }
          en.hpBar.visible = false;
          continue;
        }
        if (!en.alive) continue;
        playerHit += this.updateEnemy(dt, en, player, chest, ev, packSize, audio);
      }

      let living = 0;
      for (const e of ev.enemies) if (e.alive && e.kind !== "civilian") living += 1;
      if (living === 0) {
        ev.cleared = true;
        ev.marker.visible = false;
        ev.ring.visible = false;
        for (const en of ev.enemies) {
          if (en.kind === "civilian" && en.alive) en.mesh.rotation.y += 0.5;
        }
        cleared = ev;
        audio.success();
      }
    }

    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i]!;
      p.life -= dt;
      p.mesh.position.addScaledVector(p.vel, dt);
      const hitR = player.radius + 0.7;
      const dx = p.mesh.position.x - player.position.x;
      const dz = p.mesh.position.z - player.position.z;
      const dy = p.mesh.position.y - player.chestY;
      if (Math.hypot(dx, dz) < hitR && Math.abs(dy) < 3.2) {
        playerHit += p.damage;
        this.group.remove(p.mesh);
        this.projectiles.splice(i, 1);
        continue;
      }
      if (p.life <= 0 || p.mesh.position.y < 0) {
        this.group.remove(p.mesh);
        this.projectiles.splice(i, 1);
      }
    }

    this.respawn -= dt;
    const cap = 3 + (dir && dir.danger > 40 ? 2 : 0);
    if (this.active.length < cap && this.respawn <= 0) {
      this.spawnOne();
      this.respawn = dir?.reinforceReady ? 3.5 : 8;
    }

    this.heatCd = Math.max(0, this.heatCd - dt);
    const stub = this.heatStub;
    if (stub) {
      stub.position.copy(player.position);
      let pack = 0;
      for (const e of this.heat) if (e.alive) pack += 1;
      for (const en of this.heat) {
        if (!en.alive && en.mesh.visible) {
          en.mesh.rotation.x = Math.min(1.45, en.mesh.rotation.x + dt * 3);
          en.vel.y -= 28 * dt;
          en.mesh.position.addScaledVector(en.vel, dt);
          if (en.mesh.position.y < 0.2) {
            en.mesh.position.y = 0.2;
            en.vel.set(0, 0, 0);
          }
          en.hpBar.visible = false;
          continue;
        }
        if (!en.alive) continue;
        playerHit += this.updateEnemy(dt, en, player, chest, stub, pack, audio);
      }
    }

    return { cleared, playerHit };
  }

  applySmash(
    origin: THREE.Vector3,
    radius: number,
    damage: number,
    audio: AudioBus,
    facing: THREE.Vector3,
    superHit: boolean,
  ): number {
    let hits = 0;
    const packs: Enemy[][] = this.events.filter((e) => !e.cleared).map((e) => e.enemies);
    if (this.heat.length) packs.push(this.heat);
    for (const pack of packs) {
      for (const en of pack) {
        if (!en.alive || en.kind === "civilian") continue;
        const d = en.mesh.position.distanceTo(origin);
        if (d > radius) continue;
        hits += 1;
        const owner = this.events.find((e) => e.enemies === pack);
        if (owner) {
          owner.engaged = true;
          owner.intervened = true;
        }
        const falloff = 1 - Math.min(0.45, d / Math.max(1, radius));
        en.hp -= damage * falloff;
        const push = en.mesh.position.clone().sub(origin);
        push.y = 0;
        if (push.lengthSq() < 0.01) push.copy(facing);
        push.normalize();
        const force = superHit ? 28 : 16;
        const loft = superHit ? 14 : 8;
        en.vel.set(push.x * force, loft, push.z * force);
        en.stun = superHit ? 1.1 : 0.55;
        en.mesh.position.y = Math.max(en.mesh.position.y, 0.4);
        this.refreshHp(en);
        if (en.hp <= 0) {
          en.alive = false;
          en.vel.y += 4;
          window.setTimeout(() => {
            en.mesh.visible = false;
          }, 1400);
        }
      }
    }
    if (hits) audio.hit();
    return hits;
  }

  /** Chip civilians in a smash. Returns how many were hurt in front of the player. */
  hurtBystanders(origin: THREE.Vector3, radius: number, facing: THREE.Vector3): number {
    let n = 0;
    for (const ev of this.events) {
      if (ev.cleared) continue;
      for (const en of ev.enemies) {
        if (!en.alive || en.kind !== "civilian") continue;
        const d = en.mesh.position.distanceTo(origin);
        if (d > radius) continue;
        const to = en.mesh.position.clone().sub(origin);
        to.y = 0;
        if (to.lengthSq() > 0.01 && to.normalize().dot(facing) < -0.15) continue;
        en.hp -= 8;
        n += 1;
        if (en.hp <= 0) {
          en.alive = false;
          en.mesh.visible = false;
        }
      }
    }
    return n;
  }

  stunRadius(origin: THREE.Vector3, radius: number, seconds: number): number {
    let n = 0;
    for (const ev of this.events) {
      if (ev.cleared) continue;
      for (const en of ev.enemies) {
        if (!en.alive || en.kind === "civilian") continue;
        if (en.mesh.position.distanceTo(origin) > radius) continue;
        en.stun = Math.max(en.stun, seconds);
        n += 1;
      }
    }
    return n;
  }

  tranqNearest(origin: THREE.Vector3, radius: number): boolean {
    let best: Enemy | null = null;
    let bestD = radius;
    for (const ev of this.events) {
      if (ev.cleared) continue;
      for (const en of ev.enemies) {
        if (!en.alive || en.kind === "civilian") continue;
        const d = en.mesh.position.distanceTo(origin);
        if (d < bestD) {
          bestD = d;
          best = en;
        }
      }
    }
    if (!best) return false;
    best.stun = Math.max(best.stun, 4.2);
    best.vel.set(0, 0, 0);
    return true;
  }

  calmNear(origin: THREE.Vector3, radius: number): number {
    let n = 0;
    for (const ev of this.events) {
      if (ev.cleared) continue;
      for (const en of ev.enemies) {
        if (!en.alive || en.kind === "civilian") continue;
        if (en.mesh.position.distanceTo(origin) > radius) continue;
        en.stun = Math.max(en.stun, 3.6);
        ev.engaged = false;
        n += 1;
      }
    }
    return n;
  }

  allyStrike(origin: THREE.Vector3, radius: number, damage: number): number {
    let hits = 0;
    const facing = new THREE.Vector3(0, 0, 1);
    for (const ev of this.events) {
      if (ev.cleared) continue;
      for (const en of ev.enemies) {
        if (!en.alive || en.kind === "civilian") continue;
        const d = en.mesh.position.distanceTo(origin);
        if (d > radius) continue;
        hits += 1;
        ev.engaged = true;
        ev.intervened = true;
        en.hp -= damage;
        const push = en.mesh.position.clone().sub(origin);
        push.y = 0;
        if (push.lengthSq() < 0.01) push.copy(facing);
        push.normalize();
        en.vel.set(push.x * 10, 5, push.z * 10);
        en.stun = 0.35;
        this.refreshHp(en);
        if (en.hp <= 0) {
          en.alive = false;
          window.setTimeout(() => {
            en.mesh.visible = false;
          }, 1400);
        }
      }
    }
    return hits;
  }

  dispatchHeat(stars: number, origin: THREE.Vector3, overloaded: boolean): void {
    if (stars <= 0) {
      this.clearHeat();
      return;
    }
    this.heat = this.heat.filter((e) => e.alive);
    if (overloaded) return;
    const cap = Math.min(SMASH.heatCap, stars >= 5 ? 2 : stars >= 3 ? 3 : 2);
    if (this.heat.length >= cap || this.heatCd > 0) return;
    this.heatCd = SMASH.heatCd;
    if (!this.heatStub) {
      this.heatStub = {
        id: -1,
        kind: CrimeKind.ArmedRobbery,
        title: "Wanted",
        position: origin.clone(),
        enemies: this.heat,
        marker: new THREE.Mesh(),
        ring: new THREE.Mesh(),
        cleared: false,
        rewardCash: 0,
        rewardRep: 0,
        engaged: true,
        intervened: true,
      };
    }
    this.heatStub.enemies = this.heat;
    this.heatStub.engaged = true;
    this.heatStub.intervened = true;
    const kind: Enemy["kind"] = stars >= 4 ? "shooter" : stars >= 2 ? "armored" : "thug";
    const ang = Math.random() * Math.PI * 2;
    const dist = 14 + Math.random() * 6;
    const en = this.enemy(kind, origin.x + Math.cos(ang) * dist, origin.z + Math.sin(ang) * dist);
    this.paintHeat(en, stars);
    this.heat.push(en);
    this.group.add(en.mesh);
  }

  clearHeat(): void {
    for (const en of this.heat) {
      this.group.remove(en.mesh);
    }
    this.heat = [];
    this.heatCd = 0;
  }

  private paintHeat(en: Enemy, stars: number): void {
    const colors = [0x2b4c8a, 0x1a1e28, 0xc9a227, 0x3aaa3a, 0xc43a22];
    const tint = colors[Math.min(4, Math.max(0, stars - 1))] ?? 0x2b4c8a;
    en.mesh.traverse((o) => {
      const mesh = o as THREE.Mesh;
      const mat = mesh.material as THREE.MeshLambertMaterial | undefined;
      if (mat?.color && mesh !== en.hpFill) mat.color.lerp(new THREE.Color(tint), 0.55);
    });
    if (stars >= 5) en.mesh.scale.setScalar(1.38);
    if (stars >= 4) {
      en.hp = Math.floor(en.hp * 1.35);
      en.maxHp = en.hp;
      en.damage += 4;
    }
    if (stars >= 3) {
      en.hp = Math.floor(en.hp * 1.2);
      en.maxHp = en.hp;
    }
  }

  dispose(): void {
    this.clearHeat();
    this.group.clear();
    this.events = [];
    this.projectiles = [];
    this.heatStub = null;
  }

  private populate(n: number): void {
    for (let i = 0; i < n; i++) this.spawnOne();
  }

  private spawnOne(): void {
    const used = this.active.map((e) => e.position);
    const spots = this.world.crimeSpawns.filter((s) => used.every((u) => Math.hypot(u.x - s.x, u.z - s.z) > 28));
    const pool = spots.length ? spots : this.world.crimeSpawns;
    if (!pool.length) return;
    let spot = pick(this.rng, pool);
    if (this.playerHint) {
      const far = pool.filter((s) => {
        const d = Math.hypot(s.x - this.playerHint!.x, s.z - this.playerHint!.z);
        return d >= APPROACH.spawnMinM && d <= APPROACH.spawnMaxM;
      });
      if (far.length) spot = pick(this.rng, far);
    }
    const kind = pick(this.rng, KINDS);
    const pos = new THREE.Vector3(spot.x, 0, spot.z);
    const marker = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.7, 0),
      new THREE.MeshLambertMaterial({ color: COLORS[kind], emissive: COLORS[kind], emissiveIntensity: 0.45 }),
    );
    marker.position.copy(pos);
    marker.position.y = 5.2;
    marker.castShadow = false;
    this.group.add(marker);

    const ring = new THREE.Mesh(
      new THREE.RingGeometry(2.1, 2.55, 28),
      new THREE.MeshBasicMaterial({
        color: COLORS[kind],
        transparent: true,
        opacity: 0.3,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(pos.x, 0.08, pos.z);
    this.group.add(ring);

    const enemies = this.makeCrew(kind, pos);
    for (const en of enemies) this.group.add(en.mesh);

    this.events.push({
      id: this.nextId++,
      kind,
      title: TITLES[kind],
      position: pos,
      enemies,
      marker,
      ring,
      cleared: false,
      rewardCash: 80 + Math.floor(this.rng() * 70) + (kind === CrimeKind.Heist ? 80 : 0),
      rewardRep: 12 + (kind === CrimeKind.GangFight || kind === CrimeKind.Heist ? 8 : 0),
      engaged: false,
      intervened: false,
    });
  }

  private makeCrew(kind: CrimeKindT, pos: THREE.Vector3): Enemy[] {
    const crew: Enemy[] = [];
    const place = (kindE: Enemy["kind"], ox: number, oz: number) => {
      crew.push(this.enemy(kindE, pos.x + ox, pos.z + oz));
    };
    if (kind === CrimeKind.Mugging) {
      place("thug", 1.2, 0.4);
      place("civilian", -1.4, 0.2);
    } else if (kind === CrimeKind.Carjacking) {
      place("thug", 1.5, 0);
      place("thug", -1.2, 1.1);
      const car = new THREE.Mesh(
        new THREE.BoxGeometry(1.8, 0.85, 3.6),
        new THREE.MeshLambertMaterial({ color: 0xd8dce2 }),
      );
      car.position.set(pos.x + 0.2, 0.5, pos.z - 2.4);
      car.castShadow = true;
      this.group.add(car);
    } else if (kind === CrimeKind.GangFight) {
      place("thug", 2, 1);
      place("thug", -2, 1.2);
      place("thug", 1.4, -1.6);
      place("thug", -1.1, -1.4);
    } else if (kind === CrimeKind.Heist) {
      place("armored", 1.6, 0.8);
      place("armored", -1.5, 0.6);
      place("armored", 0.2, -1.8);
      const van = new THREE.Mesh(
        new THREE.BoxGeometry(2.2, 1.6, 4.4),
        new THREE.MeshLambertMaterial({ color: 0x2a2a30 }),
      );
      van.position.set(pos.x + 3.2, 0.8, pos.z);
      van.castShadow = true;
      this.group.add(van);
    } else if (kind === CrimeKind.StreetChase) {
      place("runner", 0.5, 0.5);
      place("thug", -2.2, 1.4);
    } else {
      place("shooter", 1.4, 0.8);
      place("shooter", -1.5, 0.4);
      place("civilian", -0.2, -1.6);
    }
    const hostiles = crew.filter((e) => e.kind !== "civilian");
    const roles = this.director?.roles(hostiles.length) ?? [];
    hostiles.forEach((e, i) => {
      e.role = roles[i] ?? (e.kind === "shooter" ? "support" : "rusher");
    });
    return crew;
  }

  private enemy(kind: Enemy["kind"], x: number, z: number): Enemy {
    const palette: Record<Enemy["kind"], [number, number]> = {
      thug: [0xb83a3a, 0x2a1a1a],
      armored: [0x2c2c34, 0xc9a227],
      runner: [0x2b4c7a, 0x1a2838],
      shooter: [0x4a2a4a, 0x1a1218],
      civilian: [0xffe2b0, 0x8a5a38],
    };
    const [shirt, pants] = palette[kind];
    const g = new THREE.Group();
    const skin = new THREE.MeshLambertMaterial({ color: 0xd4a07a });
    const cloth = new THREE.MeshLambertMaterial({ color: shirt });
    const trouser = new THREE.MeshLambertMaterial({ color: pants });
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.18, 14, 12), skin);
    head.position.y = 1.62;
    head.castShadow = true;
    g.add(head);
    const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.2, 0.48, 6, 10), cloth);
    torso.position.y = 1.18;
    torso.castShadow = true;
    g.add(torso);
    for (const side of [-1, 1]) {
      const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.07, 0.38, 5, 8), kind === "civilian" ? skin : cloth);
      arm.position.set(side * 0.28, 1.18, 0);
      arm.rotation.z = side * 0.12;
      g.add(arm);
      const leg = new THREE.Mesh(new THREE.CapsuleGeometry(0.08, 0.42, 5, 8), trouser);
      leg.position.set(side * 0.1, 0.48, 0);
      g.add(leg);
    }
    if (kind === "armored") {
      const plate = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.28, 0.16), new THREE.MeshLambertMaterial({ color: 0xc9a227 }));
      plate.position.set(0, 1.28, 0.2);
      g.add(plate);
    }
    if (kind === "shooter") {
      const gun = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.42), new THREE.MeshLambertMaterial({ color: 0x222226 }));
      gun.position.set(0.28, 1.2, 0.22);
      g.add(gun);
    }
    g.position.set(x, 0, z);
    g.scale.setScalar(kind === "civilian" ? 1.45 : 1.35); // cesStreetScale — readable little guys

    // Floating label
    const label = makeNameSprite(kind);
    label.position.y = 2.35;
    g.add(label);

    const hpBar = new THREE.Group();
    hpBar.position.y = 2.05;
    const bg = new THREE.Mesh(
      new THREE.PlaneGeometry(0.7, 0.08),
      new THREE.MeshBasicMaterial({ color: 0x1a100c, depthTest: false }),
    );
    const hpFill = new THREE.Mesh(
      new THREE.PlaneGeometry(0.66, 0.05),
      new THREE.MeshBasicMaterial({ color: 0x6adf55, depthTest: false }),
    );
    hpFill.position.z = 0.01;
    hpBar.add(bg, hpFill);
    hpBar.visible = false;
    g.add(hpBar);
    const glow = new THREE.Mesh(
      new THREE.RingGeometry(0.35, 0.55, 16),
      new THREE.MeshBasicMaterial({ color: 0xff5533, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false }),
    );
    glow.rotation.x = -Math.PI / 2;
    glow.position.y = 0.06;
    g.add(glow);

    const stats = {
      thug: { hp: 86, speed: 5.1, damage: 9 },
      armored: { hp: 150, speed: 3.6, damage: 13 },
      runner: { hp: 62, speed: 8.2, damage: 7 },
      shooter: { hp: 70, speed: 3.8, damage: 11 },
      civilian: { hp: 24, speed: 4.4, damage: 0 },
    }[kind];
    return {
      mesh: g,
      hp: stats.hp,
      maxHp: stats.hp,
      kind,
      speed: stats.speed,
      damage: stats.damage,
      windup: 0,
      attackCd: 0,
      alive: true,
      vel: new THREE.Vector3(),
      stun: 0,
      hpFill,
      hpBar,
      state: "idle",
      role: kind === "shooter" ? "support" : "rusher",
      hesitate: 0,
      backoff: 0,
      glow,
    };
  }

  private refreshHp(en: Enemy): void {
    const t = Math.max(0, en.hp / en.maxHp);
    en.hpFill.scale.x = Math.max(0.05, t);
    en.hpFill.position.x = (t - 1) * 0.33;
    (en.hpFill.material as THREE.MeshBasicMaterial).color.setHex(t < 0.35 ? 0xe74c3c : 0x6adf55);
  }

  private updateEnemy(
    dt: number,
    en: Enemy,
    player: Hulk,
    chest: THREE.Vector3,
    ev: CrimeEvent,
    packSize: number,
    audio: AudioBus,
  ): number {
    let hit = 0;
    const pos = en.mesh.position;
    const civ = ev.enemies.find((e) => e.kind === "civilian" && e.alive);
    const aim = !ev.intervened && civ ? civ.mesh.position : (this.lure ?? player.position);
    const toPlayer = this.scratch.set(aim.x - pos.x, 0, aim.z - pos.z);
    const dist = toPlayer.length();
    const keep = player.radius + 1.35;
    const lod = this.director?.lod(pos.distanceTo(player.position)) ?? "full";
    if (lod === "none") return 0;

    en.hpBar.visible = ev.engaged && en.kind !== "civilian" && en.hp < en.maxHp;
    if (en.hpBar.visible) {
      en.hpBar.lookAt(chest);
      this.refreshHp(en);
    }

    en.stun = Math.max(0, en.stun - dt);
    if (en.stun > 0 || pos.y > 0.15) {
      en.vel.y -= 32 * dt;
      pos.addScaledVector(en.vel, dt);
      if (pos.y <= 0) {
        pos.y = 0;
        en.vel.x *= 0.4;
        en.vel.z *= 0.4;
        en.vel.y = 0;
      }
      const r = this.world.resolveCircle(pos.x, pos.z, 0.4);
      pos.x = r.x;
      pos.z = r.z;
      (en.glow.material as THREE.MeshBasicMaterial).opacity = 0;
      return 0;
    }

    if (en.kind === "civilian") {
      const locked = player.band === "locked" || player.band === "overcharged" || player.band === "meltdown";
      const flee = dist < (locked ? 28 : 18);
      if (flee) toPlayer.normalize().multiplyScalar(-1);
      else toPlayer.set(0, 0, 0);
      pos.x += toPlayer.x * en.speed * 1.15 * dt;
      pos.z += toPlayer.z * en.speed * 1.15 * dt;
      const r = this.world.resolveCircle(pos.x, pos.z, 0.4);
      pos.x = r.x;
      pos.z = r.z;
      if (dist > 0.2) en.mesh.lookAt(pos.x - toPlayer.x, 0, pos.z - toPlayer.z);
      return 0;
    }

    if (!ev.intervened) {
      if (dist > 0.01) toPlayer.multiplyScalar(1 / dist);
      else toPlayer.set(0, 0, 0);
      pos.x += toPlayer.x * en.speed * 0.55 * dt;
      pos.z += toPlayer.z * en.speed * 0.55 * dt;
      const r = this.world.resolveCircle(pos.x, pos.z, 0.45);
      pos.x = r.x;
      pos.z = r.z;
      if (civ) en.mesh.lookAt(civ.mesh.position.x, 0, civ.mesh.position.z);
      return 0;
    }

    if (lod === "cheap") {
      if (dist > keep + 1) {
        pos.x += (toPlayer.x / Math.max(0.01, dist)) * en.speed * 0.45 * dt;
        pos.z += (toPlayer.z / Math.max(0.01, dist)) * en.speed * 0.45 * dt;
      }
      return 0;
    }

    const dir = this.director;
    if (dir && en.state === "idle" && dir.notice(dist, player, ev.engaged)) {
      en.state = "alert";
      en.hesitate = dir.hesitate(player);
      ev.engaged = true;
    }

    if (dir) {
      const packIndex = ev.enemies.filter((e) => e.alive && e.kind !== "civilian").indexOf(en);
      const stepped = dir.steer(dt, player, {
        pos,
        state: en.state,
        role: en.kind === "shooter" ? "support" : en.kind === "runner" && en.hp / en.maxHp < 0.4 ? "flanker" : en.role,
        hesitate: en.hesitate,
        backoff: en.backoff,
        hpRatio: en.hp / en.maxHp,
        packIndex: Math.max(0, packIndex),
        packSize,
        dist,
        toX: player.position.x - pos.x,
        toZ: player.position.z - pos.z,
      });
      en.state = stepped.state;
      en.hesitate = stepped.hesitate;
      en.backoff = stepped.backoff;
      pos.x += stepped.vx * (en.speed / 5.2) * dt;
      pos.z += stepped.vz * (en.speed / 5.2) * dt;
    }

    if (en.hp / en.maxHp < APPROACH.fleeHp && Math.random() < dt * 0.8) {
      en.state = "retreat";
    }

    const r = this.world.resolveCircle(pos.x, pos.z, 0.45);
    pos.x = r.x;
    pos.z = r.z;
    if (dist > 0.15) en.mesh.lookAt(player.position.x, 0, player.position.z);

    if (en.state === "alert" || en.state === "stalk" || en.hesitate > 0) {
      (en.glow.material as THREE.MeshBasicMaterial).opacity = 0;
      return 0;
    }

    en.attackCd = Math.max(0, en.attackCd - dt);
    const reach = keep + 1.1;
    const glowMat = en.glow.material as THREE.MeshBasicMaterial;
    if (en.kind === "shooter" && dist < 24 && dist > keep && en.attackCd <= 0) {
      en.attackCd = 1.8;
      en.windup = APPROACH.windupRanged;
      audio.whoosh();
    } else if (en.kind !== "shooter" && dist < reach && en.attackCd <= 0) {
      en.attackCd = en.kind === "armored" ? 1.55 : 1.2;
      en.windup = APPROACH.windupMelee;
      audio.whoosh();
    }
    if (en.windup > 0) {
      en.windup -= dt;
      glowMat.opacity = 0.25 + (1 - en.windup / APPROACH.windupMelee) * 0.55;
      en.mesh.rotation.x = -0.18;
      if (en.windup <= 0) {
        en.mesh.rotation.x = 0;
        glowMat.opacity = 0;
        if (en.kind === "shooter") this.spawnShot(pos, chest, en.damage);
        else if (pos.distanceTo(player.position) < reach + 0.5 && player.invuln <= 0) hit += en.damage;
      }
    } else {
      glowMat.opacity = Math.max(0, glowMat.opacity - dt * 3);
      en.mesh.rotation.x = 0;
    }
    return hit;
  }

  private spawnShot(from: THREE.Vector3, to: THREE.Vector3, damage: number): void {
    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.12, 10, 10),
      new THREE.MeshLambertMaterial({ color: 0xff6a3a, emissive: 0xff3311, emissiveIntensity: 0.8 }),
    );
    mesh.position.set(from.x, 1.35, from.z);
    const vel = to.clone().sub(mesh.position);
    vel.normalize().multiplyScalar(18);
    this.group.add(mesh);
    this.projectiles.push({ mesh, vel, life: 2.4, damage });
  }
}
