import * as THREE from "three";
import type { MonsterSpecies, QuestDef } from "../data/quests";
import type { AudioBus } from "../audio/AudioBus";
import type { Hulk } from "../player/Hulk";
import { worldExtent, type CityWorld } from "../world/CityWorld";

export type QuestMonster = {
  mesh: THREE.Group;
  name: string;
  species: MonsterSpecies;
  hp: number;
  maxHp: number;
  radius: number;
  damage: number;
  speed: number;
  alive: boolean;
  vel: THREE.Vector3;
  stun: number;
  attackCd: number;
  windup: number;
  hpFill: THREE.Mesh;
  hpBar: THREE.Group;
  spit: boolean;
};

type Shot = { mesh: THREE.Mesh; vel: THREE.Vector3; life: number; damage: number };

export class QuestSystem {
  readonly group = new THREE.Group();
  monsters: QuestMonster[] = [];
  private shots: Shot[] = [];
  private world: CityWorld;
  private prevLiving = 0;

  constructor(world: CityWorld) {
    this.world = world;
  }

  get markers(): THREE.Vector3[] {
    return this.monsters.filter((m) => m.alive).map((m) => m.mesh.position.clone());
  }

  get living(): QuestMonster[] {
    return this.monsters.filter((m) => m.alive);
  }

  spawnHunt(quest: QuestDef): void {
    this.clear();
    const species = quest.species;
    if (!species) return;
    const n = quest.goal;
    const named = quest.named ?? quest.name;
    for (let i = 0; i < n; i++) {
      const p = this.spot(species, i, n);
      this.monsters.push(this.makeMonster(species, named, p.x, p.z, n === 1));
    }
    this.prevLiving = this.monsters.length;
    const first = this.monsters[0];
    if (first) this.placeRing(first.mesh.position.x, first.mesh.position.z, species);
  }

  clear(): void {
    this.group.clear();
    this.monsters = [];
    this.shots = [];
    this.prevLiving = 0;
  }

  dispose(): void {
    this.clear();
  }

  update(dt: number, player: Hulk, audio: AudioBus): { playerHit: number; kills: number } {
    let playerHit = 0;
    const chest = new THREE.Vector3(player.position.x, player.chestY, player.position.z);
    for (const m of this.monsters) {
      if (!m.alive) {
        if (m.mesh.visible) {
          m.mesh.rotation.x = Math.min(1.3, m.mesh.rotation.x + dt * 2.4);
          m.vel.y -= 26 * dt;
          m.mesh.position.addScaledVector(m.vel, dt);
          if (m.mesh.position.y < 0.2) m.mesh.position.y = 0.2;
          m.hpBar.visible = false;
        }
        continue;
      }
      playerHit += this.think(dt, m, player, chest, audio);
    }
    for (let i = this.shots.length - 1; i >= 0; i--) {
      const s = this.shots[i]!;
      s.life -= dt;
      s.mesh.position.addScaledVector(s.vel, dt);
      const dx = s.mesh.position.x - player.position.x;
      const dz = s.mesh.position.z - player.position.z;
      if (Math.hypot(dx, dz) < player.radius + 0.8 && Math.abs(s.mesh.position.y - player.chestY) < 3.4) {
        playerHit += s.damage;
        this.group.remove(s.mesh);
        this.shots.splice(i, 1);
        continue;
      }
      if (s.life <= 0) {
        this.group.remove(s.mesh);
        this.shots.splice(i, 1);
      }
    }
    const living = this.living.length;
    const kills = Math.max(0, this.prevLiving - living);
    this.prevLiving = living;
    return { playerHit, kills };
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
    for (const m of this.monsters) {
      if (!m.alive) continue;
      const d = m.mesh.position.distanceTo(origin);
      if (d > radius + m.radius) continue;
      hits += 1;
      const falloff = 1 - Math.min(0.4, d / Math.max(1, radius));
      m.hp -= damage * falloff;
      const push = m.mesh.position.clone().sub(origin);
      push.y = 0;
      if (push.lengthSq() < 0.01) push.copy(facing);
      push.normalize();
      m.vel.set(push.x * (superHit ? 22 : 14), superHit ? 12 : 7, push.z * (superHit ? 22 : 14));
      m.stun = superHit ? 0.9 : 0.4;
      this.paintHp(m);
      if (m.hp <= 0) {
        m.alive = false;
        m.vel.y += 5;
        window.setTimeout(() => {
          m.mesh.visible = false;
        }, 1600);
      }
    }
    if (hits) audio.hit();
    return hits;
  }

