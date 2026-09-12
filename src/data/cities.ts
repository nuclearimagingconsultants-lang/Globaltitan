import { actForOrder, CITY_STORY, cityStory } from "./story";
import { cityShell, extraShell } from "./cityShells";
import type { CityDef, HazardId, LandmarkKind } from "./types";

export const HUB_CITY_ID = "new-york";

type Row = {
  id: string;
  name: string;
  lat: number;
  lon: number;
  dungeon: string;
  boss: string;
  hazard: HazardId;
  landmark: LandmarkKind;
  flavor: string;
  act?: 1 | 2 | 3 | 4 | 5;
};

const ROWS: Row[] = [
  { id: "new-york", name: "New York", lat: 40.758, lon: -73.9855, dungeon: "The Turnstile Tunnels", boss: "Turnstile Ghoul", hazard: "flood", landmark: "towers", flavor: "Flooded subway. Watch the waterline." },
  { id: "los-angeles", name: "Los Angeles", lat: 34.05, lon: -118.24, dungeon: "The Tar Pits", boss: "Saber-Wraith Matriarch", hazard: "tar", landmark: "hollywood", flavor: "Tar that holds a leap." },
  { id: "chicago", name: "Chicago", lat: 41.88, lon: -87.63, dungeon: "Freight Tunnels of the Loop", boss: "Bootlegger King", hazard: "dark", landmark: "towers", flavor: "Black tunnels under the Loop." },
  { id: "houston", name: "Houston", lat: 29.76, lon: -95.37, dungeon: "Flooded Bayou Bunker", boss: "Gator-King", hazard: "flood", landmark: "canal", flavor: "Bayou water in a concrete throat." },
  { id: "phoenix", name: "Phoenix", lat: 33.45, lon: -112.07, dungeon: "The Sun Temple", boss: "Ash Phoenix", hazard: "heat", landmark: "mountain", flavor: "Noon that never ends." },
  { id: "philadelphia", name: "Philadelphia", lat: 39.95, lon: -75.17, dungeon: "Cracked Bell Foundry", boss: "Molten Founder", hazard: "heat", landmark: "clock", flavor: "Heat slag. The floor bites." },
  { id: "jacksonville", name: "Jacksonville", lat: 30.33, lon: -81.66, dungeon: "Fort of the Drowned", boss: "Tide Warden", hazard: "flood", landmark: "fort", flavor: "A brick fort that never drained." },
  { id: "columbus", name: "Columbus", lat: 39.96, lon: -83.0, dungeon: "The Archive Below", boss: "Librarian of Ash", hazard: "dark", landmark: "capitol", flavor: "Shelves that swallow lamps." },
  { id: "indianapolis", name: "Indianapolis", lat: 39.77, lon: -86.16, dungeon: "The Speedway Crypt", boss: "Endless Racer", hazard: "spark", landmark: "speedway", flavor: "A track that never stops." },
  { id: "seattle", name: "Seattle", lat: 47.61, lon: -122.33, dungeon: "The Underground City", boss: "Drowned Rainlord", hazard: "flood", landmark: "towers", flavor: "Act I. Streets under streets, always wet.", act: 1 },
  { id: "denver", name: "Denver", lat: 39.74, lon: -104.99, dungeon: "Mile-High Necropolis", boss: "Thin-Air Lich", hazard: "thin", landmark: "mountain", flavor: "Thin air. Every leap costs more." },
  { id: "oklahoma-city", name: "Oklahoma City", lat: 35.47, lon: -97.52, dungeon: "The Dust Bowl Barrow", boss: "Storm Caller", hazard: "fog", landmark: "generic", flavor: "Dust so thick the boss is a rumor." },
  { id: "nashville", name: "Nashville", lat: 36.16, lon: -86.78, dungeon: "The Silent Opera House", boss: "The Conductor", hazard: "bell", landmark: "opera", flavor: "A downbeat that stuns the room." },
  { id: "charlotte", name: "Charlotte", lat: 35.23, lon: -80.84, dungeon: "The Mint Below", boss: "Coin Golem", hazard: "spark", landmark: "generic", flavor: "Pressed metal and jumping current." },
  { id: "las-vegas", name: "Las Vegas", lat: 36.17, lon: -115.14, dungeon: "The House Always Wins", boss: "The Dealer", hazard: "spark", landmark: "neon", flavor: "A floor that pays in shocks." },
  { id: "boston", name: "Boston", lat: 42.36, lon: -71.06, dungeon: "Old Burying Ground Vault", boss: "Bell-Ringer Wight", hazard: "bell", landmark: "clock", flavor: "Fog and a funeral bell that knocks the air out of you." },
  { id: "portland", name: "Portland, OR", lat: 45.52, lon: -122.68, dungeon: "Rose Garden Labyrinth", boss: "Thorn Queen", hazard: "root", landmark: "rose", flavor: "Roses with a grip." },
  { id: "detroit", name: "Detroit", lat: 42.33, lon: -83.05, dungeon: "The Assembly Line", boss: "Engine Wraith", hazard: "spark", landmark: "towers", flavor: "Live rails. Sparks jump the floor." },
  { id: "louisville", name: "Louisville", lat: 38.25, lon: -85.76, dungeon: "Distillery Catacombs", boss: "Barrel Wraith", hazard: "gas", landmark: "brewery", flavor: "Fumes that go to the head." },
  { id: "baltimore", name: "Baltimore", lat: 39.29, lon: -76.61, dungeon: "Harbor Hulk", boss: "Drowned Captain Ashe", hazard: "flood", landmark: "canal", flavor: "Act II. A half-sunk hull. Water grabs the ankles.", act: 2 },
  { id: "milwaukee", name: "Milwaukee", lat: 43.04, lon: -87.91, dungeon: "Brewery Cellars", boss: "The Fermenter", hazard: "gas", landmark: "brewery", flavor: "Gas that ferments the lungs." },
  { id: "albuquerque", name: "Albuquerque", lat: 35.08, lon: -106.65, dungeon: "The Balloon Graveyard", boss: "Sky Marshal", hazard: "wind", landmark: "balloon", flavor: "Wind that shoves a titan sideways." },
  { id: "kansas-city", name: "Kansas City", lat: 39.1, lon: -94.58, dungeon: "Stockyard Charnel", boss: "Butcher-Bishop", hazard: "root", landmark: "fountain", flavor: "Hooks and slow blood-mud." },
  { id: "atlanta", name: "Atlanta", lat: 33.75, lon: -84.39, dungeon: "Undercity Rail Vaults", boss: "Ash Warden", hazard: "gas", landmark: "towers", flavor: "Ash in the tunnels." },
  { id: "omaha", name: "Omaha", lat: 41.26, lon: -95.94, dungeon: "Rail Yard of Rust", boss: "Locomotive Revenant", hazard: "spark", landmark: "generic", flavor: "Live couplings. Don't stand on the rail." },
  { id: "virginia-beach", name: "Virginia Beach", lat: 36.8529, lon: -75.978, dungeon: "Boardwalk Cistern", boss: "Tide Clerk", hazard: "flood", landmark: "canal", flavor: "A boardwalk cistern that never drained." },
  { id: "minneapolis", name: "Minneapolis", lat: 44.98, lon: -93.27, dungeon: "Frozen Mill Ruins", boss: "Grain Wight", hazard: "ice", landmark: "mill", flavor: "Ice on the grain floors. Jumps die." },
  { id: "wichita", name: "Wichita", lat: 37.6872, lon: -97.3301, dungeon: "Airfield Barrow", boss: "Hangar Wight", hazard: "wind", landmark: "generic", flavor: "Hangars that swallow a leap." },
  { id: "new-orleans", name: "New Orleans", lat: 29.95, lon: -90.07, dungeon: "Above-Ground Tomb Maze", boss: "Masked Baron", hazard: "dark", landmark: "tomb", flavor: "Tombs stacked like a city." },
  { id: "honolulu", name: "Honolulu", lat: 21.31, lon: -157.86, dungeon: "The Volcanic Throat", boss: "Fire Goddess's Shade", hazard: "heat", landmark: "volcano", flavor: "Act III. A throat of the mountain.", act: 3 },
  { id: "newark", name: "Newark", lat: 40.7357, lon: -74.1724, dungeon: "Yard Throat", boss: "Coupler King", hazard: "spark", landmark: "crane", flavor: "Live couplings in the yard throat." },
  { id: "anchorage", name: "Anchorage", lat: 61.22, lon: -149.9, dungeon: "Glacier of the Last Gate", boss: "The World-Ender", hazard: "ice", landmark: "glacier", flavor: "Ice at the last big town on the rim. The chain still runs after this." },
  { id: "boise", name: "Boise", lat: 43.615, lon: -116.2023, dungeon: "Basalt Vault", boss: "River Stone", hazard: "root", landmark: "generic", flavor: "Black rock under the greenbelt." },
  { id: "des-moines", name: "Des Moines", lat: 41.5868, lon: -93.625, dungeon: "Capitol Crawl", boss: "Dome Keeper", hazard: "dark", landmark: "capitol", flavor: "A dome that files names in the dark." },
  { id: "little-rock", name: "Little Rock", lat: 34.7465, lon: -92.2896, dungeon: "River Market Crypt", boss: "Bridge Bell", hazard: "bell", landmark: "bridge", flavor: "The river market still rings a siege bell." },
  { id: "salt-lake-city", name: "Salt Lake City", lat: 40.76, lon: -111.89, dungeon: "Salt Flats Barrow", boss: "Brine Prophet", hazard: "salt", landmark: "temple", flavor: "Salt that eats the skin." },
  { id: "sioux-falls", name: "Sioux Falls", lat: 43.5446, lon: -96.7311, dungeon: "Falls Crypt", boss: "Spray Saint", hazard: "flood", landmark: "fountain", flavor: "Spray that hides a stair into the rock." },
  { id: "providence", name: "Providence", lat: 41.824, lon: -71.4128, dungeon: "Bay Bell", boss: "Cove Warden", hazard: "bell", landmark: "lighthouse", flavor: "A cove bell that knocks the air out of you." },
  { id: "charleston-sc", name: "Charleston, SC", lat: 32.7765, lon: -79.9311, dungeon: "Battery Cistern", boss: "Tide Deacon", hazard: "flood", landmark: "fort", flavor: "The Battery never gave the water back." },
  { id: "bridgeport", name: "Bridgeport", lat: 41.1792, lon: -73.1894, dungeon: "Harbor Arena Pit", boss: "Sound Warden", hazard: "spark", landmark: "crane", flavor: "Act IV. A harbor pit under the arena lights.", act: 4 },
  { id: "fargo", name: "Fargo", lat: 46.8772, lon: -96.7898, dungeon: "Frozen Lot", boss: "Grain Ghost", hazard: "ice", landmark: "generic", flavor: "A lot that never thawed." },
  { id: "jackson-ms", name: "Jackson", lat: 32.2988, lon: -90.1848, dungeon: "Capitol Heat", boss: "Marble Fan", hazard: "heat", landmark: "capitol", flavor: "Marble that cooks at noon." },
  { id: "billings", name: "Billings", lat: 45.7833, lon: -108.5007, dungeon: "Rimrock Cut", boss: "Cliff Bell", hazard: "wind", landmark: "mountain", flavor: "Rimrock that shoves the leap sideways." },
  { id: "manchester-nh", name: "Manchester, NH", lat: 42.9956, lon: -71.4548, dungeon: "Mill Race", boss: "Loom Shade", hazard: "flood", landmark: "mill", flavor: "A mill race that still turns." },
  { id: "wilmington", name: "Wilmington", lat: 39.7391, lon: -75.5398, dungeon: "River Slip", boss: "Pilot Shade", hazard: "flood", landmark: "canal", flavor: "A slip that never let the river go." },
  { id: "portland-me", name: "Portland, ME", lat: 43.6591, lon: -70.2568, dungeon: "Head Light", boss: "Fog Horn", hazard: "fog", landmark: "lighthouse", flavor: "Fog so thick the horn is a wall." },
  { id: "cheyenne", name: "Cheyenne", lat: 41.14, lon: -104.8202, dungeon: "Wind Depot", boss: "Prairie Horn", hazard: "wind", landmark: "generic", flavor: "A depot that howls on purpose." },
  { id: "charleston-wv", name: "Charleston, WV", lat: 38.3498, lon: -81.6326, dungeon: "Coal Nave", boss: "Seam Priest", hazard: "gas", landmark: "generic", flavor: "A nave cut into the seam." },
  { id: "burlington", name: "Burlington", lat: 44.4759, lon: -73.2121, dungeon: "Lakeside Root", boss: "Green Marshal", hazard: "root", landmark: "rose", flavor: "Roots that hold a titan at the lake." },
  { id: "huntsville", name: "Huntsville", lat: 34.7304, lon: -86.5861, dungeon: "Rocket Cellar", boss: "Range Warden", hazard: "spark", landmark: "generic", flavor: "Last gate. Redstone cellars. The range still tracks a name.", act: 5 },
];

