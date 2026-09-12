import * as THREE from "three";
import { comicsForCity, comicById, type ComicArc } from "../data/comics";
import type { SaveData } from "../data/types";
import type { Hulk } from "../player/Hulk";
import type { StreetGraph } from "../world/streetPack";

const BOOK = new THREE.BoxGeometry(2.4, 3.4, 0.28);
const SLAB = new THREE.BoxGeometry(1, 1, 1);
const RING = new THREE.RingGeometry(1.6, 2.1, 24);
const DISC = new THREE.CircleGeometry(6.2, 24);
const BEAM = new THREE.CylinderGeometry(0.22, 0.85, 8.4, 8);

export type ComicPickup = {
  id: string;
  arc: ComicArc;
  mesh: THREE.Group;
  pos: THREE.Vector3;
  dungeon: boolean;
};

type Pickup = ComicPickup;

type Dummy = {
  mesh: THREE.Mesh;
  hp: number;
  live: boolean;
};

export class ComicSystem {
  readonly group = new THREE.Group();
  readonly arena = new THREE.Group();
  active = false;
  arc: ComicArc | null = null;
  beat = 0;
  cleared = false;
  returnPos = new THREE.Vector3();
  private pickups: Pickup[] = [];
  private coverMat = new THREE.MeshLambertMaterial({ color: 0xd45a22, emissive: 0x88ff44, emissiveIntensity: 0.85 });
  private spineMat = new THREE.MeshLambertMaterial({ color: 0x1a1612, emissive: 0xb8ff66, emissiveIntensity: 0.7 });
  private glowMat = new THREE.MeshBasicMaterial({ color: 0x88ff44, transparent: true, opacity: 0.48, side: THREE.DoubleSide, depthWrite: false });
  private beamMat = new THREE.MeshBasicMaterial({ color: 0xb8ff66, transparent: true, opacity: 0.42, depthWrite: false });
  private dummyMat = new THREE.MeshLambertMaterial({ color: 0x4a4038 });
  private holdMat = new THREE.MeshBasicMaterial({ color: 0x7dff6a, transparent: true, opacity: 0.22, side: THREE.DoubleSide, depthWrite: false });
  private markMat = new THREE.MeshBasicMaterial({ color: 0xf0c400, transparent: true, opacity: 0.85 });
  private dummies: Dummy[] = [];
  private marker = new THREE.Mesh(SLAB, this.markMat);
  private holdRing = new THREE.Mesh(RING, this.holdMat);
  private holdT = 0;
  private reachAt = new THREE.Vector3(0, 0, -22);
  private fogHold: { color: number; near: number; far: number; bg: THREE.Color | null } | null = null;
  private groundMesh: THREE.Mesh | null = null;
  private bob = 0;

  constructor() {
    this.group.name = "comics";
    this.arena.name = "comic-arena";
    this.arena.visible = false;
    this.marker.scale.set(1.1, 2.4, 1.1);
    this.holdRing.rotation.x = -Math.PI / 2;
    this.holdRing.position.set(0, 0.08, 8);
    this.arena.add(this.marker, this.holdRing);
    this.group.add(this.arena);
  }

  spawnCity(cityId: string, graph: StreetGraph | null, plaza: THREE.Vector3, spawn: THREE.Vector3): void {
    this.clearPickups();
    const arcs = comicsForCity(cityId);
    let i = 0;
    for (const arc of arcs) {
      if (arc.dungeon) continue;
      // Origin/Gamma Bomb desert instance: park it far from DROP IN spawn so Hulk starts in NY streets
      const pos = this.slot(graph, plaza, spawn, i, false);
      if (arc.id === "origin") {
        pos.set(spawn.x + 85, 0, spawn.z + 70);
      }
      this.addPickup(arc, pos, false);
      i += 1;
    }
  }

  spawnDungeon(cityId: string, rooms: THREE.Vector3[]): void {
    const arc = comicsForCity(cityId).find((c) => c.dungeon);
    const room = rooms[0];
    if (!arc || !room) return;
    this.addPickup(arc, room.clone().add(new THREE.Vector3(2.2, 0, 0)), true);
  }

  hideStreet(hide: boolean): void {
    for (const p of this.pickups) p.mesh.visible = !hide || p.dungeon;
  }

  nearest(from: THREE.Vector3, max = 6.5): Pickup | null {
    let best: Pickup | null = null;
    let bestD = max;
    for (const p of this.pickups) {
      if (!p.mesh.visible) continue;
      const d = from.distanceTo(p.pos);
      if (d < bestD) {
        bestD = d;
        best = p;
      }
    }
    return best;
  }

