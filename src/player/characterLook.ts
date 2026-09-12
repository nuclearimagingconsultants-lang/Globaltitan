import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";

/** Saturated default Brute. Red radiance is layered on this, not a form swap. */
export const SAVAGE_GREEN = 0x2a7a38; // 2008 film olive — denser, less toy
export const SAVAGE_DEEP = 0x0f4a1c;
export const RADIANCE_RED = 0xff220c;

let poreMap: THREE.CanvasTexture | null = null;
let normalMap: THREE.CanvasTexture | null = null;
let roughMap: THREE.CanvasTexture | null = null;
let coronaTex: THREE.CanvasTexture | null = null;
let envMap: THREE.Texture | null = null;

function hash(n: number): number {
  const x = Math.sin(n * 127.1) * 43758.5453;
  return x - Math.floor(x);
}

function buildPoreCanvas(kind: "albedo" | "normal" | "rough", size = 256): HTMLCanvasElement {
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
        hash(x * 0.17 + y * 1.31) * 0.55 + hash(x * 0.41 + y * 0.23) * 0.3 + hash(x * 2.1 + y * 1.7) * 0.15;
      const wrinkle = Math.sin(y * 0.22) * Math.sin(x * 0.09) * 0.12;
      if (kind === "normal") {
        const nx = (hash(x * 0.9 + y * 0.2) - 0.5) * 0.55;
        const ny = (hash(x * 0.2 + y * 0.9) - 0.5) * 0.55;
        d[i] = Math.floor((nx + 0.5) * 255);
        d[i + 1] = Math.floor((ny + 0.5) * 255);
        d[i + 2] = 255;
        d[i + 3] = 255;
      } else if (kind === "rough") {
        const r = 118 + n * 90 + wrinkle * 40;
        d[i] = d[i + 1] = d[i + 2] = Math.max(70, Math.min(210, r));
        d[i + 3] = 255;
      } else {
        const v = 210 + n * 28 + wrinkle * 18;
        d[i] = d[i + 1] = d[i + 2] = Math.max(160, Math.min(255, v));
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
  t.repeat.set(3.2, 3.2);
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

/** Photoreal skin: roughness/metalness/clearcoat/sheen SSS stand-in. */
export function titanSkin(color: number): THREE.MeshPhysicalMaterial {
  const maps = skinMaps();
  // Movie green look without transmission SSS — that froze RTX 3050 WebGL
  return new THREE.MeshPhysicalMaterial({
    color,
    map: maps.map,
    normalMap: maps.normalMap,
    normalScale: new THREE.Vector2(1.15, 1.15),
    roughnessMap: maps.roughnessMap,
    roughness: 0.52,
    metalness: 0.02,
    clearcoat: 0.12,
    clearcoatRoughness: 0.4,
    sheen: 0.55,
    sheenColor: new THREE.Color(color).multiplyScalar(0.5),
    sheenRoughness: 0.45,
    iridescence: 0,
    emissive: 0x000000,
    emissiveIntensity: 0,
    envMapIntensity: 0.95,
  });
}

export function humanSkin(): THREE.MeshPhysicalMaterial {
  const maps = skinMaps();
  return new THREE.MeshPhysicalMaterial({
    color: 0xc9a07c,
    map: maps.map,
    normalMap: maps.normalMap,
    normalScale: new THREE.Vector2(0.4, 0.4),
    roughnessMap: maps.roughnessMap,
    roughness: 0.44,
    metalness: 0.02,
    clearcoat: 0.16,
    clearcoatRoughness: 0.5,
    sheen: 0.45,
    sheenColor: new THREE.Color(0xc08060),
    sheenRoughness: 0.55,
    envMapIntensity: 0.8,
  });
}

export function clothMat(color: number, shiny = false): THREE.MeshPhysicalMaterial {
  return new THREE.MeshPhysicalMaterial({
    color,
    roughness: shiny ? 0.28 : 0.62,
    metalness: shiny ? 0.22 : 0.04,
    clearcoat: shiny ? 0.35 : 0.06,
    clearcoatRoughness: 0.5,
    sheen: shiny ? 0.1 : 0.35,
    sheenColor: new THREE.Color(color),
    envMapIntensity: 0.7,
  });
}

export function hairMat(color: number): THREE.MeshPhysicalMaterial {
  return new THREE.MeshPhysicalMaterial({
    color,
    roughness: 0.48,
    metalness: 0.12,
    sheen: 0.4,
    sheenColor: new THREE.Color(color).multiplyScalar(1.2),
    envMapIntensity: 0.55,
  });
}

export function eyeMat(color: number, glossy = true): THREE.MeshPhysicalMaterial {
  return new THREE.MeshPhysicalMaterial({
    color,
    roughness: glossy ? 0.08 : 0.2,
    metalness: 0.05,
    clearcoat: 1,
    clearcoatRoughness: 0.08,
    envMapIntensity: 1.1,
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
  const key = new THREE.SpotLight(0xfff0d8, 3.6, 40, 0.78, 0.4, 1.05);
  key.position.set(3.2, 6.4, 4.2);
  key.castShadow = false;
  const fill = new THREE.PointLight(0x9ec0ff, 1.05, 26, 1.3);
  fill.position.set(-3.4, 3.2, 1.2);
  const rim = new THREE.PointLight(0xff2a10, 0, 16, 1.6);
  rim.position.set(0.2, 3.8, -3.6);
  const chest = new THREE.PointLight(0xff1808, 0, 11, 1.8);
  chest.position.set(0, 2.2, 1.4);
  return { key, fill, rim, chest };
}

export function bindHeroEnvMap(renderer: THREE.WebGLRenderer, mats: THREE.MeshPhysicalMaterial[]): void {
  if (!envMap) {
    const pmrem = new THREE.PMREMGenerator(renderer);
    envMap = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();
  }
  for (const m of mats) {
    m.envMap = envMap;
    m.envMapIntensity = 1.2;
    m.needsUpdate = true;
  }
}

/** Rage + Gamma â†’ red corona strength. Low = rim. Meltdown = strong bloom stand-in. */
export function radianceStrength(rage: number, gamma: number, raging: boolean, meltdown: boolean): number {
  const heat = (Math.max(0, rage) / 100) * 0.58 + (Math.max(0, gamma) / 100) * 0.42;
  const spike = raging || meltdown ? 1.4 : 1;
  return Math.min(0.55, 0.08 + heat * 0.55 * spike); // movie red corona, green still readable
}
