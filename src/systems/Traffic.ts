import * as THREE from "three";
import { trafficCount } from "../data/census";
import { CELL, GRID, ROAD, worldExtent, type CityWorld, type LiftedBlock } from "../world/CityWorld";
import { createRng, hashString, pick } from "../world/rng";
import type { StreetGraph, StreetRoute } from "../world/streetPack";

type Car = {
  mesh: THREE.Group;
  axis: "x" | "z";
  lane: number;
  dir: number;
  speed: number;
  t: number;
  route: StreetRoute | null;
  dist: number;
  graph: StreetGraph | null;
};

const bodyGeo = new THREE.BoxGeometry(1.72, 0.52, 3.5);
const cabinGeo = new THREE.BoxGeometry(1.48, 0.48, 1.45);
const wheelGeo = new THREE.CylinderGeometry(0.32, 0.32, 0.22, 12);
const glassMat = new THREE.MeshLambertMaterial({ color: 0x89c8e8 });
const tireMat = new THREE.MeshLambertMaterial({ color: 0x111111 });

export class Traffic {
  readonly group = new THREE.Group();
  readonly cars: Car[] = [];

  constructor(world: CityWorld) {
    const rng = createRng(hashString(`traffic:${world.city.id}`));
    if (world.graph) {
      this.spawnOnGraph(world.graph, rng, world.theme.vehicles, trafficCount(world.city.id));
      return;
    }
    const half = worldExtent();
    const lanes: { axis: "x" | "z"; lane: number }[] = [];
    for (let i = 0; i < GRID; i++) {
      const c = -half + i * CELL + (CELL - ROAD) + ROAD / 2;
      lanes.push({ axis: "x", lane: c });
      lanes.push({ axis: "z", lane: c });
    }

    const nCars = trafficCount(world.city.id);
    for (let i = 0; i < nCars; i++) {
      const lane = pick(rng, lanes);
      const dir = rng() < 0.5 ? 1 : -1;
      const car = this.makeCar(pick(rng, world.theme.vehicles));
      const t = (rng() * 2 - 1) * half;
      if (lane.axis === "x") car.position.set(t, 0, lane.lane + dir * 1.6);
      else car.position.set(lane.lane + dir * 1.6, 0, t);
      this.group.add(car);
      this.cars.push({
        mesh: car,
        axis: lane.axis,
        lane: lane.lane,
        dir,
        speed: 8 + rng() * 7,
        t,
        route: null,
        dist: 0,
        graph: null,
      });
    }
  }

  private spawnOnGraph(graph: StreetGraph, rng: () => number, colors: readonly number[], want: number): void {
    const routes = graph.routes.filter((r) => r.length > 48);
    const pool = routes.length ? routes : graph.routes;
    if (!pool.length) return;
    const n = Math.min(want, Math.max(3, Math.min(pool.length, want)));
    for (let i = 0; i < n; i++) {
      const route = pick(rng, pool);
      const dir = rng() < 0.5 ? 1 : -1;
      const dist = rng() * route.length;
      const car = this.makeCar(pick(rng, colors));
      this.placeOnRoute(graph, car, route, dist, dir);
      this.group.add(car);
      this.cars.push({
        mesh: car,
        axis: "z",
        lane: 1.6,
        dir,
        speed: 8 + rng() * 7,
        t: dist,
        route,
        dist,
        graph,
      });
    }
  }

  private placeOnRoute(graph: StreetGraph, mesh: THREE.Group, route: StreetRoute, dist: number, dir: number): void {
    const p = graph.pointOnRoute(route, dist);
    const tx = Math.sin(p.yaw);
    const tz = Math.cos(p.yaw);
    const lane = 1.55 * dir;
    mesh.position.set(p.x - tz * lane, 0, p.z + tx * lane);
    mesh.rotation.y = p.yaw + (dir < 0 ? Math.PI : 0);
  }

  update(dt: number): void {
    const half = worldExtent();
    for (const car of this.cars) {
      if (this.ridden === car) continue;
      if (car.mesh.userData.emp > 0) {
        car.mesh.userData.emp -= dt;
        continue;
      }
      if ((car.mesh.userData as { launched?: boolean }).launched) {
        car.mesh.position.addScaledVector(car.mesh.userData.vel as THREE.Vector3, dt);
        car.mesh.rotation.x += dt * 4;
        car.mesh.position.y = Math.max(0.4, car.mesh.position.y);
        continue;
      }
      if (car.route && car.graph) {
        car.dist += car.dir * car.speed * dt;
        const len = car.route.length;
        car.dist = ((car.dist % len) + len) % len;
        this.placeOnRoute(car.graph, car.mesh, car.route, car.dist, car.dir);
        continue;
      }
      car.t += car.dir * car.speed * dt;
      if (car.t > half + 10) car.t = -half - 10;
      if (car.t < -half - 10) car.t = half + 10;
      if (car.axis === "x") {
        car.mesh.position.set(car.t, 0, car.lane + car.dir * 1.6);
        car.mesh.rotation.y = car.dir > 0 ? Math.PI / 2 : -Math.PI / 2;
      } else {
        car.mesh.position.set(car.lane + car.dir * 1.6, 0, car.t);
        car.mesh.rotation.y = car.dir > 0 ? 0 : Math.PI;
      }
    }
  }

