import { drawCityMap, minimapCam, type MapSnapshot } from "./MapAtlas";

let sized = false;

export function drawMinimap(canvas: HTMLCanvasElement, snap: MapSnapshot): void {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const size = 168;
  if (!sized) {
    const dpr = Math.min(1, window.devicePixelRatio || 1);
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    sized = true;
  }
  drawCityMap(ctx, snap, {
    w: size,
    h: size,
    cam: minimapCam(snap.player, size, 180),
    clipCircle: true,
    labels: false,
    showLegend: false,
    filter: "all",
  });
}

