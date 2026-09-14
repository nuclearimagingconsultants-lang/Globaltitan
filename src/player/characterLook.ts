import * as THREE from "three";
import { LOOK_BUDGET } from "../world/lookBudget";
import { makeClothWeave } from "../world/textures";

/** Saturated default Brute. Red radiance is layered on this, not a form swap. */
export const SAVAGE_GREEN = 0x2a7a38; // 2008 film olive — denser, less toy
export const SAVAGE_DEEP = 0x0f4a1c;
export const RADIANCE_RED = 0xff220c;

let poreMap: THREE.CanvasTexture | null = null;
let normalMap: THREE.CanvasTexture | null = null;
let roughMap: THREE.CanvasTexture | null = null;
let clothMap: THREE.CanvasTexture | null = null;
let coronaTex: THREE.CanvasTexture | null = null;
let envMap: THREE.Texture | null = null;

function hash(n: number): number {
  const x = Math.sin(n * 127.1) * 43758.5453;
  return x - Math.floor(x);
}

function buildPoreCanvas(kind: "albedo" | "normal" | "rough", size = LOOK_BUDGET.skinMapSize): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = size;
  c.height = size;
  const ctx = c.getContext("2d")!;
  const img = ctx.createImageData(size, size);
  const d = img.data;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      const n =
        hash(x * 0.17 + y * 1.31) * 0.45 + hash(x * 0.41 + y * 0.23) * 0.32 + hash(x * 2.1 + y * 1.7) * 0.23;
      const wrinkle = Math.sin(y * 0.19) * Math.sin(x * 0.07) * 0.14;
      const pore = hash(x * 3.7 + y * 4.1) > 0.82 ? 0.18 : 0;
      if (kind === "normal") {
        const nx = (hash(x * 0.9 + y * 0.2) - 0.5) * 0.42 + (hash(x + 1) - hash(x - 1)) * 0.12;
        const ny = (hash(x * 0.2 + y * 0.9) - 0.5) * 0.42 + (hash(y + 1) - hash(y - 1)) * 0.12;
        d[i] = Math.floor((nx + 0.5) * 255);
        d[i + 1] = Math.floor((ny + 0.5) * 255);
        d[i + 2] = 255;
        d[i + 3] = 255;
      } else if (kind === "rough") {
        const r = 132 + n * 70 + wrinkle * 36 + pore * 40;
        d[i] = d[i + 1] = d[i + 2] = Math.max(88, Math.min(200, r));
        d[i + 3] = 255;
      } else {
        const v = 196 + n * 32 + wrinkle * 16 - pore * 30;
        d[i] = d[i + 1] = d[i + 2] = Math.max(140, Math.min(245, v));
        d[i + 3] = 255;
      }
    }
  }
  ctx.putImageData(img, 0, 0);
  return c;
}

function tex(kind: "albedo" | "normal" | "rough"): THREE.CanvasTexture {
  const t = new THREE.CanvasTexture(buildPoreCanvas(kind));
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(2.6, 2.6);
  t.anisotropy = 4;
  t.colorSpace = kind === "albedo" ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  t.needsUpdate = true;
  return t;
}

function skinMaps(): { map: THREE.CanvasTexture; normalMap: THREE.CanvasTexture; roughnessMap: THREE.CanvasTexture } {
  poreMap ??= tex("albedo");
  normalMap ??= tex("normal");
  roughMap ??= tex("rough");
  return { map: poreMap, normalMap, roughnessMap: roughMap };
}

function clothTex(): THREE.CanvasTexture {
  clothMap ??= makeClothWeave(LOOK_BUDGET.clothMapSize);
  return clothMap;
}

