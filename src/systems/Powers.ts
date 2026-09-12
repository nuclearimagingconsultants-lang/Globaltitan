import * as THREE from "three";
import type { AudioBus } from "../audio/AudioBus";
import { BORROWED, GADGETS, POWER_VARS as V } from "../data/powers";
import type { BorrowedPower, TitanKind } from "../data/types";
import type { Hulk } from "../player/Hulk";
import type { CrimeSystem } from "./CrimeSystem";
import type { NeighborhoodSystem } from "./NeighborhoodSystem";
import type { DungeonRun } from "./DungeonRun";
import type { Traffic } from "./Traffic";
import type { CityWorld } from "../world/CityWorld";

export type PowerTick = {
  toast: string | null;
  smash: { origin: THREE.Vector3; radius: number; damage: number; color: number } | null;
  wreck: { origin: THREE.Vector3; radius: number; power: "smash" | "super" } | null;
};

function shade(color: number, op = 1): THREE.MeshBasicMaterial {
  return new THREE.MeshBasicMaterial({ color, transparent: op < 1, opacity: op });
}

export class Powers {
  readonly group = new THREE.Group();
  borrowed: BorrowedPower | null = null;
  meter = V.meterMax;
  blindT = 0;
  exhaustT = 0;
  angerT = 0;
  gadgetLine = "";
  scanT = 0;
  private gadgetCd = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
  private shieldT = 0;
  private speedT = 0;
  private lastHit = 99;
  private beam: THREE.Mesh;
  private trail: THREE.Mesh[] = [];
  private decoy: THREE.Group;
  private constructs: { mesh: THREE.Mesh; life: number }[] = [];
  private shoutUsedDay = 0;
  private stareT = 0;
  private shoutArmed = true;
  private dealt = new Map<string, number>();

