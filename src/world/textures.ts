import * as THREE from "three";

export type PbrMaps = {
  map: THREE.Texture;
  roughnessMap?: THREE.Texture;
  normalMap?: THREE.Texture;
};

function canvas(size: number): { c: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
  const c = document.createElement("canvas");
  c.width = size;
  c.height = size;
  const ctx = c.getContext("2d", { willReadFrequently: true })!;
  return { c, ctx };
}

function tex(c: HTMLCanvasElement, repeat = 1, colorSpace: THREE.ColorSpace = THREE.SRGBColorSpace): THREE.Texture {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = colorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  t.magFilter = THREE.LinearFilter;
  t.generateMipmaps = true;
  t.anisotropy = 4;
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

function hash(n: number): number {
  const x = Math.sin(n * 127.1) * 43758.5453;
  return x - Math.floor(x);
}

export function makeSidewalk(size = 512): PbrMaps {
  const { c, ctx } = canvas(size);
  ctx.fillStyle = "#8e949a";
  ctx.fillRect(0, 0, size, size);
  const tiles = 6;
  const gap = 5;
  const tile = (size - gap * (tiles + 1)) / tiles;
  for (let y = 0; y < tiles; y++) {
    for (let x = 0; x < tiles; x++) {
      const shade = 142 + Math.floor(Math.random() * 26);
      ctx.fillStyle = `rgb(${shade},${shade - 3},${shade - 8})`;
      ctx.fillRect(gap + x * (tile + gap), gap + y * (tile + gap), tile, tile);
      ctx.fillStyle = "rgba(0,0,0,0.12)";
      ctx.fillRect(gap + x * (tile + gap), gap + y * (tile + gap) + tile * 0.82, tile, tile * 0.18);
    }
  }
  noise(ctx, size, 18);
  return { map: tex(c, 4) };
}

export function makeAsphalt(size = 512): PbrMaps {
  const { c, ctx } = canvas(size);
  ctx.fillStyle = "#2a2c30";
  ctx.fillRect(0, 0, size, size);
  const img = ctx.getImageData(0, 0, size, size);
  const d = img.data;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      const n = hash(x * 0.37 + y * 1.13) * 22 + hash(x * 2.1 + y * 0.4) * 10;
      const v = 38 + n;
      d[i] = v;
      d[i + 1] = v - 1;
      d[i + 2] = v - 3;
      d[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  ctx.strokeStyle = "rgba(210,200,160,0.35)";
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.moveTo(size * 0.5, 8);
  ctx.lineTo(size * 0.5, size - 8);
  ctx.setLineDash([28, 22]);
  ctx.stroke();
  return { map: tex(c, 8) };
}

export function makeBrick(size = 512): PbrMaps {
  const { c, ctx } = canvas(size);
  ctx.fillStyle = "#6a5348";
  ctx.fillRect(0, 0, size, size);
  const bh = 22;
  const bw = 48;
  for (let y = 0, row = 0; y < size; y += bh + 3, row++) {
    const ox = row % 2 === 0 ? 0 : bw * 0.5;
    for (let x = -bw; x < size; x += bw + 3) {
      const r = 118 + Math.floor(Math.random() * 40);
      const g = 62 + Math.floor(Math.random() * 22);
      const b = 48 + Math.floor(Math.random() * 16);
      ctx.fillStyle = `rgb(${r},${g},${b})`;
      ctx.fillRect(x + ox, y, bw, bh);
      ctx.fillStyle = "rgba(0,0,0,0.22)";
      ctx.fillRect(x + ox, y + bh - 4, bw, 4);
    }
  }
  noise(ctx, size, 14);
  return { map: tex(c, 3) };
}

export function makeFacade(base: number, windowCol: number, night: boolean, seed: number, size = 512): PbrMaps {
  const { c, ctx } = canvas(size);
  const [br, bg, bb] = hexRgb(base);
  ctx.fillStyle = `rgb(${br},${bg},${bb})`;
  ctx.fillRect(0, 0, size, size);

  const rng = () => {
    seed = (Math.imul(1664525, seed) + 1013904223) >>> 0;
    return seed / 4294967296;
  };

  const floors = 14;
  const cols = 7;
  const marginX = 48;
  const storeyH = size / floors;
  const [wr, wg, wb] = hexRgb(windowCol);

  // baked contact AO at base + roof
  const ao = ctx.createLinearGradient(0, 0, 0, size);
  ao.addColorStop(0, "rgba(0,0,0,0.28)");
  ao.addColorStop(0.08, "rgba(0,0,0,0)");
  ao.addColorStop(0.86, "rgba(0,0,0,0)");
  ao.addColorStop(1, "rgba(0,0,0,0.38)");
  ctx.fillStyle = ao;
  ctx.fillRect(0, 0, size, size);

  ctx.fillStyle = `rgba(0,0,0,0.22)`;
  ctx.fillRect(0, size - storeyH * 1.2, size, storeyH * 1.2);
  for (let k = 0; k < 3; k++) {
    ctx.fillStyle = night ? `rgba(${wr},${wg},${wb},0.42)` : "rgba(28,34,42,0.62)";
    ctx.fillRect(56 + k * 140, size - storeyH * 1.05, 110, storeyH * 0.86);
    ctx.fillStyle = "rgba(0,0,0,0.35)";
    ctx.fillRect(56 + k * 140, size - storeyH * 0.28, 110, 8);
  }
  ctx.fillStyle = `rgb(${Math.max(0, br - 36)},${Math.max(0, bg - 36)},${Math.max(0, bb - 36)})`;
  ctx.fillRect(0, 0, size, 22);

  for (let f = 1; f < floors - 1; f++) {
    const y0 = f * storeyH;
    ctx.fillStyle = `rgba(255,255,255,0.06)`;
    ctx.fillRect(0, y0, size, 4);
    ctx.fillStyle = `rgba(0,0,0,0.2)`;
    ctx.fillRect(0, y0 + storeyH - 6, size, 6);
    for (let col = 0; col < cols; col++) {
      const x = marginX + col * ((size - marginX * 2) / cols);
      const w = 42;
      const h = storeyH * 0.52;
      const lit = night ? rng() > 0.26 : rng() > 0.78;
      ctx.fillStyle = "rgba(0,0,0,0.28)";
      ctx.fillRect(x - 2, y0 + storeyH * 0.24, w + 4, h + 6);
      if (lit) {
        ctx.fillStyle = `rgba(${wr},${wg},${wb},${night ? 0.94 : 0.48})`;
      } else {
        ctx.fillStyle = night ? "rgba(10,14,20,0.94)" : `rgba(${wr * 0.28},${wg * 0.32},${wb * 0.38},0.62)`;
      }
      ctx.fillRect(x, y0 + storeyH * 0.22, w, h);
      ctx.strokeStyle = "rgba(0,0,0,0.4)";
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y0 + storeyH * 0.22, w, h);
      ctx.strokeStyle = "rgba(255,255,255,0.1)";
      ctx.beginPath();
      ctx.moveTo(x + 3, y0 + storeyH * 0.22 + 3);
      ctx.lineTo(x + w * 0.4, y0 + storeyH * 0.22 + 3);
      ctx.stroke();
    }
  }
  // dirt streaks
  ctx.globalAlpha = 0.12;
  for (let i = 0; i < 18; i++) {
    ctx.fillStyle = "#1a1814";
    ctx.fillRect(rng() * size, 40, 3 + rng() * 4, 80 + rng() * 180);
  }
  ctx.globalAlpha = 1;
  return { map: tex(c, 1) };
}

export function makeGrass(size = 256): PbrMaps {
  const { c, ctx } = canvas(size);
  ctx.fillStyle = "#3a6a32";
  ctx.fillRect(0, 0, size, size);
  for (let i = 0; i < 520; i++) {
    ctx.fillStyle = `rgba(${30 + Math.random() * 50},${90 + Math.random() * 70},${30 + Math.random() * 30},0.55)`;
    ctx.fillRect(Math.random() * size, Math.random() * size, 3, 8);
  }
  return { map: tex(c, 6) };
}

export function makeGlass(color: number, night: boolean): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color,
    emissive: new THREE.Color(color),
    emissiveIntensity: night ? 0.42 : 0.06,
    roughness: night ? 0.18 : 0.28,
    metalness: 0.62,
    envMapIntensity: 0.55,
  });
}

export function std(maps: PbrMaps, color = 0xffffff): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    map: maps.map,
    color,
    roughness: 0.78,
    metalness: 0.04,
    envMapIntensity: 0.28,
  });
}

export function makeClothWeave(size = 256): THREE.CanvasTexture {
  const { c, ctx } = canvas(size);
  const img = ctx.createImageData(size, size);
  const d = img.data;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      const weave = ((x >> 2) & 1) !== ((y >> 2) & 1) ? 28 : 0;
      const n = hash(x * 0.7 + y * 1.9) * 18;
      const v = 150 + weave + n;
      d[i] = d[i + 1] = d[i + 2] = Math.max(90, Math.min(220, v));
      d[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  const t = tex(c, 8, THREE.NoColorSpace);
  return t as THREE.CanvasTexture;
}
