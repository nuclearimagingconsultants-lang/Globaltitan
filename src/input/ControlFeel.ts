/** Hold / buffer windows. Default values are the live Keyboard_Only feel. */
export type FeelId = "default" | "relaxed" | "tight";

export type ControlFeel = {
  id: FeelId;
  label: string;
  blurb: string;
  smashSuper: number;
  formRadial: number;
  calmHold: number;
  jumpMax: number;
  chargeRun: number;
  braceDoubleMs: number;
  omegaCarve: number;
  shiftRip: number;
  lookScale: number;
};

export const FEEL: Record<FeelId, ControlFeel> = {
  default: {
    id: "default",
    label: "Default",
    blurb: "Current street feel. Smash haymaker 0.38s, form radial 0.45s, Calm 2s, rip 1.0s.",
    smashSuper: 0.38,
    formRadial: 0.45,
    calmHold: 2,
    jumpMax: 3,
    chargeRun: 1.5,
    braceDoubleMs: 280,
    omegaCarve: 0.35,
    shiftRip: 1,
    lookScale: 1,
  },
  relaxed: {
    id: "relaxed",
    label: "Relaxed",
    blurb: "Accessibility: shorter holds, easier haymaker, slower look. WASD stays camera-only.",
    smashSuper: 0.24,
    formRadial: 0.28,
    calmHold: 1.35,
    jumpMax: 2.4,
    chargeRun: 1.1,
    braceDoubleMs: 420,
    omegaCarve: 0.22,
    shiftRip: 0.7,
    lookScale: 0.72,
  },
  tight: {
    id: "tight",
    label: "Tight",
    blurb: "Longer charge windows. Still Arrows-move / WASD-look.",
    smashSuper: 0.48,
    formRadial: 0.55,
    calmHold: 2.2,
    jumpMax: 3,
    chargeRun: 1.7,
    braceDoubleMs: 220,
    omegaCarve: 0.42,
    shiftRip: 1.15,
    lookScale: 1.12,
  },
};

export const FEEL_IDS: FeelId[] = ["default", "relaxed", "tight"];

export function feelOf(id: string | undefined): ControlFeel {
  if (id === "relaxed" || id === "tight") return FEEL[id];
  return FEEL.default;
}
