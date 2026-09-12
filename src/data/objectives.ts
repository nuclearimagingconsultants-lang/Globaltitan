import { cityStory } from "./story";
import type { ObjectiveDef, SaveData } from "./types";

const NY_STORY: ObjectiveDef[] = [
  {
    id: "ny-wake",
    title: "The Night Bus",
    blurb: "Arrive in New York by bus. One bag. The papers already know the name.",
    type: "story",
    cityId: "new-york",
    when: { kind: "intro" },
    chapter: 1,
  },
  {
    id: "ny-face",
    title: "Someone Knows the Face",
    blurb: "Walk the street as Banner. A local may clock you — or sit the diner counter.",
    type: "story",
    cityId: "new-york",
    when: { kind: "recognized" },
    requires: ["ny-wake"],
    chapter: 1,
  },
  {
    id: "ny-pulse",
    title: "First Pulse",
    blurb: "Let the titan out. Press R, or take a hit hard enough.",
    type: "story",
    cityId: "new-york",
    when: { kind: "transform" },
    requires: ["ny-face"],
    chapter: 1,
  },
  {
    id: "ny-hold",
    title: "Hold It Together",
    blurb: "Put the titan back. Press R when the green fades, or wait the meter out.",
    type: "story",
    cityId: "new-york",
    when: { kind: "revert" },
    requires: ["ny-pulse"],
    chapter: 1,
  },
  {
    id: "ny-file",
    title: "Paper Warrant",
    blurb: "Clear one street job. That opens the Turnstile door.",
    type: "story",
    cityId: "new-york",
    when: { kind: "crime", city: "new-york", count: 1 },
    requires: ["ny-wake"],
    chapter: 1,
  },
  {
    id: "ny-steps",
    title: "Civic Steps",
    blurb: "Walk the plaza. The dungeon door sits under the civic stone.",
    type: "story",
    cityId: "new-york",
    when: { kind: "plaza" },
    requires: ["ny-wake"],
    chapter: 1,
  },
  {
    id: "ny-comic-origin",
    title: "Desert Memory",
    blurb: "Newsstand glow near the bus. H — enter Origin / Gamma Bomb.",
    type: "story",
    cityId: "new-york",
    when: { kind: "comic", arc: "origin" },
    requires: ["ny-wake"],
    chapter: 1,
  },
  {
    id: "ny-comic-wwh",
    title: "Conquest Page",
    blurb: "Second glowing issue on the NY street. H — enter World War Hulk.",
    type: "story",
    cityId: "new-york",
    when: { kind: "comic", arc: "world-war-hulk" },
    requires: ["ny-wake"],
    chapter: 1,
  },
  {
    id: "ledger-open",
    title: "The Turnstile",
    blurb: cityStory("new-york").trailBlurb,
    type: "story",
    cityId: "new-york",
    when: { kind: "dungeon", city: "new-york" },
    requires: ["ny-file"],
    chapter: 1,
  },
  {
    id: "east-road",
    title: "East Road",
    blurb: "Drop in on Boston. The Bell Road starts at the burying ground.",
    type: "story",
    cityId: "boston",
    when: { kind: "arrive", city: "boston" },
    requires: ["ledger-open"],
    chapter: 1,
  },
  {
    id: "fermenter",
    title: "The Fermenter",
    blurb: cityStory("milwaukee").trailBlurb,
    type: "story",
    cityId: "milwaukee",
    when: { kind: "dungeon", city: "milwaukee" },
    requires: ["east-road"],
    chapter: 1,
  },
  {
    id: "ten-thousand",
    title: "Ten Thousand Wings",
    blurb: cityStory("austin").trailBlurb,
    type: "story",
    cityId: "austin",
    when: { kind: "dungeon", city: "austin" },
    requires: ["fermenter"],
    chapter: 2,
  },
  {
    id: "mirror-twin",
    title: "Mirror-Twin",
    blurb: cityStory("orlando").trailBlurb,
    type: "story",
    cityId: "orlando",
    when: { kind: "dungeon", city: "orlando" },
    requires: ["ten-thousand"],
    chapter: 3,
  },
  {
    id: "brine",
    title: "Brine Prophet",
    blurb: cityStory("salt-lake-city").trailBlurb,
    type: "story",
    cityId: "salt-lake-city",
    when: { kind: "dungeon", city: "salt-lake-city" },
    requires: ["mirror-twin"],
    chapter: 4,
  },
  {
    id: "last-gate",
    title: "Last Gate",
    blurb: cityStory("anchorage").trailBlurb,
    type: "story",
    cityId: "anchorage",
    when: { kind: "dungeon", city: "anchorage" },
    requires: ["brine"],
    chapter: 5,
  },
];

