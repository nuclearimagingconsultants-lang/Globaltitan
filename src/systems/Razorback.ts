import * as THREE from "three";
import type { AudioBus } from "../audio/AudioBus";
import {
  defaultRivalry,
  RAZOR_FIXIT,
  RAZOR_LANDMARKS,
  RAZOR_TAUNTS,
  RAZOR_VARS as V,
  trickTier,
  type RivalrySave,
} from "../data/razorback";
import type { FightStyle } from "../data/styles";
import type { HulkKind, SaveData } from "../data/types";
import type { AttackKind } from "../input/Input";
import { Attack } from "../input/Input";
import type { Hulk } from "../player/Hulk";
import type { CityWorld } from "../world/CityWorld";
import { worldExtent } from "../world/CityWorld";

export type RazorPhase = "idle" | "stalk" | "engage" | "pounce" | "ride" | "retreat" | "ko" | "leave";

function shade(color: number): THREE.MeshLambertMaterial {
  return new THREE.MeshLambertMaterial({ color });
}

export class Razorback {
  readonly group = new THREE.Group();
  readonly pos = new THREE.Vector3();
  hp = 1;
  maxHp = 1;
  phase: RazorPhase = "idle";
  bleedT = 0;
  rideMash = 0;
  banner = "";
  taunt = "";
  private vel = new THREE.Vector3();
  private stun = 0;
  private pin = 0;
  private lastHit = 99;
  private phaseT = 0;
  private fightT = 0;
  private roamT = 0;
  private nextRoam = V.minRoamSec + Math.random() * (V.maxRoamSec - V.minRoamSec);
  private wreckHeat = 0;
  private hat: THREE.Object3D;
  private cigar: THREE.Mesh;
  private leftClaw: THREE.Group;
  private rightClaw: THREE.Group;
  private walk = 0;
  private rivalry: RivalrySave = defaultRivalry();
  private trickCd = 0;
  private manhole: THREE.Mesh;
  private bike: THREE.Group;
  private manholeT = 0;
  private bikeT = 0;

