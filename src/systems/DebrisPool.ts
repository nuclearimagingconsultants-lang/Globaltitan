import * as THREE from "three";

const GEO = new THREE.BoxGeometry(1, 1, 1);
const SLEEP_S = 2;
const DELETE_S = 6;

type Shard = {
  mesh: THREE.Mesh;
  vel: THREE.Vector3;
  spin: THREE.Vector3;
  age: number;
  asleep: boolean;
  live: boolean;
};

/** Pre-fractured pooled shards. Cap 300. Sleep at 2s, recycle at 6s. No runtime fracture. */
export class DebrisPool {
  readonly group = new THREE.Group();
  cap = 300;
  skip = false;
  short = false;
  private pool: Shard[] = [];
  private cursor = 0;
  private mat = new THREE.MeshLambertMaterial({ color: 0x6a5a4a });

  constructor(cap = 300) {
    this.cap = cap;
    for (let i = 0; i < cap; i++) {
      const mesh = new THREE.Mesh(GEO, this.mat);
      mesh.visible = false;
      mesh.castShadow = false;
      this.group.add(mesh);
      this.pool.push({
        mesh,
        vel: new THREE.Vector3(),
        spin: new THREE.Vector3(),
        age: 0,
        asleep: false,
        live: false,
      });
    }
  }

  setCap(n: number): void {
    this.cap = Math.max(8, Math.min(this.pool.length, n));
    for (let i = this.cap; i < this.pool.length; i++) {
      const s = this.pool[i]!;
      s.live = false;
      s.mesh.visible = false;
    }
  }

  spawn(origin: THREE.Vector3, count: number, power: "smash" | "super"): void {
    if (this.skip) return;
    const n = Math.min(count, this.short || this.cap < 120 ? 1 : 4);
    const kick = power === "super" ? 18 : 10;
    for (let i = 0; i < n; i++) {
      const s = this.next();
      if (!s) return;
      s.live = true;
      s.asleep = false;
      s.age = 0;
      s.mesh.visible = true;
      s.mesh.position.copy(origin);
      s.mesh.position.y += 0.8 + Math.random() * 1.4;
      s.mesh.scale.set(0.35 + Math.random() * 0.7, 0.2 + Math.random() * 0.45, 0.3 + Math.random() * 0.6);
      s.vel.set((Math.random() - 0.5) * kick, 6 + Math.random() * kick * 0.6, (Math.random() - 0.5) * kick);
      s.spin.set(Math.random() * 8, Math.random() * 8, Math.random() * 8);
    }
  }

  update(dt: number): void {
    const n = this.cap;
    const dieAt = this.short ? 0.28 : DELETE_S;
    for (let i = 0; i < n; i++) {
      const s = this.pool[i]!;
      if (!s.live) continue;
      s.age += dt;
      if (!s.asleep) {
        s.vel.y -= 32 * dt;
        s.mesh.position.addScaledVector(s.vel, dt);
        s.mesh.rotation.x += s.spin.x * dt;
        s.mesh.rotation.y += s.spin.y * dt;
        if (s.mesh.position.y < 0.08) {
          s.mesh.position.y = 0.08;
          s.vel.set(0, 0, 0);
          s.spin.set(0, 0, 0);
          s.asleep = true;
        } else if (!this.short && s.age >= SLEEP_S) {
          s.asleep = true;
          s.vel.set(0, 0, 0);
          s.spin.set(0, 0, 0);
        }
      }
      if (s.age >= dieAt) {
        s.live = false;
        s.mesh.visible = false;
      }
    }
  }

  dispose(): void {
    this.group.removeFromParent();
  }

  private next(): Shard | null {
    for (let n = 0; n < this.cap; n++) {
      this.cursor = (this.cursor + 1) % this.cap;
      const s = this.pool[this.cursor]!;
      if (!s.live) return s;
    }
    const s = this.pool[this.cursor]!;
    return s ?? null;
  }
}