  pins(cityId: string, save: SaveData): { id: string; x: number; z: number; title: string; blurb: string; unread: boolean }[] {
    const out: { id: string; x: number; z: number; title: string; blurb: string; unread: boolean }[] = [];
    for (const p of this.pickups) {
      if (p.dungeon) continue;
      if (p.arc.cityId !== cityId) continue;
      const unread = !save.comicsCleared.includes(p.arc.id);
      out.push({
        id: `comic-${p.arc.id}`,
        x: p.pos.x,
        z: p.pos.z,
        title: p.arc.title,
        blurb: unread ? "Unread comic story. H to enter the instance." : "Filed in the Codex. H to replay.",
        unread,
      });
    }
    return out;
  }

  enter(arc: ComicArc, player: Hulk, scene: THREE.Scene): void {
    this.active = true;
    this.cleared = false;
    this.arc = arc;
    this.beat = 0;
    this.holdT = 0;
    this.returnPos.copy(player.position);
    this.buildArena(arc);
    this.fogHold = {
      color: (scene.fog as THREE.Fog | null)?.color.getHex() ?? 0x12141c,
      near: (scene.fog as THREE.Fog | null)?.near ?? 40,
      far: (scene.fog as THREE.Fog | null)?.far ?? 180,
      bg: scene.background instanceof THREE.Color ? scene.background.clone() : null,
    };
    scene.background = new THREE.Color(arc.sky);
    if (scene.fog instanceof THREE.Fog) {
      scene.fog.color.setHex(arc.fog);
      scene.fog.near = 18;
      scene.fog.far = 70;
    } else {
      scene.fog = new THREE.Fog(arc.fog, 18, 70);
    }
    this.arena.visible = true;
    this.group.visible = true;
    for (const p of this.pickups) p.mesh.visible = false;
    player.position.set(0, 0, 14);
    player.velocity.set(0, 0, 0);
    if (arc.formHint) player.setKind(arc.formHint, null);
    this.resetBeats();
  }

  leave(player: Hulk, scene: THREE.Scene): void {
    this.active = false;
    this.arena.visible = false;
    this.clearDummies();
    if (this.fogHold) {
      if (this.fogHold.bg) scene.background = this.fogHold.bg;
      else scene.background = null;
      if (scene.fog instanceof THREE.Fog) {
        scene.fog.color.setHex(this.fogHold.color);
        scene.fog.near = this.fogHold.near;
        scene.fog.far = this.fogHold.far;
      }
      this.fogHold = null;
    }
    player.position.copy(this.returnPos);
    player.velocity.set(0, 0, 0);
    for (const p of this.pickups) p.mesh.visible = !p.dungeon;
    this.arc = null;
  }

  tick(dt: number, player: Hulk): string | null {
    this.bob += dt;
    if (!this.active) {
      const s = 1 + Math.sin(this.bob * 3) * 0.05;
      for (const p of this.pickups) {
        p.mesh.position.y = 1.85 + Math.sin(this.bob * 2.4 + p.pos.x) * 0.22;
        p.mesh.rotation.y += dt * 0.85;
        p.mesh.scale.setScalar(s);
      }
      return null;
    }
    const beat = this.arc?.beats[this.beat];
    if (!beat) {
      this.cleared = true;
      return "cleared";
    }
    this.marker.visible = beat.kind === "reach";
    this.holdRing.visible = beat.kind === "hold";
    if (beat.kind === "smash") {
      let live = 0;
      for (const d of this.dummies) if (d.live) live += 1;
      if (live <= 0) return this.advance();
    } else if (beat.kind === "reach") {
      const z = beat.id === "lap-2" ? 18 : -22;
      this.marker.position.set(beat.id === "lap-2" ? 8 : 0, 1.2, z);
      this.reachAt.set(this.marker.position.x, 0, z);
      if (player.position.distanceTo(this.reachAt) < 3.2) return this.advance();
    } else if (beat.kind === "hold") {
      if (player.position.distanceTo(this.holdRing.position) < 3.4) {
        this.holdT += dt;
        this.holdMat.opacity = 0.22 + Math.min(0.5, this.holdT / 6) * 0.4;
        if (this.holdT >= 6) return this.advance();
      } else {
        this.holdT = Math.max(0, this.holdT - dt * 0.6);
      }
    }
    return null;
  }

  applySmash(origin: THREE.Vector3, radius: number, dmg: number): number {
    if (!this.active) return 0;
    let n = 0;
    for (const d of this.dummies) {
      if (!d.live) continue;
      if (origin.distanceTo(d.mesh.position) > radius) continue;
      d.hp -= dmg;
      n += 1;
      if (d.hp <= 0) {
        d.live = false;
        d.mesh.visible = false;
      }
    }
    return n;
  }

  beatTitle(): string {
    if (!this.arc) return "";
    if (this.cleared) return `${this.arc.title} — filed`;
    const b = this.arc.beats[this.beat];
    return `${this.arc.title} · ${this.beat + 1}/${this.arc.beats.length} — ${b?.title ?? "Done"}`;
  }