export const CITIES: CityDef[] = ROWS.map((row, i) => {
  const next = ROWS[i + 1];
  const shell = cityShell(row.id);
  if (!shell) throw new Error(`Missing city shell: ${row.id}`);
  return {
    id: row.id,
    name: row.name,
    country: "United States",
    lat: row.lat,
    lon: row.lon,
    blurb: `${row.dungeon}. ${row.flavor}`,
    crimeFlavor: row.flavor,
    featured: i === 0 || i === 9 || i === 19 || i === 29 || i === 39 || i === 49,
    landmark: shell.landmarkKind,
    boss: {
      name: row.boss,
      title: row.dungeon,
      crimesToUnlock: row.id === "new-york" ? 1 : row.act ? 3 : 2,
    },
    unlocks: next ? [next.id] : [],
    order: i + 1,
    dungeonName: row.dungeon,
    hazard: row.hazard,
    act: row.act ?? 0,
    actBand: actForOrder(i + 1),
    storyLine: cityStory(row.id).line,
    districts: shell.districts,
    landmarkName: shell.landmarkName,
    skyline: shell.skyline,
    bones: shell.bones,
    palette: shell.palette,
    bestiaryPrefix: shell.bestiaryPrefix,
  };
});

const byId = new Map(CITIES.map((c) => [c.id, c]));

