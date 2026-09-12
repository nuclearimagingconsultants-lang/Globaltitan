import * as THREE from "three";
import type { AudioBus } from "../audio/AudioBus";
import type { CityDef, HazardId } from "../data/types";
import type { Hulk } from "../player/Hulk";
import { ZombiePack } from "./ZombiePack";

type Attack = "idle" | "charge" | "slam" | "ring" | "clone";

const HAZARD_TINT: Record<HazardId, number> = {
  flood: 0x1a3a48,
  fog: 0x6a7068,
  heat: 0x4a2010,
  dark: 0x0c1016,
  ice: 0x1a2a38,
  gas: 0x2a3a18,
  bats: 0x1a1420,
  mirror: 0x202428,
  salt: 0x3a3830,
  spark: 0x241810,
  tar: 0x141210,
  wind: 0x304048,
  root: 0x1a2414,
  thin: 0x2a2838,
  bell: 0x2a2418,
};

export class DungeonRun {
  readonly group = new THREE.Group();
  active = false;
  cleared = false;
  hp = 0;
  maxHp = 520;
  name = "";
  title = "";
  hazard: HazardId = "dark";
  readonly door = new THREE.Vector3(0, 0, 10);
  readonly zombies = new ZombiePack();
  readonly sideRooms = [new THREE.Vector3(-10, 0, 18), new THREE.Vector3(10, 0, 18), new THREE.Vector3(-8, 0, 6), new THREE.Vector3(8, 0, 6)];
  private city: CityDef | null = null;
  private arena = new THREE.Group();
  private mesh = new THREE.Group();
  private clone: THREE.Group | null = null;
  readonly bossPos = new THREE.Vector3(0, 0, -8);
  private pos = this.bossPos;
  private clonePos = new THREE.Vector3(6, 0, -4);
  private vel = new THREE.Vector3();
  private attack: Attack = "idle";
  private timer = 1.6;
  private wind = 0;
  private tick = 0;
  private telegraph: THREE.Mesh;
  private ring: THREE.Mesh;
  private fogHold: { color: number; near: number; far: number } | null = null;
  private rosterMove = "brawl";

  constructor() {
    this.telegraph = new THREE.Mesh(
      new THREE.CircleGeometry(1, 24),
      new THREE.MeshBasicMaterial({ color: 0xff3333, transparent: true, opacity: 0, side: THREE.DoubleSide }),
    );
    this.telegraph.rotation.x = -Math.PI / 2;
    this.telegraph.position.y = 0.08;
    this.ring = new THREE.Mesh(
      new THREE.RingGeometry(0.6, 1.2, 28),
      new THREE.MeshBasicMaterial({ color: 0xff6644, transparent: true, opacity: 0, side: THREE.DoubleSide }),
    );
    this.ring.rotation.x = -Math.PI / 2;
    this.ring.position.y = 0.1;
    this.group.add(this.arena, this.mesh, this.telegraph, this.ring, this.zombies.group);
    this.group.visible = false;
  }

  get polished(): boolean {
    return Boolean(this.city && (this.city.act > 0 || this.city.order <= 3));
  }

  prepare(city: CityDef): void {
    this.city = city;
    this.name = city.boss.name;
    this.title = city.dungeonName;
    this.hazard = city.hazard;
    this.maxHp = city.act === 5 ? 980 : city.act ? 760 : city.order <= 3 ? 560 : 500;
    this.hp = this.maxHp;
    this.cleared = false;
    this.active = false;
    this.rosterMove = "brawl";
    this.rebuild(city);
  }

  applyRoster(name: string, hp: number, tint: number, move: string): void {
    this.name = name;
    this.maxHp = hp;
    this.hp = hp;
    this.rosterMove = move;
    this.telegraph.material = this.telegraph.material as THREE.MeshBasicMaterial;
    (this.telegraph.material as THREE.MeshBasicMaterial).color.setHex(tint);
    this.mesh.traverse((obj) => {
      if (obj instanceof THREE.Mesh && obj.material instanceof THREE.MeshLambertMaterial) {
        if (obj.material.color.getHex() !== 0xc9a227) obj.material.color.setHex(tint);
      }
    });
  }

