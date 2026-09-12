#!/usr/bin/env node
/**
 * Dump live Titan Streets gameplay tables as plain JSON for Unreal ingest.
 * Run from repo root:
 *   node --experimental-strip-types scripts/export-ue-port-data.mjs [outDir]
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const outDir = process.argv[2] || "/opt/cursor/artifacts/ue-port-data";

function hex(n) {
  if (typeof n !== "number" || !Number.isFinite(n)) return n ?? null;
  return `#${Math.max(0, Math.round(n)).toString(16).padStart(6, "0")}`;
}

function hexList(arr) {
  return Array.isArray(arr) ? arr.map(hex) : [];
}

function dump(name, data) {
  const path = join(outDir, name);
  writeFileSync(path, `${JSON.stringify(data, null, 2)}\n`);
  console.log("wrote", path);
}

async function loadTs(rel) {
  return import(pathToFileURL(join(root, rel)).href);
}

mkdirSync(outDir, { recursive: true });

const citiesMod = await loadTs("src/data/cities.ts");
const shellsMod = await loadTs("src/data/cityShells.ts");
const storyMod = await loadTs("src/data/story.ts");
const metersMod = await loadTs("src/data/meters.ts");
const inputMod = await loadTs("src/input/Input.ts");
const feelMod = await loadTs("src/input/ControlFeel.ts");
const smashMod = await loadTs("src/data/smashEconomy.ts");
const formsMod = await loadTs("src/data/hulkForms.ts");
const bossFateMod = await loadTs("src/data/bossFate.ts");
const razorMod = await loadTs("src/data/razorback.ts");
const balanceMod = await loadTs("src/data/balance.ts");
const missionsMod = await loadTs("src/data/missionBeats.ts");
const roster = JSON.parse(readFileSync(join(root, "data/CAPITAL_BOSS_ROSTER.json"), "utf8"));
const nyBestiary = JSON.parse(readFileSync(join(root, "src/data/ny-bestiary.json"), "utf8"));

const { CITIES, EXTRA_CITIES, TRAVEL_CITIES, SANCTUARY_IDS, HUB_CITY_ID, MAP_HUBS } = citiesMod;

function paletteJson(p) {
  return {
    sky: hex(p.sky),
    fog: hex(p.fog),
    buildings: hexList(p.buildings),
    accent: hex(p.accent),
    plaza: hex(p.plaza),
    grass: hex(p.grass),
    road: hex(p.road),
    sidewalk: hex(p.sidewalk),
    window: hex(p.window),
    night: Boolean(p.night),
    neon: hexList(p.neon ?? []),
  };
}

function cityJson(c, extra) {
  const shell = shellsMod.cityShell(c.id) ?? shellsMod.extraShell?.(c.id, c.name) ?? null;
  return {
    id: c.id,
    name: c.name,
    country: c.country,
    extra,
    campaignOrder: extra ? 0 : c.order,
    lat: c.lat,
    lon: c.lon,
    dungeonName: c.dungeonName,
    hazard: c.hazard,
    boss: c.boss,
    unlocks: c.unlocks,
    act: c.act,
    actBand: c.actBand,
    storyLine: c.storyLine,
    districts: c.districts,
    landmark: c.landmark,
    landmarkName: c.landmarkName,
    skyline: c.skyline,
    bones: c.bones,
    bestiaryPrefix: c.bestiaryPrefix,
    featured: c.featured,
    blurb: c.blurb,
    crimeFlavor: c.crimeFlavor,
    palette: paletteJson(c.palette),
    streets: shell?.streets ?? [],
    anchors: shell?.anchors ?? [],
  };
}

dump("cities_71.json", {
  schema: "titan-streets.cities.v1",
  note:
    "SANCTUARY_IDS is 71 downtowns kept from Sanctuary's Shadow. TRAVEL_CITIES is 73 map shells (71 + charleston-sc + bridgeport). Campaign CITIES is the 50 largest-per-state unlock chain (1 New York → 50 Huntsville). EXTRA_CITIES are playable overlays that do not advance the chain.",
  hubCityId: HUB_CITY_ID,
  sanctuaryCount: SANCTUARY_IDS.length,
  sanctuaryIds: [...SANCTUARY_IDS],
  campaignCount: CITIES.length,
  extraCount: EXTRA_CITIES.length,
  travelCount: TRAVEL_CITIES.length,
  mapHubCount: MAP_HUBS.length,
  mapHubs: MAP_HUBS,
  campaign: CITIES.map((c) => cityJson(c, false)),
  extras: EXTRA_CITIES.map((c) => cityJson(c, true)),
  story: storyMod.CITY_STORY,
});

const rageTiers = [
  { min: 0, id: "calm", name: metersMod.rageTierLabel("calm"), liftMul: metersMod.liftMul("calm") },
  { min: 20, id: "angry", name: metersMod.rageTierLabel("angry"), liftMul: metersMod.liftMul("angry") },
  { min: 50, id: "furious", name: metersMod.rageTierLabel("furious"), liftMul: metersMod.liftMul("furious") },
  { min: 80, id: "worldbreaker", name: metersMod.rageTierLabel("worldbreaker"), liftMul: metersMod.liftMul("worldbreaker") },
  { min: 100, id: "meltdown", name: metersMod.rageTierLabel("meltdown"), liftMul: metersMod.liftMul("meltdown") },
];

const gammaBands = [
  { min: 0, id: "bruce", name: metersMod.bandLabel("bruce"), healMul: metersMod.healMul("bruce"), powerCostMul: metersMod.powerCostMul("bruce"), powersAllowed: metersMod.powersAllowed("bruce"), formSwitchAllowed: metersMod.formSwitchAllowed("bruce") },
  { min: 20, id: "control", name: metersMod.bandLabel("control"), healMul: metersMod.healMul("control"), powerCostMul: metersMod.powerCostMul("control"), powersAllowed: metersMod.powersAllowed("control"), formSwitchAllowed: metersMod.formSwitchAllowed("control") },
  { min: 50, id: "locked", name: metersMod.bandLabel("locked"), healMul: metersMod.healMul("locked"), powerCostMul: metersMod.powerCostMul("locked"), powersAllowed: metersMod.powersAllowed("locked"), formSwitchAllowed: metersMod.formSwitchAllowed("locked") },
  { min: 80, id: "overcharged", name: metersMod.bandLabel("overcharged"), healMul: metersMod.healMul("overcharged"), powerCostMul: metersMod.powerCostMul("overcharged"), powersAllowed: metersMod.powersAllowed("overcharged"), formSwitchAllowed: metersMod.formSwitchAllowed("overcharged") },
  { min: 100, id: "meltdown", name: metersMod.bandLabel("meltdown"), healMul: metersMod.healMul("meltdown"), powerCostMul: metersMod.powerCostMul("meltdown"), powersAllowed: metersMod.powersAllowed("meltdown"), formSwitchAllowed: metersMod.formSwitchAllowed("meltdown") },
];

dump("anger_loop.json", {
  schema: "titan-streets.anger-loop.v1",
  meters: { ...metersMod.METERS },
  rageTiers,
  gammaBands,
  wantedStars: { formula: "wanted<=4 → 0 else clamp(ceil(wanted/20), 1, 5)" },
  sample: {
    rageTierAt50: metersMod.rageTier(50, false),
    gammaBandAt50: metersMod.gammaBand(50),
    gammaBandAt10: metersMod.gammaBand(10),
  },
  balanceProfiles: {
    default: "Legacy",
    alt: "Worldbreaker_v1",
    source: "src/data/balance.ts",
    ids: balanceMod.BALANCE_PROFILES,
    blurbs: {
      Legacy: balanceMod.balanceBlurb("Legacy"),
      Worldbreaker_v1: balanceMod.balanceBlurb("Worldbreaker_v1"),
    },
    note: "Worldbreaker_v1 currently copies Legacy meters until PDF §6 tables are filed. Toggle is real; tables overlay, they do not replace the default fight until the player flips Settings → Balance.",
  },
});

dump("controls.json", {
  schema: "titan-streets.controls.v1",
  hardRules: {
    smash: "Enter",
    sIsNeverReverse: true,
    aIsNotStrafe: true,
    keyboardOnly: "Arrows = move, WASD = look",
    worldBreakerIsDefaultTitan: true,
  },
  defaultBinds: inputMod.DEFAULT_BINDS,
  specials: [...inputMod.SPECIALS],
  attackKinds: { ...inputMod.Attack },
  feel: feelMod.FEEL,
  feelIds: feelMod.FEEL_IDS,
  defaultFeel: "default",
});

function tintHex(row) {
  if (!row?.encounter) return row;
  return { ...row, encounter: { ...row.encounter, tintHex: hex(row.encounter.tint) } };
}

dump("bosses.json", {
  schema: "titan-streets.bosses.v1",
  fateUnlockAt: bossFateMod.FATE_UNLOCK_AT,
  capitalBossCountCampaign: bossFateMod.CAPITAL_BOSS_COUNT,
  fate: {
    killEnding: "Hell Hulk + Mephisto Bruce after 37 capital kills",
    spareEnding: "Cosmic Hulk + Dr. Iron Strange after 37 capital spares",
    bothEarnable: true,
  },
  razorback: {
    cityId: "new-york",
    trigger: "After NY capital dungeon (postBoss Razorback). Free-roam streets only. Test spawn KeyP.",
    vars: razorMod.RAZOR_VARS,
    landmarks: razorMod.RAZOR_LANDMARKS,
    taunts: razorMod.RAZOR_TAUNTS,
    fixitLines: razorMod.RAZOR_FIXIT,
  },
  roster: {
    ...roster,
    threats: roster.threats.map(tintHex),
    cities: roster.cities.map(tintHex),
  },
});

dump("smash_economy.json", {
  schema: "titan-streets.smash-economy.v1",
  note: "DAMAGE$ is a ledger, not a shop. Rage Rep = floor(DAMAGE$ / 50). Nothing is bought with cash.",
  smash: smashMod.SMASH,
  wantedTiers: smashMod.WANTED_TIERS,
  repUnlocks: smashMod.REP_UNLOCKS,
  beatLabels: smashMod.BEAT_LABEL,
  gammaEchoes: smashMod.GAMMA_ECHOES.map((e) => ({ ...e, colorHex: hex(e.color) })),
  formGates: {
    worldbreaker: "always",
    bruce: "always (Gamma < 20 window)",
    fixit: "Rage Rep 180",
    red: "Rage Rep 400",
    immortal: "Rage Rep 550",
    feral: "same as immortal (Rage Rep 550)",
    maestro: "Rage Rep 700",
    hell_mephisto: "37 capital kills",
    cosmic_ironstrange: "37 capital spares",
  },
});

dump("forms.json", {
  schema: "titan-streets.forms.v1",
  defaultHulkKind: formsMod.DEFAULT_HULK_KIND,
  defaultActiveForm: formsMod.DEFAULT_ACTIVE_FORM,
  dropInMustBeWorldBreaker: true,
  savageAliasesToWorldBreaker: true,
  forms: formsMod.HULK_FORMS.map((v) => ({
    id: v.id,
    saveId: v.saveId,
    name: v.name,
    short: v.short,
    blurb: v.blurb,
    skin: hex(v.skin),
    deep: hex(v.deep),
    khaki: hex(v.khaki),
    hair: hex(v.hair),
    glow: hex(v.glow),
    speed: v.speed,
    jump: v.jump,
    smash: v.smash,
    comboLen: v.comboLen,
    climb: v.climb,
    rageSec: v.rageSec,
    heat: v.heat,
  })),
});

dump("dungeons.json", {
  schema: "titan-streets.dungeons.v1",
  note: "No standalone dungeons.ts. Each city carries dungeonName + hazard + stub boss. Runtime: src/systems/DungeonRun.ts.",
  campaign: CITIES.map((c) => ({
    cityId: c.id,
    cityName: c.name,
    extra: false,
    order: c.order,
    dungeonName: c.dungeonName,
    hazard: c.hazard,
    bossName: c.boss.name,
    bossTitle: c.boss.title,
    crimesToUnlock: c.boss.crimesToUnlock,
  })),
  extras: EXTRA_CITIES.map((c) => ({
    cityId: c.id,
    cityName: c.name,
    extra: true,
    order: 0,
    dungeonName: c.dungeonName,
    hazard: c.hazard,
    bossName: c.boss.name,
    bossTitle: c.boss.title,
    crimesToUnlock: c.boss.crimesToUnlock,
  })),
});

dump("missions_vol2.json", {
  schema: "titan-streets.missions.v1",
  note: "45 Vol2 beat stubs. ADDITIVE — do not strip live objectives.",
  count: missionsMod.MISSION_BEATS.length,
  beats: missionsMod.MISSION_BEATS,
});

dump("ny_bestiary.json", {
  schema: "titan-streets.bestiary.v1",
  note: "NY 50 named street originals. Other cities seed 50 civic rosters from bestiaryPrefix (src/data/bestiary.ts).",
  species: nyBestiary,
});

dump("manifest.json", {
  schema: "titan-streets.ue-port.v1",
  generated: new Date().toISOString(),
  source: "browser Titan Streets (Vite + TypeScript + Three.js)",
  inventory: "Docs/UE_PORT_INVENTORY.md",
  packs: [
    "cities_71.json",
    "anger_loop.json",
    "controls.json",
    "bosses.json",
    "smash_economy.json",
    "forms.json",
    "dungeons.json",
    "missions_vol2.json",
    "ny_bestiary.json",
  ],
});