type ExtraRow = {
  id: string;
  name: string;
  lat: number;
  lon: number;
  zoom?: number;
  dungeon: string;
  boss: string;
};

/** Selectable downtown overlays not on the largest-per-state 1→50 chain. Old Sanctuary-Shadow cities stay playable here. */
const EXTRA_ROWS: ExtraRow[] = [
  { id: "washington-dc", name: "Washington, DC", lat: 38.91, lon: -77.04, dungeon: "Catacombs Under the Mall", boss: "Marble Senator" },
  { id: "pittsburgh", name: "Pittsburgh", lat: 40.44, lon: -80.0, dungeon: "The Steel Cathedral", boss: "Slag Golem" },
  { id: "cleveland", name: "Cleveland", lat: 41.5, lon: -81.69, dungeon: "Lakeside Lighthouse", boss: "Lamp-Keeper" },
  { id: "dallas", name: "Dallas", lat: 32.78, lon: -96.8, dungeon: "The Derrick Pit", boss: "Black Gold Elemental" },
  { id: "san-antonio", name: "San Antonio", lat: 29.42, lon: -98.49, dungeon: "Mission Bell Tower", boss: "Siege Colonel" },
  { id: "austin", name: "Austin", lat: 30.27, lon: -97.74, dungeon: "Bat Bridge Caverns", boss: "Mother of Ten Thousand Wings" },
  { id: "memphis", name: "Memphis", lat: 35.15, lon: -90.05, dungeon: "The Pyramid Vault", boss: "Pharaoh of the Delta" },
  { id: "richmond", name: "Richmond", lat: 37.54, lon: -77.44, dungeon: "Ironworks Cannonry", boss: "Cannon Priest" },
  { id: "raleigh", name: "Raleigh", lat: 35.78, lon: -78.64, dungeon: "The Oak Hollow", boss: "Root Matriarch" },
  { id: "miami", name: "Miami", lat: 25.76, lon: -80.19, dungeon: "Sunken Art Deco Hotel", boss: "Tidal Concierge" },
  { id: "tampa", name: "Tampa", lat: 27.95, lon: -82.46, dungeon: "The Pirate Cistern", boss: "Gasparilla Ghost" },
  { id: "orlando", name: "Orlando", lat: 28.54, lon: -81.38, dungeon: "Hall of Mirrors Manor", boss: "Mirror-Twin" },
  { id: "birmingham", name: "Birmingham", lat: 33.52, lon: -86.81, dungeon: "Vulcan's Forge", boss: "Iron Titan" },
  { id: "cincinnati", name: "Cincinnati", lat: 39.1, lon: -84.51, dungeon: "The Abandoned Subway", boss: "Twin-Tunnel Hydra" },
  { id: "san-francisco", name: "San Francisco", lat: 37.77, lon: -122.42, dungeon: "Fog Rock Prison", boss: "Warden Eternal" },
  { id: "oakland", name: "Oakland", lat: 37.8, lon: -122.27, dungeon: "The Crane Colossus", boss: "Crane Golem" },
  { id: "san-jose", name: "San Jose", lat: 37.34, lon: -121.89, dungeon: "The Silicon Hive", boss: "Machine Mind" },
  { id: "sacramento", name: "Sacramento", lat: 38.58, lon: -121.49, dungeon: "Gold Rush Mine", boss: "Claim-Jumper Lich" },
  { id: "san-diego", name: "San Diego", lat: 32.72, lon: -117.16, dungeon: "The Kelp Cathedral", boss: "Leviathan Bishop" },
  { id: "st-louis", name: "St. Louis", lat: 38.63, lon: -90.2, dungeon: "The Gateway Crypt", boss: "Archkeeper" },
  { id: "hartford", name: "Hartford", lat: 41.7658, lon: -72.6734, dungeon: "Archive Stack", boss: "Policy Wraith" },
  { id: "columbia-sc", name: "Columbia", lat: 34.0007, lon: -81.0348, dungeon: "Oak Hollow Extra", boss: "Dome Root" },
  { id: "tulsa", name: "Tulsa", lat: 36.154, lon: -95.9928, dungeon: "Derrick Pit Extra", boss: "Oil Bell" },
];

