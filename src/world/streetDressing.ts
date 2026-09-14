import * as THREE from "three";
import { LOOK_BUDGET } from "./lookBudget";
import { createRng, hashString, range } from "./rng";
import type { CityTheme } from "./themes";

export type DressGrid = {
  grid: number;
  cell: number;
  block: number;
  road: number;
  extent: number;
};

function place(
  dummy: THREE.Object3D,
  mesh: THREE.InstancedMesh,
  x: number,
  y: number,
  z: number,
  sx: number,
  sy: number,
  sz: number,
  yaw = 0,
): void {
  if (mesh.count >= mesh.instanceMatrix.count) return;
  dummy.position.set(x, y, z);
  dummy.scale.set(sx, sy, sz);
  dummy.rotation.set(0, yaw, 0);
  dummy.updateMatrix();
  mesh.setMatrixAt(mesh.count, dummy.matrix);
  mesh.count += 1;
}

/** Instanced curb dressing — density without unique-mesh cost. */
export function buildStreetDressing(parent: THREE.Group, theme: CityTheme, cityId: string, g: DressGrid): void {
  const rng = createRng(hashString(`dress:${cityId}`));
  const dummy = new THREE.Object3D();
  const half = g.extent;
  const box = new THREE.BoxGeometry(1, 1, 1);
  const cyl = new THREE.CylinderGeometry(0.5, 0.5, 1, 8);

  const dumpMat = new THREE.MeshStandardMaterial({ color: 0x3a5a3a, roughness: 0.72, metalness: 0.18 });
  const steel = new THREE.MeshStandardMaterial({ color: 0x6a7078, roughness: 0.38, metalness: 0.55 });
  const planter = new THREE.MeshStandardMaterial({ color: 0x6a5040, roughness: 0.78, metalness: 0.04 });
  const leaf = new THREE.MeshLambertMaterial({ color: theme.grass });
  const kiosk = new THREE.MeshStandardMaterial({ color: theme.accent, roughness: 0.55, metalness: 0.08 });
  const hydrant = new THREE.MeshStandardMaterial({ color: 0xb42318, roughness: 0.45, metalness: 0.12 });
  const carBody = new THREE.MeshStandardMaterial({ color: 0xd8d8d8, roughness: 0.42, metalness: 0.22 });
  const cabMat = new THREE.MeshStandardMaterial({ color: 0x89a8c0, roughness: 0.22, metalness: 0.08 });
  const trunk = new THREE.MeshLambertMaterial({ color: 0x4a3424 });

  const dumpsters = new THREE.InstancedMesh(box, dumpMat, LOOK_BUDGET.dumpsters);
  const bollards = new THREE.InstancedMesh(cyl, steel, LOOK_BUDGET.bollards);
  const planters = new THREE.InstancedMesh(box, planter, LOOK_BUDGET.planters);
  const bushes = new THREE.InstancedMesh(new THREE.SphereGeometry(0.55, 6, 5), leaf, LOOK_BUDGET.planters);
  const kiosks = new THREE.InstancedMesh(box, kiosk, LOOK_BUDGET.kiosks);
  const hydrants = new THREE.InstancedMesh(cyl, hydrant, LOOK_BUDGET.hydrants);
  const cars = new THREE.InstancedMesh(box, carBody, LOOK_BUDGET.parkedCars);
  const cabins = new THREE.InstancedMesh(box, cabMat, LOOK_BUDGET.parkedCars);
  const trunks = new THREE.InstancedMesh(cyl, trunk, LOOK_BUDGET.curbTrees);
  const canopy = new THREE.InstancedMesh(new THREE.SphereGeometry(1.15, 6, 5), leaf, LOOK_BUDGET.curbTrees);

  for (const m of [dumpsters, bollards, planters, bushes, kiosks, hydrants, cars, cabins, trunks, canopy]) {
    m.count = 0;
    m.castShadow = false;
    m.receiveShadow = true;
    m.frustumCulled = true;
  }

  for (let iz = 0; iz < g.grid; iz++) {
    for (let ix = 0; ix < g.grid; ix++) {
      const ox = -half + ix * g.cell;
      const oz = -half + iz * g.cell;
      const roadX = ox + g.block + g.road / 2;
      const roadZ = oz + g.block + g.road / 2;
      const plaza = ix === Math.floor(g.grid / 2) && iz === Math.floor(g.grid / 2);

      for (const [sx, sz] of [
        [ox + 1.2, oz + g.block + 1.1],
        [ox + g.block - 1.2, oz + g.block + 1.1],
        [ox + g.block + 1.1, oz + 1.2],
        [ox + g.block + 1.1, oz + g.block - 1.2],
      ] as const) {
        if (rng() < 0.55) place(dummy, bollards, sx, 0.42, sz, 0.22, 0.84, 0.22);
        if (rng() < 0.4) place(dummy, bollards, sx + 0.9, 0.42, sz + 0.2, 0.22, 0.84, 0.22);
      }

      if (!plaza && rng() < 0.7) {
        place(dummy, dumpsters, ox + 2.2 + rng() * 4, 0.55, oz + g.block + 1.35, 1.4, 1.1, 0.85, rng() * 0.2);
      }
      if (!plaza && rng() < 0.45) {
        const px = ox + 3 + rng() * (g.block - 6);
        const pz = oz + 2.2;
        place(dummy, planters, px, 0.28, pz, 1.1, 0.55, 1.1);
        place(dummy, bushes, px, 0.85, pz, 0.9 + rng() * 0.3, 0.7, 0.9 + rng() * 0.3);
      }
      if (!plaza && rng() < 0.38) {
        place(dummy, kiosks, ox + g.block * 0.5, 1.05, oz + g.block + 1.6, 1.6, 2.1, 0.7, rng() * 0.4);
      }
      if (rng() < 0.55) {
        place(dummy, hydrants, ox + g.block + 1.6, 0.38, oz + 3.4 + rng() * 6, 0.32, 0.76, 0.32);
      }
      if (!plaza && rng() < 0.5) {
        const tx = ox + 2.4 + rng() * 6;
        const tz = oz + g.block + 1.55;
        place(dummy, trunks, tx, 1.15, tz, 0.32, 2.3, 0.32);
        place(dummy, canopy, tx, 2.85, tz, 1.1 + rng() * 0.35, 0.95, 1.1 + rng() * 0.35);
      }
      if (!plaza && rng() < 0.42) {
        const along = range(rng, ox + 3, ox + g.block - 3);
        const yaw = rng() < 0.5 ? 0 : Math.PI / 2;
        const cx = yaw === 0 ? along : roadX + (rng() < 0.5 ? -4.2 : 4.2);
        const cz = yaw === 0 ? roadZ + (rng() < 0.5 ? -4.2 : 4.2) : along;
        place(dummy, cars, cx, 0.42, cz, 1.72, 0.52, 3.5, yaw);
        place(dummy, cabins, cx, 0.82, cz - 0.2, 1.48, 0.46, 1.45, yaw);
      }
    }
  }

  for (const m of [dumpsters, bollards, planters, bushes, kiosks, hydrants, cars, cabins, trunks, canopy]) {
    m.instanceMatrix.needsUpdate = true;
    parent.add(m);
  }
}
