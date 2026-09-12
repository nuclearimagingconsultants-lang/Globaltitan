import * as THREE from "three";

export type PbrMaps = {
  map: THREE.Texture;
};

function canvas(size: number): { c: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
  const c = document.createElement("canvas");
  c.width = size;
  c.height = size;
  const ctx = c.getContext("2d", { willReadFrequently: true })!;
  return { c, ctx };
}

function tex(c: HTMLCanvasElement, repeat = 1): THREE.Texture {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  t.magFilter = THREE.LinearFilter;
  t.generateMipmaps = true;
  t.anisotropy = 1;
  t.repeat.set(repeat, repeat);
  t.needsUpdate = true;
  return t;
}

function noise(ctx: CanvasRenderingContext2D, size: number, alpha: number): void {
  const img = ctx.getImageData(0, 0, size, size);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = (Math.random() - 0.5) * alpha;
    d[i] = Math.min(255, Math.max(0, d[i]! + n));
    d[i + 1] = Math.min(255, Math.max(0, d[i + 1]! + n));
    d[i + 2] = Math.min(255, Math.max(0, d[i + 2]! + n));
  }
  ctx.putImageData(img, 0, 0);
}

function hexRgb(hex: number): [number, number, number] {
  return [(hex >> 16) & 255, (hex >> 8) & 255, hex & 255];
}

export function makeSidewalk(size = 384): PbrMaps {
  const { c, ctx } = canvas(size);
  ctx.fillStyle = "#9aa0a6";
  ctx.fillRect(0, 0, size, size);
  const tiles = 6;
  const gap = 4;
  const tile = (size - gap * (tiles + 1)) / tiles;
  for (let y = 0; y < tiles; y++) {
    for (let x = 0; x < tiles; x++) {
      const shade = 148 + Math.floor(Math.random() * 22);
      ctx.fillStyle = `rgb(${shade},${shade - 2},${shade - 6})`;
      ctx.fillRect(gap + x * (tile + gap), gap + y * (tile + gap), tile, tile);
    }
  }
  noise(ctx, size, 16);
  return { map: tex(c, 4) };
}

export function makeFacade(base: number, windowCol: number, night: boolean, seed: number, size = 384): PbrMaps {
  const { c, ctx } = canvas(size);
  const [br, bg, bb] = hexRgb(base);
  ctx.fillStyle = `rgb(${br},${bg},${bb})`;
  ctx.fillRect(0, 0, size, size);

  const rng = () => {
    seed = (Math.imul(1664525, seed) + 1013904223) >>> 0;
    return seed / 4294967296;
  };

  const floors = 12;
  const cols = 6;
  const marginX = 70;
  const storeyH = size / floors;
  const [wr, wg, wb] = hexRgb(windowCol);

  ctx.fillStyle = `rgba(0,0,0,0.18)`;
  ctx.fillRect(0, size - storeyH * 1.15, size, storeyH * 1.15);
  for (let k = 0; k < 3; k++) {
    ctx.fillStyle = night ? `rgba(${wr},${wg},${wb},0.35)` : "rgba(40,50,60,0.55)";
    ctx.fillRect(80 + k * 300, size - storeyH * 1.02, 220, storeyH * 0.82);
  }
  ctx.fillStyle = `rgb(${Math.max(0, br - 30)},${Math.max(0, bg - 30)},${Math.max(0, bb - 30)})`;
  ctx.fillRect(0, 0, size, 28);

  for (let f = 1; f < floors - 1; f++) {
    const y0 = f * storeyH;
    ctx.fillStyle = `rgba(255,255,255,0.05)`;
    ctx.fillRect(0, y0, size, 6);
    ctx.fillStyle = `rgba(0,0,0,0.16)`;
    ctx.fillRect(0, y0 + storeyH - 8, size, 8);
    for (let col = 0; col < cols; col++) {
      const x = marginX + col * ((size - marginX * 2) / cols);
      const w = 96;
      const h = storeyH * 0.58;
      const lit = night ? rng() > 0.28 : rng() > 0.82;
      if (lit) {
        ctx.fillStyle = `rgba(${wr},${wg},${wb},${night ? 0.92 : 0.55})`;
      } else {
        ctx.fillStyle = night ? "rgba(12,16,22,0.92)" : `rgba(${wr * 0.35},${wg * 0.4},${wb * 0.45},0.55)`;
      }
      ctx.fillRect(x, y0 + storeyH * 0.22, w, h);
      ctx.strokeStyle = "rgba(0,0,0,0.35)";
      ctx.lineWidth = 3;
      ctx.strokeRect(x, y0 + storeyH * 0.22, w, h);
      ctx.strokeStyle = "rgba(255,255,255,0.08)";
      ctx.beginPath();
      ctx.moveTo(x + 4, y0 + storeyH * 0.22 + 4);
      ctx.lineTo(x + w * 0.45, y0 + storeyH * 0.22 + 4);
      ctx.stroke();
    }
  }
  return { map: tex(c, 1) };
}

export function makeGrass(size = 256): PbrMaps {
  const { c, ctx } = canvas(size);
  ctx.fillStyle = "#3a6a32";
  ctx.fillRect(0, 0, size, size);
  for (let i = 0; i < 400; i++) {
    ctx.fillStyle = `rgba(${30 + Math.random() * 50},${90 + Math.random() * 70},${30 + Math.random() * 30},0.55)`;
    ctx.fillRect(Math.random() * size, Math.random() * size, 3, 8);
  }
  return { map: tex(c, 6) };
}

export function makeGlass(color: number, night: boolean): THREE.MeshPhongMaterial {
  return new THREE.MeshPhongMaterial({
    color,
    emissive: new THREE.Color(color),
    emissiveIntensity: night ? 0.38 : 0.07,
    shininess: night ? 72 : 54,
    specular: new THREE.Color(0xa8cce0),
  });
}

export function std(maps: PbrMaps, color = 0xffffff): THREE.MeshLambertMaterial {
  return new THREE.MeshLambertMaterial({
    map: maps.map,
    color,
  });
}
