import { asTitan, canonicalKind, DEFAULT_ACTIVE_FORM, DEFAULT_HULK_KIND, formSaveId, isBruceKind, isHulkKind } from "../data/hulkForms";
import { isBalanceProfile } from "../data/balance";
import { CITIES, HUB_CITY_ID } from "../data/cities";
import { nextStoryId, syncObjectives } from "../data/objectives";
import { defaultRivalry } from "../data/razorback";
import { rageRepFromDamage } from "../data/smashEconomy";
import { progressFromXp, STARTER_CITIES } from "../data/skills";
import { feelOf } from "../input/ControlFeel";
import type { SaveData } from "../data/types";

const KEY = "titan-streets-save-v2";

export function defaultSave(): SaveData {
  const save: SaveData = {
    version: 2,
    cityId: HUB_CITY_ID,
    unlockedCities: [...STARTER_CITIES],
    beatenBosses: [],
    cash: 0,
    reputation: 0,
    damageCash: 0,
    vehiclesSmashed: 0,
    heroCivilians: 0,
    menaceCivilians: 0,
    echoes: [],
    craters: 0,
    xp: 0,
    level: 1,
    skillPoints: 1,
    skills: {},
    crimesCleared: {},
    introSeen: false,
    recognized: false,
    codexPages: [],
    comicsFound: [],
    comicsCleared: [],
    activeQuestId: null,
    questProgress: 0,
    completedQuests: [],
    activeObjectiveId: "ny-wake",
    completedObjectives: [],
    missionBeats: [],
    objectiveProgress: {},
    everHulked: false,
    wrecked: 0,
    hunts: 0,
    teamed: false,
    hulkKind: DEFAULT_HULK_KIND,
    lastTitan: DEFAULT_HULK_KIND,
    activeForm: DEFAULT_ACTIVE_FORM,
    bossesKilled: [],
    bossesSpared: [],
    postBossBeats: [],
    unlockedForms: [],
    kingShoutDay: 0,
    rage: 0,
    gamma: 0,
    life: { hour: 8.2, day: 1, energy: 80, hunger: 70, mood: 62, jobType: null, lastShiftDay: 0 },
    bestiary: { seen: [], caught: [], party: [] },
    rivalry: defaultRivalry(),
    settings: {
      sensitivity: 0.22,
      muted: false,
      binds: {},
      quality: "medium",
      legendOpen: false,
      balanceProfile: "Legacy",
      controlFeel: "default",
      gamepad: true,
      cityMesh: true,
    },
  };
  syncObjectives(save);
  return save;
}