const SIDE: ObjectiveDef[] = [
  { id: "boston-wight", title: "Bell-Ringer", blurb: "Clear Old Burying Ground Vault.", type: "boss", cityId: "boston", when: { kind: "dungeon", city: "boston" }, chapter: 1 },
  { id: "philly-founder", title: "Molten Founder", blurb: "Clear the Cracked Bell Foundry.", type: "boss", cityId: "philadelphia", when: { kind: "dungeon", city: "philadelphia" }, chapter: 1 },
  { id: "dc-senator", title: "Marble Senator", blurb: "Clear the Catacombs Under the Mall.", type: "boss", cityId: "washington-dc", when: { kind: "dungeon", city: "washington-dc" }, chapter: 1 },
  { id: "baltimore-ashe", title: "Drowned Captain", blurb: "Clear the Harbor Hulk.", type: "boss", cityId: "baltimore", when: { kind: "dungeon", city: "baltimore" }, chapter: 1 },
  { id: "chicago-king", title: "Bootlegger King", blurb: "Clear the Freight Tunnels of the Loop.", type: "boss", cityId: "chicago", when: { kind: "dungeon", city: "chicago" }, chapter: 2 },
  { id: "denver-lich", title: "Thin-Air Lich", blurb: "Clear the Mile-High Necropolis.", type: "boss", cityId: "denver", when: { kind: "dungeon", city: "denver" }, chapter: 2 },
  { id: "dallas-oil", title: "Black Gold", blurb: "Clear the Derrick Pit.", type: "boss", cityId: "dallas", when: { kind: "dungeon", city: "dallas" }, chapter: 2 },
  { id: "nola-baron", title: "Masked Baron", blurb: "Clear the Above-Ground Tomb Maze.", type: "boss", cityId: "new-orleans", when: { kind: "dungeon", city: "new-orleans" }, chapter: 3 },
  { id: "miami-tide", title: "Tidal Concierge", blurb: "Clear the Sunken Art Deco Hotel.", type: "boss", cityId: "miami", when: { kind: "dungeon", city: "miami" }, chapter: 3 },
  { id: "vegas-dealer", title: "The Dealer", blurb: "Clear The House Always Wins.", type: "boss", cityId: "las-vegas", when: { kind: "dungeon", city: "las-vegas" }, chapter: 4 },
  { id: "phoenix-ash", title: "Ash Phoenix", blurb: "Clear the Sun Temple.", type: "boss", cityId: "phoenix", when: { kind: "dungeon", city: "phoenix" }, chapter: 4 },
  { id: "seattle-rain", title: "Drowned Rainlord", blurb: "Clear the Underground City.", type: "boss", cityId: "seattle", when: { kind: "dungeon", city: "seattle" }, chapter: 5 },
  { id: "sf-warden", title: "Warden Eternal", blurb: "Clear Fog Rock Prison.", type: "boss", cityId: "san-francisco", when: { kind: "dungeon", city: "san-francisco" }, chapter: 5 },
  { id: "la-saber", title: "Saber-Wraith", blurb: "Clear the Tar Pits.", type: "boss", cityId: "los-angeles", when: { kind: "dungeon", city: "los-angeles" }, chapter: 5 },
  { id: "honolulu-shade", title: "Volcanic Shade", blurb: "Clear the Volcanic Throat.", type: "boss", cityId: "honolulu", when: { kind: "dungeon", city: "honolulu" }, chapter: 5 },

  { id: "ny-five", title: "Night Sweep", blurb: "Clear five street crimes in New York.", type: "crime", cityId: "new-york", when: { kind: "crime", city: "new-york", count: 5 }, chapter: 1 },
  { id: "boston-jobs", title: "Common Jobs", blurb: "Clear two street crimes in Boston.", type: "crime", cityId: "boston", when: { kind: "crime", city: "boston", count: 2 }, chapter: 1 },
  { id: "philly-jobs", title: "Foundry Streets", blurb: "Clear two street crimes in Philadelphia.", type: "crime", cityId: "philadelphia", when: { kind: "crime", city: "philadelphia", count: 2 }, chapter: 1 },
  { id: "dc-jobs", title: "Mall Patrol", blurb: "Clear two street crimes in Washington, DC.", type: "crime", cityId: "washington-dc", when: { kind: "crime", city: "washington-dc", count: 2 }, chapter: 1 },
  { id: "chicago-jobs", title: "Loop Racket", blurb: "Clear three street crimes in Chicago.", type: "crime", cityId: "chicago", when: { kind: "crime", city: "chicago", count: 3 }, chapter: 2 },
  { id: "milwaukee-jobs", title: "Cellar Streets", blurb: "Clear two street crimes in Milwaukee.", type: "crime", cityId: "milwaukee", when: { kind: "crime", city: "milwaukee", count: 2 }, chapter: 2 },
  { id: "dallas-jobs", title: "Derrick Jobs", blurb: "Clear two street crimes in Dallas.", type: "crime", cityId: "dallas", when: { kind: "crime", city: "dallas", count: 2 }, chapter: 2 },
  { id: "austin-jobs", title: "Bridge Jobs", blurb: "Clear two street crimes in Austin.", type: "crime", cityId: "austin", when: { kind: "crime", city: "austin", count: 2 }, chapter: 3 },
  { id: "miami-jobs", title: "Deco Jobs", blurb: "Clear two street crimes in Miami.", type: "crime", cityId: "miami", when: { kind: "crime", city: "miami", count: 2 }, chapter: 3 },
  { id: "nola-jobs", title: "Tomb Streets", blurb: "Clear two street crimes in New Orleans.", type: "crime", cityId: "new-orleans", when: { kind: "crime", city: "new-orleans", count: 2 }, chapter: 3 },
  { id: "vegas-jobs", title: "House Jobs", blurb: "Clear two street crimes in Las Vegas.", type: "crime", cityId: "las-vegas", when: { kind: "crime", city: "las-vegas", count: 2 }, chapter: 4 },
  { id: "seattle-jobs", title: "Rain Jobs", blurb: "Clear two street crimes in Seattle.", type: "crime", cityId: "seattle", when: { kind: "crime", city: "seattle", count: 2 }, chapter: 5 },
  { id: "la-jobs", title: "Pit Streets", blurb: "Clear two street crimes in Los Angeles.", type: "crime", cityId: "los-angeles", when: { kind: "crime", city: "los-angeles", count: 2 }, chapter: 5 },
  { id: "any-eight", title: "Eight Cities Clean", blurb: "Clear eight street crimes anywhere on the chain.", type: "crime", cityId: null, when: { kind: "crime", count: 8 }, chapter: 3 },

  { id: "ny-roof", title: "Glass Garden", blurb: "Stand on a New York rooftop.", type: "exploration", cityId: "new-york", when: { kind: "roof" }, chapter: 1 },
  { id: "ny-heroes", title: "Gold Schematic", blurb: "Walk east into Skyline Heroes.", type: "exploration", cityId: "new-york", when: { kind: "heroes" }, chapter: 1 },
  { id: "ny-warrens", title: "Iron Gate", blurb: "Walk west into the Iron Warrens.", type: "exploration", cityId: "new-york", when: { kind: "warrens" }, chapter: 1 },
  { id: "wreck-three", title: "Brick Rain", blurb: "Fold three buildings with a smash.", type: "exploration", cityId: null, when: { kind: "wreck", count: 3 }, chapter: 1 },
  { id: "wreck-eight", title: "Block Fold", blurb: "Fold eight buildings across the campaign.", type: "exploration", cityId: null, when: { kind: "wreck", count: 8 }, chapter: 2 },
  { id: "hunt-three", title: "Iron Pack", blurb: "Put down three hunt beasts.", type: "exploration", cityId: null, when: { kind: "hunt", count: 3 }, chapter: 1 },
  { id: "team-up", title: "Fall In", blurb: "Press H beside a Skyline Hero and take them on the block.", type: "exploration", cityId: "new-york", when: { kind: "team" }, chapter: 1 },
  { id: "cash-400", title: "Street Fund", blurb: "Hold $400 in street cash.", type: "exploration", cityId: null, when: { kind: "cash", amount: 400 }, chapter: 2 },
  { id: "level-three", title: "Titan Grade", blurb: "Reach level 3.", type: "exploration", cityId: null, when: { kind: "level", level: 3 }, chapter: 2 },
  { id: "five-gates", title: "Five Gates", blurb: "Clear five capital dungeons.", type: "exploration", cityId: null, when: { kind: "bosses", count: 5 }, chapter: 2 },

  { id: "go-chicago", title: "Wind Route", blurb: "Travel to Chicago.", type: "travel", cityId: "chicago", when: { kind: "arrive", city: "chicago" }, chapter: 2 },
  { id: "go-miami", title: "Tide Run", blurb: "Travel to Miami.", type: "travel", cityId: "miami", when: { kind: "arrive", city: "miami" }, chapter: 3 },
  { id: "go-denver", title: "Thin Air", blurb: "Travel to Denver.", type: "travel", cityId: "denver", when: { kind: "arrive", city: "denver" }, chapter: 2 },
  { id: "go-nola", title: "Tomb Ticket", blurb: "Travel to New Orleans.", type: "travel", cityId: "new-orleans", when: { kind: "arrive", city: "new-orleans" }, chapter: 3 },
  { id: "go-vegas", title: "House Ticket", blurb: "Travel to Las Vegas after dark. The strip is a fuse. First drop-in forces night.", type: "travel", cityId: "las-vegas", when: { kind: "arrive", city: "las-vegas" }, chapter: 4 },
  { id: "vegas-comic-fixit", title: "Gray Math", blurb: "Glowing issue on the Strip. H — enter Joe Fixit.", type: "story", cityId: "las-vegas", when: { kind: "comic", arc: "joe-fixit" }, requires: ["go-vegas"], chapter: 4 },
  { id: "go-seattle", title: "Rain Ticket", blurb: "Travel to Seattle.", type: "travel", cityId: "seattle", when: { kind: "arrive", city: "seattle" }, chapter: 5 },
  { id: "go-la", title: "Tar Ticket", blurb: "Travel to Los Angeles.", type: "travel", cityId: "los-angeles", when: { kind: "arrive", city: "los-angeles" }, chapter: 5 },
];