  ridden: Car | null = null;

  nearest(from: THREE.Vector3, radius: number): Car | null {
    let best: Car | null = null;
    let bestD = radius;
    for (const car of this.cars) {
      if ((car.mesh.userData as { launched?: boolean }).launched) continue;
      const d = car.mesh.position.distanceTo(from);
      if (d < bestD) {
        bestD = d;
        best = car;
      }
    }
    return best;
  }

  liftNearest(from: THREE.Vector3, radius: number): LiftedBlock | null {
    const car = this.nearest(from, radius);
    if (!car) return null;
    if (this.ridden === car) this.exit();
    const i = this.cars.indexOf(car);
    if (i >= 0) this.cars.splice(i, 1);
    car.mesh.removeFromParent();
    return { mesh: car.mesh, w: 1.8, d: 3.6, h: 1.5 };
  }

  empNear(origin: THREE.Vector3, radius: number): number {
    let n = 0;
    for (const car of this.cars) {
      if (car.mesh.position.distanceTo(origin) > radius) continue;
      car.speed = 0;
      car.mesh.userData.emp = 6;
      n += 1;
    }
    return n;
  }

  repair(car: Car): void {
    car.mesh.userData.launched = false;
    car.speed = Math.max(8, car.speed || 10);
    car.mesh.rotation.x = 0;
    car.mesh.position.y = 0;
  }

  enter(car: Car): void {
    this.ridden = car;
    car.speed = 0;
  }

  exit(): void {
    if (this.ridden) this.ridden.speed = 10;
    this.ridden = null;
  }

  drive(dt: number, axis: { x: number; z: number }, player: { position: THREE.Vector3; yaw: number; facing: THREE.Vector3 }): void {
    const car = this.ridden;
    if (!car) return;
    if (car.route && car.graph) {
      const along = axis.x * Math.sin(car.mesh.rotation.y) + -axis.z * Math.cos(car.mesh.rotation.y);
      const signed = Math.abs(along) > 0.08 ? Math.sign(along) : car.dir;
      car.dist += signed * 18 * dt;
      const len = car.route.length;
      car.dist = ((car.dist % len) + len) % len;
      this.placeOnRoute(car.graph, car.mesh, car.route, car.dist, signed >= 0 ? 1 : -1);
      player.position.copy(car.mesh.position);
      player.position.y = 0.2;
      player.yaw = car.mesh.rotation.y;
      player.facing.set(Math.sin(player.yaw), 0, Math.cos(player.yaw));
      return;
    }
    const half = worldExtent();
    const along = car.axis === "x" ? axis.x : -axis.z;
    car.t += along * 18 * dt;
    if (car.t > half + 10) car.t = -half - 10;
    if (car.t < -half - 10) car.t = half + 10;
    if (car.axis === "x") {
      car.mesh.position.set(car.t, 0, car.lane + car.dir * 1.6);
      car.mesh.rotation.y = along >= 0 ? Math.PI / 2 : -Math.PI / 2;
    } else {
      car.mesh.position.set(car.lane + car.dir * 1.6, 0, car.t);
      car.mesh.rotation.y = along <= 0 ? 0 : Math.PI;
    }
    player.position.copy(car.mesh.position);
    player.position.y = 0.2;
    player.yaw = car.mesh.rotation.y;
    player.facing.set(Math.sin(player.yaw), 0, Math.cos(player.yaw));
  }

  smashNear(origin: THREE.Vector3, radius: number, force: number): number {
    let n = 0;
    for (const car of this.cars) {
      if ((car.mesh.userData as { launched?: boolean }).launched) continue;
      const dx = car.mesh.position.x - origin.x;
      const dz = car.mesh.position.z - origin.z;
      if (Math.hypot(dx, dz) < radius) {
        const vel = new THREE.Vector3(dx, 8, dz).normalize().multiplyScalar(force);
        vel.y = 9;
        car.mesh.userData.launched = true;
        car.mesh.userData.vel = vel;
        n += 1;
      }
    }
    return n;
  }

  dispose(): void {
    this.group.clear();
    this.cars.length = 0;
  }

  private makeCar(color: number): THREE.Group {
    const g = new THREE.Group();
    const paint = new THREE.MeshLambertMaterial({ color });
    const body = new THREE.Mesh(bodyGeo, paint);
    body.position.y = 0.62;
    body.castShadow = false;
    g.add(body);
    const cabin = new THREE.Mesh(cabinGeo, glassMat);
    cabin.position.set(0, 1.08, -0.25);
    g.add(cabin);
    const bumper = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.18, 0.22), new THREE.MeshLambertMaterial({ color: 0x222226 }));
    bumper.position.set(0, 0.42, 1.72);
    g.add(bumper);
    for (const [x, z] of [
      [-0.72, 1.1],
      [0.72, 1.1],
      [-0.72, -1.15],
      [0.72, -1.15],
    ] as const) {
      const w = new THREE.Mesh(wheelGeo, tireMat);
      w.rotation.z = Math.PI / 2;
      w.position.set(x, 0.32, z);
      g.add(w);
    }
    return g;
  }
}
