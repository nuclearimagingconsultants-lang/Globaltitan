import type { BruceKind, HulkKind, TitanKind } from "./types";

export type HulkFormDef = {
  id: HulkKind;
  saveId: string;
  name: string;
  short: string;
  blurb: string;
  skin: number;
  deep: number;
  khaki: number;
  hair: number;
  glow: number;
  speed: number;
  jump: number;
  smash: number;
  comboLen: number;
  climb: boolean;
  rageSec: number;
  heat: boolean;
};

/** Default titan. Not an upgrade — this is first-transform Hulk. */
export const DEFAULT_HULK_KIND: TitanKind = "worldbreaker";
export const DEFAULT_ACTIVE_FORM = "WorldBreaker";

export const HULK_FORMS: HulkFormDef[] = [
  {
    id: "worldbreaker",
    saveId: "WorldBreaker",
    name: "World Breaker",
    short: "BREAKER",
    blurb:
      "Default titan. Movie CGI olive-green skin, purple torn pants, bright red radiance, World Breaker mass from the first smash — not a weaker base that upgrades into this.",
    skin: 0x2f9e48,
    deep: 0x156b2a,
    khaki: 0x4a2f6e,
    hair: 0x16130f,
    glow: 0xff1a08,
    speed: 1,
    jump: 1.12,
    smash: 1.18,
    comboLen: 4,
    climb: true,
    rageSec: 20,
    heat: false,
  },
  {
    id: "fixit",
    saveId: "Fixit",
    name: "Joe Fixit",
    short: "FIXIT",
    blurb: "Grey suit and fedora. Faster, longer combos, shorter leap. Gamma caps at 79. Street-brawl 3 and 7.",
    skin: 0x9aa0a6,
    deep: 0x6e747a,
    khaki: 0x2a2c32,
    hair: 0x1a1816,
    glow: 0xc8d0d6,
    speed: 1.22,
    jump: 0.72,
    smash: 0.92,
    comboLen: 6,
    climb: true,
    rageSec: 20,
    heat: false,
  },
  {
    id: "red",
    saveId: "Red",
    name: "Red Hulk",
    short: "RED",
    blurb: "Stores Gamma as Heat. Floor 30 while lit. Damage up, HP drain at cap. Numpad 8 vents. Fire 5 and 9.",
    skin: 0xc43a22,
    deep: 0x8a2414,
    khaki: 0x4a2a18,
    hair: 0x1a0c08,
    glow: 0xff6a2a,
    speed: 1.04,
    jump: 0.94,
    smash: 1.06,
    comboLen: 4,
    climb: true,
    rageSec: 0,
    heat: true,
  },
  {
    id: "immortal",
    saveId: "Immortal",
    name: "Immortal Hulk",
    short: "IMMORTAL",
    blurb: "Night flesh. Regenerates. No Bruce window at night. Death is a horror rebuild. 2 / 4 / 9 gamma AoE.",
    skin: 0x1e3a22,
    deep: 0x0e1c12,
    khaki: 0x2a2418,
    hair: 0x050806,
    glow: 0x44ff88,
    speed: 0.78,
    jump: 0.86,
    smash: 1.18,
    comboLen: 3,
    climb: true,
    rageSec: 20,
    heat: false,
  },
  {
    id: "maestro",
    saveId: "Maestro",
    name: "Maestro",
    short: "MAESTRO",
    blurb: "Old, bearded, permanent weapon. Burns Gamma at half rate. No wall climb. Heavy Enter cleaves. Rage 30s.",
    skin: 0x6a8a3a,
    deep: 0x3e5820,
    khaki: 0x3a3428,
    hair: 0xc8c0b0,
    glow: 0xd4c46a,
    speed: 0.88,
    jump: 0.9,
    smash: 1.28,
    comboLen: 3,
    climb: false,
    rageSec: 30,
    heat: false,
  },
  {
    id: "feral",
    saveId: "Feral",
    name: "Feral Hulk",
    short: "FERAL",
    blurb: "Additive stub. Darker green, street-hunt frame. Kit numbers PARTIAL — Rage Rep gate until the bible lands.",
    skin: 0x0e5a18,
    deep: 0x06380c,
    khaki: 0x6a5a40,
    hair: 0x0a0806,
    glow: 0x66ff44,
    speed: 1.08,
    jump: 1.04,
    smash: 1.08,
    comboLen: 4,
    climb: true,
    rageSec: 22,
    heat: false,
  },
  {
    id: "hell",
    saveId: "Hell",
    name: "Hell Hulk",
    short: "HELL",
    blurb: "Kill-path titan. Unlocks with Hell Hulk after 37 capital kills. Kit numbers PARTIAL.",
    skin: 0x3a0808,
    deep: 0x1a0404,
    khaki: 0x2a1810,
    hair: 0x100404,
    glow: 0xff2200,
    speed: 0.96,
    jump: 0.98,
    smash: 1.22,
    comboLen: 3,
    climb: true,
    rageSec: 24,
    heat: true,
  },
  {
    id: "cosmic",
    saveId: "Cosmic",
    name: "Cosmic Hulk",
    short: "COSMIC",
    blurb: "Spare-path titan. Unlocks with Cosmic Hulk after 37 capital spares. Kit numbers PARTIAL.",
    skin: 0x6a88ff,
    deep: 0x243868,
    khaki: 0xc8d0e8,
    hair: 0xe8f0ff,
    glow: 0xd0e8ff,
    speed: 1.06,
    jump: 1.16,
    smash: 1.2,
    comboLen: 4,
    climb: true,
    rageSec: 26,
    heat: false,
  },
  {
    id: "bruce",
    saveId: "Bruce",
    name: "Bruce",
    short: "BRUCE",
    blurb: "Fragile gadget form. Pick Bruce on the hold-0 radial, only below Gamma 20. Three hits force the last titan. Rage dumps −10/s.",
    skin: 0xc4a07a,
    deep: 0x8a6a48,
    khaki: 0x3a3c48,
    hair: 0x3a2a18,
    glow: 0x88aacc,
    speed: 1.08,
    jump: 0.62,
    smash: 0.35,
    comboLen: 2,
    climb: false,
    rageSec: 0,
    heat: false,
  },
  {
    id: "mephisto",
    saveId: "MephistoBruce",
    name: "Mephisto Bruce",
    short: "MEPHISTO",
    blurb: "Kill-path Bruce. Horns and hell-brand gadgets. Unlocks with Hell Hulk at 37 kills. Kit PARTIAL.",
    skin: 0x8a2018,
    deep: 0x4a100c,
    khaki: 0x2a0c0c,
    hair: 0x1a0808,
    glow: 0xff3311,
    speed: 1.04,
    jump: 0.66,
    smash: 0.42,
    comboLen: 2,
    climb: false,
    rageSec: 0,
    heat: false,
  },
  {
    id: "ironstrange",
    saveId: "IronStrange",
    name: "Dr. Iron Strange",
    short: "STRANGE",
    blurb: "Spare-path Bruce. Armor-wielding sorcerer. Unlocks with Cosmic Hulk at 37 spares. Kit PARTIAL.",
    skin: 0xb89268,
    deep: 0x6a4a30,
    khaki: 0xc4a24a,
    hair: 0x3a2a18,
    glow: 0x66a0ff,
    speed: 1.02,
    jump: 0.7,
    smash: 0.48,
    comboLen: 2,
    climb: false,
    rageSec: 0,
    heat: false,
  },
];

