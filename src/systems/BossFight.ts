import * as THREE from "three";
import type { CityDef } from "../data/types";
import type { AudioBus } from "../audio/AudioBus";
import type { Hulk } from "../player/Hulk";

import type { EnemyDirector } from "./EnemyDirector";

type Attack = "idle" | "charge" | "slam" | "ring";
type Phase = "bait" | "punish" | "special";

export class BossFight {
  readonly group = new THREE.Group();
  readonly mesh: THREE.Group;
  hp: number;
  maxHp: number;
  active = false;
  defeated = false;
  name: string;
  title: string;
  private attack: Attack = "idle";
  private timer = 2;
  private wind = 0;
  private vel = new THREE.Vector3();
  private telegraph: THREE.Mesh;
  private ring: THREE.Mesh;
  private pos = new THREE.Vector3(0, 0, -6);
  director: EnemyDirector | null = null;
  private phase: Phase = "bait";
  private adds: { mesh: THREE.Group; pos: THREE.Vector3; hp: number; wind: number }[] = [];
  private addGate = 0.66;

  constructor(city: CityDef) {
    this.name = city.boss.name;
    this.title = city.boss.title;
    this.maxHp = 520;
    this.hp = this.maxHp;
    this.mesh = this.buildMesh(city);
    this.mesh.position.copy(this.pos);
    this.group.add(this.mesh);

    this.telegraph = new THREE.Mesh(
      new THREE.CircleGeometry(1, 28),
      new THREE.MeshBasicMaterial({ color: 0xff3333, transparent: true, opacity: 0, side: THREE.DoubleSide }),
    );
    this.telegraph.rotation.x = -Math.PI / 2;
    this.telegraph.position.y = 0.08;
    this.group.add(this.telegraph);

    this.ring = new THREE.Mesh(
      new THREE.RingGeometry(0.6, 1.1, 32),
      new THREE.MeshBasicMaterial({ color: 0xff6644, transparent: true, opacity: 0, side: THREE.DoubleSide }),
    );
    this.ring.rotation.x = -Math.PI / 2;
    this.ring.position.y = 0.1;
    this.group.add(this.ring);
  }

  start(): void {
    this.active = true;
    this.defeated = false;
    this.hp = this.maxHp;
    this.attack = "idle";
    this.phase = "bait";
    this.addGate = 0.66;
    this.clearAdds();
    this.timer = 1.6;
    this.pos.set(0, 0, -6);
    this.mesh.position.copy(this.pos);
    this.mesh.visible = true;
    this.mesh.rotation.x = 0;
  }

  applySmash(origin: THREE.Vector3, radius: number, damage: number, audio: AudioBus): boolean {
    if (!this.active || this.defeated) return false;
    if (this.pos.distanceTo(origin) <= radius + 1.6) {
      this.hp = Math.max(0, this.hp - damage);
      audio.hit();
      this.mesh.scale.setScalar(1.08);
      if (this.hp <= 0) {
        this.defeated = true;
        this.active = false;
        this.mesh.rotation.x = 1.2;
        this.telegraph.material = this.fade(this.telegraph, 0);
        audio.success();
      }
      return true;
    }
    for (const a of this.adds) {
      if (a.hp <= 0) continue;
      if (a.pos.distanceTo(origin) <= radius + 0.8) {
        a.hp = Math.max(0, a.hp - damage);
        if (a.hp <= 0) a.mesh.visible = false;
        return true;
      }
    }
    return false;
  }

