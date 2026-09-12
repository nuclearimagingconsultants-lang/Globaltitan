import * as THREE from "three";
import { APPROACH, assignRoles, brainLod, hesitateFor, type ApproachState, type BrainLod, type PackRole } from "../data/approach";
import type { Hulk } from "../player/Hulk";

export type SteerIn = {
  pos: THREE.Vector3;
  state: ApproachState;
  role: PackRole;
  hesitate: number;
  backoff: number;
  hpRatio: number;
  packIndex: number;
  packSize: number;
  dist: number;
  toX: number;
  toZ: number;
};

export type SteerOut = {
  state: ApproachState;
  vx: number;
  vz: number;
  hesitate: number;
  backoff: number;
};

export class EnemyDirector {
  danger = 0;
  wanted = 0;
  lastAoe = 99;
  lastSmash = 99;
  chaos = 0;
  reinforceReady = false;
  private idleHot = 0;
  private out: SteerOut = { state: "idle", vx: 0, vz: 0, hesitate: 0, backoff: 0 };

  private emit(state: ApproachState, vx: number, vz: number, hesitate: number, backoff: number): SteerOut {
    this.out.state = state;
    this.out.vx = vx;
    this.out.vz = vz;
    this.out.hesitate = hesitate;
    this.out.backoff = backoff;
    return this.out;
  }

  tick(dt: number, player: Hulk, hotspot: boolean): void {
    this.lastAoe += dt;
    this.lastSmash += dt;
    this.chaos = Math.max(0, this.chaos - dt * 6);
    const moving = player.velocity.lengthSq() > 1;
    if (hotspot && (!moving || player.driving)) this.idleHot += dt;
    else this.idleHot = Math.max(0, this.idleHot - dt);
    if (this.idleHot > 4) this.danger = Math.min(100, this.danger + APPROACH.dangerIdle * dt);
    if (hotspot) this.danger = Math.min(100, this.danger + APPROACH.dangerHotspot * dt * 0.15);
    this.danger = Math.max(0, this.danger - APPROACH.dangerDecay * dt * (this.lastSmash > 8 ? 1 : 0.25));
    this.wanted = Math.min(100, this.wanted * (1 - 0.08 * dt) + this.chaos * 0.2);
    this.reinforceReady = this.danger >= APPROACH.reinforceAt && this.chaos > 12;
  }

  noteSmash(aoe: boolean, wrecks: number): void {
    this.lastSmash = 0;
    this.chaos = Math.min(80, this.chaos + APPROACH.dangerSmash + wrecks * 2);
    this.danger = Math.min(100, this.danger + APPROACH.dangerSmash * 0.6 + wrecks);
    this.wanted = Math.min(100, this.wanted + 8 + wrecks * 2);
    if (aoe) this.lastAoe = 0;
  }

  lod(dist: number): BrainLod {
    return brainLod(dist);
  }

  roles(count: number): PackRole[] {
    return assignRoles(count);
  }

  notice(dist: number, player: Hulk, already: boolean): boolean {
    if (already) return true;
    if (dist < APPROACH.hearStepM) return true;
    if (this.lastSmash < 1.6 && dist < APPROACH.hearSmashM) return true;
    if (this.wanted > 40 && dist < APPROACH.sightM + 8) return true;
    if (player.isHulk && dist < APPROACH.sightM) return true;
    if (player.isBruce && dist < APPROACH.sightM * 0.72) return true;
    return dist < APPROACH.sightM * 0.55;
  }

  hesitate(player: Hulk): number {
    return hesitateFor(player.isHulk, player.isBruce);
  }

  aoePush(): boolean {
    return this.lastAoe < APPROACH.aoeBackoff;
  }

  steer(dt: number, player: Hulk, a: SteerIn): SteerOut {
    let { state, hesitate, backoff } = a;
    hesitate = Math.max(0, hesitate - dt);
    backoff = Math.max(0, backoff - dt);
    if (this.aoePush()) backoff = Math.max(backoff, APPROACH.aoeBackoff - this.lastAoe);

    const dist = a.dist;
    const nx = dist > 0.01 ? a.toX / dist : 0;
    const nz = dist > 0.01 ? a.toZ / dist : 1;
    const fx = -nz;
    const fz = nx;
    const side = a.packIndex % 2 === 0 ? 1 : -1;

    if (a.hpRatio < APPROACH.fleeHp && state !== "idle") state = "retreat";

    if (state === "idle") {
      return this.emit(state, 0, 0, hesitate, backoff);
    }
    if (state === "alert") {
      if (hesitate <= 0) state = "stalk";
      return this.emit(state, fx * side * 1.2, fz * side * 1.2, hesitate, backoff);
    }
    if (state === "stalk") {
      const orbit = APPROACH.stalkOrbit;
      let vx = fx * side * 5.2 + nx * (dist > orbit + 2 ? 3.2 : dist < orbit - 3 ? -2.4 : 0);
      let vz = fz * side * 5.2 + nz * (dist > orbit + 2 ? 3.2 : dist < orbit - 3 ? -2.4 : 0);
      if (dist < APPROACH.commitM || (player.isBruce && dist < 20)) state = a.role === "flanker" ? "flank" : "engage";
      return this.emit(state, vx, vz, hesitate, backoff);
    }
    if (state === "retreat") {
      if (dist > 18 || backoff <= 0) state = "engage";
      return this.emit(state, -nx * 6.5 + fx * side * 2, -nz * 6.5 + fz * side * 2, hesitate, backoff);
    }

    if (backoff > 0) {
      return this.emit(state, -nx * 5 + fx * side * 3, -nz * 5 + fz * side * 3, hesitate, backoff);
    }

    const bruce = player.isBruce;
    const keep = player.radius + (bruce ? 1.1 : 2.2);
    let vx = 0;
    let vz = 0;
    if (a.role === "support") {
      const want = 11;
      vx = nx * (dist > want + 2 ? 4 : dist < want - 2 ? -3.2 : 0) + fx * side * 3.4;
      vz = nz * (dist > want + 2 ? 4 : dist < want - 2 ? -3.2 : 0) + fz * side * 3.4;
      state = "flank";
    } else if (a.role === "flanker") {
      vx = fx * side * (bruce ? 7 : 6.2) + nx * (dist > keep + 3 ? 3.4 : dist < keep ? -2 : 0.6);
      vz = fz * side * (bruce ? 7 : 6.2) + nz * (dist > keep + 3 ? 3.4 : dist < keep ? -2 : 0.6);
      state = "flank";
    } else {
      vx = nx * (dist > keep + 0.6 ? (bruce ? 7.4 : 5.8) : dist < keep ? -2.2 : 0);
      vz = nz * (dist > keep + 0.6 ? (bruce ? 7.4 : 5.8) : dist < keep ? -2.2 : 0);
      if (player.isHulk && !bruce) {
        vx += fx * side * 2.2;
        vz += fz * side * 2.2;
      }
      state = "engage";
    }
    return this.emit(state, vx, vz, hesitate, backoff);
  }

  glow(mesh: THREE.Object3D, amount: number): void {
    mesh.traverse((o) => {
      const m = (o as THREE.Mesh).material;
      if (m && (m as THREE.MeshLambertMaterial).emissive) {
        const mat = m as THREE.MeshLambertMaterial;
        mat.emissiveIntensity = amount;
      }
    });
  }
}