function coronaTexture(): THREE.CanvasTexture {
  if (coronaTex) return coronaTex;
  const size = 128;
  const c = document.createElement("canvas");
  c.width = size;
  c.height = size;
  const ctx = c.getContext("2d")!;
  const g = ctx.createRadialGradient(64, 64, 4, 64, 64, 62);
  g.addColorStop(0, "rgba(255,80,40,1)");
  g.addColorStop(0.22, "rgba(255,24,8,0.7)");
  g.addColorStop(0.55, "rgba(255,10,0,0.22)");
  g.addColorStop(1, "rgba(255,0,0,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  coronaTex = new THREE.CanvasTexture(c);
  coronaTex.colorSpace = THREE.SRGBColorSpace;
  return coronaTex;
}

/** Photoreal skin: roughness/metalness/clearcoat/sheen SSS stand-in. No transmission (3050 freeze). */
export function titanSkin(color: number): THREE.MeshPhysicalMaterial {
  const maps = skinMaps();
  return new THREE.MeshPhysicalMaterial({
    color,
    map: maps.map,
    normalMap: maps.normalMap,
    normalScale: new THREE.Vector2(0.72, 0.72),
    roughnessMap: maps.roughnessMap,
    roughness: 0.62,
    metalness: 0.0,
    clearcoat: 0.06,
    clearcoatRoughness: 0.55,
    sheen: 0.72,
    sheenColor: new THREE.Color(color).multiplyScalar(0.62),
    sheenRoughness: 0.52,
    iridescence: 0,
    emissive: 0x000000,
    emissiveIntensity: 0,
    envMapIntensity: 0.7,
    transmission: 0,
  });
}

export function humanSkin(): THREE.MeshPhysicalMaterial {
  const maps = skinMaps();
  return new THREE.MeshPhysicalMaterial({
    color: 0xc4a07a,
    map: maps.map,
    normalMap: maps.normalMap,
    normalScale: new THREE.Vector2(0.28, 0.28),
    roughnessMap: maps.roughnessMap,
    roughness: 0.58,
    metalness: 0.0,
    clearcoat: 0.08,
    clearcoatRoughness: 0.62,
    sheen: 0.55,
    sheenColor: new THREE.Color(0xc08060),
    sheenRoughness: 0.6,
    transmission: 0,
    envMapIntensity: 0.55,
  });
}

export function clothMat(color: number, shiny = false): THREE.MeshPhysicalMaterial {
  return new THREE.MeshPhysicalMaterial({
    color,
    map: clothTex(),
    roughness: shiny ? 0.34 : 0.74,
    metalness: shiny ? 0.12 : 0.02,
    clearcoat: shiny ? 0.18 : 0.02,
    clearcoatRoughness: 0.62,
    sheen: shiny ? 0.12 : 0.48,
    sheenColor: new THREE.Color(color),
    sheenRoughness: 0.7,
    transmission: 0,
    envMapIntensity: 0.45,
  });
}

export function hairMat(color: number): THREE.MeshPhysicalMaterial {
  return new THREE.MeshPhysicalMaterial({
    color,
    roughness: 0.52,
    metalness: 0.08,
    sheen: 0.48,
    sheenColor: new THREE.Color(color).multiplyScalar(1.15),
    transmission: 0,
    envMapIntensity: 0.4,
  });
}

export function eyeMat(color: number, glossy = true): THREE.MeshPhysicalMaterial {
  return new THREE.MeshPhysicalMaterial({
    color,
    roughness: glossy ? 0.08 : 0.22,
    metalness: 0.04,
    clearcoat: 1,
    clearcoatRoughness: 0.1,
    transmission: 0,
    envMapIntensity: 0.85,
  });
}

export function makeCoronaSprite(scale = 5.4): THREE.Sprite {
  const mat = new THREE.SpriteMaterial({
    map: coronaTexture(),
    color: RADIANCE_RED,
    transparent: true,
    opacity: 0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    depthTest: true,
  });
  const s = new THREE.Sprite(mat);
  s.scale.setScalar(scale);
  s.position.y = 1.6;
  s.visible = false;
  return s;
}

export type HeroLights = {
  key: THREE.SpotLight;
  fill: THREE.PointLight;
  rim: THREE.PointLight;
  chest: THREE.PointLight;
};

export function makeHeroLights(): HeroLights {
  const key = new THREE.SpotLight(0xfff0d8, 2.8, 40, 0.78, 0.4, 1.05);
  key.position.set(3.2, 6.4, 4.2);
  key.castShadow = false;
  const fill = new THREE.PointLight(0x9ec0ff, 0.85, 26, 1.3);
  fill.position.set(-3.4, 3.2, 1.2);
  const rim = new THREE.PointLight(0xff2a10, 0, 16, 1.6);
  rim.position.set(0.2, 3.8, -3.6);
  const chest = new THREE.PointLight(0xff1808, 0, 11, 1.8);
  chest.position.set(0, 2.2, 1.4);
  return { key, fill, rim, chest };
}

/** Outdoor IBL stand-in (sky + ground). RoomEnvironment reads as indoor plastic. */
export function bindHeroEnvMap(renderer: THREE.WebGLRenderer, mats: THREE.MeshPhysicalMaterial[]): void {
  if (!envMap) {
    const pmrem = new THREE.PMREMGenerator(renderer);
    const envScene = new THREE.Scene();
    envScene.add(new THREE.HemisphereLight(0xc8dcff, 0x3a3028, 1.35));
    const sky = new THREE.Mesh(
      new THREE.SphereGeometry(12, 16, 12),
      new THREE.MeshBasicMaterial({ color: 0x88aed4, side: THREE.BackSide }),
    );
    envScene.add(sky);
    const ground = new THREE.Mesh(new THREE.CircleGeometry(10, 16), new THREE.MeshBasicMaterial({ color: 0x4a4a40 }));
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -1.2;
    envScene.add(ground);
    envMap = pmrem.fromScene(envScene, 0.02).texture;
    pmrem.dispose();
  }
  for (const m of mats) {
    m.envMap = envMap;
    m.envMapIntensity = 0.72;
    m.transmission = 0;
    m.needsUpdate = true;
  }
}

/** Rage + Gamma → red corona strength. Low = rim. Meltdown = strong bloom stand-in. */
export function radianceStrength(rage: number, gamma: number, raging: boolean, meltdown: boolean): number {
  const heat = (Math.max(0, rage) / 100) * 0.58 + (Math.max(0, gamma) / 100) * 0.42;
  const spike = raging || meltdown ? 1.4 : 1;
  return Math.min(0.55, 0.08 + heat * 0.55 * spike);
}