  update(dt: number, player: Hulk, audio: AudioBus): number {
    if (!this.active || this.defeated) {
      this.hideTelegraphs();
      return 0;
    }
    this.mesh.scale.lerp(new THREE.Vector3(1, 1, 1), 0.15);
    this.timer -= dt;
    let dmg = 0;

    const toPlayer = player.position.clone().sub(this.pos);
    toPlayer.y = 0;

    dmg += this.tickAdds(dt, player);
    if (this.attack === "idle") {
      if (toPlayer.length() > 4.2) {
        const dir = toPlayer.normalize();
        const hesitate = player.isHulk && !player.isBruce ? 0.55 : 1;
        this.pos.addScaledVector(dir, 2.4 * hesitate * dt);
        this.mesh.lookAt(player.position.x, 0, player.position.z);
      }
      this.hideTelegraphs();
      if (player.smashActive > 0 && this.pos.distanceTo(player.smashOrigin()) > 7) this.phase = "punish";
      const livingAdds = this.adds.filter((a) => a.hp > 0).length;
      if (this.timer <= 0) {
        if (livingAdds > 0 && this.phase !== "punish") {
          this.timer = 0.8;
        } else {
          if (this.hp / this.maxHp < this.addGate) {
            this.addGate -= 0.33;
            this.spawnAdds();
            this.phase = "bait";
            this.timer = 2;
            audio.whoosh();
          } else {
            const kind =
              this.phase === "punish" ? "charge" : this.phase === "special" ? "ring" : this.hp < this.maxHp * 0.45 ? "slam" : Math.random() < 0.5 ? "charge" : "slam";
            this.begin(kind, kind === "charge" ? 0.9 : 1.05, player);
            this.phase = this.phase === "punish" ? "special" : "bait";
            audio.whoosh();
          }
        }
      }
    } else if (this.attack === "charge") {
      this.wind -= dt;
      this.showLine(player);
      if (this.wind <= 0) {
        this.pos.addScaledVector(this.vel, dt);
        if (this.pos.distanceTo(player.position) < 2.4) {
          dmg = 22;
          this.finish();
        } else if (this.timer <= 0) this.finish();
      }
    } else if (this.attack === "slam") {
      this.wind -= dt;
      this.showCircle(this.pos, 8.5);
      if (this.wind <= 0) {
        if (player.position.distanceTo(this.pos) < 8.5 && player.position.y < 1.4) dmg = 28;
        this.finish();
        audio.thud();
      }
    } else if (this.attack === "ring") {
      this.wind -= dt;
      const radius = 3 + (0.95 - Math.max(0, this.wind)) * 14;
      this.showRing(this.pos, radius);
      if (this.wind <= 0) {
        const d = player.position.distanceTo(this.pos);
        if (d > radius - 1.6 && d < radius + 1.6 && player.position.y < 1.2) dmg = 20;
        this.finish();
        audio.thud();
      }
    }

    this.pos.x = Math.max(-20, Math.min(20, this.pos.x));
    this.pos.z = Math.max(-20, Math.min(20, this.pos.z));
    this.mesh.position.copy(this.pos);
    return dmg;
  }

  dispose(): void {
    this.clearAdds();
    this.group.clear();
  }

  private spawnAdds(): void {
    this.clearAdds();
    for (const x of [-5, 5]) {
      const mesh = new THREE.Group();
      const body = new THREE.Mesh(new THREE.BoxGeometry(0.7, 1.1, 0.45), new THREE.MeshLambertMaterial({ color: 0x4a2020 }));
      body.position.y = 0.7;
      mesh.add(body);
      const pos = new THREE.Vector3(x, 0, this.pos.z + 3);
      mesh.position.copy(pos);
      this.group.add(mesh);
      this.adds.push({ mesh, pos, hp: 40, wind: 0 });
    }
  }

  private tickAdds(dt: number, player: Hulk): number {
    let dmg = 0;
    for (const a of this.adds) {
      if (a.hp <= 0) continue;
      const to = player.position.clone().sub(a.pos);
      to.y = 0;
      const dist = to.length();
      if (dist > 1.6) a.pos.addScaledVector(to.normalize(), 4.2 * dt);
      a.mesh.position.copy(a.pos);
      a.mesh.lookAt(player.position.x, 0, player.position.z);
      if (dist < player.radius + 1.1) {
        a.wind -= dt;
        if (a.wind <= 0) {
          a.wind = 0.7;
          dmg += 6;
        }
      }
    }
    return dmg;
  }