  private think(dt: number, m: QuestMonster, player: Hulk, chest: THREE.Vector3, audio: AudioBus): number {
    let hit = 0;
    const pos = m.mesh.position;
    const to = new THREE.Vector3(player.position.x - pos.x, 0, player.position.z - pos.z);
    const dist = to.length();
    const keep = player.radius + m.radius + 0.6;
    m.hpBar.visible = m.hp < m.maxHp;
    if (m.hpBar.visible) m.hpBar.lookAt(chest);

    m.stun = Math.max(0, m.stun - dt);
    if (m.stun > 0 || pos.y > 0.2) {
      m.vel.y -= 30 * dt;
      pos.addScaledVector(m.vel, dt);
      if (pos.y < 0) {
        pos.y = 0;
        m.vel.set(m.vel.x * 0.35, 0, m.vel.z * 0.35);
      }
      this.clamp(pos, m.radius);
      return 0;
    }

    if (dist < keep && dist > 0.01) {
      pos.addScaledVector(to.normalize().multiplyScalar(-1), keep - dist);
    }

    if (m.spit && dist < 22 && dist > keep + 1.5) {
      const side = new THREE.Vector3(-to.z, 0, to.x).normalize();
      pos.addScaledVector(side, m.speed * 0.45 * dt);
    } else if (dist > keep + 0.5 && dist > 0.01) {
      pos.addScaledVector(to.normalize(), m.speed * dt);
    }
    this.clamp(pos, m.radius);
    if (dist > 0.2) m.mesh.lookAt(player.position.x, pos.y, player.position.z);

    m.attackCd = Math.max(0, m.attackCd - dt);
    if (m.spit && dist < 20 && dist > keep && m.attackCd <= 0) {
      m.attackCd = 1.7;
      this.spitAt(pos, chest, m.damage);
      audio.whoosh();
    } else if (!m.spit && dist < keep + 1.2 && m.attackCd <= 0) {
      m.attackCd = m.species === "golem" ? 1.5 : 1.15;
      m.windup = 0.32;
    }
    if (m.windup > 0) {
      m.windup -= dt;
      if (m.windup <= 0 && pos.distanceTo(player.position) < keep + 1.4) hit += m.damage;
    }
    return hit;
  }

  private clamp(pos: THREE.Vector3, radius: number): void {
    const r = this.world.resolveCircle(pos.x, pos.z, radius);
    pos.x = r.x;
    pos.z = r.z;
  }