export const EXTRA_CITIES: CityDef[] = EXTRA_ROWS.map((row) => {
  const shell = cityShell(row.id) ?? extraShell(row.id, row.name);
  return {
    id: row.id,
    name: row.name,
    country: "United States",
    lat: row.lat,
    lon: row.lon,
    blurb: `${row.dungeon}. Selectable extra downtown — not on the largest-per-state 1→50 chain.`,
    crimeFlavor: "Extra downtown. Same smash overlay, different curb.",
    featured: false,
    landmark: shell.landmarkKind,
    boss: { name: row.boss, title: row.dungeon, crimesToUnlock: 1 },
    unlocks: [],
    order: 0,
    dungeonName: row.dungeon,
    hazard: "dark",
    act: 0,
    actBand: 1,
    storyLine: "Selectable extra downtown. Campaign is largest city per state: 1 New York → 50 Huntsville.",
    districts: shell.districts,
    landmarkName: shell.landmarkName,
    skyline: shell.skyline,
    bones: shell.bones,
    palette: shell.palette,
    bestiaryPrefix: shell.bestiaryPrefix,
  };
});

const extraById = new Map(EXTRA_CITIES.map((c) => [c.id, c]));

export type MapHub = {
  id: string;
  name: string;
  lat: number;
  lon: number;
  zoom: number;
  campaign: boolean;
};

