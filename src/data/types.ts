export type GameScreen =
  | "title"
  | "intro"
  | "play"
  | "pause"
  | "map"
  | "skills"
  | "quests"
  | "help"
  | "settings"
  | "bestiary"
  | "codex"
  | "boss-roster"
  | "street-roster";

export type HulkKind =
  | "worldbreaker"
  | "savage"
  | "fixit"
  | "red"
  | "immortal"
  | "maestro"
  | "feral"
  | "hell"
  | "cosmic"
  | "bruce"
  | "mephisto"
  | "ironstrange";

export type BruceKind = "bruce" | "mephisto" | "ironstrange";
export type TitanKind = Exclude<HulkKind, BruceKind>;

export type BorrowedPower = "omega" | "vengeance" | "will" | "king";

export type { FightStyle } from "./styles";
export type { RivalrySave } from "./razorback";

export type JobType = "lab" | "cafe" | "warehouse" | "office";

export type BannerLifeSave = {
  hour: number;
  day: number;
  energy: number;
  hunger: number;
  mood: number;
  jobType: JobType | null;
  lastShiftDay: number;
};

export type CaughtBeastie = {
  uid: string;
  speciesId: string;
  nickname: string;
  level: number;
  xp: number;
  wins: number;
  bossKills: number;
  stage: 1 | 2 | 3;
  moves: string[];
};

export type BestiarySave = {
  seen: string[];
  caught: CaughtBeastie[];
  party: string[];
};

export const CrimeKind = {
  Mugging: "mugging",
  Carjacking: "carjacking",
  GangFight: "gang_fight",
  Heist: "heist",
  StreetChase: "street_chase",
  ArmedRobbery: "armed_robbery",
} as const;

export type CrimeKind = (typeof CrimeKind)[keyof typeof CrimeKind];

export type CityId = string;

export type HazardId =
  | "flood"
  | "fog"
  | "heat"
  | "dark"
  | "ice"
  | "gas"
  | "bats"
  | "mirror"
  | "salt"
  | "spark"
  | "tar"
  | "wind"
  | "root"
  | "thin"
  | "bell";

export type CityBossDef = {
  name: string;
  title: string;
  crimesToUnlock: number;
};

export type CityDef = {
  id: CityId;
  name: string;
  country: string;
  lat: number;
  lon: number;
  blurb: string;
  crimeFlavor: string;
  featured: boolean;
  landmark: LandmarkKind;
  boss: CityBossDef;
  unlocks: CityId[];
  order: number;
  dungeonName: string;
  hazard: HazardId;
  act: 0 | 1 | 2 | 3 | 4 | 5;
  actBand: 1 | 2 | 3 | 4 | 5;
  storyLine: string;
  districts: string[];
  landmarkName: string;
  skyline: string;
  bones: CityBones;
  palette: CityPalette;
  bestiaryPrefix: string;
};

export type CityBones =
  | "manhattan-grid"
  | "colonial-spoke"
  | "mall-axis"
  | "harbor"
  | "river-grid"
  | "lake-grid"
  | "prairie"
  | "mountain-grid"
  | "desert"
  | "bayou"
  | "delta"
  | "gulf"
  | "strip"
  | "fog-grid"
  | "volcanic"
  | "glacier"
  | "island";

export type CityPalette = {
  sky: number;
  fog: number;
  buildings: number[];
  accent: number;
  plaza: number;
  grass: number;
  road: number;
  sidewalk: number;
  window: number;
  night?: boolean;
  neon?: number[];
};

export type LandmarkKind =
  | "towers"
  | "neon"
  | "clock"
  | "spire"
  | "mountain"
  | "lattice"
  | "hollywood"
  | "canal"
  | "arch"
  | "pyramid"
  | "lighthouse"
  | "mill"
  | "brewery"
  | "bridge"
  | "fountain"
  | "mission"
  | "capitol"
  | "obelisk"
  | "balloon"
  | "temple"
  | "crane"
  | "rose"
  | "fort"
  | "opera"
  | "tomb"
  | "speedway"
  | "volcano"
  | "glacier"
  | "generic";

export type ObjectiveType = "story" | "crime" | "boss" | "exploration" | "travel";