/** Old Savage id maps onto World Breaker. Savage is not a weaker starter form. */
export function canonicalKind(kind: HulkKind): HulkKind {
  return kind === "savage" ? "worldbreaker" : kind;
}

export function isWorldBreaker(kind: HulkKind): boolean {
  const k = canonicalKind(kind);
  return k === "worldbreaker";
}

export function isBruceKind(kind: HulkKind): kind is BruceKind {
  const k = canonicalKind(kind);
  return k === "bruce" || k === "mephisto" || k === "ironstrange";
}

export function asTitan(kind: HulkKind, fallback: TitanKind = DEFAULT_HULK_KIND): TitanKind {
  const k = canonicalKind(kind);
  if (isBruceKind(k)) return fallback;
  return k as TitanKind;
}

export function formSaveId(kind: HulkKind): string {
  return formDef(kind).saveId;
}

export function formDef(kind: HulkKind): HulkFormDef {
  const id = canonicalKind(kind);
  return HULK_FORMS.find((f) => f.id === id) ?? HULK_FORMS[0]!;
}

export function nextKind(kind: HulkKind): HulkKind {
  const id = canonicalKind(kind);
  const i = HULK_FORMS.findIndex((f) => f.id === id);
  const idx = i < 0 ? 0 : i;
  return HULK_FORMS[(idx + 1) % HULK_FORMS.length]!.id;
}

export function isHulkKind(v: string | undefined): v is HulkKind {
  if (!v) return false;
  if (v === "savage") return true;
  return HULK_FORMS.some((f) => f.id === v);
}
