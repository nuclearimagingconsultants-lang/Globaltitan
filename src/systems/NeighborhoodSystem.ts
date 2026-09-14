import * as THREE from "three";
import {
  DISTRICT_COPY,
  District,
  HERO_GATE_X,
  IRON_WARRENS,
  SKYLINE_HEROES,
  VILLAIN_GATE_X,
  districtAt,
  type DistrictId,
  type StreetHeroDef,
  type StreetVillainDef,
} from "../data/districts";
import type { AudioBus } from "../audio/AudioBus";
import type { Hulk } from "../player/Hulk";
import type { CrimeSystem } from "./CrimeSystem";
import type { EnemyDirector } from "./EnemyDirector";
import { worldExtent, type CityWorld } from "../world/CityWorld";

type Ally = {
  def: StreetHeroDef;
  mesh: THREE.Group;
  home: THREE.Vector3;
  teamed: boolean;
  attackCd: number;
  phase: number;
  hover: number;
};

type Hostile = {
  def: StreetVillainDef;
  mesh: THREE.Group;
  home: THREE.Vector3;
  hp: number;
  maxHp: number;
  alive: boolean;
  attackCd: number;
  vel: THREE.Vector3;
  stun: number;
  hpFill: THREE.Mesh;
  hpBar: THREE.Group;
  radius: number;
  damage: number;
  speed: number;
  spit: boolean;
  hesitate: number;
  windup: number;
};

export class NeighborhoodSystem {
  readonly group = new THREE.Group();
  district: DistrictId = District.Neutral;
  private allies: Ally[] = [];
  private hostiles: Hostile[] = [];
  private world: CityWorld;
  private enabled: boolean;
  private heroSchematic: THREE.Mesh;
  private villainSchematic: THREE.Mesh;
  private blend = { sky: new THREE.Color(), fog: new THREE.Color(), hemi: new THREE.Color(), ground: new THREE.Color(), sun: new THREE.Color() };
  private time = 0;
  private downed: string[] = [];
  director: EnemyDirector | null = null;
  heroUnlocked = true;
  villainUnlocked = true;

  bindDirector(d: EnemyDirector): void {
    this.director = d;
  }

  constructor(world: CityWorld) {
    this.world = world;
    this.enabled = world.city.id === "new-york" && !world.mapsLite;
    this.heroSchematic = this.gridPlane(0xc9a227);
    this.villainSchematic = this.gridPlane(0x8a2030);
    this.heroSchematic.position.set(HERO_GATE_X + 48, 0.06, 0);
    this.villainSchematic.position.set(VILLAIN_GATE_X - 48, 0.06, 0);
    this.heroSchematic.material = this.heroSchematic.material as THREE.MeshBasicMaterial;
    (this.heroSchematic.material as THREE.MeshBasicMaterial).opacity = 0.08;
    (this.villainSchematic.material as THREE.MeshBasicMaterial).opacity = 0.08;
    this.group.add(this.heroSchematic, this.villainSchematic);
    if (this.enabled) {
      this.buildGates();
      this.spawnCast();
    }
  }

  get squad(): string[] {
    return this.allies.filter((a) => a.teamed).map((a) => a.def.name);
  }

  get focusedVillain(): { name: string; hp: number; maxHp: number } | null {
    const living = this.hostiles.filter((h) => h.alive);
    if (!living.length || this.district !== District.Villains) return null;
    let best = living[0]!;
    let bestHp = best.hp / best.maxHp;
    for (const h of living) {
      const t = h.hp / h.maxHp;
      if (t < bestHp) {
        best = h;
        bestHp = t;
      }
    }
    const hurt = living.find((h) => h.hp < h.maxHp);
    const pick = hurt ?? best;
    return { name: pick.def.name, hp: pick.hp, maxHp: pick.maxHp };
  }

  get markers(): { x: number; z: number; kind: "hero" | "villain" | "gate" }[] {
    if (!this.enabled) return [];
    const out: { x: number; z: number; kind: "hero" | "villain" | "gate" }[] = [
      { x: HERO_GATE_X + 8, z: 0, kind: "gate" },
      { x: VILLAIN_GATE_X - 8, z: 0, kind: "gate" },
    ];
    for (const a of this.allies) out.push({ x: a.mesh.position.x, z: a.mesh.position.z, kind: "hero" });
    for (const h of this.hostiles) {
      if (h.alive) out.push({ x: h.mesh.position.x, z: h.mesh.position.z, kind: "villain" });
    }
    return out;
  }