  enter(scene: THREE.Scene, player: Hulk): void {
    if (!this.city) return;
    this.active = true;
    this.cleared = false;
    this.hp = this.maxHp;
    this.attack = "idle";
    this.timer = 1.8;
    this.tick = 0;
    this.pos.set(0, 0, -8);
    this.mesh.position.copy(this.pos);
    this.mesh.rotation.x = 0;
    this.mesh.visible = true;
    this.group.visible = true;
    player.position.set(0, 0, 30);
    player.velocity.set(0, 0, 0);
    this.zombies.spawnRooms(this.sideRooms, this.city?.act ? 6 : 5);
    if (scene.fog instanceof THREE.Fog) {
      this.fogHold = { color: scene.fog.color.getHex(), near: scene.fog.near, far: scene.fog.far };
      const tight = this.hazard === "fog" || this.hazard === "bell" || this.hazard === "dark";
      scene.fog.color.setHex(HAZARD_TINT[this.hazard]);
      scene.fog.near = tight ? 8 : 16;
      scene.fog.far = tight ? 42 : 70;
    }
    scene.background = new THREE.Color(HAZARD_TINT[this.hazard]);
  }

  leave(scene: THREE.Scene, player: Hulk, spawn: THREE.Vector3): void {
    this.active = false;
    this.group.visible = false;
    player.position.copy(spawn);
    player.velocity.set(0, 0, 0);
    if (scene.fog instanceof THREE.Fog && this.fogHold) {
      scene.fog.color.setHex(this.fogHold.color);
      scene.fog.near = this.fogHold.near;
      scene.fog.far = this.fogHold.far;
    }
    this.fogHold = null;
  }

  applySmash(origin: THREE.Vector3, radius: number, damage: number, audio: AudioBus): boolean {
    if (!this.active || this.cleared) return false;
    let hit = this.zombies.applySmash(origin, radius, damage, audio) > 0;
    if (this.pos.distanceTo(origin) <= radius + 2.1) {
      this.hp = Math.max(0, this.hp - damage);
      this.mesh.scale.setScalar(1.08);
      hit = true;
    }
    if (this.clone && this.clonePos.distanceTo(origin) <= radius + 1.6) {
      this.hp = Math.max(0, this.hp - damage * 0.55);
      hit = true;
    }
    if (hit) {
      audio.hit();
      if (this.hp <= 0) {
        this.cleared = true;
        this.active = false;
        this.mesh.rotation.x = 1.15;
        audio.success();
      }
    }
    return hit;
  }

  update(dt: number, player: Hulk, audio: AudioBus): number {
    if (!this.active || this.cleared) return 0;
    this.tick += dt;
    this.timer -= dt;
    this.mesh.scale.lerp(new THREE.Vector3(1, 1, 1), 1 - Math.exp(-10 * dt));
    let dmg = this.hazardTick(dt, player);
    dmg += this.zombies.update(dt, player);
    const adds = this.zombies.remaining;
    if (this.attack === "idle" && this.timer <= 0) {
      if (adds > 4 && this.hp < this.maxHp * 0.7) this.timer = 1.4;
      else this.begin(player);
    }
    if (this.attack === "charge") {
      this.pos.addScaledVector(this.vel, dt);
      if (this.pos.distanceTo(player.position) < 2.4 + player.radius) {
        dmg += this.city?.act === 5 ? 28 : this.city?.act ? 22 : 16;
        this.attack = "idle";
        this.timer = 1.1;
        audio.thud();
      } else if (this.timer <= 0) {
        this.attack = "idle";
        this.timer = 0.8;
      }
    } else if (this.attack === "slam") {
      (this.telegraph.material as THREE.MeshBasicMaterial).opacity = 0.45;
      if (this.timer <= 0) {
        const r = this.city?.act ? 9 : 7;
        if (player.position.distanceTo(this.pos) < r + player.radius) dmg += this.city?.act === 5 ? 32 : 20;
        (this.telegraph.material as THREE.MeshBasicMaterial).opacity = 0;
        this.attack = "idle";
        this.timer = 1.2;
        audio.smash();
      }
    } else if (this.attack === "ring") {
      const t = 1 - this.timer / this.wind;
      this.ring.scale.setScalar(1 + t * 10);
      (this.ring.material as THREE.MeshBasicMaterial).opacity = 0.5 * (1 - t);
      if (this.timer <= 0) {
        const dist = Math.hypot(player.position.x - this.pos.x, player.position.z - this.pos.z);
        if (dist > 3 && dist < 14) dmg += 18;
        (this.ring.material as THREE.MeshBasicMaterial).opacity = 0;
        this.attack = "idle";
        this.timer = 1.3;
      }
    } else if (this.attack === "clone" && this.clone) {
      this.clonePos.x += Math.sin(this.tick * 2.2) * 6 * dt;
      this.clone.position.copy(this.clonePos);
      if (this.clonePos.distanceTo(player.position) < 2.2 + player.radius) dmg += 14;
      if (this.timer <= 0) {
        this.attack = "idle";
        this.timer = 0.9;
      }
    }
    this.pos.x = THREE.MathUtils.clamp(this.pos.x, -16, 16);
    this.pos.z = THREE.MathUtils.clamp(this.pos.z, -28, 8);
    this.mesh.position.copy(this.pos);
    if (this.rosterMove === "hop" && this.attack === "slam") this.mesh.position.y = Math.max(0, this.wind * 6);
    this.mesh.lookAt(player.position.x, 1, player.position.z);
    this.telegraph.position.set(this.pos.x, 0.08, this.pos.z);
    this.ring.position.set(this.pos.x, 0.1, this.pos.z);
    return dmg;
  }