  constructor() {
    this.beam = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.14, 1, 8), shade(0xff2244, 0.85));
    this.beam.rotation.x = Math.PI / 2;
    this.beam.visible = false;
    this.group.add(this.beam);
    this.decoy = new THREE.Group();
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.22, 0.7, 4, 6), shade(0xc4a07a));
    body.position.y = 0.7;
    const coat = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.7, 0.28), shade(0x3a3c48));
    coat.position.y = 0.95;
    this.decoy.add(body, coat);
    this.decoy.visible = false;
    this.group.add(this.decoy);
  }

  get name(): string {
    return this.borrowed ? BORROWED[this.borrowed].name : "";
  }

  get decoyPos(): THREE.Vector3 | null {
    return this.decoy.visible ? this.decoy.position : null;
  }

  get stealthed(): boolean {
    return this.scanT > 0;
  }

  incomingMul(): number {
    if (this.shieldT > 0) return 0.22;
    return 1;
  }

  speedMul(): number {
    return this.speedT > 0 ? 1.7 : 1;
  }

  damageMul(): number {
    return this.angerT > 0 ? 2 : 1;
  }

  flying(will: boolean, space: boolean): boolean {
    return will && this.borrowed === "will" && space && this.meter > 4 && this.blindT <= 0;
  }

  select(id: BorrowedPower, hulk: boolean): string | null {
    if (!hulk) return null;
    if (this.borrowed === id) return BORROWED[id].blurb;
    this.borrowed = id;
    this.meter = 0;
    this.beam.visible = false;
    return `${BORROWED[id].name} — meter reset. ${BORROWED[id].blurb}`;
  }

  noteDealt(id: string, amount: number): void {
    this.dealt.set(id, (this.dealt.get(id) ?? 0) + amount);
  }

  noteTaken(): void {
    this.lastHit = 0;
  }

  gadget(
    id: number,
    player: Hulk,
    audio: AudioBus,
    crimes: CrimeSystem,
    hood: NeighborhoodSystem,
    dungeon: DungeonRun,
    traffic: Traffic,
    inDungeon: boolean,
    lastTitan: TitanKind,
  ): string {
    if (!player.isBruce || this.exhaustT > 0) return this.exhaustT > 0 ? "Exhausted. Breathe." : "Gadgets are Bruce-only.";
    if (this.gadgetCd[id] > 0) return `${GADGETS[id - 1]?.name ?? "Gadget"} cooling down.`;
    this.gadgetCd[id] = V.gadgetCd[id] ?? 10;
    audio.ui();
    const origin = player.position;
    if (id === 1) {
      this.scanT = 14;
      const n = crimes.nearest(origin);
      return n ? `Scanner: ${n.title} nearby.` : "Scanner: streets are quiet.";
    }
    if (id === 2) {
      const hit = crimes.tranqNearest(origin, 16) || hood.stunRadius(origin, 16, 3.4) > 0;
      if (inDungeon) dungeon.zombies.stunAll(2.6);
      return hit || inDungeon ? "Tranq dart. He's down." : "No target in range.";
    }
    if (id === 3) {
      traffic.empNear(origin, 14);
      crimes.stunRadius(origin, 12, 1.8);
      hood.stunRadius(origin, 12, 1.8);
      if (inDungeon) dungeon.zombies.stunAll(1.4);
      return "EMP. Engines and radios die.";
    }
    if (id === 4) {
      crimes.stunRadius(origin, 10, 2.4);
      hood.stunRadius(origin, 10, 2.4);
      traffic.empNear(origin, 10);
      return "Hack in. Crews freeze.";
    }
    if (id === 5) {
      this.speedT = 8;
      player.health = Math.min(player.maxHealth, player.health + 22);
      return "Adrenaline. Move.";
    }
    if (id === 6) {
      this.shieldT = 7;
      return "Shield up.";
    }
    if (id === 7) {
      this.decoy.visible = true;
      this.decoy.position.copy(origin).addScaledVector(player.facing, 3);
      this.decoy.position.y = 0;
      return "Decoy walking. They'll bite.";
    }
    if (id === 8) {
      const car = traffic.nearest(origin, 4.2);
      player.health = Math.min(player.maxHealth, player.health + (car ? 18 : 28));
      if (car) traffic.repair(car);
      return car ? "Car patched. You're patched." : "Field repair. Stay standing.";
    }
    player.angerTrigger(lastTitan, audio);
    this.angerT = V.angerSec;
    return "Anger Trigger. The titan takes it — double damage, 20s.";
  }

  update(
    dt: number,
    player: Hulk,
    input: {
      keys: Set<string>;
      smashHeld: boolean;
      jumpDown: boolean;
      gHold: number;
      tHold: number;
      xHold: number;
      feel?: { omegaCarve: number };
    },
    _world: CityWorld,
    audio: AudioBus,
    lockName: string,
    lockPos: THREE.Vector3 | null,
    day: number,
  ): PowerTick {
    let toast: string | null = null;
    let smash: PowerTick["smash"] = null;
    let wreck: PowerTick["wreck"] = null;
    for (let i = 1; i <= 9; i++) this.gadgetCd[i] = Math.max(0, this.gadgetCd[i]! - dt);
    this.shieldT = Math.max(0, this.shieldT - dt);
    this.speedT = Math.max(0, this.speedT - dt);
    this.angerT = Math.max(0, this.angerT - dt);
    this.scanT = Math.max(0, this.scanT - dt);
    this.blindT = Math.max(0, this.blindT - dt);
    this.exhaustT = Math.max(0, this.exhaustT - dt);
    this.lastHit += dt;
    if (player.tookHit) {
      this.lastHit = 0;
      player.tookHit = false;
    }

    this.gadgetLine = player.isBruce
      ? this.exhaustT > 0
        ? `Exhausted ${this.exhaustT.toFixed(0)}s`
        : "1–9 gadgets · H car / calm"
      : "";

    for (const c of this.constructs) c.life -= dt;
    for (let i = this.constructs.length - 1; i >= 0; i--) {
      if (this.constructs[i]!.life <= 0) {
        this.group.remove(this.constructs[i]!.mesh);
        this.constructs.splice(i, 1);
      }
    }
    for (const t of this.trail) t.userData.life = (t.userData.life as number) - dt;
    for (let i = this.trail.length - 1; i >= 0; i--) {
      if ((this.trail[i]!.userData.life as number) <= 0) {
        this.group.remove(this.trail[i]!);
        this.trail.splice(i, 1);
      }
    }

    if (!player.isHulk) {
      this.beam.visible = false;
      this.stareT = 0;
      return { toast, smash, wreck };
    }

    if (this.borrowed === "will" && this.lastHit >= 2) {
      this.meter = Math.min(V.meterMax, this.meter + V.willRefill * dt);
    }

    if (this.borrowed === "omega" && input.keys.has("keyx") && this.blindT <= 0) {
      const hold = input.xHold > (input.feel?.omegaCarve ?? 0.35);
      const drain = (hold ? V.omegaCarve : V.omegaDrain) * dt;
      this.meter = Math.max(0, this.meter - drain);
      const len = hold ? 22 : 14;
      const origin = player.position.clone();
      origin.y = player.chestY;
      origin.addScaledVector(player.facing, 1.2);
      this.beam.visible = true;
      this.beam.scale.set(hold ? 1.6 : 1, len, hold ? 1.6 : 1);
      const mid = player.position.clone().addScaledVector(player.facing, len / 2);
      mid.y = player.chestY;
      this.beam.position.copy(mid);
      this.beam.lookAt(mid.clone().add(player.facing));
      smash = {
        origin: origin.addScaledVector(player.facing, len * 0.35),
        radius: hold ? 3.4 : 1.8,
        damage: hold ? 28 : 16,
        color: 0xff3344,
      };
      if (hold) wreck = { origin: player.position.clone().addScaledVector(player.facing, 8), radius: 4.2, power: "smash" };
      if (this.meter <= 0) {
        this.blindT = V.omegaBlindSec;
        this.beam.visible = false;
        toast = "Overuse. Blind.";
        audio.hurt();
      } else {
        audio.whoosh();
      }
    } else {
      this.beam.visible = false;
    }

    if (this.borrowed === "vengeance") {
      if (player.smashThrough || player.velocity.lengthSq() > 8) {
        if (Math.random() < dt * 8) {
          const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.7, 0.05, 8), shade(0xff5511, 0.7));
          disc.position.copy(player.position);
          disc.position.y = 0.04;
          disc.userData.life = 1.6;
          this.group.add(disc);
          this.trail.push(disc);
          wreck = { origin: player.position.clone(), radius: 3.2, power: "smash" };
        }
      }
      if (input.gHold >= V.stareHold && lockPos) {
        this.stareT += dt;
        if (this.stareT >= 0.15) {
          const paid = this.dealt.get(lockName) ?? 40;
          smash = { origin: lockPos.clone(), radius: 2.4, damage: Math.max(24, paid), color: 0xff6611 };
          this.stareT = 0;
          this.borrowed = null;
          this.meter = 0;
          this.exhaustT = V.exhaustSec;
          player.exhaustToBruce(audio);
          toast = "Penance stare. You're Bruce, and empty.";
          audio.rage();
        }
      } else this.stareT = 0;
    }

    if (this.borrowed === "will" && this.flying(true, input.jumpDown)) {
      this.meter = Math.max(0, this.meter - V.willFlight * dt);
      player.velocity.y = Math.max(player.velocity.y, 7.2);
      player.grounded = false;
    }

    if (this.borrowed === "king") {
      if (input.tHold < 0.15) this.shoutArmed = true;
      if (this.shoutArmed && input.tHold >= 1.15) {
        this.shoutArmed = false;
        if (this.shoutUsedDay === day) {
          toast = "Mega shout already spent today.";
        } else {
          this.shoutUsedDay = day;
          player.chip(player.maxHealth * 0.2);
          smash = { origin: player.position.clone(), radius: 22, damage: 90, color: 0x88ccff };
          wreck = { origin: player.position.clone(), radius: 16, power: "super" };
          toast = "Silent King shouts. The street folds. You eat 20%.";
          audio.boss();
        }
      }
    }

    return { toast, smash, wreck };
  }

  fireChain(origin: THREE.Vector3, facing: THREE.Vector3): PowerTick["smash"] {
    if (this.borrowed !== "vengeance" || this.meter < 8) return null;
    this.meter = Math.max(0, this.meter - 12);
    const p = origin.clone().addScaledVector(facing, 6);
    return { origin: p, radius: 5.5, damage: 38, color: 0xff6611 };
  }

  buildConstruct(player: Hulk, audio: AudioBus): string | null {
    if (this.borrowed !== "will" || this.meter < 12) return this.borrowed === "will" ? "Will's thin." : null;
    this.meter -= 18;
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(3.2, 2.4, 0.7), shade(0x33dd66, 0.72));
    mesh.position.copy(player.position).addScaledVector(player.facing, 3.4);
    mesh.position.y = 1.2;
    mesh.rotation.y = player.yaw;
    this.group.add(mesh);
    this.constructs.push({ mesh, life: 14 });
    audio.success();
    return "Emerald construct.";
  }

  kingCone(player: Hulk): PowerTick["smash"] {
    if (this.borrowed !== "king" || this.meter < 10) return null;
    this.meter = Math.max(0, this.meter - 16);
    const origin = player.position.clone().addScaledVector(player.facing, 5);
    return { origin, radius: V.kingCone, damage: 52, color: 0x88ccff };
  }

  refillCombat(): void {
    if (this.borrowed && this.borrowed !== "will") {
      this.meter = Math.min(V.meterMax, this.meter + 6);
    }
  }

  bindDay(day: number, savedDay: number): void {
    this.shoutUsedDay = savedDay;
    if (savedDay !== day) this.shoutUsedDay = 0;
  }

  shoutDay(): number {
    return this.shoutUsedDay;
  }

  dispose(): void {
    this.group.removeFromParent();
  }
}