  nearestRecruit(from: THREE.Vector3): Ally | null {
    let best: Ally | null = null;
    let bestD = 9;
    for (const a of this.allies) {
      const d = a.mesh.position.distanceTo(from);
      if (d < bestD) {
        bestD = d;
        best = a;
      }
    }
    return best;
  }

  tryRecruit(from: THREE.Vector3): string | null {
    if (!this.enabled) return null;
    if (!this.heroUnlocked) return null;
    if (this.district !== District.Heroes) return null;
    const a = this.nearestRecruit(from);
    if (!a) return null;
    a.teamed = !a.teamed;
    return a.teamed ? `${a.def.name} falls in` : `${a.def.name} holds the block`;
  }

  update(
    dt: number,
    player: Hulk,
    crimes: CrimeSystem,
    audio: AudioBus,
    scene: THREE.Scene,
    hemi: THREE.HemisphereLight,
    sun: THREE.DirectionalLight,
  ): { playerHit: number; toast: string; districtChanged: boolean } {
    if (!this.enabled) return { playerHit: 0, toast: "", districtChanged: false };
    this.time += dt;
    const next = districtAt(player.position.x, this.world.city.id);
    const changed = next !== this.district;
    if (changed) {
      this.district = next;
      if (next !== District.Heroes) {
        for (const a of this.allies) a.teamed = false;
      }
    }
    this.paintLook(dt, scene, hemi, sun);
    this.driveSchematic();
    this.heroSchematic.visible = this.heroUnlocked;
    this.villainSchematic.visible = this.villainUnlocked;
    let playerHit = 0;
    if (this.heroUnlocked) {
      for (const a of this.allies) {
        a.mesh.visible = true;
        this.thinkAlly(dt, a, player, crimes);
      }
    } else {
      for (const a of this.allies) a.mesh.visible = false;
    }
    if (this.villainUnlocked) {
      for (const h of this.hostiles) {
        h.mesh.visible = h.alive;
        if (!h.alive) {
          h.mesh.rotation.x = Math.min(1.2, h.mesh.rotation.x + dt * 2);
          continue;
        }
        playerHit += this.thinkHostile(dt, h, player, audio);
      }
    } else {
      for (const h of this.hostiles) h.mesh.visible = false;
    }
    let toast = "";
    if (changed) {
      if (next === District.Heroes && !this.heroUnlocked) toast = "Skyline Heroes locked — smash more. Rage Rep 80.";
      else if (next === District.Villains && !this.villainUnlocked) toast = "Iron Warrens locked — smash more. Rage Rep 280.";
      else toast = DISTRICT_COPY[next].toast;
    }
    return { playerHit, toast, districtChanged: changed };
  }

  applySmash(
    origin: THREE.Vector3,
    radius: number,
    damage: number,
    audio: AudioBus,
    facing: THREE.Vector3,
    superHit: boolean,
  ): number {
    if (!this.enabled) return 0;
    let hits = 0;
    for (const h of this.hostiles) {
      if (!h.alive) continue;
      const d = h.mesh.position.distanceTo(origin);
      if (d > radius + h.radius) continue;
      hits += 1;
      h.hp -= damage * (superHit ? 1 : 0.85);
      const push = h.mesh.position.clone().sub(origin);
      push.y = 0;
      if (push.lengthSq() < 0.01) push.copy(facing);
      push.normalize();
      h.vel.set(push.x * (superHit ? 18 : 11), superHit ? 10 : 6, push.z * (superHit ? 18 : 11));
      h.stun = superHit ? 0.8 : 0.35;
      this.paintHp(h);
      if (h.hp <= 0) {
        h.alive = false;
        this.downed.push(h.def.name);
        window.setTimeout(() => this.respawnHostile(h), 16000);
      }
    }
    if (hits) audio.hit();
    return hits;
  }

  consumeDowned(): string[] {
    const names = this.downed;
    this.downed = [];
    return names;
  }

  stunRadius(origin: THREE.Vector3, radius: number, seconds: number): number {
    if (!this.enabled) return 0;
    let n = 0;
    for (const h of this.hostiles) {
      if (!h.alive) continue;
      if (h.mesh.position.distanceTo(origin) > radius + h.radius) continue;
      h.stun = Math.max(h.stun, seconds);
      n += 1;
    }
    return n;
  }

  dispose(): void {
    this.group.clear();
    this.allies = [];
    this.hostiles = [];
  }