  private clearAdds(): void {
    for (const a of this.adds) this.group.remove(a.mesh);
    this.adds.length = 0;
  }

  private begin(kind: Attack, wind: number, player: Hulk): void {
    this.attack = kind;
    this.wind = wind;
    this.timer = wind + (kind === "charge" ? 0.7 : 0.05);
    if (kind === "charge") {
      const dir = player.position.clone().sub(this.pos);
      dir.y = 0;
      dir.normalize();
      this.vel.copy(dir.multiplyScalar(28));
    }
  }

  private finish(): void {
    this.attack = "idle";
    this.timer = 1.4 + Math.random() * 0.8;
    this.hideTelegraphs();
  }

  private showCircle(at: THREE.Vector3, r: number): void {
    this.telegraph.position.set(at.x, 0.08, at.z);
    this.telegraph.scale.set(r, r, 1);
    (this.telegraph.material as THREE.MeshBasicMaterial).opacity = 0.38;
    this.ring.visible = false;
    this.telegraph.visible = true;
  }

  private showLine(player: Hulk): void {
    const dir = player.position.clone().sub(this.pos);
    dir.y = 0;
    const len = Math.max(4, dir.length());
    this.telegraph.position.set(this.pos.x + dir.x * 0.5, 0.08, this.pos.z + dir.z * 0.5);
    this.telegraph.scale.set(1.3, len, 1);
    this.telegraph.rotation.z = Math.atan2(dir.x, dir.z);
    (this.telegraph.material as THREE.MeshBasicMaterial).opacity = 0.4;
    this.telegraph.visible = true;
    this.ring.visible = false;
  }

  private showRing(at: THREE.Vector3, r: number): void {
    this.ring.position.set(at.x, 0.1, at.z);
    this.ring.scale.set(r, r, 1);
    (this.ring.material as THREE.MeshBasicMaterial).opacity = 0.55;
    this.ring.visible = true;
    this.telegraph.visible = false;
  }

  private hideTelegraphs(): void {
    (this.telegraph.material as THREE.MeshBasicMaterial).opacity = 0;
    (this.ring.material as THREE.MeshBasicMaterial).opacity = 0;
  }

  private fade(mesh: THREE.Mesh, opacity: number): THREE.MeshBasicMaterial {
    const mat = mesh.material as THREE.MeshBasicMaterial;
    mat.opacity = opacity;
    return mat;
  }

  private buildMesh(city: CityDef): THREE.Group {
    const g = new THREE.Group();
    const armor = new THREE.MeshLambertMaterial({ color: 0x2c2f38 });
    const trim = new THREE.MeshLambertMaterial({
      color: city.featured ? 0xc9a227 : 0x8a3030,
      emissive: new THREE.Color(city.featured ? 0x664400 : 0x440000),
      emissiveIntensity: 0.25,
    });
    const body = new THREE.Mesh(new THREE.BoxGeometry(2.4, 2.4, 1.5), armor);
    body.position.y = 2.1;
    g.add(body);
    const head = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.9, 1.0), armor);
    head.position.y = 3.6;
    g.add(head);
    const helm = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.25, 1.1), trim);
    helm.position.y = 4.05;
    g.add(helm);
    const armL = new THREE.Mesh(new THREE.BoxGeometry(0.7, 1.8, 0.7), armor);
    armL.position.set(-1.6, 2.0, 0);
    g.add(armL);
    const armR = armL.clone();
    armR.position.x = 1.6;
    g.add(armR);
    const fist = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.7, 0.85), trim);
    fist.position.set(-1.6, 1.0, 0.2);
    g.add(fist);
    const fistR = fist.clone();
    fistR.position.x = 1.6;
    g.add(fistR);
    const legs = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.3, 1.1), armor);
    legs.position.y = 0.7;
    g.add(legs);
    return g;
  }
}