export const OBJECTIVES: ObjectiveDef[] = [...NY_STORY, ...SIDE];

if (OBJECTIVES.length !== 62) {
  throw new Error(`Expected 62 objectives, got ${OBJECTIVES.length}`);
}
if (new Set(OBJECTIVES.map((o) => o.id)).size !== OBJECTIVES.length) {
  throw new Error("Duplicate objective ids");
}

export function objectiveById(id: string): ObjectiveDef | undefined {
  return OBJECTIVES.find((o) => o.id === id);
}

export function objectiveUnlocked(save: SaveData, obj: ObjectiveDef): boolean {
  if (!obj.requires?.length) return true;
  const done = new Set(save.completedObjectives);
  return obj.requires.every((id) => done.has(id));
}

export function objectiveStatus(save: SaveData, obj: ObjectiveDef): "active" | "done" | "locked" | "open" {
  if (save.completedObjectives.includes(obj.id)) return "done";
  if (save.activeObjectiveId === obj.id) return "active";
  if (!objectiveUnlocked(save, obj)) return "locked";
  return "open";
}

export type ObjFlags = {
  plaza?: boolean;
  roof?: boolean;
  heroes?: boolean;
  warrens?: boolean;
  reverted?: boolean;
};

function met(save: SaveData, obj: ObjectiveDef, flags: ObjFlags): boolean {
  const w = obj.when;
  const crimes = (id?: string) => {
    if (id) return save.crimesCleared[id] ?? 0;
    return Object.values(save.crimesCleared).reduce((a, b) => a + b, 0);
  };
  switch (w.kind) {
    case "arrive":
      return save.cityId === w.city;
    case "transform":
      return save.everHulked;
    case "revert":
      return Boolean(flags.reverted || save.objectiveProgress.reverted);
    case "crime":
      return crimes(w.city) >= w.count;
    case "dungeon":
      return save.beatenBosses.includes(w.city);
    case "plaza":
      return Boolean(flags.plaza || save.objectiveProgress.plaza);
    case "roof":
      return Boolean(flags.roof || save.objectiveProgress.roof);
    case "heroes":
      return Boolean(flags.heroes || save.objectiveProgress.heroes);
    case "warrens":
      return Boolean(flags.warrens || save.objectiveProgress.warrens);
    case "wreck":
      return save.wrecked >= w.count;
    case "hunt":
      return save.hunts >= w.count;
    case "team":
      return save.teamed;
    case "cash":
      return save.cash >= w.amount;
    case "level":
      return save.level >= w.level;
    case "bosses":
      return save.beatenBosses.length >= w.count;
    case "cities":
      return save.unlockedCities.length >= w.count;
    case "intro":
      return save.introSeen;
    case "recognized":
      return save.recognized;
    case "night":
      return save.cityId === w.city && (save.life.hour >= 20 || save.life.hour < 5 || (save.objectiveProgress.vegasNight ?? 0) > 0);
    case "comic":
      return save.comicsCleared.includes(w.arc);
    default:
      return false;
  }
}