  private thinkAlly(dt: number, a: Ally, player: Hulk, crimes: CrimeSystem): void {
    a.phase += dt;
    const pos = a.mesh.position;
    const crime = crimes.nearest(pos);
    const crimeNear = crime && !crime.cleared && crime.position.distanceTo(pos) < 36;
    let tx = a.home.x + Math.sin(a.phase * 0.45 + a.hover) * 7;
    let tz = a.home.z + Math.cos(a.phase * 0.38 + a.hover) * 6;
    if (a.teamed && this.district === District.Heroes) {
      const side = a.hover * 2.4;
      tx = player.position.x + Math.sin(this.time * 1.2 + a.hover) * (3.6 + side);
      tz = player.position.z + Math.cos(this.time * 1.1 + a.hover) * 3.2 - 2.4;
    } else if (crimeNear && crime) {
      tx = crime.position.x + Math.sin(a.hover) * 2.2;
      tz = crime.position.z + Math.cos(a.hover) * 2.2;
    }
    const dx = tx - pos.x;
    const dz = tz - pos.z;
    const dist = Math.hypot(dx, dz);
    const speed = a.teamed ? 11 : crimeNear ? 8.5 : 4.2;
    if (dist > 0.4) {
      pos.x += (dx / dist) * speed * dt;
      pos.z += (dz / dist) * speed * dt;
    }
    const hover = a.def.id === "holt" ? 3.4 + Math.sin(this.time * 2.1 + a.hover) * 0.45 : 0;
    pos.y = hover;
    const look = this.world.resolveCircle(pos.x, pos.z, 0.9);
    pos.x = look.x;
    pos.z = look.z;
    if (dist > 0.2) a.mesh.lookAt(tx, pos.y, tz);

    a.attackCd = Math.max(0, a.attackCd - dt);
    if (crimeNear && crime && a.attackCd <= 0) {
      const struck = crimes.allyStrike(pos, 4.2, a.teamed ? 38 : 22);
      if (struck) a.attackCd = 0.85;
    }
  }

  private thinkHostile(dt: number, h: Hostile, player: Hulk, audio: AudioBus): number {
    let hit = 0;
    const pos = h.mesh.position;
    const inWarrens = this.district === District.Villains;
    const to = new THREE.Vector3(player.position.x - pos.x, 0, player.position.z - pos.z);
    const dist = to.length();
    h.hpBar.visible = h.hp < h.maxHp;
    if (h.hpBar.visible) h.hpBar.lookAt(player.position.x, player.chestY, player.position.z);
    h.stun = Math.max(0, h.stun - dt);
    if (h.stun > 0 || pos.y > 0.15) {
      h.vel.y -= 28 * dt;
      pos.addScaledVector(h.vel, dt);
      if (pos.y < 0) {
        pos.y = 0;
        h.vel.set(0, 0, 0);
      }
      return 0;
    }
    const dir = this.director;
    const lod = dir?.lod(dist) ?? (dist > 50 ? "cheap" : "full");
    if (lod === "none") return 0;
    const noticed = (dir?.notice(dist, player, inWarrens || dist < 16) ?? inWarrens) || dist < 20;
    if (noticed && dist > 0.01 && lod === "cheap") {
      if (dist > player.radius + 3) pos.addScaledVector(to.normalize(), h.speed * 0.4 * dt);
      return 0;
    }
    if (noticed && dist > 0.01) {
      if (h.hesitate === undefined) (h as Hostile).hesitate = dir?.hesitate(player) ?? 0;
      h.hesitate = Math.max(0, (h.hesitate ?? 0) - dt);
      const keep = player.radius + h.radius + 0.5;
      const packI = this.hostiles.indexOf(h);
      if (dir && h.hesitate <= 0) {
        const stepped = dir.steer(dt, player, {
          pos,
          state: dist < 12 ? "engage" : "stalk",
          role: h.spit ? "support" : packI % 2 === 0 ? "rusher" : "flanker",
          hesitate: 0,
          backoff: dir.aoePush() ? 0.6 : 0,
          hpRatio: h.hp / h.maxHp,
          packIndex: packI,
          packSize: this.hostiles.length,
          dist,
          toX: to.x,
          toZ: to.z,
        });
        pos.x += stepped.vx * dt;
        pos.z += stepped.vz * dt;
      } else if (h.hesitate <= 0) {
        if (dist > keep + 0.6) pos.addScaledVector(to.normalize(), h.speed * dt);
        else if (dist < keep) pos.addScaledVector(to.normalize().multiplyScalar(-1), keep - dist);
      }
      const r = this.world.resolveCircle(pos.x, pos.z, h.radius);
      pos.x = r.x;
      pos.z = r.z;
      h.mesh.lookAt(player.position.x, pos.y, player.position.z);
      if (h.hesitate > 0) return 0;
      h.attackCd = Math.max(0, h.attackCd - dt);
      if (h.windup === undefined) h.windup = 0;
      if (h.spit && dist < 16 && dist > keep && h.attackCd <= 0) {
        h.attackCd = 1.8;
        h.windup = 0.65;
        audio.whoosh();
      } else if (!h.spit && dist < keep + 1.1 && h.attackCd <= 0) {
        h.attackCd = 1.45;
        h.windup = 0.5;
        audio.whoosh();
      }
      if (h.windup > 0) {
        h.windup -= dt;
        h.mesh.rotation.x = -0.16;
        if (h.windup <= 0) {
          h.mesh.rotation.x = 0;
          if (h.spit && dist < 14) hit += h.damage * 0.7;
          else if (!h.spit && dist < keep + 1.2) hit += h.damage;
        }
      }
    } else {
      const tx = h.home.x + Math.sin(this.time * 0.4) * 4;
      const tz = h.home.z + Math.cos(this.time * 0.35) * 4;
      pos.x += (tx - pos.x) * dt * 1.4;
      pos.z += (tz - pos.z) * dt * 1.4;
    }
    return hit;
  }