  private spitAt(from: THREE.Vector3, to: THREE.Vector3, damage: number): void {
    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.28, 10, 10),
      new THREE.MeshLambertMaterial({ color: 0xc45a18, emissive: 0x882200, emissiveIntensity: 0.7 }),
    );
    mesh.position.set(from.x, 2.2, from.z);
    const vel = to.clone().sub(mesh.position).normalize().multiplyScalar(16);
    this.group.add(mesh);
    this.shots.push({ mesh, vel, life: 2.4, damage });
  }

  private spot(species: MonsterSpecies, i: number, n: number): { x: number; z: number } {
    const graph = this.world.graph;
    if (graph && graph.segs.length) {
      const plaza = graph.landmark("plaza");
      const door = graph.landmark("dungeon");
      if (species === "brute" && plaza) return graph.sidewalk(plaza.x, plaza.z, 1, 8);
      if (species === "wyrm" && door) return graph.sidewalk(door.x + 18, door.z, -1, 6);
      if (species === "golem" && plaza) return graph.sidewalk(plaza.x - 12, plaza.z + 10, 1, 5);
      const s = graph.segs[(i * 17 + n * 3) % graph.segs.length]!;
      const t = 0.25 + (i % 5) * 0.12;
      const curb = graph.sidewalk(s.ax + s.dx * t, s.az + s.dz * t, i % 2 === 0 ? 1 : -1, 4);
      return { x: curb.x, z: curb.z };
    }
    const ext = worldExtent() - 18;
    if (species === "brute") return { x: -6, z: -22 };
    if (species === "wyrm") return { x: 36, z: 8 };
    if (species === "golem") return { x: 10, z: 8 };
    const x = 28 + (i - (n - 1) / 2) * 6;
    const z = 16 + i * 3;
    return { x: Math.max(-ext, Math.min(ext, x)), z: Math.max(-ext, Math.min(ext, z)) };
  }

  private placeRing(x: number, z: number, species: MonsterSpecies): void {
    const col = species === "wyrm" ? 0xc45a18 : species === "golem" ? 0x8a9098 : species === "brute" ? 0x4a7a38 : 0x8899aa;
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(2.4, 3.1, 28),
      new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.45, side: THREE.DoubleSide, depthWrite: false }),
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(x, 0.1, z);
    this.group.add(ring);
    const beacon = new THREE.Mesh(
      new THREE.CylinderGeometry(0.18, 0.18, 14, 8),
      new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.32, depthWrite: false }),
    );
    beacon.position.set(x, 7, z);
    this.group.add(beacon);
  }

  private makeMonster(species: MonsterSpecies, name: string, x: number, z: number, named: boolean): QuestMonster {
    const g = new THREE.Group();
    const stats = {
      hound: { hp: 96, radius: 1.1, damage: 11, speed: 7.2, spit: false },
      brute: { hp: 340, radius: 2.1, damage: 18, speed: 4.4, spit: false },
      wyrm: { hp: 300, radius: 1.8, damage: 14, speed: 5.2, spit: true },
      golem: { hp: 420, radius: 2.3, damage: 22, speed: 3.4, spit: false },
    }[species];
    const hp = named ? Math.round(stats.hp * 1.12) : stats.hp;
    this.sculpt(g, species);
    g.position.set(x, 0, z);
    g.castShadow = true;
    this.group.add(g);

    const hpBar = new THREE.Group();
    hpBar.position.y = species === "hound" ? 2.1 : 4.2;
    const bg = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 0.1), new THREE.MeshBasicMaterial({ color: 0x1a100c, depthTest: false }));
    const hpFill = new THREE.Mesh(new THREE.PlaneGeometry(1.04, 0.06), new THREE.MeshBasicMaterial({ color: 0xe74c3c, depthTest: false }));
    hpFill.position.z = 0.02;
    hpBar.add(bg, hpFill);
    hpBar.visible = false;
    g.add(hpBar);

    const m: QuestMonster = {
      mesh: g,
      name,
      species,
      hp,
      maxHp: hp,
      radius: stats.radius,
      damage: stats.damage,
      speed: stats.speed,
      alive: true,
      vel: new THREE.Vector3(),
      stun: 0,
      attackCd: 0.4,
      windup: 0,
      hpFill,
      hpBar,
      spit: stats.spit,
    };
    this.paintHp(m);
    return m;
  }

  private paintHp(m: QuestMonster): void {
    const t = Math.max(0, m.hp / m.maxHp);
    m.hpFill.scale.x = Math.max(0.06, t);
    m.hpFill.position.x = (t - 1) * 0.52;
  }

  private sculpt(g: THREE.Group, species: MonsterSpecies): void {
    if (species === "hound") {
      const steel = new THREE.MeshLambertMaterial({ color: 0x8a96a4 });
      const dark = new THREE.MeshLambertMaterial({ color: 0x2a3038 });
      const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.42, 1.1, 6, 10), steel);
      body.rotation.z = Math.PI / 2;
      body.position.set(0, 0.85, 0);
      body.castShadow = true;
      g.add(body);
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.32, 12, 10), dark);
      head.position.set(0, 0.95, 0.85);
      g.add(head);
      const jaw = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.12, 0.38), dark);
      jaw.position.set(0, 0.72, 1.05);
      g.add(jaw);
      for (const [x, z] of [
        [-0.28, 0.45],
        [0.28, 0.45],
        [-0.28, -0.45],
        [0.28, -0.45],
      ]) {
        const leg = new THREE.Mesh(new THREE.CapsuleGeometry(0.1, 0.45, 4, 8), steel);
        leg.position.set(x, 0.4, z);
        g.add(leg);
      }
      return;
    }
    if (species === "brute") {
      const hide = new THREE.MeshLambertMaterial({ color: 0x4a7a38 });
      const belly = new THREE.MeshLambertMaterial({ color: 0x6a8a48 });
      const body = new THREE.Mesh(new THREE.SphereGeometry(1.15, 16, 12), hide);
      body.scale.set(1.1, 0.95, 0.9);
      body.position.y = 1.35;
      body.castShadow = true;
      g.add(body);
      const gut = new THREE.Mesh(new THREE.SphereGeometry(0.7, 12, 10), belly);
      gut.position.set(0, 1.05, 0.45);
      g.add(gut);
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.55, 14, 12), hide);
      head.position.set(0, 2.35, 0.35);
      g.add(head);
      for (const s of [-1, 1]) {
        const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.22, 1.1, 6, 8), hide);
        arm.position.set(s * 1.05, 1.4, 0.2);
        arm.rotation.z = s * 0.45;
        g.add(arm);
      }
      return;
    }
    if (species === "wyrm") {
      const scale = new THREE.MeshLambertMaterial({ color: 0x3a6a7a, emissive: 0x123038, emissiveIntensity: 0.25 });
      const wing = new THREE.MeshLambertMaterial({ color: 0xc45a18 });
      for (let i = 0; i < 5; i++) {
        const seg = new THREE.Mesh(new THREE.SphereGeometry(0.42 - i * 0.04, 12, 10), scale);
        seg.position.set(0, 1.1, -i * 0.7);
        seg.castShadow = true;
        g.add(seg);
      }
      const head = new THREE.Mesh(new THREE.ConeGeometry(0.38, 0.9, 8), scale);
      head.rotation.x = Math.PI / 2;
      head.position.set(0, 1.2, 0.7);
      g.add(head);
      for (const s of [-1, 1]) {
        const w = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.08, 0.55), wing);
        w.position.set(s * 0.7, 1.35, -0.2);
        w.rotation.z = s * -0.25;
        g.add(w);
      }
      return;
    }
    const rock = new THREE.MeshLambertMaterial({ color: 0x8a9098 });
    const moss = new THREE.MeshLambertMaterial({ color: 0x4a6a40 });
    const base = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.1, 1.4), rock);
    base.position.y = 0.55;
    base.castShadow = true;
    g.add(base);
    const torso = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.4, 1.1), rock);
    torso.position.y = 1.7;
    g.add(torso);
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.7, 0.75), moss);
    head.position.y = 2.7;
    g.add(head);
    for (const s of [-1, 1]) {
      const arm = new THREE.Mesh(new THREE.BoxGeometry(0.45, 1.5, 0.45), rock);
      arm.position.set(s * 1.15, 1.5, 0);
      g.add(arm);
    }
  }
}
