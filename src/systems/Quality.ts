export const QUALITY_IDS = ["auto", "low", "medium", "high", "cinematic"] as const;
export type QualityId = (typeof QUALITY_IDS)[number];

export type QualityState = {
  id: QualityId;
  label: string;
  blurb: string;
  scale: number;
  bloom: boolean;
  ssao: boolean;
  grade: boolean;
  rim: boolean;
  motionBlur: boolean;
  shadows: boolean;
  shadowDist: number;
  farClip: number;
  particleCap: number;
  debrisCap: number;
  loadM: number;
  unloadM: number;
  antialias: boolean;
};

export const QUALITY: Record<QualityId, QualityState> = {
  auto: {
    id: "auto",
    label: "Auto",
    blurb: "Laptop visual target (grade + lean bloom). FrameGuard drops scale after slow frames, floor 50%, load 220 m.",
    scale: 0.82,
    bloom: true,
    ssao: false,
    grade: true,
    rim: true,
    motionBlur: false,
    shadows: false,
    shadowDist: 80,
    farClip: 640,
    particleCap: 20,
    debrisCap: 220,
    loadM: 340,
    unloadM: 440,
    antialias: false,
  },
  low: {
    id: "low",
    label: "Low",
    blurb: "Freeze-safe. No bloom/SSAO/shadows. Sky + fog still hide the far clip (far 520 / load 300).",
    scale: 0.7,
    bloom: false,
    ssao: false,
    grade: false,
    rim: false,
    motionBlur: false,
    shadows: false,
    shadowDist: 64,
    farClip: 520,
    particleCap: 12,
    debrisCap: 100,
    loadM: 300,
    unloadM: 400,
    antialias: false,
  },
  medium: {
    id: "medium",
    label: "Medium",
    blurb: "RTX 3050 visual target. Grade + lean bloom, far 640. Shadows off. FrameGuard still owns hitches.",
    scale: 0.82,
    bloom: true,
    ssao: false,
    grade: true,
    rim: true,
    motionBlur: false,
    shadows: false,
    shadowDist: 72,
    farClip: 640,
    particleCap: 16,
    debrisCap: 140,
    loadM: 340,
    unloadM: 440,
    antialias: false,
  },
  high: {
    id: "high",
    label: "High",
    blurb: "SSAO, rim, bloom, 100 m soft shadows. Hero lighting budget. FrameGuard still drops toward 50%.",
    scale: 1,
    bloom: true,
    ssao: true,
    grade: true,
    rim: true,
    motionBlur: true,
    shadows: true,
    shadowDist: 100,
    farClip: 780,
    particleCap: 48,
    debrisCap: 300,
    loadM: 420,
    unloadM: 520,
    antialias: false,
  },
  cinematic: {
    id: "cinematic",
    label: "Cinematic",
    blurb: "All post + Hulk motion blur. Debris hard-capped at 300. Shadows 120 m. Far 860.",
    scale: 1,
    bloom: true,
    ssao: true,
    grade: true,
    rim: true,
    motionBlur: true,
    shadows: true,
    shadowDist: 120,
    farClip: 860,
    particleCap: 64,
    debrisCap: 300,
    loadM: 420,
    unloadM: 520,
    antialias: false,
  },
};

/** P0 emergency net. Dynres after slow frames. −15% steps, floor 50%. */
export class FrameGuard {
  scale = 1;
  loadMul = 1;
  particleMul = 1;
  cutPost = false;
  emaMs = 16.6;
  fps = 60;
  heavy = 0;
  maxOps = 2;
  hitchMs = 0;
  hitchWarn = false;
  overloaded = false;
  slowFrames = 0;
  private peakMs = 0;

  tick(frameMs: number): void {
    const ms = frameMs < 0.2 ? 0.2 : frameMs > 250 ? 250 : frameMs;
    this.emaMs += (ms - this.emaMs) * 0.22;
    this.fps = 1000 / this.emaMs;
    if (ms > this.peakMs) this.peakMs = ms;
    this.hitchMs = this.peakMs;
    this.hitchWarn = ms > 18 || this.emaMs > 18;

    if (ms > 18) this.slowFrames = Math.min(90, this.slowFrames + 1);
    else this.slowFrames = Math.max(0, this.slowFrames - 2);

    if (this.slowFrames >= 6) {
      this.scale = Math.max(0.5, this.scale - 0.15);
      this.loadMul = Math.min(1, 220 / 300);
      this.particleMul = 0.5;
      this.maxOps = 1;
      this.cutPost = true;
      this.overloaded = true;
      this.slowFrames = 0;
    } else if (this.emaMs < 14 && this.slowFrames <= 0) {
      this.scale = Math.min(1, this.scale + 0.01);
      this.loadMul = Math.min(1, this.loadMul + 0.02);
      this.particleMul = Math.min(1, this.particleMul + 0.02);
      this.maxOps = this.scale > 0.9 ? 2 : 1;
      if (this.scale > 0.92) this.cutPost = false;
      this.overloaded = false;
    } else {
      this.overloaded = this.hitchWarn || this.scale < 0.92;
      if (this.overloaded) this.maxOps = 1;
    }
  }
}

export function qualityLabel(id: QualityId): string {
  return QUALITY[id].label;
}