  private paintLook(dt: number, scene: THREE.Scene, hemi: THREE.HemisphereLight, sun: THREE.DirectionalLight): void {
    const goal = DISTRICT_COPY[this.district];
    const k = 1 - Math.exp(-2.4 * dt);
    const theme = this.world.theme;
    const sky = this.district === District.Neutral ? theme.sky : goal.sky;
    const fog = this.district === District.Neutral ? theme.fog : goal.fog;
    const hs = this.district === District.Neutral ? theme.hemiSky : goal.hemiSky;
    const hg = this.district === District.Neutral ? theme.hemiGround : goal.hemiGround;
    const sunC = this.district === District.Neutral ? theme.sunColor : goal.sun;
    const sunI = this.district === District.Neutral ? Math.max(1.05, theme.sunIntensity) : goal.sunI;
    this.blend.sky.setHex(sky);
    this.blend.fog.setHex(fog);
    this.blend.hemi.setHex(hs);
    this.blend.ground.setHex(hg);
    this.blend.sun.setHex(sunC);
    if (scene.background instanceof THREE.Color) scene.background.lerp(this.blend.sky, k);
    if (scene.fog instanceof THREE.Fog) {
      scene.fog.color.lerp(this.blend.fog, k);
    }
    hemi.color.lerp(this.blend.hemi, k);
    hemi.groundColor.lerp(this.blend.ground, k);
    sun.color.lerp(this.blend.sun, k);
    sun.intensity += (sunI - sun.intensity) * k;
  }

  private driveSchematic(): void {
    const heroOn = this.district === District.Heroes;
    const villOn = this.district === District.Villains;
    const hm = this.heroSchematic.material as THREE.MeshBasicMaterial;
    const vm = this.villainSchematic.material as THREE.MeshBasicMaterial;
    hm.opacity += ((heroOn ? 0.42 : 0.07) - hm.opacity) * 0.08;
    vm.opacity += ((villOn ? 0.4 : 0.07) - vm.opacity) * 0.08;
    this.heroSchematic.rotation.z = this.time * 0.04;
    this.villainSchematic.rotation.z = -this.time * 0.03;
  }

