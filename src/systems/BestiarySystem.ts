import * as THREE from "three";
import type { AudioBus } from "../audio/AudioBus";
import { grantBeastXp, MOVES, pickWildSpecies, rosterForCity, speciesById, stageName, type SpeciesDef } from "../data/bestiary";
import type { CaughtBeastie, SaveData } from "../data/types";
import type { Hulk } from "../player/Hulk";
import type { EnemyDirector } from "./EnemyDirector";
import { createRng, hashString } from "../world/rng";

export type WildBeast = {
  species: SpeciesDef;
  mesh: THREE.Group;
  pos: THREE.Vector3;
  hp: number;
  maxHp: number;
  t: number;
  aggro: boolean;
  state: "idle" | "stalk" | "engage";
  windup: number;
  hesitate: number;
};

function shade(color: number): THREE.MeshLambertMaterial {
  return new THREE.MeshLambertMaterial({ color });
}

function nameSprite(text: string, tint: string): THREE.Sprite {
  const c = document.createElement("canvas");
  c.width = 384;
  c.height = 64;
  const g = c.getContext("2d")!;
  g.fillStyle = "rgba(8,6,5,0.78)";
  g.fillRect(0, 0, 384, 64);
  g.strokeStyle = tint;
  g.lineWidth = 3;
  g.strokeRect(2, 2, 380, 60);
  g.fillStyle = tint;
  g.font = "700 26px sans-serif";
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillText(text.slice(0, 28), 192, 34);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false }));
  spr.scale.set(4.2, 0.7, 1);
  spr.position.y = 1.55;
  return spr;
}

export function sculptBeast(species: SpeciesDef, stage: 1 | 2 | 3): THREE.Group {
  const g = new THREE.Group();
  const skin = shade(species.color);
  const trim = shade(species.accent);
  const scale = 0.85 + (stage - 1) * 0.28;
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.38, 12, 10), skin);
  body.scale.set(1.15, 0.85, 1.35);
  body.position.y = 0.42;
  g.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.24, 10, 8), skin);
  head.position.set(0, 0.72, 0.28);
  g.add(head);
  if (species.body === "crab" || species.body === "spider") {
    for (let i = 0; i < 6; i++) {
      const leg = new THREE.Mesh(new THREE.CapsuleGeometry(0.03, 0.34, 3, 5), trim);
      const a = (i / 6) * Math.PI * 2;
      leg.position.set(Math.sin(a) * 0.42, 0.22, Math.cos(a) * 0.28);
      leg.rotation.z = Math.sin(a) * 0.8;
      g.add(leg);
    }
  } else if (species.body === "bird" || species.body === "bat" || species.body === "moth" || species.body === "griffin") {
    for (const x of [-1, 1]) {
      const wing = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 6), trim);
      wing.scale.set(1.6, 0.15, 0.7);
      wing.position.set(x * 0.4, 0.62, 0);
      g.add(wing);
    }
  } else if (species.body === "serpent" || species.body === "fish") {
    body.scale.set(0.7, 0.55, 1.9);
    const tail = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 6), trim);
    tail.scale.set(0.5, 0.4, 1.4);
    tail.position.set(0, 0.32, -0.55);
    g.add(tail);
  } else {
    for (const x of [-0.16, 0.16]) {
      const leg = new THREE.Mesh(new THREE.CapsuleGeometry(0.06, 0.22, 4, 6), skin);
      leg.position.set(x, 0.16, 0.08);
      g.add(leg);
    }
  }
  const mark = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 6), trim);
  mark.position.set(0, 0.9, 0.12);
  g.add(mark);
  g.scale.setScalar(scale);
  return g;
}

export class BestiarySystem {
  readonly group = new THREE.Group();
  readonly wilds: WildBeast[] = [];
  readonly allies: { mesh: THREE.Group; beast: CaughtBeastie; pos: THREE.Vector3; cd: number }[] = [];
  private cityId = "new-york";
  private cityName = "New York";

  loadCity(cityId: string, cityName: string, save: SaveData, origin?: THREE.Vector3): void {
    this.clearWilds();
    this.cityId = cityId;
    this.cityName = cityName;
    const roster = rosterForCity(cityId, cityName);
    const rng = createRng(hashString(`bestiary:${cityId}:${save.life.day}`));
    const ox = origin?.x ?? 0;
    const oz = origin?.z ?? 0;
    if (cityId === "new-york") {
      for (let i = 0; i < 10; i++) {
        const species = roster[i]!;
        if (!save.bestiary.seen.includes(species.id)) save.bestiary.seen.push(species.id);
        const pos = new THREE.Vector3(ox - 14 + i * 3.1, 0, oz + 8 + (i % 3) * 2.4);
        this.addWild(species, pos, true);
      }
    } else {
      const count = 7;
      for (let i = 0; i < count; i++) {
        const species = pickWildSpecies(roster, rng);
        if (!save.bestiary.seen.includes(species.id)) save.bestiary.seen.push(species.id);
        const a = rng() * Math.PI * 2;
        const r = 18 + rng() * 48;
        const pos = new THREE.Vector3(Math.sin(a) * r, 0, Math.cos(a) * r);
        if (Math.hypot(pos.x, pos.z) < 10) pos.x += 14;
        this.addWild(species, pos, false);
      }
    }
  }

