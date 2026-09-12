import * as THREE from "three";
import type { AudioBus } from "../audio/AudioBus";
import { APPROACH, assignRoles, type ApproachState, type PackRole } from "../data/approach";
import type { Hulk } from "../player/Hulk";
import type { EnemyDirector } from "./EnemyDirector";

export type ZombieKind = "shambler" | "runner" | "armored";

export type Zombie = {
  mesh: THREE.Group;
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  hp: number;
  maxHp: number;
  stagger: number;
  aggro: boolean;
  kind: ZombieKind;
  role: PackRole;
  state: ApproachState;
  hesitate: number;
  backoff: number;
  windup: number;
  glow: THREE.Mesh;
};

function shade(color: number): THREE.MeshLambertMaterial {
  return new THREE.MeshLambertMaterial({ color });
}

export class ZombiePack {
  readonly group = new THREE.Group();
  readonly list: Zombie[] = [];
  director: EnemyDirector | null = null;
  private phase = 0;
  private spilled = false;
  private spillAt = new THREE.Vector3(0, 0, 22);
  private to = new THREE.Vector3();

  bindDirector(d: EnemyDirector): void {
    this.director = d;
  }

  spawnRooms(rooms: THREE.Vector3[], perRoom = 5): void {
    this.clear();
    this.spilled = false;
    const start = new THREE.Vector3(0, 0, 30);
    for (const room of rooms) {
      for (let i = 0; i < perRoom; i++) {
        const a = (i / perRoom) * Math.PI * 2 + room.x * 0.1;
        const kind: ZombieKind = i === 0 && perRoom > 3 ? "armored" : i % 3 === 1 ? "runner" : "shambler";
        const side = kind === "runner" ? (i % 2 === 0 ? 6.5 : -6.5) : Math.sin(a) * 3.2;
        const pos = new THREE.Vector3(room.x + side, 0, room.z + Math.cos(a) * (kind === "shambler" ? 2.4 : 3.6));
        if (pos.distanceTo(start) < 12) pos.z -= 10;
        this.list.push(this.make(pos, kind));
      }
    }
    const hostiles = this.list;
    const roles = assignRoles(hostiles.length);
    hostiles.forEach((z, i) => {
      z.role = z.kind === "runner" ? "flanker" : z.kind === "armored" ? "rusher" : roles[i] ?? "rusher";
    });
  }

  spillFromDoor(origin: THREE.Vector3, n = 3): void {
    if (this.spilled) return;
    this.spilled = true;
    for (let i = 0; i < n; i++) {
      const pos = origin.clone().add(new THREE.Vector3((i - 1) * 2.2, 0, -2 - i * 0.4));
      this.list.push(this.make(pos, i === 0 ? "armored" : "runner"));
    }
  }

  living(): Zombie[] {
    return this.list.filter((z) => z.hp > 0);
  }

  get remaining(): number {
    return this.living().length;
  }

  applySmash(origin: THREE.Vector3, radius: number, damage: number, audio: AudioBus): number {
    let hits = 0;
    for (const z of this.list) {
      if (z.hp <= 0) continue;
      if (z.pos.distanceTo(origin) > radius + 1.1) continue;
      z.hp = Math.max(0, z.hp - damage);
      z.stagger = 0.35;
      z.aggro = true;
      z.state = "engage";
      hits += 1;
      if (z.hp <= 0) {
        z.mesh.visible = false;
        audio.hit();
      }
    }
    return hits;
  }

  stunAll(seconds = 1.6): void {
    for (const z of this.list) {
      if (z.hp > 0) z.stagger = Math.max(z.stagger, seconds);
    }
  }