  private spawnCast(): void {
    const homes = [
      new THREE.Vector3(HERO_GATE_X + 28, 0, 8),
      new THREE.Vector3(HERO_GATE_X + 36, 0, -12),
      new THREE.Vector3(HERO_GATE_X + 20, 0, 22),
    ];
    SKYLINE_HEROES.forEach((def, i) => {
      const mesh = this.sculptHero(def);
      const home = homes[i]!.clone();
      mesh.position.copy(home);
      this.group.add(mesh);
      this.allies.push({ def, mesh, home, teamed: false, attackCd: 0.4, phase: i * 1.7, hover: i + 1 });
    });
    const dens = [
      new THREE.Vector3(VILLAIN_GATE_X - 28, 0, 6),
      new THREE.Vector3(VILLAIN_GATE_X - 36, 0, -14),
      new THREE.Vector3(VILLAIN_GATE_X - 20, 0, 20),
    ];
    IRON_WARRENS.forEach((def, i) => {
      const mesh = this.sculptVillain(def);
      const home = dens[i]!.clone();
      mesh.position.copy(home);
      this.group.add(mesh);
      const stats =
        def.id === "lode"
          ? { hp: 280, radius: 1.6, damage: 16, speed: 3.8, spit: false }
          : def.id === "choir"
            ? { hp: 220, radius: 1.3, damage: 13, speed: 4.6, spit: true }
            : { hp: 240, radius: 1.4, damage: 14, speed: 4.2, spit: true };
      const hpBar = new THREE.Group();
      hpBar.position.y = 3.6;
      const bg = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 0.1), new THREE.MeshBasicMaterial({ color: 0x1a100c, depthTest: false }));
      const hpFill = new THREE.Mesh(new THREE.PlaneGeometry(1.04, 0.06), new THREE.MeshBasicMaterial({ color: 0xe74c3c, depthTest: false }));
      hpFill.position.z = 0.02;
      hpBar.add(bg, hpFill);
      hpBar.visible = false;
      mesh.add(hpBar);
      const h: Hostile = {
        def,
        mesh,
        home,
        hp: stats.hp,
        maxHp: stats.hp,
        alive: true,
        attackCd: 0.5,
        vel: new THREE.Vector3(),
        stun: 0,
        hpFill,
        hpBar,
        radius: stats.radius,
        damage: stats.damage,
        speed: stats.speed,
        spit: stats.spit,
        hesitate: 0,
        windup: 0,
      };
      this.hostiles.push(h);
    });
  }

  private respawnHostile(h: Hostile): void {
    h.alive = true;
    h.hp = h.maxHp;
    h.mesh.visible = true;
    h.mesh.rotation.x = 0;
    h.mesh.position.copy(h.home);
    h.vel.set(0, 0, 0);
    this.paintHp(h);
  }

  private paintHp(h: Hostile): void {
    const t = Math.max(0, h.hp / h.maxHp);
    h.hpFill.scale.x = Math.max(0.06, t);
    h.hpFill.position.x = (t - 1) * 0.52;
  }

  private buildGates(): void {
    this.group.add(this.arch(HERO_GATE_X + 2, 0, 0xc9a227, 0xffe08a, "SKYLINE HEROES"));
    this.group.add(this.arch(VILLAIN_GATE_X - 2, 0, 0x6a2030, 0xc45a18, "IRON WARRENS"));
    this.group.add(this.banner(HERO_GATE_X + 32, 18, 0xc9a227, "WATCH"));
    this.group.add(this.banner(VILLAIN_GATE_X - 32, -16, 0x8a2030, "CLAIM"));
  }

  private arch(x: number, z: number, color: number, glow: number, label: string): THREE.Group {
    const g = new THREE.Group();
    const stone = new THREE.MeshLambertMaterial({ color, emissive: glow, emissiveIntensity: 0.22 });
    const left = new THREE.Mesh(new THREE.BoxGeometry(1.6, 12, 1.6), stone);
    left.position.set(x, 6, z - 6);
    const right = new THREE.Mesh(new THREE.BoxGeometry(1.6, 12, 1.6), stone);
    right.position.set(x, 6, z + 6);
    const beam = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.4, 14), stone);
    beam.position.set(x, 12.4, z);
    g.add(left, right, beam);
    const sign = this.canvasSign(label, color);
    sign.position.set(x + (x > 0 ? -0.95 : 0.95), 12.4, z);
    sign.rotation.y = x > 0 ? Math.PI / 2 : -Math.PI / 2;
    g.add(sign);
    return g;
  }

  private banner(x: number, z: number, color: number, label: string): THREE.Group {
    const g = new THREE.Group();
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 9, 8), new THREE.MeshLambertMaterial({ color: 0x2a2420 }));
    pole.position.set(x, 4.5, z);
    const cloth = new THREE.Mesh(
      new THREE.PlaneGeometry(3.2, 2.2),
      new THREE.MeshLambertMaterial({ color, emissive: color, emissiveIntensity: 0.35, side: THREE.DoubleSide }),
    );
    cloth.position.set(x + 1.5, 7.2, z);
    g.add(pole, cloth, this.canvasSign(label, color));
    g.children[2]!.position.set(x + 1.5, 7.2, z + 0.04);
    return g;
  }

  private canvasSign(text: string, color: number): THREE.Mesh {
    const c = document.createElement("canvas");
    c.width = 512;
    c.height = 128;
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = "#120c08";
    ctx.fillRect(0, 0, 512, 128);
    ctx.fillStyle = `#${color.toString(16).padStart(6, "0")}`;
    ctx.font = "700 42px Outfit, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, 256, 64);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(7.2, 1.8), new THREE.MeshBasicMaterial({ map: tex, transparent: true }));
    return mesh;
  }

  private gridPlane(color: number): THREE.Mesh {
    const c = document.createElement("canvas");
    c.width = 256;
    c.height = 256;
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = "rgba(0,0,0,0)";
    ctx.fillRect(0, 0, 256, 256);
    ctx.strokeStyle = `#${color.toString(16).padStart(6, "0")}`;
    ctx.lineWidth = 2;
    for (let i = 0; i <= 8; i++) {
      ctx.beginPath();
      ctx.moveTo((i / 8) * 256, 0);
      ctx.lineTo((i / 8) * 256, 256);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, (i / 8) * 256);
      ctx.lineTo(256, (i / 8) * 256);
      ctx.stroke();
    }
    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(6, 6);
    tex.colorSpace = THREE.SRGBColorSpace;
    const mat = new THREE.MeshBasicMaterial({
      map: tex,
      color,
      transparent: true,
      opacity: 0.08,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(88, worldExtent()), mat);
    mesh.rotation.x = -Math.PI / 2;
    return mesh;
  }

  private sculptHero(def: StreetHeroDef): THREE.Group {
    const g = new THREE.Group();
    const plate = new THREE.MeshLambertMaterial({ color: def.color, emissive: def.color, emissiveIntensity: 0.18 });
    const trim = new THREE.MeshLambertMaterial({ color: def.accent });
    if (def.id === "holt") {
      const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.42, 1.15, 6, 10), plate);
      body.position.y = 1.55;
      body.castShadow = true;
      g.add(body);
      const helm = new THREE.Mesh(new THREE.SphereGeometry(0.34, 12, 10), plate);
      helm.position.y = 2.45;
      g.add(helm);
      const crown = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.45, 6), trim);
      crown.position.y = 2.85;
      g.add(crown);
      const cape = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.5, 0.7), trim);
      cape.position.set(0, 1.4, -0.45);
      g.add(cape);
      return g;
    }
    if (def.id === "vesper") {
      const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.28, 1.05, 6, 10), plate);
      body.position.y = 1.35;
      body.castShadow = true;
      g.add(body);
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.24, 12, 10), trim);
      head.position.y = 2.15;
      g.add(head);
      for (const s of [-1, 1]) {
        const vane = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.06, 0.35), plate);
        vane.position.set(s * 0.55, 1.55, -0.1);
        vane.rotation.z = s * -0.35;
        g.add(vane);
      }
      return g;
    }
    const body = new THREE.Mesh(new THREE.BoxGeometry(1.05, 1.4, 0.7), plate);
    body.position.y = 1.2;
    body.castShadow = true;
    g.add(body);
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.45, 0.45), trim);
    head.position.y = 2.15;
    g.add(head);
    return g;
  }

  private sculptVillain(def: StreetVillainDef): THREE.Group {
    const g = new THREE.Group();
    const hide = new THREE.MeshLambertMaterial({ color: def.color, emissive: def.accent, emissiveIntensity: 0.2 });
    const trim = new THREE.MeshLambertMaterial({ color: def.accent });
    if (def.id === "lode") {
      const core = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.5, 1.2), hide);
      core.position.y = 1.1;
      core.castShadow = true;
      g.add(core);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(1.05, 0.08, 8, 18), trim);
      ring.rotation.x = Math.PI / 2;
      ring.position.y = 1.4;
      g.add(ring);
      const head = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.55, 0.7), hide);
      head.position.y = 2.15;
      g.add(head);
      return g;
    }
    if (def.id === "choir") {
      const robe = new THREE.Mesh(new THREE.ConeGeometry(0.85, 2.1, 8), hide);
      robe.position.y = 1.05;
      g.add(robe);
      for (let i = 0; i < 3; i++) {
        const mouth = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 8), trim);
        mouth.position.set((i - 1) * 0.38, 2.15, 0.15);
        g.add(mouth);
      }
      return g;
    }
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.4, 1.2, 6, 10), hide);
    body.position.y = 1.4;
    g.add(body);
    for (let i = 0; i < 5; i++) {
      const shard = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.7, 5), trim);
      shard.position.set(Math.sin(i) * 0.45, 2.1 + (i % 2) * 0.2, Math.cos(i) * 0.35);
      shard.rotation.z = i * 0.4;
      g.add(shard);
    }
    return g;
  }
}
