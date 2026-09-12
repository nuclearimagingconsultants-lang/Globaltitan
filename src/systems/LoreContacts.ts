import * as THREE from "three";
import type { Hulk } from "../player/Hulk";
import type { StreetGraph } from "../world/streetPack";

/** Original-named street people tied to public era titles. They hail the titan. No borrowed comic dialogue. */
export type LoreDef = {
  id: string;
  name: string;
  era: string;
  cityId: string;
  hail: string;
  reply: string;
  color: number;
};

export const LORE_PEOPLE: LoreDef[] = [
  {
    id: "mira",
    name: "Mira Voss",
    era: "Origin",
    cityId: "new-york",
    hail: "I stood the fence when the desert went white. You walked out. I took the same bus.",
    reply: "Mira files the test as a street. The Origin issue still glows on this curb.",
    color: 0xc4a060,
  },
  {
    id: "kesh",
    name: "Kesh Reed",
    era: "Planet Hulk",
    cityId: "new-york",
    hail: "The green that won a world is on 8th. I came off the sand to see if the crown still fits.",
    reply: "Kesh keeps the exile quiet. Planet Hulk is a Houston page if you want the yard.",
    color: 0xf0c400,
  },
  {
    id: "dorian",
    name: "Dorian Vale",
    era: "World War Hulk",
    cityId: "new-york",
    hail: "The island remembers a heavier step. I came to ask if Midtown is a street again.",
    reply: "Dorian stays on the curb. The conquest issue is the other lime beacon.",
    color: 0xff5533,
  },
  {
    id: "wren",
    name: "Wren Hollow",
    era: "Immortal Hulk",
    cityId: "new-york",
    hail: "Night shift. Below-things don't clock out. Neither do I. You smell like the below.",
    reply: "Wren keeps the rain file. Immortal is a Seattle page — this is only a hello.",
    color: 0x66ff55,
  },
  {
    id: "bramble",
    name: "Scout Bramble",
    era: "Hulk: The End",
    cityId: "new-york",
    hail: "I walked a future with no street. You still have this one. Don't waste the ice.",
    reply: "Bramble files last-ice as a rumor. Anchorage is the civic gate; this is a warning.",
    color: 0x8aa0b0,
  },
  {
    id: "cal",
    name: "Cal Voss",
    era: "Joe Fixit",
    cityId: "las-vegas",
    hail: "Gray suit, gray math. The house wants a word before the dungeon dealer does.",
    reply: "Cal keeps the pit. The Fixit issue is on the Strip glow.",
    color: 0xff5d8f,
  },
];

type Body = {
  def: LoreDef;
  mesh: THREE.Group;
  spoken: boolean;
  phase: number;
  home: THREE.Vector3;
};

const BODY = new THREE.CapsuleGeometry(0.28, 1.05, 3, 6);
const DISC = new THREE.CircleGeometry(1.6, 16);

export class LoreContacts {
  readonly group = new THREE.Group();
  private bodies: Body[] = [];
  private hailMat = new THREE.MeshBasicMaterial({ color: 0xf0c400, transparent: true, opacity: 0.4, side: THREE.DoubleSide, depthWrite: false });

  spawn(cityId: string, graph: StreetGraph | null, spawn: THREE.Vector3): void {
    this.clear();
    const list = LORE_PEOPLE.filter((p) => p.cityId === cityId);
    let i = 0;
    for (const def of list) {
      const pos = graph
        ? graph.sidewalk(spawn.x + (i % 2 === 0 ? 8 : -10), spawn.z + 10 + i * 7, i % 2 === 0 ? 1 : -1, 3.1)
        : { x: spawn.x + 8 + i * 4, z: spawn.z + 12 };
      const mesh = this.makeBody(def);
      mesh.position.set(pos.x, 0, pos.z);
      this.group.add(mesh);
      this.bodies.push({ def, mesh, spoken: false, phase: i * 1.7, home: new THREE.Vector3(pos.x, 0, pos.z) });
      i += 1;
    }
  }

  tick(dt: number, player: Hulk, hulked: boolean): void {
    const px = player.position.x;
    const pz = player.position.z;
    for (const b of this.bodies) {
      b.phase += dt;
      const want = hulked;
      const tx = want ? px : b.home.x;
      const tz = want ? pz : b.home.z;
      const dx = tx - b.mesh.position.x;
      const dz = tz - b.mesh.position.z;
      const dist = Math.hypot(dx, dz);
      const stop = want ? 3.6 : 0.4;
      if (dist > stop) {
        const sp = want ? 5.4 : 1.6;
        b.mesh.position.x += (dx / dist) * sp * dt;
        b.mesh.position.z += (dz / dist) * sp * dt;
        b.mesh.rotation.y = Math.atan2(dx, dz);
      }
      b.mesh.position.y = 0.95 + Math.sin(b.phase * 3) * 0.04;
      const glow = b.mesh.children[1] as THREE.Mesh | undefined;
      if (glow) glow.rotation.z = b.phase * 0.4;
    }
  }

  nearest(from: THREE.Vector3, max = 5.2): Body | null {
    let best: Body | null = null;
    let bestD = max;
    for (const b of this.bodies) {
      const d = from.distanceTo(b.mesh.position);
      if (d < bestD) {
        bestD = d;
        best = b;
      }
    }
    return best;
  }

  talk(from: THREE.Vector3): string | null {
    const n = this.nearest(from, 5.4);
    if (!n) return null;
    n.spoken = true;
    return `${n.def.name} · ${n.def.era} — ${n.def.reply}`;
  }

  hailLine(from: THREE.Vector3): string {
    const n = this.nearest(from, 9);
    if (!n) return "";
    return n.spoken ? `${n.def.name} is still on this curb.` : `${n.def.name} (${n.def.era}): ${n.def.hail}`;
  }

  dispose(): void {
    this.clear();
    this.group.removeFromParent();
  }

  private makeBody(def: LoreDef): THREE.Group {
    const g = new THREE.Group();
    const mat = new THREE.MeshLambertMaterial({ color: def.color, emissive: def.color, emissiveIntensity: 0.22 });
    const body = new THREE.Mesh(BODY, mat);
    const ring = new THREE.Mesh(DISC, this.hailMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = -0.9;
    const beam = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.22, 4.2, 6),
      new THREE.MeshBasicMaterial({ color: def.color, transparent: true, opacity: 0.35, depthWrite: false }),
    );
    beam.position.y = 2.4;
    g.add(body, ring, beam);
    g.name = `lore-${def.id}`;
    return g;
  }

  private clear(): void {
    for (const b of this.bodies) b.mesh.removeFromParent();
    this.bodies.length = 0;
  }
}
