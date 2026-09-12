import * as THREE from "three";
import type { Hulk } from "../player/Hulk";
import type { Aabb } from "../data/types";

const CAM_NAMES = ["3rd", "close", "shoulder"] as const;

/** Building AABBs the drone cam must not clip through. */
export type CamWorld = {
  colliders: Aabb[];
  colliderLive?: (b: Aabb) => boolean;
};

/**
 * SPEC-A street chase: character lower-center / slightly right, city in the left 2/3.
 * Drone-style boom: raycast-pulls in so the lens never sits inside buildings.
 */
export class CameraRig {
  yaw = 0.4;
  pitch = 0.22;
  shake = 0;
  zoom = 6;
  /** 0 third-person (default), 1 close, 2 over-shoulder. */
  mode = 0;
  fov = 72;
  private offset = new THREE.Vector3();
  private look = new THREE.Vector3();
  private desired = new THREE.Vector3();
  private target = new THREE.Vector3();
  private right = new THREE.Vector3();
  private from = new THREE.Vector3();
  private hit = new THREE.Vector3();
  private dir = new THREE.Vector3();
  /** Smoothed boom scale 0..1 after occlusion (drone ease). */
  private clearT = 1;

  cycle(): string {
    this.mode = (this.mode + 1) % 3;
    return CAM_NAMES[this.mode]!;
  }

  modeName(): string {
    return CAM_NAMES[this.mode] ?? "3rd";
  }

  applyLook(dx: number, dy: number, sensitivity: number): void {
    this.yaw += dx * 0.004 * sensitivity * 5;
    this.pitch += dy * 0.003 * sensitivity * 5;
    this.pitch = Math.max(-0.95, Math.min(1.05, this.pitch));
  }

  applyZoom(delta: number): void {
    this.zoom = THREE.MathUtils.clamp(this.zoom + delta * 18, -2, 22);
  }

  autoCenter(playerYaw: number, dt: number): void {
    const behind = playerYaw + Math.PI;
    let d = behind - this.yaw;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    this.yaw += d * (1 - Math.exp(-3.2 * dt));
  }

  bump(amount = 0.35): void {
    this.shake = Math.max(this.shake, amount);
  }

  update(
    dt: number,
    camera: THREE.PerspectiveCamera,
    player: Hulk,
    dungeon = false,
    world: CamWorld | null = null,
  ): void {
    this.shake = Math.max(0, this.shake - dt * 2.4);
    if (dungeon) {
      this.updateDungeon(dt, camera, player);
      return;
    }
    const air = Math.max(0, player.position.y);
    const leaping = player.isHulk && !player.grounded;
    const sprint =
      player.smashThrough ||
      (player.isHulk && player.grounded && Math.hypot(player.velocity.x, player.velocity.z) > 70);
    const combat = player.smashActive > 0 || player.combo > 1;
    const landing = leaping && player.velocity.y < 0 && air < 16;
    const close = this.mode === 1;
    const shoulder = this.mode === 2;

    const fovWant = leaping ? 95 : sprint ? 84 : 72;
    this.fov += (fovWant - this.fov) * (1 - Math.exp(-5.5 * dt));
    if (Math.abs(camera.fov - this.fov) > 0.15) {
      camera.fov = this.fov;
      camera.updateProjectionMatrix();
    }

    const humanBoom = landing ? 4.2 : combat ? 5.2 : 6.0;
    const hulkBoom = landing ? 14 : combat ? 16.5 : 18.5;
    const distMul = close ? 0.62 : shoulder ? 0.82 : 1;
    const dist = ((player.isHulk ? hulkBoom : humanBoom) + Math.min(6, air * 0.08) + this.zoom) * distMul;

    const chest = player.isHulk ? 2.15 : 1.28;
    const camH = (sprint || leaping ? chest * 0.72 : chest) + (close ? -0.35 : 0);
    const cy = Math.cos(this.pitch);
    const side = (shoulder ? (player.isHulk ? 2.2 : 1.15) : player.isHulk ? 1.35 : 0.72) + (close ? 0.4 : 0);
    this.right.set(Math.cos(this.yaw), 0, -Math.sin(this.yaw));
    this.offset.set(
      Math.sin(this.yaw) * dist * cy + this.right.x * side,
      camH + Math.sin(this.pitch) * dist * 0.22,
      Math.cos(this.yaw) * dist * cy + this.right.z * side,
    );
    this.target.copy(player.position);
    this.target.y += player.lookY * 0.42 + Math.min(4, air * 0.03);
    this.target.addScaledVector(player.facing, player.isHulk ? 2.2 : 1.4);
    this.target.addScaledVector(this.right, player.isHulk ? -1.6 : -0.7);
    this.target.x += player.velocity.x * 0.04;
    this.target.z += player.velocity.z * 0.04;

    // Pivot just above the shoulders — drone looks from here toward boom tip
    this.from.copy(player.position);
    this.from.y += camH + (player.isHulk ? 1.1 : 0.55);

    this.desired.copy(player.position);
    this.desired.y += camH;
    this.desired.add(this.offset);

    // Drone clearance: pull boom in if a building sits between Hulk and the lens
    if (world && world.colliders.length) {
      const cleared = this.droneClear(this.from, this.desired, world, player.isHulk ? 1.35 : 0.9);
      const wantT = cleared.distanceTo(this.from) / Math.max(0.001, this.desired.distanceTo(this.from));
      // Fast pull-in when blocked, slower ease-out when clear (drone feel)
      const rate = wantT < this.clearT ? 18 : 4.5;
      this.clearT += (wantT - this.clearT) * (1 - Math.exp(-rate * dt));
      this.desired.lerpVectors(this.from, this.desired, THREE.MathUtils.clamp(this.clearT, 0.18, 1));
      // Tiny lift when heavily clipped so we skim roofs instead of tunneling
      if (this.clearT < 0.55) this.desired.y += (0.55 - this.clearT) * (player.isHulk ? 3.2 : 1.6);
    } else {
      this.clearT = 1;
    }

    const follow = 1 - Math.exp(-16 * dt);
    camera.position.lerp(this.desired, follow);
    this.look.lerp(this.target, 1 - Math.exp(-14 * dt));
    camera.lookAt(this.look);
    // Keep near plane tight when boom is short so we don't x-ray facades
    const nearWant = this.clearT < 0.7 ? 0.55 : 0.35;
    if (Math.abs(camera.near - nearWant) > 0.04) {
      camera.near = nearWant;
      camera.updateProjectionMatrix();
    }
    player.setLod(dist * this.clearT);
    if (this.shake > 0) {
      camera.position.x += (Math.random() - 0.5) * this.shake * 0.45;
      camera.position.y += (Math.random() - 0.5) * this.shake * 0.28;
    }
  }