function migrate(parsed: SaveData): SaveData {
  const known = new Set(CITIES.map((c) => c.id));
  if ((parsed.version ?? 0) < 2) {
    parsed.unlockedCities = [HUB_CITY_ID];
    parsed.cityId = HUB_CITY_ID;
    parsed.beatenBosses = [];
    parsed.version = 2;
  }
  parsed.unlockedCities = (parsed.unlockedCities ?? []).filter((id) => known.has(id));
  if (!parsed.unlockedCities.includes(HUB_CITY_ID)) parsed.unlockedCities.unshift(HUB_CITY_ID);
  if (parsed.unlockedCities.length === 0) parsed.unlockedCities = [HUB_CITY_ID];
  if (!known.has(parsed.cityId)) parsed.cityId = HUB_CITY_ID;
  // Ces: desert = Origin comic or wrong city — always boot on New York hub
  parsed.cityId = HUB_CITY_ID;
  parsed.beatenBosses = (parsed.beatenBosses ?? []).filter((id) => known.has(id));
  parsed.xp = parsed.xp ?? 0;
  parsed.skills = parsed.skills ?? {};
  const prog = progressFromXp(parsed.xp);
  parsed.level = prog.level;
  if (parsed.skillPoints == null) {
    let spent = 0;
    for (const v of Object.values(parsed.skills)) spent += v;
    parsed.skillPoints = Math.max(0, prog.level - spent);
  }
  parsed.settings = parsed.settings ?? {
    sensitivity: 0.22,
    muted: false,
    binds: {},
    quality: "medium",
    legendOpen: false,
    balanceProfile: "Legacy",
    controlFeel: "default",
    gamepad: true,
    cityMesh: true,
  };
  parsed.settings.sensitivity = Math.min(0.6, Math.max(0.06, parsed.settings.sensitivity));
  parsed.settings.binds = parsed.settings.binds ?? {};
  if (parsed.settings.legendOpen === undefined) {
    parsed.settings.legendOpen = false;
  }
  parsed.settings.quality = parsed.settings.quality ?? "medium";
  try {
    if (!localStorage.getItem("titan-streets-look-v1")) {
      localStorage.setItem("titan-streets-look-v1", "1");
      if (parsed.settings.quality === "low") parsed.settings.quality = "medium";
    }
  } catch {
    /* ignore quota / private mode */
  }
  parsed.settings.legendOpen = Boolean(parsed.settings.legendOpen);
  parsed.settings.balanceProfile = isBalanceProfile(parsed.settings.balanceProfile)
    ? parsed.settings.balanceProfile
    : "Legacy";
  parsed.settings.controlFeel = feelOf(parsed.settings.controlFeel).id;
  parsed.settings.gamepad = parsed.settings.gamepad !== false;
  parsed.settings.cityMesh = Boolean(parsed.settings.cityMesh);
  // cesForceCityMesh — keep OSM city buildings on (avoid empty/yellow void)
  parsed.settings.cityMesh = true;
  parsed.activeQuestId = parsed.activeQuestId ?? null;
  parsed.questProgress = parsed.questProgress ?? 0;
  parsed.completedQuests = parsed.completedQuests ?? [];
  parsed.completedObjectives = parsed.completedObjectives ?? [];
  parsed.missionBeats = parsed.missionBeats ?? [];
  parsed.objectiveProgress = parsed.objectiveProgress ?? {};
  parsed.everHulked = parsed.everHulked ?? false;
  parsed.wrecked = parsed.wrecked ?? 0;
  parsed.damageCash = parsed.damageCash ?? parsed.wrecked * 4200;
  parsed.vehiclesSmashed = parsed.vehiclesSmashed ?? 0;
  parsed.heroCivilians = parsed.heroCivilians ?? 0;
  parsed.menaceCivilians = parsed.menaceCivilians ?? 0;
  parsed.echoes = parsed.echoes ?? [];
  parsed.craters = parsed.craters ?? parsed.wrecked;
  parsed.reputation = Math.max(parsed.reputation ?? 0, rageRepFromDamage(parsed.damageCash));
  parsed.hunts = parsed.hunts ?? 0;
  parsed.teamed = parsed.teamed ?? false;
  if (isHulkKind(parsed.hulkKind) && isBruceKind(parsed.hulkKind)) {
    parsed.hulkKind = canonicalKind(parsed.hulkKind);
  } else if (isHulkKind(parsed.hulkKind)) {
    parsed.hulkKind = asTitan(parsed.hulkKind);
  } else {
    parsed.hulkKind = DEFAULT_HULK_KIND;
  }
  parsed.lastTitan = isHulkKind(parsed.lastTitan)
    ? asTitan(parsed.lastTitan)
    : parsed.hulkKind && !isBruceKind(parsed.hulkKind)
      ? asTitan(parsed.hulkKind)
      : DEFAULT_HULK_KIND;
  parsed.activeForm = parsed.activeForm || formSaveId(parsed.hulkKind === "bruce" ? parsed.lastTitan : parsed.hulkKind);
  parsed.bossesKilled = parsed.bossesKilled ?? [];
  parsed.bossesSpared = parsed.bossesSpared ?? [];
  parsed.postBossBeats = parsed.postBossBeats ?? [];
  parsed.unlockedForms = parsed.unlockedForms ?? [];
  if (parsed.bossesKilled.length >= 37) {
    if (!parsed.unlockedForms.includes("hell")) parsed.unlockedForms.push("hell");
    if (!parsed.unlockedForms.includes("mephisto")) parsed.unlockedForms.push("mephisto");
  }
  if (parsed.bossesSpared.length >= 37) {
    if (!parsed.unlockedForms.includes("cosmic")) parsed.unlockedForms.push("cosmic");
    if (!parsed.unlockedForms.includes("ironstrange")) parsed.unlockedForms.push("ironstrange");
  }
  parsed.kingShoutDay = parsed.kingShoutDay ?? 0;
  parsed.rage = parsed.rage ?? 0;
  parsed.gamma = parsed.gamma ?? 0;
  parsed.life = parsed.life ?? { hour: 8.2, day: 1, energy: 80, hunger: 70, mood: 62, jobType: null, lastShiftDay: 0 };
  parsed.bestiary = parsed.bestiary ?? { seen: [], caught: [], party: [] };
  parsed.bestiary.seen = parsed.bestiary.seen ?? [];
  parsed.bestiary.caught = parsed.bestiary.caught ?? [];
  parsed.bestiary.party = parsed.bestiary.party ?? [];
  parsed.rivalry = parsed.rivalry ?? defaultRivalry();
  parsed.rivalry.encounters = parsed.rivalry.encounters ?? 0;
  parsed.rivalry.wins = parsed.rivalry.wins ?? 0;
  parsed.rivalry.losses = parsed.rivalry.losses ?? 0;
  parsed.rivalry.clawMarks = parsed.rivalry.clawMarks ?? 0;
  parsed.rivalry.tougher = parsed.rivalry.tougher ?? 0;
  parsed.rivalry.lastFightAt = parsed.rivalry.lastFightAt ?? 0;
  parsed.rivalry.landmarkDay = parsed.rivalry.landmarkDay ?? parsed.life?.day ?? 1;
  parsed.rivalry.landmarks = parsed.rivalry.landmarks ?? [];
  parsed.recognized = parsed.recognized ?? false;
  parsed.codexPages = parsed.codexPages ?? [];
  parsed.comicsFound = parsed.comicsFound ?? [];
  parsed.comicsCleared = parsed.comicsCleared ?? [];
  parsed.activeObjectiveId = parsed.activeObjectiveId ?? nextStoryId(parsed);
  parsed.version = 2;
  syncObjectives(parsed);
  return parsed;
}

export function loadSave(): SaveData | null {
  try {
    const raw = localStorage.getItem(KEY) ?? localStorage.getItem("titan-streets-save-v1");
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SaveData;
    if (!parsed.cityId) return null;
    return migrate(parsed);
  } catch {
    return null;
  }
}

export function writeSave(data: SaveData): void {
  localStorage.setItem(KEY, JSON.stringify(data));
}

export function clearSave(): void {
  localStorage.removeItem(KEY);
  localStorage.removeItem("titan-streets-save-v1");
}

export function hasSave(): boolean {
  return loadSave() !== null;
}

