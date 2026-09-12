/** Vol2 ADD: 45 mission beat stubs + side-content hooks. Flags only — does not strip live objectives. */
export type MissionHook = "street" | "rampage" | "freaks" | "boss" | "travel";

export type MissionBeat = {
  id: string;
  n: number;
  title: string;
  cityId: string;
  hook: MissionHook;
  blurb: string;
};

export const MISSION_BEATS: MissionBeat[] = [
  { id: "mb-01", n: 1, title: "Night Bus Curb", cityId: "new-york", hook: "street", blurb: "Drop in. Walk as Banner." },
  { id: "mb-02", n: 2, title: "First Street Job", cityId: "new-york", hook: "street", blurb: "Smash one crew. DAMAGE$ ticks." },
  { id: "mb-03", n: 3, title: "Smash Rampage", cityId: "new-york", hook: "rampage", blurb: "Hold the street hot. Wanted climbs." },
  { id: "mb-04", n: 4, title: "Gamma Freaks", cityId: "new-york", hook: "freaks", blurb: "Lore contacts hail the titan. H to talk." },
  { id: "mb-05", n: 5, title: "Turnstile Door", cityId: "new-york", hook: "boss", blurb: "Capital dungeon stub: Turnstile Tunnels." },
  { id: "mb-06", n: 6, title: "West to LA", cityId: "los-angeles", hook: "travel", blurb: "City 2 on the largest-per-state chain. Toad waits in the pits." },
  { id: "mb-07", n: 7, title: "Harbor Sweep", cityId: "baltimore", hook: "street", blurb: "Waterline jobs." },
  { id: "mb-08", n: 8, title: "Loop Freight", cityId: "chicago", hook: "street", blurb: "Clear a heist under the Loop." },
  { id: "mb-09", n: 9, title: "Act I Cellars", cityId: "milwaukee", hook: "boss", blurb: "Brewery Cellars dungeon stub." },
  { id: "mb-10", n: 10, title: "Dust Run", cityId: "oklahoma-city", hook: "rampage", blurb: "Rampage through the bowl." },
  { id: "mb-11", n: 11, title: "Bat Bridge", cityId: "austin", hook: "boss", blurb: "Act II cavern stub." },
  { id: "mb-12", n: 12, title: "Delta Mask", cityId: "new-orleans", hook: "freaks", blurb: "Side freaks in the tombs." },
  { id: "mb-13", n: 13, title: "Silent Opera", cityId: "nashville", hook: "street", blurb: "Street job before the downbeat." },
  { id: "mb-14", n: 14, title: "Mirror Manor", cityId: "orlando", hook: "boss", blurb: "Act III dungeon stub." },
  { id: "mb-15", n: 15, title: "House Edge", cityId: "las-vegas", hook: "rampage", blurb: "Night rampage on the Strip overlay." },
  { id: "mb-16", n: 16, title: "Salt Prophet", cityId: "salt-lake-city", hook: "boss", blurb: "Act IV barrow stub." },
  { id: "mb-17", n: 17, title: "Fog Rock", cityId: "san-francisco", hook: "street", blurb: "Jobs in the fog." },
  { id: "mb-18", n: 18, title: "Tar Pits", cityId: "los-angeles", hook: "freaks", blurb: "Side hunt in the pits." },
  { id: "mb-19", n: 19, title: "Glacier Light", cityId: "anchorage", hook: "boss", blurb: "Anchorage dungeon stub. Not the last page — Huntsville is 50." },
  { id: "mb-20", n: 20, title: "Rocket Cellar", cityId: "huntsville", hook: "travel", blurb: "City 50. Range still tracks a name." },
  { id: "mb-21", n: 21, title: "Boise Drop", cityId: "boise", hook: "travel", blurb: "Extra hub overlay." },
  { id: "mb-22", n: 22, title: "Des Moines Curb", cityId: "des-moines", hook: "street", blurb: "Extra street job stub." },
  { id: "mb-23", n: 23, title: "Wichita Sweep", cityId: "wichita", hook: "street", blurb: "Extra street job stub." },
  { id: "mb-24", n: 24, title: "Billings Wind", cityId: "billings", hook: "rampage", blurb: "Extra rampage hook." },
  { id: "mb-25", n: 25, title: "Manchester Mill", cityId: "manchester-nh", hook: "street", blurb: "Extra street job stub." },
  { id: "mb-26", n: 26, title: "Newark Yards", cityId: "newark", hook: "street", blurb: "Extra street job stub." },
  { id: "mb-27", n: 27, title: "Fargo Freeze", cityId: "fargo", hook: "freaks", blurb: "Extra freaks hook." },
  { id: "mb-28", n: 28, title: "Providence Bell", cityId: "providence", hook: "street", blurb: "Extra street job stub." },
  { id: "mb-29", n: 29, title: "Sioux Falls", cityId: "sioux-falls", hook: "travel", blurb: "Extra hub overlay." },
  { id: "mb-30", n: 30, title: "Burlington Green", cityId: "burlington", hook: "street", blurb: "Extra street job stub." },
  { id: "mb-31", n: 31, title: "Charleston Coal", cityId: "charleston-wv", hook: "street", blurb: "Extra street job stub." },
  { id: "mb-32", n: 32, title: "Cheyenne Flats", cityId: "cheyenne", hook: "rampage", blurb: "Extra rampage hook." },
  { id: "mb-33", n: 33, title: "Wilmington Dock", cityId: "wilmington", hook: "street", blurb: "Extra street job stub." },
  { id: "mb-34", n: 34, title: "Portland Head", cityId: "portland-me", hook: "street", blurb: "Extra street job stub." },
  { id: "mb-35", n: 35, title: "Hartford Archive", cityId: "hartford", hook: "street", blurb: "Extra street job stub." },
  { id: "mb-36", n: 36, title: "Columbia Oaks", cityId: "columbia-sc", hook: "street", blurb: "Extra street job stub." },
  { id: "mb-37", n: 37, title: "Jackson Heat", cityId: "jackson-ms", hook: "street", blurb: "Extra street job stub." },
  { id: "mb-38", n: 38, title: "Little Rock", cityId: "little-rock", hook: "travel", blurb: "Extra hub overlay." },
  { id: "mb-39", n: 39, title: "Virginia Beach", cityId: "virginia-beach", hook: "rampage", blurb: "Extra rampage hook." },
  { id: "mb-40", n: 40, title: "Tulsa Derrick", cityId: "tulsa", hook: "street", blurb: "Extra street job stub." },
  { id: "mb-41", n: 41, title: "Hero Resolution", cityId: "new-york", hook: "street", blurb: "HERO / MENACE fork. Existing smash economy." },
  { id: "mb-42", n: 42, title: "Menace Resolution", cityId: "new-york", hook: "rampage", blurb: "Menace path. Existing smash economy." },
  { id: "mb-43", n: 43, title: "Codex Page", cityId: "milwaukee", hook: "boss", blurb: "Act capital page after the dungeon." },
  { id: "mb-44", n: 44, title: "Relic Night", cityId: "new-york", hook: "freaks", blurb: "X / G / N / T echoes. Existing borrowed powers." },
  { id: "mb-45", n: 45, title: "Seventy-One", cityId: "huntsville", hook: "travel", blurb: "71 Sanctuary downtowns kept on the map. 50 largest-per-state unlock. Extras (Austin, Miami, DC…) stay selectable." },
];

if (MISSION_BEATS.length !== 45) {
  throw new Error(`Expected 45 mission beats, got ${MISSION_BEATS.length}`);
}