export function syncObjectives(save: SaveData, flags: ObjFlags = {}): string[] {
  if (flags.plaza) save.objectiveProgress.plaza = 1;
  if (flags.roof) save.objectiveProgress.roof = 1;
  if (flags.heroes) save.objectiveProgress.heroes = 1;
  if (flags.warrens) save.objectiveProgress.warrens = 1;
  if (flags.reverted) save.objectiveProgress.reverted = 1;
  const fresh: string[] = [];
  for (const obj of OBJECTIVES) {
    if (save.completedObjectives.includes(obj.id)) continue;
    if (!objectiveUnlocked(save, obj)) continue;
    if (!met(save, obj, flags)) continue;
    save.completedObjectives.push(obj.id);
    fresh.push(obj.id);
  }
  if (save.activeObjectiveId && (save.completedObjectives.includes(save.activeObjectiveId) || !objectiveById(save.activeObjectiveId))) {
    save.activeObjectiveId = nextStoryId(save);
  }
  if (!save.activeObjectiveId) save.activeObjectiveId = nextStoryId(save);
  return fresh;
}

export function nextStoryId(save: SaveData): string | null {
  const done = new Set(save.completedObjectives);
  const story = OBJECTIVES.find((o) => o.type === "story" && !done.has(o.id) && objectiveUnlocked(save, o));
  return story?.id ?? OBJECTIVES.find((o) => !done.has(o.id) && objectiveUnlocked(save, o))?.id ?? null;
}

export function pinObjective(save: SaveData, id: string): boolean {
  const obj = objectiveById(id);
  if (!obj || !objectiveUnlocked(save, obj) || save.completedObjectives.includes(id)) return false;
  save.activeObjectiveId = id;
  return true;
}