  spawnDungeonSide(rooms: THREE.Vector3[], save: SaveData): void {
    this.clearWilds();
    const roster = rosterForCity(this.cityId, this.cityName);
    for (const room of rooms) {
      const species = roster[Math.abs(Math.floor(room.x + room.z * 3)) % roster.length]!;
      if (!save.bestiary.seen.includes(species.id)) save.bestiary.seen.push(species.id);
      this.addWild(species, room.clone().add(new THREE.Vector3(2.4, 0, 0)), false);
    }
  }

  deployAllies(save: SaveData): void {
    this.clearAllies();
    for (const uid of save.bestiary.party.slice(0, 3)) {
      const beast = save.bestiary.caught.find((c) => c.uid === uid);
      if (!beast) continue;
      const species = speciesById(beast.speciesId, this.cityId, this.cityName);
      if (!species) continue;
      const mesh = sculptBeast(species, beast.stage);
      const pos = new THREE.Vector3(2, 0, 12);
      mesh.position.copy(pos);
      this.group.add(mesh);
      this.allies.push({ mesh, beast, pos, cd: 0.4 });
    }
  }

  nearestWild(from: THREE.Vector3, max = 5.4): WildBeast | null {
    let best: WildBeast | null = null;
    let bestD = max;
    for (const w of this.wilds) {
      if (w.hp <= 0) continue;
      const d = w.pos.distanceTo(from);
      if (d < bestD) {
        bestD = d;
        best = w;
      }
    }
    return best;
  }

  applySmash(origin: THREE.Vector3, radius: number, damage: number): number {
    let n = 0;
    for (const w of this.wilds) {
      if (w.hp <= 0) continue;
      if (w.pos.distanceTo(origin) > radius) continue;
      w.hp = Math.max(1, w.hp - damage * 0.35);
      w.aggro = true;
      w.state = "engage";
      n += 1;
    }
    return n;
  }

  tryCatch(from: THREE.Vector3, save: SaveData, isBanner: boolean, audio: AudioBus): string | null {
    const w = this.nearestWild(from, 5.2);
    if (!w) return null;
    const chance = (isBanner ? 0.72 : 0.4) + (1 - w.hp / w.maxHp) * 0.4;
    if (Math.random() > chance) {
      audio.hurt();
      return `${w.species.name} slipped the catch. Soften it or try as Banner.`;
    }
    const uid = `b-${Date.now().toString(36)}-${Math.floor(Math.random() * 999)}`;
    const caught: CaughtBeastie = {
      uid,
      speciesId: w.species.id,
      nickname: w.species.name,
      level: 5,
      xp: 0,
      wins: 0,
      bossKills: 0,
      stage: 1,
      moves: [...w.species.moves],
    };
    save.bestiary.caught.push(caught);
    if (save.bestiary.party.length < 3) save.bestiary.party.push(uid);
    w.hp = 0;
    w.mesh.visible = false;
    audio.success();
    return `Caught ${w.species.name}. Four moves locked. Open Bestiary from pause.`;
  }