  /**
   * Sphere-cast along boom against live building AABBs. Returns the farthest safe cam point.
   */
  private droneClear(from: THREE.Vector3, to: THREE.Vector3, world: CamWorld, softR: number): THREE.Vector3 {
    this.dir.copy(to).sub(from);
    const len = this.dir.length();
    if (len < 0.5) return to.clone();
    this.dir.multiplyScalar(1 / len);
    let best = 1;
    const pad = softR + 0.55;
    const live = world.colliderLive;
    for (const b of world.colliders) {
      if (live && !live(b)) continue;
      if (b.height < 1.2) continue;
      const t = this.rayHitExpandedAabb(from, this.dir, len, b, pad);
      if (t !== null && t < best) best = t;
    }
    // Never collapse completely onto the titan
    const minFrac = Math.min(0.22, 2.4 / len);
    best = Math.max(minFrac, best - 0.04);
    this.hit.copy(from).addScaledVector(this.dir, len * best);
    return this.hit.clone();
  }

  /** Slab test vs AABB expanded by `pad` in XZ and a little in Y. Returns hit fraction or null. */
  private rayHitExpandedAabb(
    origin: THREE.Vector3,
    dir: THREE.Vector3,
    maxLen: number,
    b: Aabb,
    pad: number,
  ): number | null {
    const minX = b.minX - pad;
    const maxX = b.maxX + pad;
    const minY = -0.5;
    const maxY = b.height + pad * 0.35;
    const minZ = b.minZ - pad;
    const maxZ = b.maxZ + pad;

    let tMin = 0;
    let tMax = maxLen;
    // X
    if (Math.abs(dir.x) < 1e-8) {
      if (origin.x < minX || origin.x > maxX) return null;
    } else {
      let t1 = (minX - origin.x) / dir.x;
      let t2 = (maxX - origin.x) / dir.x;
      if (t1 > t2) {
        const s = t1;
        t1 = t2;
        t2 = s;
      }
      tMin = Math.max(tMin, t1);
      tMax = Math.min(tMax, t2);
      if (tMin > tMax) return null;
    }
    // Y
    if (Math.abs(dir.y) < 1e-8) {
      if (origin.y < minY || origin.y > maxY) return null;
    } else {
      let t1 = (minY - origin.y) / dir.y;
      let t2 = (maxY - origin.y) / dir.y;
      if (t1 > t2) {
        const s = t1;
        t1 = t2;
        t2 = s;
      }
      tMin = Math.max(tMin, t1);
      tMax = Math.min(tMax, t2);
      if (tMin > tMax) return null;
    }
    // Z
    if (Math.abs(dir.z) < 1e-8) {
      if (origin.z < minZ || origin.z > maxZ) return null;
    } else {
      let t1 = (minZ - origin.z) / dir.z;
      let t2 = (maxZ - origin.z) / dir.z;
      if (t1 > t2) {
        const s = t1;
        t1 = t2;
        t2 = s;
      }
      tMin = Math.max(tMin, t1);
      tMax = Math.min(tMax, t2);
      if (tMin > tMax) return null;
    }
    if (tMax < 0) return null;
    const hitT = tMin >= 0 ? tMin : tMax;
    if (hitT < 0 || hitT > maxLen) return null;
    return hitT / maxLen;
  }

  private updateDungeon(dt: number, camera: THREE.PerspectiveCamera, player: Hulk): void {
    this.fov += (48 - this.fov) * (1 - Math.exp(-8 * dt));
    if (Math.abs(camera.fov - this.fov) > 0.2) {
      camera.fov = this.fov;
      camera.updateProjectionMatrix();
    }
    this.desired.set(player.position.x + 13.5, player.position.y + 16.5, player.position.z + 13.5);
    camera.position.lerp(this.desired, 1 - Math.exp(-10 * dt));
    this.look.set(player.position.x, player.position.y + 1.35, player.position.z);
    camera.lookAt(this.look);
    player.setLod(18);
  }
}
