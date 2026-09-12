import * as THREE from "three";

const bitGeo = new THREE.TetrahedronGeometry(0.22, 0);
const ringGeo = new THREE.RingGeometry(0.4, 0.85, 16);
const BIT_POOL = 160;
const WAVE_POOL = 16;

type Bit = { mesh: THREE.Mesh; vel: THREE.Vector3; life: number; live: boolean };
type Wave = { mesh: THREE.Mesh; life: number; max: number; live: boolean };

export class SmashFx {
  readonly group = new THREE.Group();
  cap = 72;
  skip = false;
  private bits: Bit[] = [];
  private waves: Wave[] = [];
  private bitCursor = 0;
  private waveCursor = 0;
  private mat = new THREE.MeshBasicMaterial({ color: 0x88ff66, transparent: true, opacity: 0.9 });
  private ringMat = new THREE.MeshBasicMaterial({
    color: 0x88ff66,
    transparent: true,
    opacity: 0.72,
    side: THREE.DoubleSide,
    depthWrite: false,
  });

  constructor() {
    for (let i = 0; i < BIT_POOL; i++) {
      const mesh = new THREE.Mesh(bitGeo, this.mat);
      mesh.visible = false;
      mesh.frustumCulled = true;
      this.group.add(mesh);
      this.bits.push({ mesh, vel: new THREE.Vector3(), life: 0, live: false });
    }
    for (let i = 0; i < WAVE_POOL; i++) {
      const mesh = new THREE.Mesh(ringGeo, this.ringMat);
      mesh.rotation.x = -Math.PI / 2;
      mesh.visible = false;
      this.group.add(mesh);
      this.waves.push({ mesh, life: 0, max: 0.28, live: false });
    }
  }

  burst(origin: THREE.Vector3, color: number, count = 8): void {
    if (this.skip) return;
    this.mat.color.setHex(color);
    this.ringMat.color.setHex(color);
    const n = Math.min(count, 6, Math.max(2, (this.cap / 20) | 0));
    for (let i = 0; i < n; i++) {
      const b = this.nextBit();
      if (!b) break;
      b.live = true;
      b.life = 0.18 + Math.random() * 0.1;
      b.mesh.visible = true;
      b.mesh.position.copy(origin);
      b.mesh.position.y += 0.5;
      b.vel.set((Math.random() - 0.5) * 22, 8 + Math.random() * 14, (Math.random() - 0.5) * 22);
    }
    const w = this.nextWave();
    if (w) {
      w.live = true;
      w.life = 0.28;
      w.max = 0.28;
      w.mesh.visible = true;
      w.mesh.position.set(origin.x, 0.12, origin.z);
      w.mesh.scale.setScalar(1);
      this.ringMat.opacity = 0.72;
    }
  }

  update(dt: number): void {
    for (let i = 0; i < this.bits.length; i++) {
      const b = this.bits[i]!;
      if (!b.live) continue;
      b.life -= dt;
      b.vel.y -= 28 * dt;
      b.mesh.position.addScaledVector(b.vel, dt);
      b.mesh.rotation.x += dt * 8;
      if (b.life <= 0) {
        b.live = false;
        b.mesh.visible = false;
      }
    }
    for (let i = 0; i < this.waves.length; i++) {
      const w = this.waves[i]!;
      if (!w.live) continue;
      w.life -= dt;
      const t = 1 - w.life / w.max;
      w.mesh.scale.setScalar(1 + t * 22);
      this.ringMat.opacity = 0.7 * (1 - t);
      if (w.life <= 0) {
        w.live = false;
        w.mesh.visible = false;
      }
    }
  }

  dispose(): void {
    this.group.clear();
    this.bits.length = 0;
    this.waves.length = 0;
  }

  private nextBit(): Bit | null {
    const limit = Math.min(this.cap, this.bits.length);
    for (let n = 0; n < limit; n++) {
      this.bitCursor = (this.bitCursor + 1) % limit;
      const b = this.bits[this.bitCursor]!;
      if (!b.live) return b;
    }
    const b = this.bits[this.bitCursor];
    return b ?? null;
  }

  private nextWave(): Wave | null {
    for (let n = 0; n < this.waves.length; n++) {
      this.waveCursor = (this.waveCursor + 1) % this.waves.length;
      const w = this.waves[this.waveCursor]!;
      if (!w.live) return w;
    }
    return this.waves[this.waveCursor] ?? null;
  }
}