  dispose(): void {
    this.group.removeFromParent();
  }

  hurt(amount: number, audio?: AudioBus): void {
    if (!this.active || this.cleared || amount <= 0) return;
    this.hp = Math.max(0, this.hp - amount);
    if (this.hp <= 0) {
      this.cleared = true;
      this.active = false;
      this.mesh.rotation.x = 1.15;
      audio?.success();
    }
  }

  private phase: "bait" | "punish" | "special" = "bait";
  private addGate = 0.66;

  private begin(player: Hulk): void {
    const act = this.city?.act ?? 0;
    if (player.smashActive > 0 && this.pos.distanceTo(player.smashOrigin()) > 6) {
      this.phase = "punish";
    } else if (this.phase === "punish") {
      this.phase = "special";
    } else if (this.hp / this.maxHp < this.addGate) {
      this.addGate -= 0.33;
      this.phase = "bait";
      this.timer = 2.2;
      this.zombies.spillFromDoor(new THREE.Vector3((Math.random() - 0.5) * 10, 0, 8), 2);
      return;
    } else {
      this.phase = "bait";
    }
    const roll = this.phase === "punish" ? 0.1 : this.phase === "special" ? 0.9 : Math.random();
    if (this.rosterMove === "hop" && roll < 0.62) {
      this.attack = "slam";
      this.timer = 0.55;
      this.wind = 0.42;
      this.mesh.position.y = 3.2;
      return;
    }
    if (this.rosterMove === "stilt" && roll < 0.5) {
      this.attack = "charge";
      this.vel.copy(player.position).sub(this.pos);
      this.vel.y = 0;
      this.vel.setLength(11);
      this.timer = 1.9;
      return;
    }
    if (act >= 3 && this.clone && roll < 0.28) {
      this.attack = "clone";
      this.timer = 2.2;
      return;
    }
    if (act >= 1 && roll < 0.34) {
      this.attack = "ring";
      this.wind = 1.15;
      this.timer = 1.15;
      this.ring.scale.setScalar(1);
      return;
    }
    if (roll < 0.5) {
      this.attack = "charge";
      this.vel.copy(player.position).sub(this.pos);
      this.vel.y = 0;
      this.vel.setLength(act === 5 ? 22 : 16);
      this.timer = 1.6;
    } else {
      this.attack = "slam";
      this.timer = 0.7;
      this.wind = 0.7;
    }
  }

  private hazardTick(dt: number, player: Hulk): number {
    const h = this.hazard;
    let dmg = 0;
    if (h === "flood" || h === "tar" || h === "root") {
      player.velocity.x *= 1 - 1.6 * dt;
      player.velocity.z *= 1 - 1.6 * dt;
    }
    if (h === "ice" || h === "thin") {
      if (player.velocity.y > 0) player.velocity.y *= 1 - 0.9 * dt;
    }
    if (h === "heat" || h === "gas" || h === "salt") {
      if (Math.floor(this.tick * 2) !== Math.floor((this.tick - dt) * 2)) dmg += h === "salt" ? 4 : 3;
    }
    if (h === "bats" && Math.floor(this.tick) !== Math.floor(this.tick - dt)) dmg += 5;
    if ((h === "bell" || h === "fog") && Math.floor(this.tick / 3) !== Math.floor((this.tick - dt) / 3)) {
      player.velocity.multiplyScalar(0.15);
      dmg += 2;
    }
    if (h === "spark" && Math.floor(this.tick * 1.4) !== Math.floor((this.tick - dt) * 1.4)) {
      if (Math.abs(player.position.x) % 6 < 1.2) dmg += 6;
    }
    if (h === "wind") {
      player.velocity.x += Math.sin(this.tick * 1.3) * 18 * dt;
    }
    return dmg;
  }

