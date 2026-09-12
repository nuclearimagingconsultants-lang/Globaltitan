import * as THREE from "three";
import { censusOf, crowdCap, formatPop, nearbyPeople, perKm2 } from "../data/census";
import type { CityWorld } from "../world/CityWorld";
import type { StreetGraph, StreetRoute } from "../world/streetPack";
import { createRng, hashString } from "../world/rng";

const BODY = new THREE.CapsuleGeometry(0.22, 0.72, 3, 6);
const COLORS = [0xc8b090, 0x6a7a88, 0x4a3a32, 0x8a6a48, 0x2a3a4a, 0xb09070, 0x3a4a38, 0x5a4a68];

type Walker = {
  live: boolean;
  route: StreetRoute | null;
  dist: number;
  dir: number;
  speed: number;
  lane: number;
};

/**
 * Census-accurate city totals on the HUD. Only a nearby InstancedMesh slice walks the curb.
 * Far population stays a number — never 8 million meshes.
 */
export class CrowdSystem {
  readonly group = new THREE.Group();
  cityPop = 0;
  nearbyEst = 0;
  visible = 0;
  perKm2 = 0;
  private mesh: THREE.InstancedMesh;
  private walkers: Walker[] = [];
  private world: CityWorld;
  private graph: StreetGraph | null;
  private scratch = new THREE.Object3D();
  private color = new THREE.Color();
  private rng: () => number;
  private hour = 12;

  constructor(world: CityWorld) {
    this.world = world;
    this.graph = world.graph;
    this.rng = createRng(hashString(`crowd:${world.city.id}`));
    const row = censusOf(world.city.id);
    this.cityPop = row.pop;
    this.perKm2 = perKm2(world.city.id);
    const cap = 40;
    const mat = new THREE.MeshLambertMaterial({ color: 0xc4b49a });
    this.mesh = new THREE.InstancedMesh(BODY, mat, cap);
    this.mesh.count = 0;
    this.mesh.frustumCulled = true;
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.group.add(this.mesh);
    this.group.name = "census-crowd";
    const routes = this.graph?.routes.filter((r) => r.length > 30) ?? [];
    for (let i = 0; i < cap; i++) {
      this.color.setHex(COLORS[i % COLORS.length]!);
      this.mesh.setColorAt(i, this.color);
      const route = routes.length ? routes[i % routes.length]! : null;
      this.walkers.push({
        live: false,
        route,
        dist: this.rng() * (route?.length ?? 40),
        dir: this.rng() < 0.5 ? 1 : -1,
        speed: 1.15 + this.rng() * 0.7,
        lane: (this.rng() < 0.5 ? -1 : 1) * (2.4 + this.rng() * 1.4),
      });
    }
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
  }

  tick(dt: number, px: number, pz: number, hour: number, overloaded: boolean): void {
    this.hour = hour;
    this.nearbyEst = nearbyPeople(this.world.city.id, 50, hour);
    const want = Math.min(this.walkers.length, crowdCap(this.world.city.id, overloaded), Math.max(8, this.nearbyEst));
    const graph = this.graph;
    let shown = 0;
    for (let i = 0; i < this.walkers.length; i++) {
      const w = this.walkers[i]!;
      if (i >= want) {
        w.live = false;
        continue;
      }
      w.live = true;
      if (graph && w.route) {
        w.dist += w.dir * w.speed * dt;
        const len = w.route.length;
        w.dist = ((w.dist % len) + len) % len;
        const p = graph.pointOnRoute(w.route, w.dist);
        const tx = Math.sin(p.yaw);
        const tz = Math.cos(p.yaw);
        let x = p.x - tz * w.lane;
        let z = p.z + tx * w.lane;
        if (Math.hypot(x - px, z - pz) > 58) {
          const near = graph.sidewalk(px, pz, w.lane > 0 ? 1 : -1, Math.abs(w.lane));
          x = near.x;
          z = near.z;
          w.dist = (w.dist + 18) % len;
        }
        this.scratch.position.set(x, 0.85, z);
        this.scratch.rotation.set(0, p.yaw, 0);
      } else {
        const a = i * 1.37 + this.hour;
        this.scratch.position.set(px + Math.cos(a) * (8 + (i % 7) * 3), 0.85, pz + Math.sin(a) * (8 + (i % 5) * 3));
        this.scratch.rotation.set(0, a, 0);
      }
      this.scratch.scale.set(1, 1, 1);
      this.scratch.updateMatrix();
      this.mesh.setMatrixAt(shown, this.scratch.matrix);
      shown += 1;
    }
    this.mesh.count = shown;
    this.mesh.instanceMatrix.needsUpdate = true;
    this.visible = shown;
  }

  hudLine(): string {
    return `${formatPop(this.cityPop)} in the city · ${this.visible} on this curb (~${this.nearbyEst} in 50m)`;
  }

  dispose(): void {
    this.group.removeFromParent();
    this.mesh.dispose();
  }
}