  updateWilds(dt: number, player?: Hulk, director?: EnemyDirector | null): number {
    let hit = 0;
    for (let i = 0; i < this.wilds.length; i++) {
      const w = this.wilds[i]!;
      if (w.hp <= 0) continue;
      w.t += dt;
      if (!player) {
        w.mesh.position.copy(w.pos);
        w.mesh.position.y = Math.sin(w.t * 2.4) * 0.08;
        w.mesh.rotation.y += dt * 0.6;
        continue;
      }
      const dist = w.pos.distanceTo(player.position);
      const lod = director?.lod(dist) ?? (dist > 50 ? "cheap" : "full");
      if (lod === "none") continue;
      if (!w.aggro && director?.notice(dist, player, false) && player.isHulk && dist < 14) {
        w.aggro = true;
        w.state = "stalk";
        w.hesitate = director.hesitate(player);
      }
      if (w.aggro && lod === "full") {
        w.hesitate = Math.max(0, w.hesitate - dt);
        const to = player.position.clone().sub(w.pos);
        to.y = 0;
        const side = i % 2 === 0 ? 1 : -1;
        if (w.hesitate <= 0 && dist > player.radius + 1.4) {
          const nx = to.x / Math.max(0.01, dist);
          const nz = to.z / Math.max(0.01, dist);
          w.pos.x += (nx * 3.6 + -nz * side * 2.4) * dt;
          w.pos.z += (nz * 3.6 + nx * side * 2.4) * dt;
          w.state = dist < 8 ? "engage" : "stalk";
        }
        if (w.state === "engage" && dist < player.radius + 1.8 && w.windup <= 0) {
          w.windup = 0.48;
        }
        if (w.windup > 0) {
          w.windup -= dt;
          w.mesh.rotation.x = -0.2;
          if (w.windup <= 0) {
            w.mesh.rotation.x = 0;
            if (w.pos.distanceTo(player.position) < player.radius + 2) hit += 4;
          }
        }
      }
      w.mesh.position.copy(w.pos);
      w.mesh.position.y = Math.sin(w.t * 2.4) * 0.08;
      if (w.aggro) w.mesh.lookAt(player.position.x, 0, player.position.z);
      else w.mesh.rotation.y += dt * 0.6;
    }
    return hit;
  }

  updateAllies(
    dt: number,
    player: THREE.Vector3,
    enemies: { pos: THREE.Vector3; hp: number }[],
    audio: AudioBus,
  ): { damage: number; kills: number } {
    let damage = 0;
    let kills = 0;
    for (let i = 0; i < this.allies.length; i++) {
      const a = this.allies[i]!;
      a.cd = Math.max(0, a.cd - dt);
      let target = enemies.find((e) => e.hp > 0) ?? null;
      let best = Infinity;
      for (const e of enemies) {
        if (e.hp <= 0) continue;
        const d = e.pos.distanceToSquared(a.pos);
        if (d < best) {
          best = d;
          target = e;
        }
      }
      const dest = target ? target.pos : player;
      const to = dest.clone().sub(a.pos);
      to.y = 0;
      const dist = to.length();
      if (dist > 1.2) {
        to.normalize();
        a.pos.addScaledVector(to, 7.5 * dt);
      }
      a.pos.x += (player.x + (i - 1) * 2.2 - a.pos.x) * 0.4 * dt;
      a.mesh.position.copy(a.pos);
      a.mesh.position.y = 0.1;
      if (target && dist < 2.4 && a.cd <= 0) {
        const move = MOVES[a.beast.moves[Math.floor(Math.random() * a.beast.moves.length)]!] ?? MOVES.scratch!;
        const dmg = move.power * (0.7 + a.beast.level * 0.04) * (0.85 + a.beast.stage * 0.15);
        target.hp -= dmg;
        damage += dmg;
        a.cd = 1.05;
        audio.hit();
        if (target.hp <= 0) {
          a.beast.wins += 1;
          grantBeastXp(a.beast, 28);
          kills += 1;
        }
      }
    }
    return { damage, kills };
  }

  noteBossKill(save: SaveData): void {
    for (const uid of save.bestiary.party) {
      const b = save.bestiary.caught.find((c) => c.uid === uid);
      if (!b) continue;
      b.bossKills += 1;
      grantBeastXp(b, 80);
    }
  }

  partyLine(save: SaveData): string {
    return save.bestiary.party
      .map((uid) => {
        const b = save.bestiary.caught.find((c) => c.uid === uid);
        if (!b) return "";
        const s = speciesById(b.speciesId, this.cityId, this.cityName);
        return s ? `${stageName(s, b.stage)} Lv${b.level}` : "";
      })
      .filter(Boolean)
      .join(" · ");
  }

  dispose(): void {
    this.clearWilds();
    this.clearAllies();
    this.group.removeFromParent();
  }

  private addWild(species: SpeciesDef, pos: THREE.Vector3, labeled: boolean): void {
    const mesh = sculptBeast(species, 1);
    mesh.position.copy(pos);
    if (labeled) mesh.add(nameSprite(`${species.code ?? ""} ${species.name}`, species.rank === "unique" ? "#7dff6a" : species.rank === "champ" ? "#f0c400" : "#e8dcc8"));
    this.group.add(mesh);
    this.wilds.push({
      species,
      mesh,
      pos,
      hp: 28,
      maxHp: 28,
      t: Math.random() * 4,
      aggro: false,
      state: "idle",
      windup: 0,
      hesitate: 0,
    });
  }

  private clearWilds(): void {
    for (const w of this.wilds) this.group.remove(w.mesh);
    this.wilds.length = 0;
  }

  private clearAllies(): void {
    for (const a of this.allies) this.group.remove(a.mesh);
    this.allies.length = 0;
  }
}