const CAMPAIGN_ZOOM: Record<string, number> = {
  "new-york": 17,
  anchorage: 15,
  honolulu: 15,
  "virginia-beach": 15,
  huntsville: 16,
  "charleston-sc": 16,
  bridgeport: 16,
};

export const MAP_HUBS: MapHub[] = [
  ...CITIES.map((c) => ({
    id: c.id,
    name: c.name,
    lat: c.lat,
    lon: c.lon,
    zoom: CAMPAIGN_ZOOM[c.id] ?? 16,
    campaign: true,
  })),
  ...EXTRA_ROWS.map((r) => ({
    id: r.id,
    name: r.name,
    lat: r.lat,
    lon: r.lon,
    zoom: r.zoom ?? 16,
    campaign: false,
  })),
];

export function isCampaignCity(id: string): boolean {
  return byId.has(id);
}

export function getCity(id: string): CityDef {
  const city = byId.get(id) ?? extraById.get(id);
  if (!city) throw new Error(`Unknown city: ${id}`);
  return city;
}

export function hubOf(id: string): MapHub {
  return MAP_HUBS.find((h) => h.id === id) ?? MAP_HUBS[0]!;
}

export function allCityIds(): string[] {
  return CITIES.map((c) => c.id);
}

export function allPlaceIds(): string[] {
  return TRAVEL_CITIES.map((c) => c.id);
}