export type ObjectiveWhen =
  | { kind: "arrive"; city: string }
  | { kind: "transform" }
  | { kind: "revert" }
  | { kind: "crime"; city?: string; count: number }
  | { kind: "dungeon"; city: string }
  | { kind: "plaza" }
  | { kind: "roof" }
  | { kind: "heroes" }
  | { kind: "warrens" }
  | { kind: "wreck"; count: number }
  | { kind: "hunt"; count: number }
  | { kind: "team" }
  | { kind: "cash"; amount: number }
  | { kind: "level"; level: number }
  | { kind: "bosses"; count: number }
  | { kind: "cities"; count: number }
  | { kind: "intro" }
  | { kind: "recognized" }
  | { kind: "night"; city: string }
  | { kind: "comic"; arc: string };

export type ObjectiveDef = {
  id: string;
  title: string;
  blurb: string;
  type: ObjectiveType;
  cityId: string | null;
  when: ObjectiveWhen;
  requires?: string[];
  chapter: number;
};

export type PlayerForm = "human" | "hulk";

export type SaveData = {
  version: number;
  cityId: CityId;
  unlockedCities: CityId[];
  beatenBosses: CityId[];
  cash: number;
  reputation: number;
  damageCash: number;
  vehiclesSmashed: number;
  heroCivilians: number;
  menaceCivilians: number;
  echoes: string[];
  craters: number;
  xp: number;
  level: number;
  skillPoints: number;
  skills: Record<string, number>;
  crimesCleared: Record<CityId, number>;
  introSeen: boolean;
  recognized: boolean;
  codexPages: number[];
  comicsFound: string[];
  comicsCleared: string[];
  activeQuestId: string | null;
  questProgress: number;
  completedQuests: string[];
  activeObjectiveId: string | null;
  completedObjectives: string[];
  missionBeats: string[];
  objectiveProgress: Record<string, number>;
  everHulked: boolean;
  wrecked: number;
  hunts: number;
  teamed: boolean;
  hulkKind: HulkKind;
  lastTitan: TitanKind;
  activeForm: string;
  bossesKilled: CityId[];
  bossesSpared: CityId[];
  postBossBeats: string[];
  unlockedForms: HulkKind[];
  kingShoutDay: number;
  rage: number;
  gamma: number;
  life: BannerLifeSave;
  bestiary: BestiarySave;
  rivalry: import("./razorback").RivalrySave;
  settings: {
    sensitivity: number;
    muted: boolean;
    binds: Record<string, string>;
    quality: "auto" | "low" | "medium" | "high" | "cinematic";
    legendOpen: boolean;
    balanceProfile: "Legacy" | "Worldbreaker_v1";
    controlFeel: "default" | "relaxed" | "tight";
    gamepad: boolean;
    cityMesh: boolean;
  };
};

export type Aabb = {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  height: number;
};

export type HudSnapshot = {
  health: number;
  maxHealth: number;
  rage: number;
  maxRage: number;
  rageActive: boolean;
  gamma: number;
  maxGamma: number;
  gammaBand: string;
  gammaLabel: string;
  rageTier: string;
  wantedStars: number;
  wantedTier: string;
  damageCash: number;
  damageDisplay: number;
  rageRep: number;
  missionBeat: string;
  rampageLine: string;
  stanceMark: string;
  calmLocked: boolean;
  cash: number;
  reputation: number;
  cityName: string;
  cityCountry: string;
  mission: string;
  prompt: string;
  toast: string;
  crimesCleared: number;
  crimesNeeded: number;
  bossReady: boolean;
  bossBeaten: boolean;
  bossHp: number;
  bossMaxHp: number;
  bossName: string;
  combo: number;
  level: number;
  xpInto: number;
  xpNeed: number;
  skillPoints: number;
  questTitle: string;
  questDetail: string;
  districtName: string;
  districtId: string;
  squadLine: string;
  form: PlayerForm;
  hulkKind: HulkKind;
  formLabel: string;
  style: import("./styles").FightStyle;
  styleLabel: string;
  styleIcon: string;
  stanceFlash: boolean;
  mixReady: boolean;
  heat: number;
  jumpCharge: number;
  clock: string;
  energy: number;
  hunger: number;
  mood: number;
  jobName: string;
  lockName: string;
  partyLine: string;
  zombieLeft: number;
  showMarkers: boolean;
  objectiveTitle: string;
  dungeonName: string;
  rivalBanner: string;
  rivalRide: boolean;
  powerName: string;
  powerMeter: number;
  powerBlind: boolean;
  gadgetLine: string;
  calmCharge: number;
  danger: number;
  fps: number;
  frameMs: number;
  navTitle: string;
  navDist: number;
  navBearing: number;
  navAlong: string;
  navVisible: boolean;
  hitchMs: number;
  weatherLine: string;
  popLine: string;
  cameraHint: string;
  quietHud: boolean;
  hpUrgent: boolean;
};