  update(dt: number, player: Hulk): number {
    this.phase += dt;
    let dmg = 0;
    const target = player.position;
    if (!this.spilled && target.z < this.spillAt.z && target.z > 8) {
      this.spillFromDoor(this.spillAt, 3);
    }
    let packSize = 0;
    for (let i = 0; i < this.list.length; i++) if (this.list[i]!.hp > 0) packSize += 1;
    let idx = 0;
    for (let i = 0; i < this.list.length; i++) {
      const z = this.list[i]!;
      if (z.hp <= 0) continue;
      idx += 1;
      z.stagger = Math.max(0, z.stagger - dt);
      const to = this.to.copy(target).sub(z.pos);
      to.y = 0;
      const dist = to.length();
      const lod = this.director?.lod(dist) ?? (dist > 50 ? "cheap" : "full");
      if (lod === "none") {
        z.mesh.visible = dist < 210;
        continue;
      }
      if (this.director?.notice(dist, player, z.aggro) || dist < 18) {
        if (!z.aggro) {
          z.aggro = true;
          z.state = "alert";
          z.hesitate = this.director?.hesitate(player) ?? 0.4;
        }
      }
      if (z.stagger > 0) {
        z.vel.multiplyScalar(1 - 8 * dt);
        (z.glow.material as THREE.MeshBasicMaterial).opacity = 0;
      } else if (z.aggro && lod === "cheap") {
        if (dist > 2) z.vel.addScaledVector(to.normalize(), 8 * dt);
      } else if (z.aggro && this.director) {
        const stepped = this.director.steer(dt, player, {
          pos: z.pos,
          state: z.state,
          role: z.role,
          hesitate: z.hesitate,
          backoff: z.backoff,
          hpRatio: z.hp / z.maxHp,
          packIndex: idx,
          packSize,
          dist,
          toX: to.x,
          toZ: to.z,
        });
        z.state = stepped.state;
        z.hesitate = stepped.hesitate;
        z.backoff = stepped.backoff;
        const cap = z.kind === "runner" ? 7.2 : z.kind === "armored" ? 3.6 : 4.6;
        z.vel.x += stepped.vx * dt;
        z.vel.z += stepped.vz * dt;
        const sp = Math.hypot(z.vel.x, z.vel.z);
        if (sp > cap) {
          z.vel.x *= cap / sp;
          z.vel.z *= cap / sp;
        }
      } else {
        z.vel.x += Math.sin(this.phase + i) * 3 * dt;
        z.vel.z += Math.cos(this.phase * 0.8 + i) * 3 * dt;
      }
      z.vel.multiplyScalar(1 - 3.2 * dt);
      z.pos.x += z.vel.x * dt;
      z.pos.z += z.vel.z * dt;
      z.pos.x = THREE.MathUtils.clamp(z.pos.x, -20, 20);
      z.pos.z = THREE.MathUtils.clamp(z.pos.z, -30, 34);
      const reach = player.radius + (z.kind === "armored" ? 1.3 : 0.95);
      if (z.aggro && z.stagger <= 0 && z.hesitate <= 0 && dist < reach + 0.8 && lod === "full") {
        if (z.windup <= 0) {
          z.windup = z.kind === "armored" ? 0.7 : APPROACH.windupMelee;
        }
      }
      if (z.windup > 0) {
        z.windup -= dt;
        (z.glow.material as THREE.MeshBasicMaterial).opacity = 0.3 + (1 - z.windup) * 0.5;
        z.mesh.rotation.x = -0.2;
        if (z.windup <= 0) {
          z.mesh.rotation.x = 0;
          (z.glow.material as THREE.MeshBasicMaterial).opacity = 0;
          if (z.pos.distanceTo(target) < reach + 0.45) dmg += z.kind === "armored" ? 9 : z.kind === "runner" ? 5 : 6;
        }
      } else {
        (z.glow.material as THREE.MeshBasicMaterial).opacity = Math.max(0, (z.glow.material as THREE.MeshBasicMaterial).opacity - dt * 3);
      }
      if (z.vel.lengthSq() > 0.04) z.mesh.rotation.y = Math.atan2(z.vel.x, z.vel.z);
      z.mesh.position.copy(z.pos);
      z.mesh.position.y = Math.abs(Math.sin(this.phase * 8 + i)) * 0.08;
    }
    return dmg;
  }

  nearest(from: THREE.Vector3): Zombie | null {
    let best: Zombie | null = null;
    let bestD = Infinity;
    for (const z of this.living()) {
      const d = z.pos.distanceToSquared(from);
      if (d < bestD) {
        bestD = d;
        best = z;
      }
    }
    return best;
  }

  clear(): void {
    for (const z of this.list) this.group.remove(z.mesh);
    this.list.length = 0;
    this.spilled = false;
  }

  private make(pos: THREE.Vector3, kind: ZombieKind): Zombie {
    const g = new THREE.Group();
    const coat = shade(kind === "armored" ? 0x2a2e28 : kind === "runner" ? 0x4a3020 : 0x3a4030);
    const flesh = shade(0x6a7a52);
    const helm = shade(kind === "armored" ? 0x6a6e62 : 0x4a4e42);
    const strap = shade(0x2a2418);
    const body = new THREE.Mesh(new THREE.BoxGeometry(kind === "armored" ? 0.74 : 0.62, 0.95, 0.38), coat);
    body.position.y = 1.05;
    g.add(body);
    const hem = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.35, 0.42), shade(0x2c3024));
    hem.position.y = 0.52;
    g.add(hem);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 8), flesh);
    head.position.y = 1.68;
    g.add(head);
    const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.24, 10, 8, 0, Math.PI * 2, 0, 1.2), helm);
    helmet.position.set(0, 1.78, 0);
    g.add(helmet);
    const brim = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.04, 0.28), helm);
    brim.position.set(0, 1.7, 0.12);
    g.add(brim);
    const belt = new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.08, 0.4), strap);
    belt.position.y = 0.78;
    g.add(belt);
    for (const x of [-0.38, 0.38]) {
      const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.08, 0.42, 4, 6), coat);
      arm.position.set(x, 1.15, 0);
      g.add(arm);
    }
    for (const x of [-0.16, 0.16]) {
      const leg = new THREE.Mesh(new THREE.CapsuleGeometry(0.09, 0.4, 4, 6), shade(0x2a2c22));
      leg.position.set(x, 0.28, 0);
      g.add(leg);
    }
    const rifle = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, kind === "runner" ? 0.55 : 0.85), shade(0x2a2218));
    rifle.position.set(0.32, 1.05, 0.35);
    g.add(rifle);
    const glow = new THREE.Mesh(
      new THREE.RingGeometry(0.4, 0.62, 14),
      new THREE.MeshBasicMaterial({ color: 0xff4422, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false }),
    );
    glow.rotation.x = -Math.PI / 2;
    glow.position.y = 0.05;
    g.add(glow);
    g.position.copy(pos);
    this.group.add(g);
    const hp = kind === "armored" ? 72 : kind === "runner" ? 28 : 38;
    return {
      mesh: g,
      pos: pos.clone(),
      vel: new THREE.Vector3(),
      hp,
      maxHp: hp,
      stagger: 0,
      aggro: false,
      kind,
      role: "rusher",
      state: "idle",
      hesitate: 0,
      backoff: 0,
      windup: 0,
      glow,
    };
  }
}