  constructor() {
    const jacket = shade(0x6a4a22);
    const trim = shade(0xc9a227);
    const skin = shade(0x8a6a48);
    const metal = shade(0x9aa2aa);
    const hair = shade(0x2a1c10);

    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.72, 0.4), jacket);
    torso.position.set(0, 0.92, 0.04);
    torso.rotation.x = 0.28;
    this.group.add(torso);
    const yoke = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.18, 0.44), trim);
    yoke.position.set(0, 1.22, 0.02);
    this.group.add(yoke);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.2, 10, 8), skin);
    head.position.set(0, 1.42, 0.16);
    this.group.add(head);
    const brow = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.06, 0.12), hair);
    brow.position.set(0, 1.5, 0.28);
    this.group.add(brow);
    for (const x of [-0.16, 0.16]) {
      const burn = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.22, 0.04), hair);
      burn.position.set(x, 1.36, 0.12);
      this.group.add(burn);
    }
    this.hat = new THREE.Group();
    const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.03, 12), shade(0x3a2a14));
    const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 0.1, 10), shade(0x3a2a14));
    crown.position.y = 0.06;
    this.hat.add(brim, crown);
    this.hat.position.set(0, 1.58, 0.12);
    this.group.add(this.hat);
    this.cigar = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.16, 6), shade(0x4a2a14));
    this.cigar.rotation.z = 1.2;
    this.cigar.position.set(0.12, 1.34, 0.3);
    this.group.add(this.cigar);
    const ember = new THREE.Mesh(new THREE.SphereGeometry(0.025, 6, 6), new THREE.MeshBasicMaterial({ color: 0xff6622 }));
    ember.position.set(0.18, 1.32, 0.36);
    this.group.add(ember);
    for (const x of [-0.28, 0.28]) {
      const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.08, 0.34, 4, 6), jacket);
      arm.position.set(x, 1.05, 0.02);
      this.group.add(arm);
    }
    for (const x of [-0.12, 0.12]) {
      const leg = new THREE.Mesh(new THREE.CapsuleGeometry(0.09, 0.38, 4, 6), shade(0x2a2418));
      leg.position.set(x, 0.32, 0);
      this.group.add(leg);
    }
    this.leftClaw = this.makeClaws(metal, -1);
    this.rightClaw = this.makeClaws(metal, 1);
    this.group.add(this.leftClaw, this.rightClaw);
    this.manhole = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.08, 14), shade(0x3a3a40));
    this.manhole.visible = false;
    this.group.add(this.manhole);
    this.bike = new THREE.Group();
    const tank = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.22, 1.35), shade(0x1a1a1c));
    const wheelA = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.05, 6, 10), shade(0x111111));
    const wheelB = wheelA.clone();
    wheelA.position.set(0, -0.18, 0.48);
    wheelB.position.set(0, -0.18, -0.48);
    wheelA.rotation.y = Math.PI / 2;
    wheelB.rotation.y = Math.PI / 2;
    this.bike.add(tank, wheelA, wheelB);
    this.bike.visible = false;
    this.group.add(this.bike);
    this.group.visible = false;
    this.group.scale.setScalar(1.05);
    this.roamT = 0;
  }

  bindSave(save: SaveData): void {
    this.rivalry = save.rivalry ?? defaultRivalry();
    save.rivalry = this.rivalry;
    if (this.rivalry.landmarkDay !== save.life.day) {
      this.rivalry.landmarkDay = save.life.day;
      this.rivalry.landmarks = [];
    }
  }

  get active(): boolean {
    return this.phase !== "idle" && this.phase !== "leave";
  }

  get fighting(): boolean {
    return this.phase === "engage" || this.phase === "pounce" || this.phase === "ride" || this.phase === "retreat";
  }

  get riding(): boolean {
    return this.phase === "ride";
  }

  get stalking(): boolean {
    return this.phase === "stalk";
  }

  reset(audio?: AudioBus): void {
    if (this.phase !== "idle") audio?.rivalStop();
    this.hide();
  }

  noteWreck(): void {
    this.wreckHeat = Math.min(1, this.wreckHeat + V.wreckChanceBonus);
  }

  forceSpawn(player: Hulk, camYaw: number, audio: AudioBus, save: SaveData): string {
    this.bindSave(save);
    this.begin(player, camYaw, audio, save, true);
    return this.banner;
  }

  considerSpawn(dt: number, player: Hulk, camYaw: number, audio: AudioBus, save: SaveData, blocked: boolean): string | null {
    this.bindSave(save);
    this.wreckHeat = Math.max(0, this.wreckHeat - dt / V.wreckWindowSec);
    if (this.phase !== "idle") return null;
    if (blocked) return null;
    const now = Date.now() / 1000;
    if (now - this.rivalry.lastFightAt < V.cooldownSec) return null;

    for (const mark of RAZOR_LANDMARKS) {
      if (this.rivalry.landmarks.includes(mark.id)) continue;
      if (Math.hypot(player.position.x - mark.x, player.position.z - mark.z) < 7.5) {
        this.rivalry.landmarks.push(mark.id);
        this.begin(player, camYaw, audio, save, false);
        this.banner = `RAZORBACK has found you — ${mark.label}.`;
        return this.banner;
      }
    }

    this.roamT += dt;
    if (this.roamT < this.nextRoam) return null;
    this.roamT = 0;
    this.nextRoam = V.minRoamSec + Math.random() * (V.maxRoamSec - V.minRoamSec);
    const chance = Math.min(0.95, V.spawnChance + this.wreckHeat);
    if (Math.random() > chance) return null;
    this.begin(player, camYaw, audio, save, false);
    return this.banner;
  }

  applySmash(
    origin: THREE.Vector3,
    radius: number,
    damage: number,
    style: FightStyle,
    kind: AttackKind,
    grab: boolean,
    clap: boolean,
    kindForm: HulkKind,
    heat: number,
    audio: AudioBus,
  ): boolean {
    if (!this.active || this.phase === "ko" || this.phase === "leave") return false;
    const dist = this.pos.distanceTo(origin);
    if (!grab && dist > radius + 1.1) return false;
    if (grab && dist > 4.2) return false;

    if (this.phase === "ride" && (grab || clap || style === "judo" || style === "jiujitsu")) {
      this.throwOff();
      audio.snikt();
    }

    let dodge = 0;
    if (style === "boxing") dodge += V.boxingDodge;
    if ((kind === Attack.Super || kind === Attack.Ground) && style !== "judo" && style !== "jiujitsu" && !clap) {
      dodge += V.heavyDodge;
    }
    if (this.phase === "retreat") dodge += 0.15;
    if (kindForm === "immortal") dodge += 0.08;
    if (!grab && !clap && this.stun <= 0 && this.pin <= 0 && Math.random() < dodge) {
      this.sidestep();
      audio.whoosh();
      this.taunt = "Whiffed it, big man.";
      return false;
    }

    let dmg = damage;
    if (style === "judo") dmg *= V.judoMul;
    if (grab) dmg *= 1.55;
    if (clap) {
      this.stun = 1.15;
      dmg *= 1.2;
    }
    if (style === "jiujitsu") {
      this.pin = 1.8;
      this.stun = Math.max(this.stun, 1.2);
    }
    this.hp = Math.max(0, this.hp - dmg);
    this.lastHit = 0;
    this.extendClaws(true);
    audio.snikt();
    if (heat > 40 && kindForm === "red") this.lastHit = 0;
    if (this.hp <= 0) {
      this.phase = "ko";
      this.phaseT = 0;
      this.taunt = RAZOR_TAUNTS[this.rivalry.encounters % RAZOR_TAUNTS.length]!;
      return true;
    }
    if (this.phase === "stalk") this.phase = "engage";
    return true;
  }

  mashRide(): boolean {
    if (this.phase !== "ride") return false;
    this.rideMash += 1;
    if (this.rideMash >= V.rideMash) {
      this.throwOff();
      return true;
    }
    return false;
  }

  update(dt: number, player: Hulk, world: CityWorld, audio: AudioBus, save: SaveData): { dmg: number; line: string | null; ended: "win" | "loss" | null } {
    if (this.phase === "idle") return { dmg: 0, line: null, ended: null };
    this.phaseT += dt;
    this.fightT += dt;
    this.stun = Math.max(0, this.stun - dt);
    this.pin = Math.max(0, this.pin - dt);
    this.lastHit += dt;
    this.walk += dt * 8;
    this.trickCd = Math.max(0, this.trickCd - dt);
    this.bleedT = Math.max(0, this.bleedT - dt);
    this.cigar.rotation.z = 1.2 + Math.sin(this.walk * 0.4) * 0.05;

    const berserk = this.hp / this.maxHp < V.berserkHp;
    const heatCut = player.hulkKind === "red" && player.heat > 8 ? 0.5 : 1;
    const canHeal = this.lastHit >= V.healWindowSec && this.pin <= 0 && this.phase !== "ko";
    if (canHeal && this.hp > 0) {
      this.hp = Math.min(this.maxHp, this.hp + this.maxHp * V.regenPerSec * heatCut * dt);
    }

    if (this.phase === "ko") {
      this.hat.rotation.z = Math.min(0.8, this.phaseT * 0.2);
      this.group.rotation.x = Math.min(0.9, this.phaseT * 0.08);
      if (this.phaseT >= V.koPoseSec) return this.finish("win", player, save, audio);
      this.place();
      return { dmg: 0, line: this.taunt, ended: null };
    }

    if (this.fightT >= V.fightCapSec && this.fighting) {
      this.taunt = "Clock's up. Same time next week, big man.";
      return this.finish("leave", player, save, audio);
    }

    if (player.health <= player.maxHealth * 0.1 && this.fighting) {
      return this.finish("loss", player, save, audio);
    }

    let dmg = 0;
    const to = player.position.clone().sub(this.pos);
    to.y = 0;
    const dist = to.length();
    const dir = dist > 0.01 ? to.normalize() : new THREE.Vector3(0, 0, 1);
    const speed = (berserk ? 9.2 * V.berserkSpeed : 7.4) * (player.hulkKind === "immortal" ? 0.86 : 1);
    this.extendClaws(this.fighting || this.phase === "stalk");

    if (this.phase === "stalk") {
      const orbit = new THREE.Vector3(-dir.z, 0, dir.x);
      this.vel.copy(orbit).multiplyScalar(4.5).addScaledVector(dir, dist > 26 ? 3 : dist < 16 ? -2 : 0);
      if (this.phaseT >= V.stalkSec || dist < 10) {
        this.phase = "pounce";
        this.phaseT = 0;
        this.banner = "";
        audio.snikt();
        this.taunt = player.hulkKind === "fixit" ? RAZOR_FIXIT[1]! : "Smell you, big man.";
      }
    } else if (this.phase === "pounce") {
      this.vel.copy(dir).multiplyScalar(22);
      if (dist < player.radius + 1.1 || this.phaseT > 0.7) {
        this.phase = Math.random() < 0.45 ? "ride" : "engage";
        this.phaseT = 0;
        this.rideMash = 0;
        if (this.phase === "ride") {
          this.banner = "On your back — mash Enter";
          dmg += 8;
          this.bleedT = V.bleedSec;
          audio.snikt();
        }
      }
    } else if (this.phase === "ride") {
      this.pos.copy(player.position);
      this.pos.y += player.isHulk ? 5.2 : 1.4;
      this.pos.addScaledVector(player.facing, -0.6);
      if (Math.floor(this.phaseT * 3) !== Math.floor((this.phaseT - dt) * 3)) {
        dmg += berserk ? 7 : 4.5;
        this.bleedT = V.bleedSec;
        audio.snikt();
      }
      if (this.phaseT > 5.5) this.throwOff();
      this.place();
      return { dmg, line: "Mash Enter — throw him off", ended: null };
    } else if (this.phase === "engage") {
      if (this.stun > 0 || this.pin > 0) {
        this.vel.multiplyScalar(0.2);
      } else {
        const want = berserk ? 2.1 : 3.4;
        this.vel.copy(dir).multiplyScalar(dist > want ? speed : -speed * 0.7);
        const strafe = new THREE.Vector3(-dir.z, 0, dir.x).multiplyScalar(Math.sin(this.walk) * 5);
        this.vel.add(strafe);
        if (dist < player.radius + 1.6 && this.phaseT > 0.35) {
          dmg += berserk ? 9 : 6;
          this.bleedT = V.bleedSec;
          this.phaseT = 0;
          audio.snikt();
          if (trickTier(this.rivalry.encounters) >= 2 && Math.random() < 0.22) {
            this.pin = 0;
            player.velocity.multiplyScalar(0.15);
            this.taunt = "Pinned. One second.";
            this.stun = 0;
            this.phaseT = -0.6;
          }
          this.tryAdvanceTrick(dist, dir);
          if (Math.random() < 0.22) {
            this.phase = "pounce";
            this.phaseT = 0;
          }
        }
        if (this.hp < this.maxHp * 0.45 && this.lastHit > 0.8 && Math.random() < 0.01 + dt) {
          this.phase = "retreat";
          this.phaseT = 0;
        }
        if (trickTier(this.rivalry.encounters) >= 1 && player.climbing) {
          this.vel.y = 8;
        }
      }
    } else if (this.phase === "retreat") {
      this.vel.copy(dir).multiplyScalar(-speed * 1.15);
      if (dist > 18 || this.phaseT > 3.2) {
        this.phase = "engage";
        this.phaseT = 0;
      }
    } else if (this.phase === "leave") {
      this.vel.copy(dir).multiplyScalar(-10);
      if (this.phaseT > 2.2) {
        this.hide();
        return { dmg: 0, line: null, ended: null };
      }
    }

    if (this.phase !== "ride") {
      this.pos.addScaledVector(this.vel, dt);
      const limit = worldExtent() - 4;
      this.pos.x = THREE.MathUtils.clamp(this.pos.x, -limit, limit);
      this.pos.z = THREE.MathUtils.clamp(this.pos.z, -limit, limit);
      const floor = world.floorAt(this.pos.x, this.pos.z, 0.4, this.pos.y);
      this.pos.y = THREE.MathUtils.damp(this.pos.y, floor, 8, dt);
      if (this.vel.lengthSq() > 0.2) this.group.rotation.y = Math.atan2(this.vel.x, this.vel.z);
    }
    dmg += this.tickTricks(dt, player.position, dir, dist);
    this.place();
    return { dmg, line: this.taunt || this.banner, ended: null };
  }

  dispose(): void {
    this.group.removeFromParent();
  }

  private begin(player: Hulk, camYaw: number, audio: AudioBus, save: SaveData, test: boolean): void {
    const lvl = save.level + 2;
    const tough = 1 + this.rivalry.tougher;
    this.maxHp = Math.round((220 + lvl * 28) * tough);
    this.hp = this.maxHp;
    this.phase = "stalk";
    this.phaseT = test ? V.stalkSec - 4 : 0;
    this.fightT = 0;
    this.stun = 0;
    this.pin = 0;
    this.bleedT = 0;
    this.rideMash = 0;
    this.trickCd = 0;
    this.manholeT = 0;
    this.bikeT = 0;
    this.manhole.visible = false;
    this.bike.visible = false;
    this.hat.rotation.z = 0;
    this.group.rotation.x = 0;
    const behind = camYaw + Math.PI;
    const dist = V.spawnMinM + Math.random() * (V.spawnMaxM - V.spawnMinM);
    this.pos.set(player.position.x + Math.sin(behind) * dist, 0, player.position.z + Math.cos(behind) * dist);
    this.group.visible = true;
    this.banner = "RAZORBACK has found you.";
    this.taunt = player.hulkKind === "fixit" ? RAZOR_FIXIT[0]! : "Caught your scent.";
    this.rivalry.encounters += 1;
    audio.rivalStart();
    audio.snikt();
    this.place();
  }

  private finish(kind: "win" | "loss" | "leave", player: Hulk, save: SaveData, audio: AudioBus): { dmg: number; line: string | null; ended: "win" | "loss" | null } {
    this.phase = "leave";
    this.phaseT = 0;
    this.rivalry.lastFightAt = Date.now() / 1000;
    save.rivalry = this.rivalry;
    audio.rivalStop();
    if (kind === "win") {
      this.rivalry.wins += 1;
      this.rivalry.clawMarks += 1;
      player.rage = player.maxRage;
      player.noteContact();
      audio.success();
      this.taunt = RAZOR_TAUNTS[this.rivalry.wins % RAZOR_TAUNTS.length]!;
      return { dmg: 0, line: `${this.taunt}  Claw Mark ${this.rivalry.clawMarks}.`, ended: "win" };
    }
    if (kind === "loss") {
      this.rivalry.losses += 1;
      this.rivalry.tougher += 0.05;
      player.health = player.maxHealth * 0.1;
      audio.hurt();
      this.taunt = "Get up. I like you better standing.";
      return { dmg: 0, line: `${this.taunt}  Next time +5%.`, ended: "loss" };
    }
    return { dmg: 0, line: this.taunt, ended: null };
  }

  private throwOff(): void {
    this.phase = "engage";
    this.phaseT = 0;
    this.rideMash = 0;
    this.stun = 0.35;
    this.banner = "";
    this.pos.add(new THREE.Vector3((Math.random() - 0.5) * 4, 0, (Math.random() - 0.5) * 4));
  }

  private sidestep(): void {
    const a = Math.random() * Math.PI * 2;
    this.pos.x += Math.sin(a) * 3.2;
    this.pos.z += Math.cos(a) * 3.2;
  }

  private extendClaws(out: boolean): void {
    const z = out ? 0.42 : 0.08;
    this.leftClaw.scale.set(1, 1, out ? 1 : 0.15);
    this.rightClaw.scale.set(1, 1, out ? 1 : 0.15);
    this.leftClaw.position.z = z;
    this.rightClaw.position.z = z;
  }

  private makeClaws(metal: THREE.Material, side: number): THREE.Group {
    const g = new THREE.Group();
    g.position.set(side * 0.38, 0.88, 0.2);
    for (let i = 0; i < 3; i++) {
      const blade = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.04, 0.55), metal);
      blade.position.set(side * 0.04, (i - 1) * 0.05, 0.22);
      blade.rotation.x = -0.15;
      g.add(blade);
    }
    return g;
  }

  private place(): void {
    this.group.position.copy(this.pos);
    this.group.visible = this.phase !== "idle";
  }

  private hide(): void {
    this.phase = "idle";
    this.group.visible = false;
    this.banner = "";
    this.manhole.visible = false;
    this.bike.visible = false;
    this.nextRoam = V.minRoamSec + Math.random() * (V.maxRoamSec - V.minRoamSec);
    this.roamT = 0;
  }

  private tryAdvanceTrick(dist: number, dir: THREE.Vector3): void {
    const tier = trickTier(this.rivalry.encounters);
    if (this.trickCd > 0 || this.stun > 0) return;
    if (tier >= 3 && dist > 5 && dist < 14 && this.manholeT <= 0) {
      this.trickCd = 9;
      this.manholeT = 0.55;
      this.manhole.visible = true;
      this.manhole.position.set(-dir.x * 1.2, 0.2, -dir.z * 1.2);
      this.taunt = "Catch.";
    } else if (tier >= 4 && Math.random() < 0.35) {
      this.trickCd = 12;
      this.bikeT = 0.8;
      this.bike.visible = true;
      this.bike.position.set(-dir.x * 8, 0.4, -dir.z * 8);
      this.taunt = "The bike's with me.";
    }
  }

  private tickTricks(dt: number, hulkPos: THREE.Vector3, dir: THREE.Vector3, dist: number): number {
    let dmg = 0;
    if (this.manholeT > 0) {
      this.manholeT -= dt;
      this.manhole.position.lerp(new THREE.Vector3(dir.x * dist, 1.1, dir.z * dist), 0.35);
      this.manhole.rotation.x += dt * 14;
      if (this.manholeT <= 0) {
        this.manhole.visible = false;
        if (this.pos.distanceTo(hulkPos) < 12) {
          dmg += 14;
          this.bleedT = V.bleedSec;
        }
      }
    }
    if (this.bikeT > 0) {
      this.bikeT -= dt;
      this.bike.position.lerp(new THREE.Vector3(dir.x * Math.min(dist, 3), 0.35, dir.z * Math.min(dist, 3)), 0.2);
      if (this.bikeT <= 0) {
        this.bike.visible = false;
        if (this.pos.distanceTo(hulkPos) < 10) {
          dmg += 11;
          this.bleedT = V.bleedSec;
          this.phase = "pounce";
          this.phaseT = 0;
        }
      }
    }
    return dmg;
  }
}