  private rebuild(city: CityDef): void {
    while (this.arena.children.length) this.arena.remove(this.arena.children[0]!);
    while (this.mesh.children.length) this.mesh.remove(this.mesh.children[0]!);
    this.clone = null;
    const tint = HAZARD_TINT[city.hazard];
    const floor = new THREE.MeshLambertMaterial({ color: tint });
    const wall = new THREE.MeshLambertMaterial({ color: new THREE.Color(tint).offsetHSL(0, 0, 0.08).getHex() });
    const accent = new THREE.MeshLambertMaterial({ color: city.act ? 0xc9a227 : 0x6a5a4a });
    const pad = new THREE.Mesh(new THREE.BoxGeometry(46, 0.4, 72), floor);
    pad.position.set(0, -0.2, 4);
    this.arena.add(pad);
    for (const [x, z, sx, sz] of [
      [0, -32, 46, 2],
      [0, 36, 46, 2],
      [-22, 2, 2, 70],
      [22, 2, 2, 70],
    ] as const) {
      const w = new THREE.Mesh(new THREE.BoxGeometry(sx, 10, sz), wall);
      w.position.set(x, 5, z);
      this.arena.add(w);
    }
    for (const room of [
      [-10, 18],
      [10, 18],
      [-10, 6],
      [10, 6],
    ]) {
      const alcove = new THREE.Mesh(new THREE.BoxGeometry(8, 0.15, 8), accent);
      alcove.position.set(room[0], 0.08, room[1]);
      this.arena.add(alcove);
      const crate = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.1, 1.4), wall);
      crate.position.set(room[0] + 2.4, 0.55, room[1] - 2.2);
      this.arena.add(crate);
    }
    const hall = new THREE.Mesh(new THREE.BoxGeometry(8, 0.12, 16), accent);
    hall.position.set(0, 0.06, 22);
    this.arena.add(hall);
    const count = city.act ? 8 : city.order <= 3 ? 6 : 4;
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2;
      const p = new THREE.Mesh(new THREE.BoxGeometry(1.4, city.act ? 8 : 5.5, 1.4), accent);
      p.position.set(Math.sin(a) * 12, city.act ? 4 : 2.7, Math.cos(a) * 12);
      this.arena.add(p);
    }
    if (city.order === 1) {
      for (const z of [-6, 0, 6]) {
        const gate = new THREE.Mesh(new THREE.BoxGeometry(3.2, 3.4, 0.35), accent);
        gate.position.set(-8, 1.7, z);
        this.arena.add(gate);
      }
    }
    if (city.order === 2) {
      const bell = new THREE.Mesh(new THREE.SphereGeometry(1.1, 12, 10), accent);
      bell.position.set(8, 6.2, -10);
      this.arena.add(bell);
    }
    if (city.order === 3) {
      const vat = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.4, 3, 12), new THREE.MeshLambertMaterial({ color: 0x8a3010 }));
      vat.position.set(-9, 1.5, -8);
      this.arena.add(vat);
    }
    if (city.act === 3 || city.hazard === "mirror") {
      this.clone = this.sculptBoss(city, 0.72);
      this.clone.position.copy(this.clonePos);
      this.arena.add(this.clone);
    }
    this.mesh.add(this.sculptBoss(city, city.act === 5 ? 1.45 : city.act ? 1.2 : 1));
  }

  private sculptBoss(city: CityDef, scale: number): THREE.Group {
    const g = new THREE.Group();
    const bodyC = city.act === 5 ? 0xc8d8e8 : city.act ? 0x8a2030 : 0x4a3a48;
    const trim = new THREE.MeshLambertMaterial({ color: 0xc9a227 });
    const hide = new THREE.MeshLambertMaterial({ color: bodyC });
    const torso = new THREE.Mesh(new THREE.SphereGeometry(1.15 * scale, 14, 12), hide);
    torso.scale.set(1.15, 1.35, 0.9);
    torso.position.y = 2.1 * scale;
    g.add(torso);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.55 * scale, 12, 10), hide);
    head.position.y = 3.5 * scale;
    g.add(head);
    for (const x of [-1.2, 1.2]) {
      const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.28 * scale, 1.4 * scale, 6, 10), hide);
      arm.position.set(x * scale, 2.1 * scale, 0);
      g.add(arm);
    }
    const crest = new THREE.Mesh(new THREE.BoxGeometry(1.4 * scale, 0.2 * scale, 0.4 * scale), trim);
    crest.position.y = 3.95 * scale;
    g.add(crest);
    return g;
  }
}