/** Original Ces Sanctuary downtowns (50 campaign-era + 21 extras). Never drop these. */
export const SANCTUARY_IDS = [
  "new-york", "boston", "philadelphia", "washington-dc", "baltimore", "pittsburgh", "cleveland", "detroit", "chicago", "milwaukee",
  "minneapolis", "st-louis", "kansas-city", "omaha", "denver", "oklahoma-city", "dallas", "houston", "san-antonio", "austin",
  "new-orleans", "memphis", "nashville", "atlanta", "charlotte", "richmond", "raleigh", "miami", "tampa", "orlando",
  "jacksonville", "birmingham", "louisville", "indianapolis", "columbus", "cincinnati", "las-vegas", "phoenix", "albuquerque", "salt-lake-city",
  "seattle", "portland", "san-francisco", "oakland", "san-jose", "sacramento", "san-diego", "los-angeles", "honolulu", "anchorage",
  "huntsville", "boise", "des-moines", "wichita", "billings", "manchester-nh", "newark", "fargo", "providence", "sioux-falls",
  "burlington", "charleston-wv", "cheyenne", "wilmington", "portland-me", "hartford", "columbia-sc", "jackson-ms", "little-rock", "virginia-beach",
  "tulsa",
] as const;

export const TRAVEL_CITIES: CityDef[] = [...CITIES, ...EXTRA_CITIES];

export function isExtraCity(id: string): boolean {
  return extraById.has(id);
}

/** Campaign chain only. Extras do not unlock the next capital. After NY, Los Angeles (Toad). */
export function nextCity(id: string): CityDef | null {
  const city = byId.get(id);
  if (!city) return null;
  return CITIES[city.order] ?? null;
}

export function cityByOrder(order: number): CityDef | undefined {
  return CITIES[order - 1];
}

if (CITIES.length !== 50) {
  throw new Error(`Expected 50 cities, got ${CITIES.length}`);
}
if (new Set(CITIES.map((c) => c.id)).size !== 50) {
  throw new Error("Duplicate city ids");
}
if (MAP_HUBS.length !== 73) {
  throw new Error(`Expected 73 map hubs, got ${MAP_HUBS.length}`);
}
if (new Set(MAP_HUBS.map((h) => h.id)).size !== 73) {
  throw new Error("Duplicate map hub ids");
}
if (CITIES[0]?.id !== "new-york" || CITIES[1]?.id !== "los-angeles" || CITIES[49]?.id !== "huntsville") {
  throw new Error("Campaign order must be 1 New York … 2 Los Angeles … 50 Huntsville");
}
if (CITIES.find((c) => c.id === "portland")?.name !== "Portland, OR") {
  throw new Error("Oregon Portland must be named Portland, OR");
}
if (CITIES.find((c) => c.id === "portland-me")?.name !== "Portland, ME") {
  throw new Error("Maine Portland must be named Portland, ME");
}
if (CITIES.find((c) => c.id === "charleston-sc")?.name !== "Charleston, SC") {
  throw new Error("South Carolina Charleston must be named Charleston, SC");
}
if (CITIES.find((c) => c.id === "charleston-wv")?.name !== "Charleston, WV") {
  throw new Error("West Virginia Charleston must be named Charleston, WV");
}
if (SANCTUARY_IDS.length !== 71) {
  throw new Error(`Expected 71 Sanctuary ids, got ${SANCTUARY_IDS.length}`);
}
if (new Set(SANCTUARY_IDS).size !== 71) {
  throw new Error("Duplicate Sanctuary ids");
}
for (const id of SANCTUARY_IDS) {
  if (!MAP_HUBS.some((h) => h.id === id)) throw new Error(`Dropped Sanctuary downtown: ${id}`);
}
for (const city of CITIES) {
  if (!CITY_STORY[city.id]) throw new Error(`Missing city story: ${city.id}`);
}
