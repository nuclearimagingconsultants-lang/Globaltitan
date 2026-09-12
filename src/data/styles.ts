export const FIGHT_STYLES = ["savage", "boxing", "karate", "judo", "jiujitsu"] as const;
export type FightStyle = (typeof FIGHT_STYLES)[number];

export type StyleDef = {
  id: FightStyle;
  name: string;
  short: string;
  key: string;
  icon: string;
  tap: string;
  hold: string;
  grab: string;
  radius: number;
  heavyRadius: number;
  speed: number;
  color: number;
};

export const STYLES: Record<FightStyle, StyleDef> = {
  savage: {
    id: "savage",
    name: "Savage brawl",
    short: "BRAWL",
    key: "",
    icon: "S",
    tap: "Smash",
    hold: "Haymaker",
    grab: "Rip",
    radius: 1,
    heavyRadius: 1,
    speed: 1,
    color: 0x7dff6a,
  },
  boxing: {
    id: "boxing",
    name: "Boxing",
    short: "BOX",
    key: "B",
    icon: "B",
    tap: "Punch combo",
    hold: "Haymaker",
    grab: "Clinch",
    radius: 0.78,
    heavyRadius: 0.92,
    speed: 1.22,
    color: 0xf0c400,
  },
  karate: {
    id: "karate",
    name: "Karate",
    short: "KARA",
    key: "K",
    icon: "K",
    tap: "Kick combo",
    hold: "Axe kick",
    grab: "Sweep",
    radius: 1.22,
    heavyRadius: 1.12,
    speed: 1.04,
    color: 0xff8a3d,
  },
  judo: {
    id: "judo",
    name: "Judo",
    short: "JUDO",
    key: "U",
    icon: "U",
    tap: "Throw",
    hold: "Slam",
    grab: "Toss",
    radius: 0.88,
    heavyRadius: 1.18,
    speed: 0.96,
    color: 0x6ad0ff,
  },
  jiujitsu: {
    id: "jiujitsu",
    name: "Jiu-jitsu",
    short: "JIU",
    key: "J",
    icon: "J",
    tap: "Mount",
    hold: "Submission",
    grab: "Takedown",
    radius: 0.62,
    heavyRadius: 0.7,
    speed: 0.9,
    color: 0xe07aff,
  },
};

export const STYLE_BY_KEY: Record<string, FightStyle> = {
  keyb: "boxing",
  keyk: "karate",
  keyu: "judo",
  keyj: "jiujitsu",
};

export function styleDef(id: FightStyle): StyleDef {
  return STYLES[id];
}

export function flavorSpecial(id: number, style: FightStyle, base: string): string {
  if (style === "savage") return base;
  const tag: Record<FightStyle, Record<number, string>> = {
    savage: {},
    boxing: {
      1: "clapping hooks",
      2: "body-shot stomp",
      3: "shoulder jab-in",
      4: "clinch rip",
      5: "uppercut burst",
      6: "cross slam",
      7: "rope-a-dope whirl",
      8: "haymaker meteors",
      9: "liver-shot quake",
    },
    karate: {
      1: "knife-hand clap",
      2: "stomp kick",
      3: "flying side kick",
      4: "ridge-hand rip",
      5: "kiai burst",
      6: "axe-kick leap",
      7: "spinning heel",
      8: "flying meteors",
      9: "earth-split kick",
    },
    judo: {
      1: "breaking clap",
      2: "osoto stomp",
      3: "seoi charge",
      4: "grip rip",
      5: "kuzushi burst",
      6: "sacrifice leap",
      7: "uchi-mata whirl",
      8: "circle throws",
      9: "suplex quake",
    },
    jiujitsu: {
      1: "frame clap",
      2: "guard stomp",
      3: "single-leg drive",
      4: "grip break",
      5: "pressure burst",
      6: "mount leap",
      7: "armbar whirl",
      8: "ground-and-pound meteors",
      9: "lock quake",
    },
  };
  const extra = tag[style][id];
  return extra ? `${base} — ${extra}` : base;
}