  dispose(): void {
    this.clearPickups();
    this.clearDummies();
    this.group.removeFromParent();
  }

  private advance(): string {
    this.beat += 1;
    this.holdT = 0;
    if (!this.arc || this.beat >= this.arc.beats.length) {
      this.cleared = true;
      return "cleared";
    }
    this.resetBeats();
    return this.arc.beats[this.beat]?.title ?? "Next";
  }

  private resetBeats(): void {
    const beat = this.arc?.beats[this.beat];
    this.clearDummies();
    if (beat?.kind === "smash") this.spawnDummies();
    this.marker.position.set(0, 1.2, -22);
    this.marker.visible = beat?.kind === "reach";
    this.holdRing.visible = beat?.kind === "hold";
    this.holdMat.opacity = 0.22;
  }

  private spawnDummies(): void {
    const spots = [new THREE.Vector3(-7, 1.1, -6), new THREE.Vector3(7, 1.1, -6), new THREE.Vector3(0, 1.4, -11)];
    for (const p of spots) {
      const mesh = new THREE.Mesh(SLAB, this.dummyMat);
      mesh.scale.set(1.4, 2.2, 1.1);
      mesh.position.copy(p);
      this.arena.add(mesh);
      this.dummies.push({ mesh, hp: 40, live: true });
    }
  }

  private clearDummies(): void {
    for (const d of this.dummies) d.mesh.removeFromParent();
    this.dummies.length = 0;
  }

  private buildArena(arc: ComicArc): void {
    if (this.groundMesh) {
      const mat = this.groundMesh.material as THREE.MeshLambertMaterial;
      mat.color.setHex(arc.ground);
    } else {
      const g = new THREE.Mesh(new THREE.PlaneGeometry(90, 90), new THREE.MeshLambertMaterial({ color: arc.ground }));
      g.rotation.x = -Math.PI / 2;
      g.position.y = 0;
      this.arena.add(g);
      this.groundMesh = g;
      const wallMat = new THREE.MeshLambertMaterial({ color: 0x1a1612 });
      for (const [x, z, sx, sz] of [
        [0, -40, 90, 2],
        [0, 40, 90, 2],
        [-40, 0, 2, 90],
        [40, 0, 2, 90],
      ] as const) {
        const w = new THREE.Mesh(SLAB, wallMat);
        w.scale.set(sx, 8, sz);
        w.position.set(x, 4, z);
        this.arena.add(w);
      }
    }
    this.dummyMat.color.setHex(arc.accent);
    this.markMat.color.setHex(arc.accent);
    this.holdMat.color.setHex(arc.accent);
  }

  private addPickup(arc: ComicArc, pos: THREE.Vector3, dungeon: boolean): void {
    const g = new THREE.Group();
    const book = new THREE.Mesh(BOOK, this.coverMat);
    const spine = new THREE.Mesh(SLAB, this.spineMat);
    spine.scale.set(0.32, 3.4, 0.28);
    spine.position.x = -1.28;
    const glow = new THREE.Mesh(DISC, this.glowMat);
    glow.rotation.x = -Math.PI / 2;
    glow.position.y = -1.7;
    const beam = new THREE.Mesh(BEAM, this.beamMat);
    beam.position.y = 4.1;
    g.add(book, spine, glow, beam);
    g.position.copy(pos);
    g.position.y = 1.85;
    this.group.add(g);
    this.pickups.push({ id: arc.id, arc, mesh: g, pos: pos.clone(), dungeon });
  }

  private clearPickups(): void {
    for (const p of this.pickups) p.mesh.removeFromParent();
    this.pickups.length = 0;
  }

  private slot(graph: StreetGraph | null, plaza: THREE.Vector3, spawn: THREE.Vector3, i: number, dungeon: boolean): THREE.Vector3 {
    void dungeon;
    if (graph) {
      const side = i % 2 === 0 ? 1 : -1;
      const along = 4 + i * 9;
      const p = graph.sidewalk(spawn.x, spawn.z + along, side, 2.8);
      return new THREE.Vector3(p.x, 0, p.z);
    }
    const a = (i / 3) * Math.PI * 2 + 0.6;
    return new THREE.Vector3(plaza.x + Math.cos(a) * 14, 0, plaza.z + Math.sin(a) * 14);
  }
}

export function markComicFound(save: SaveData, id: string): boolean {
  if (!save.comicsFound.includes(id)) {
    save.comicsFound.push(id);
    return true;
  }
  return false;
}

export function markComicCleared(save: SaveData, id: string): boolean {
  markComicFound(save, id);
  if (!save.comicsCleared.includes(id)) {
    save.comicsCleared.push(id);
    return true;
  }
  return false;
}

export { comicById };
