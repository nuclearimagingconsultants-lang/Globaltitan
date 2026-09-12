import type { SaveData } from "./types";

/** Calder Voss — the Cartographer. Original mastermind. Not a licensed character. */
export const MASTERMIND = {
  name: "Calder Voss",
  title: "the Cartographer",
  short: "Voss",
};

export type ActId = 1 | 2 | 3 | 4 | 5;

export type ActDef = {
  id: ActId;
  name: string;
  region: string;
  range: string;
  cities: string;
  bossCity: string;
  boss: string;
  blurb: string;
};

export const ACTS: ActDef[] = [
  {
    id: 1,
    name: "The Big Five",
    region: "Giants",
    range: "1–10",
    cities: "New York → Seattle",
    bossCity: "seattle",
    boss: "Drowned Rainlord",
    blurb: "Largest-in-state chain. NY first, then the other giants, until the rain under Seattle.",
  },
  {
    id: 2,
    name: "High Plains to Harbor",
    region: "Interior",
    range: "11–20",
    cities: "Denver → Baltimore",
    bossCity: "baltimore",
    boss: "Drowned Captain Ashe",
    blurb: "Mile-high dust, then roses, rails, and a hull that never made the last tide.",
  },
  {
    id: 3,
    name: "Lakes to Fire",
    region: "Heart",
    range: "21–30",
    cities: "Milwaukee → Honolulu",
    bossCity: "honolulu",
    boss: "Fire Goddess's Shade",
    blurb: "Brewery cellars to a volcanic throat. The Pacific is not the end of the book.",
  },
  {
    id: 4,
    name: "Yards and Sound",
    region: "North",
    range: "31–40",
    cities: "Newark → Bridgeport",
    bossCity: "bridgeport",
    boss: "Sound Warden",
    blurb: "Rail throats, ice, gold domes, two Portlands, two Charlestons — then a harbor pit on the Sound.",
  },
  {
    id: 5,
    name: "Last Range",
    region: "Small giants",
    range: "41–50",
    cities: "Fargo → Huntsville",
    bossCity: "huntsville",
    boss: "Range Warden",
    blurb: "Prairie ice to Redstone cellars. The last name on the ledger is a rocket range.",
  },
];

export type IntroPage = {
  eyebrow: string;
  title: string;
  lead: string;
};

export const INTRO_PAGES: IntroPage[] = [
  {
    eyebrow: "Port Authority · 1:14 a.m.",
    title: "The night<br>bus in",
    lead: "A scientist steps off a Grey-line coach with one bag and a name the papers already ruined. New York does not ask why he came. The terminal clock is wrong by seven minutes — the first small lie of the circuit.",
  },
  {
    eyebrow: "Someone on the steps",
    title: "They know<br>the face",
    lead: "A woman selling coffee from a cart stops mid-pour. \"You're that Banner. They said you left science.\" He did. The city did not leave him. Locals may clock the walk, the coat, the way he flinches at a slammed hood.",
  },
  {
    eyebrow: "Sanctuary’s Shadow",
    title: "Hunt the<br>Cartographer",
    lead: "Fifty buried gates under the largest city in each US state. Calder Voss designed them to breed a living weapon, then walked the roster. Banner is the first civilian the circuit took. Work a shift. Eat. Sleep. When the green comes, start in New York — then keep going until Huntsville.",
  },
];

export type CodexPage = {
  act: ActId;
  title: string;
  unlockedBy: string;
  body: string;
};

export const CODEX: CodexPage[] = [
  {
    act: 1,
    title: "Page I — The Big Five",
    unlockedBy: "Drowned Rainlord · Seattle",
    body: "The giants were a rehearsal. Voss poured the first pulse into the biggest rooms — turnstiles, tar pits, the Loop, a bayou throat, noon that never ends — until Seattle’s streets under streets learned to breathe. The Rainlord was not a god. It was a lock that learned weather. Banner’s name is already in the wet.",
  },
  {
    act: 2,
    title: "Page II — Harbor Name",
    unlockedBy: "Drowned Captain Ashe · Baltimore",
    body: "The interior circuit feeds. Dust, roses, rails, a hull that never made the last tide. Baltimore’s Harbor Hulk has a passenger list with one empty bunk. Ashe is how Voss counts a harbor. He is still ahead — always one city down the roster.",
  },
  {
    act: 3,
    title: "Page III — Volcanic Throat",
    unlockedBy: "Fire Goddess's Shade · Honolulu",
    body: "Lakes to fire. Brewery gas, mill ice, a volcanic throat. Honolulu is not the last island on the list — it is Act III’s lock. The Shade does not care who designed the circuit. Voss wanted a spare Banner. He got a spare gate instead.",
  },
  {
    act: 4,
    title: "Page IV — Sound Odds",
    unlockedBy: "Sound Warden · Bridgeport",
    body: "Yards, ice, two Portlands, two Charlestons. Bridgeport’s harbor pit is Act IV’s lock on Long Island Sound. The Warden keeps what the Sound cannot bury. The last ten names are the small giants.",
  },
  {
    act: 5,
    title: "Page V — Last Range",
    unlockedBy: "Range Warden · Huntsville",
    body: "The Range Warden was never a god. It was Voss’s last door, cut under Redstone, keyed to the civilian the circuit chose. Banner walked through. The ledger closes on a name that is still a man. The cities keep their dead. The bus still runs.",
  },
];

export type CityStory = {
  line: string;
  trailTitle: string;
  trailBlurb: string;
};

/** One-line map flavor + main-story beat per capital. */
export const CITY_STORY: Record<string, CityStory> = {
  "new-york": {
    line: "The bus lets him off. The turnstiles already know his step.",
    trailTitle: "The Turnstile",
    trailBlurb: "Clear the Turnstile Tunnels. The Ghoul is Voss’s first breadcrumb under New York.",
  },
  boston: {
    line: "A funeral bell that rings for scientists who left the lab.",
    trailTitle: "Bell Road",
    trailBlurb: "Hear the burying-ground bell. Put down the Wight. Voss marked the East with bronze.",
  },
  philadelphia: {
    line: "The foundry still pours the year they cracked the first bell.",
    trailTitle: "Slag Ledger",
    trailBlurb: "The Molten Founder keeps a pour-book. Cross Philadelphia off the East list.",
  },
  "washington-dc": {
    line: "Marble that votes. Someone already cast Banner’s name.",
    trailTitle: "The Quiet Vote",
    trailBlurb: "The Marble Senator sits under the Mall. Take the seat. Voss used the capital as a stamp.",
  },
  baltimore: {
    line: "A hull that never made the last tide. The captain still calls roll.",
    trailTitle: "Harbor Name",
    trailBlurb: "Board the Harbor Hulk. Drowned Captain Ashe has a passenger list with one empty bunk.",
  },
  pittsburgh: {
    line: "Open furnaces. The cathedral was built to cook a titan.",
    trailTitle: "Steel Hymn",
    trailBlurb: "Walk the Steel Cathedral. The Slag Golem is the East’s heavy lock.",
  },
  cleveland: {
    line: "The lamp dies, then blinds. Someone is practicing for later cities.",
    trailTitle: "Dead Lamp",
    trailBlurb: "Climb the Lakeside Lighthouse. The Lamp-Keeper tests who can walk in the black.",
  },
  detroit: {
    line: "Live rails. The line was retooled to assemble a weapon, not a car.",
    trailTitle: "Night Shift",
    trailBlurb: "Shut the Assembly Line. The Engine Wraith still punches the clock Voss set.",
  },
  chicago: {
    line: "Freight tunnels under the Loop. Bootleggers kept the first maps.",
    trailTitle: "Loop Freight",
    trailBlurb: "Take the Bootlegger King. His tunnels are how the East whispered west.",
  },
  milwaukee: {
    line: "Cellars that ferment a pulse until it learns a name. Not the first lock anymore — still a tasting room.",
    trailTitle: "Act I — The Fermenter",
    trailBlurb: "Brewery Cellars. Beat the Fermenter and the Bell Road opens the Codex.",
  },
  minneapolis: {
    line: "Ice on the grain floors. The heartland starts by taking the jump out of you.",
    trailTitle: "Frozen Ledger",
    trailBlurb: "Clear the Frozen Mill. The Grain Wight is how Act II says hello.",
  },
  "st-louis": {
    line: "The arch presses down. A gate pretending to be a monument.",
    trailTitle: "Under the Arch",
    trailBlurb: "The Gateway Crypt. The Archkeeper holds the heartland’s first true key.",
  },
  "kansas-city": {
    line: "Hooks and slow blood-mud. The yards still sort living freight.",
    trailTitle: "Charnel Tickets",
    trailBlurb: "Stockyard Charnel. The Butcher-Bishop keeps Voss’s midwest cuts.",
  },
  omaha: {
    line: "Live couplings. Do not stand on the rail he used to leave town.",
    trailTitle: "Rust Express",
    trailBlurb: "Rail Yard of Rust. The Locomotive Revenant is the last train Voss boarded east of Denver.",
  },
  denver: {
    line: "Thin air. Every leap costs more — the circuit likes you tired.",
    trailTitle: "Mile-High Ink",
    trailBlurb: "Mile-High Necropolis. The Thin-Air Lich writes at altitude so the ink never dries.",
  },
  "oklahoma-city": {
    line: "Dust so thick the boss is a rumor. So is Voss.",
    trailTitle: "Bowl of Names",
    trailBlurb: "The Dust Bowl Barrow. The Storm Caller hides the next three cities in weather.",
  },
  dallas: {
    line: "Oil fire in a pit. The heartland’s money still burns for him.",
    trailTitle: "Black Gold Page",
    trailBlurb: "The Derrick Pit. Put the Black Gold Elemental out. Voss paid this gate in crude.",
  },
  houston: {
    line: "Bayou water in a concrete throat. Something older than oil lives there.",
    trailTitle: "Bayou Bunker",
    trailBlurb: "Flooded Bayou Bunker. The Gator-King ate a courier. Check the teeth for a map scrap.",
  },
  "san-antonio": {
    line: "A siege bell that drops the knees. The mission still holds.",
    trailTitle: "Siege Note",
    trailBlurb: "Mission Bell Tower. The Siege Colonel rings the heartland’s last bronze.",
  },
  austin: {
    line: "Act II. The air is wings. The courier flock comes home.",
    trailTitle: "Act II — Ten Thousand Wings",
    trailBlurb: "Bat Bridge Caverns. Beat the Mother and the Grain Circuit writes itself into the Codex.",
  },
  "new-orleans": {
    line: "Tombs stacked like a second city. The mask is the password.",
    trailTitle: "Above-Ground",
    trailBlurb: "Tomb Maze. The Masked Baron opens the South. Do not take the mask off.",
  },
  memphis: {
    line: "A black pyramid under the river city. The delta keeps its pharaohs.",
    trailTitle: "Delta Vault",
    trailBlurb: "The Pyramid Vault. The Pharaoh of the Delta is a southern lock, not a king.",
  },
  nashville: {
    line: "A downbeat that stuns the room. The opera house learned a worse score.",
    trailTitle: "Silent Downbeat",
    trailBlurb: "The Silent Opera House. Stop the Conductor before the South sings Banner’s pulse.",
  },
  atlanta: {
    line: "Ash in the tunnels. The undercity still remembers a burn.",
    trailTitle: "Ash Rail",
    trailBlurb: "Undercity Rail Vaults. The Ash Warden is how the South hides a retreat.",
  },
  charlotte: {
    line: "Pressed metal and jumping current. Someone minted a false Banner.",
    trailTitle: "The Mint Below",
    trailBlurb: "Coin Golem. Smash the press. Voss tried to stamp a spare civilian.",
  },
  richmond: {
    line: "Hot iron and powder. The cannonry never stood down.",
    trailTitle: "Ironworks",
    trailBlurb: "Ironworks Cannonry. The Cannon Priest blesses the South’s last old war.",
  },
  raleigh: {
    line: "Roots that hold a titan still. The oaks were planted on purpose.",
    trailTitle: "Oak Hollow",
    trailBlurb: "The Oak Hollow. The Root Matriarch is a living snare. Cut through.",
  },
  miami: {
    line: "A lobby under the tide. The concierge still has his list.",
    trailTitle: "Sunken Desk",
    trailBlurb: "Sunken Art Deco Hotel. The Tidal Concierge checked Voss in. Check him out.",
  },
  tampa: {
    line: "Brackish cistern, old flags. Pirates kept one honest map.",
    trailTitle: "Cistern Colors",
    trailBlurb: "The Pirate Cistern. Gasparilla’s ghost still salutes the wrong flag.",
  },
  orlando: {
    line: "Act III. The boss hits from two rooms. Do not trust the glass.",
    trailTitle: "Act III — Mirror-Twin",
    trailBlurb: "Hall of Mirrors Manor. Beat the Twin. The South writes a Codex page in glass.",
  },
  jacksonville: {
    line: "A brick fort that never drained. The cut west starts in leftover water.",
    trailTitle: "Fort Left Behind",
    trailBlurb: "Fort of the Drowned. Tide Warden. Act IV’s first decoy — Voss wanted you looking south.",
  },
  birmingham: {
    line: "The statue’s basement still burns. Iron remembers the pour.",
    trailTitle: "Vulcan’s Floor",
    trailBlurb: "Vulcan’s Forge. The Iron Titan is a decoy gate with a real fist.",
  },
  louisville: {
    line: "Fumes that go to the head. The barrels were never only whiskey.",
    trailTitle: "Catacomb Mash",
    trailBlurb: "Distillery Catacombs. The Barrel Wraith is how the cut west gets you lost.",
  },
  indianapolis: {
    line: "A track that never stops. He is already the next lap.",
    trailTitle: "Endless Lap",
    trailBlurb: "The Speedway Crypt. The Endless Racer is Voss’s joke: you cannot catch a man who never pits.",
  },
  columbus: {
    line: "Shelves that swallow lamps. The archive filed him under gone.",
    trailTitle: "Ash Archive",
    trailBlurb: "The Archive Below. The Librarian of Ash mis-shelved the desert map on purpose.",
  },
  cincinnati: {
    line: "Two tunnels, one bite. Pick wrong and the west waits longer.",
    trailTitle: "Twin-Tunnel",
    trailBlurb: "The Abandoned Subway. Beat the Hydra. After this, the trail stops pretending it is still the South.",
  },
  "las-vegas": {
    line: "Night only. The house is a gate. Voss left a chip on the felt.",
    trailTitle: "The House After Dark",
    trailBlurb: "Vegas at night. Clear The House Always Wins. The Dealer plays for the last ten names.",
  },
  phoenix: {
    line: "Noon that never ends. The temple wants you cooked before the salt.",
    trailTitle: "Sun Temple",
    trailBlurb: "The Sun Temple. Ash Phoenix. The desert starts telling the truth.",
  },
  albuquerque: {
    line: "Wind that shoves a titan sideways. The sky has a marshal.",
    trailTitle: "Balloon Grave",
    trailBlurb: "The Balloon Graveyard. The Sky Marshal directs traffic Voss already left.",
  },
  "salt-lake-city": {
    line: "Act IV. Salt that eats the skin and keeps a pulse forever.",
    trailTitle: "Act IV — Brine Prophet",
    trailBlurb: "Salt Flats Barrow. Beat the Brine Prophet. The desert writes House Odds into the Codex.",
  },
  seattle: {
    line: "Act I. Streets under streets, always wet. The giants open in the rain.",
    trailTitle: "Act I — Rain Under",
    trailBlurb: "The Underground City. Beat the Drowned Rainlord and the Big Five writes a Codex page.",
  },
  portland: {
    line: "Roses with a grip. The garden was planted as a maze.",
    trailTitle: "Rose Grip",
    trailBlurb: "Rose Garden Labyrinth. The Thorn Queen holds the northwest key.",
  },
  "san-francisco": {
    line: "Fog so thick the warden is a wall. The rock never released him.",
    trailTitle: "Fog Rock",
    trailBlurb: "Fog Rock Prison. Warden Eternal. Voss served no time. The door still thinks he might.",
  },
  oakland: {
    line: "A crane that learned to swing back. The docks kept a colossus.",
    trailTitle: "Crane Colossus",
    trailBlurb: "Beat the Crane Golem. The west’s freight still answers to a dead shift.",
  },
  "san-jose": {
    line: "A hive that thinks in volts. Someone taught a city to count pulses.",
    trailTitle: "Silicon Hive",
    trailBlurb: "The Silicon Hive. The Machine Mind has Banner’s waveform on file.",
  },
  sacramento: {
    line: "A claim that never closed. Gold was never the point.",
    trailTitle: "Open Claim",
    trailBlurb: "Gold Rush Mine. The Claim-Jumper Lich still files on the last ten acres.",
  },
  "san-diego": {
    line: "Kelp that binds the knees. The cathedral is older than the navy.",
    trailTitle: "Kelp Nave",
    trailBlurb: "The Kelp Cathedral. The Leviathan Bishop blesses the Pacific door.",
  },
  "los-angeles": {
    line: "Tar that holds a leap. The pits kept a queen older than film.",
    trailTitle: "Tar Queen",
    trailBlurb: "The Tar Pits. The Saber-Wraith Matriarch is the mainland’s last heavy lock.",
  },
  honolulu: {
    line: "A throat of the mountain. Fire that does not care who designed it.",
    trailTitle: "Volcanic Throat",
    trailBlurb: "Clear the Throat. The Fire Goddess’s Shade is the last warm gate before ice.",
  },
  anchorage: {
    line: "Ice at the last big town on the rim. The roster still has names after this.",
    trailTitle: "Glacier Light",
    trailBlurb: "Glacier of the Last Gate. The World-Ender is a heavy lock, not the last page. Keep walking.",
  },
  "virginia-beach": {
    line: "A boardwalk that never drained. The clerk still has the tide chart.",
    trailTitle: "Neptune Desk",
    trailBlurb: "Boardwalk Cistern. The Tide Clerk checked Voss in on the oceanfront.",
  },
  wichita: {
    line: "Hangars that swallow a leap. Aerospace kept a barrow under the prairie.",
    trailTitle: "Hangar Barrow",
    trailBlurb: "Airfield Barrow. The Hangar Wight still files a flight plan with one empty seat.",
  },
  newark: {
    line: "Live couplings in the yard throat. Manhattan watches from across the water.",
    trailTitle: "Yard Throat",
    trailBlurb: "Shut the Yard Throat. The Coupler King punches the clock Voss set on Broad Street.",
  },
  boise: {
    line: "Black rock under the greenbelt. The foothills already know the name.",
    trailTitle: "Basalt Cut",
    trailBlurb: "Basalt Vault. River Stone is how the roster says hello to the interior west.",
  },
  "des-moines": {
    line: "A dome that files names in the dark. Skywalks hide the crawl.",
    trailTitle: "Gold Dome Crawl",
    trailBlurb: "Capitol Crawl. The Dome Keeper mis-shelved the next ten cities on purpose.",
  },
  "little-rock": {
    line: "The river market still rings a siege bell. Yellow bridges remember.",
    trailTitle: "Bridge Bell",
    trailBlurb: "River Market Crypt. The Bridge Bell is the Arkansas lock. Cross it.",
  },
  "sioux-falls": {
    line: "Spray that hides a stair into the rock. Quartzite keeps a pulse.",
    trailTitle: "Falls Stair",
    trailBlurb: "Falls Crypt. The Spray Saint blesses the prairie door.",
  },
  providence: {
    line: "A cove bell that knocks the air out of you. Three rivers, one lock.",
    trailTitle: "Bay Bell",
    trailBlurb: "Bay Bell. The Cove Warden rings the smallest state’s biggest room.",
  },
  "charleston-sc": {
    line: "The Battery never gave the water back. Pastel houses, a real fort.",
    trailTitle: "Battery Water",
    trailBlurb: "Battery Cistern. The Tide Deacon holds the South Carolina key — not the West Virginia one.",
  },
  bridgeport: {
    line: "Act IV. A harbor pit under the arena lights. The Sound has a warden.",
    trailTitle: "Act IV — Sound Warden",
    trailBlurb: "Harbor Arena Pit. Beat the Sound Warden. The small giants write the last Codex page’s setup.",
  },
  fargo: {
    line: "A lot that never thawed. The prairie sky is the other wall.",
    trailTitle: "Frozen Lot",
    trailBlurb: "Frozen Lot. The Grain Ghost is Act V’s first ice.",
  },
  "jackson-ms": {
    line: "Marble that cooks at noon. The Pearl keeps a fan in the dome.",
    trailTitle: "Capitol Heat",
    trailBlurb: "Capitol Heat. The Marble Fan is a southern lock with a real fist.",
  },
  billings: {
    line: "Rimrock that shoves the leap sideways. The town sits under a stone wall.",
    trailTitle: "Rimrock Cut",
    trailBlurb: "Rimrock Cut. The Cliff Bell tests who can walk in the wind.",
  },
  "manchester-nh": {
    line: "A mill race that still turns. Brick chimneys keep the pulse.",
    trailTitle: "Mill Race",
    trailBlurb: "Mill Race. The Loom Shade is how New Hampshire hides a gate in the Merrimack.",
  },
  wilmington: {
    line: "A slip that never let the river go. The pilot still calls the hole.",
    trailTitle: "River Slip",
    trailBlurb: "River Slip. Pilot Shade. Delaware’s lock is a dock, not a capital.",
  },
  "portland-me": {
    line: "Fog so thick the horn is a wall. This is not the Oregon rose city.",
    trailTitle: "Head Light",
    trailBlurb: "Head Light. The Fog Horn is Maine’s Portland — unique id, unique door.",
  },
  cheyenne: {
    line: "A depot that howls on purpose. Wind is the other lock.",
    trailTitle: "Wind Depot",
    trailBlurb: "Wind Depot. The Prairie Horn is Wyoming’s biggest room.",
  },
  "charleston-wv": {
    line: "A nave cut into the seam. This is not the Battery city.",
    trailTitle: "Coal Nave",
    trailBlurb: "Coal Nave. The Seam Priest holds the West Virginia key — not the South Carolina one.",
  },
  burlington: {
    line: "Roots that hold a titan at the lake. The marketplace still knows the walk.",
    trailTitle: "Lakeside Root",
    trailBlurb: "Lakeside Root. The Green Marshal directs traffic Voss already left.",
  },
  huntsville: {
    line: "Last gate. Redstone cellars. The range still tracks a name.",
    trailTitle: "Act V — Range Warden",
    trailBlurb: "Rocket Cellar. End the Range Warden. Voss’s door. Banner’s name. Close the book.",
  },
};

export const VEGAS_NIGHT_LINE =
  "Las Vegas after dark. The strip is a fuse. Voss left a chip on the felt — ten names, last ten cities. The house is still open.";

export const RECOGNIZE_LINES = [
  "A local, quiet: \"You're that scientist. The one from the papers.\"",
  "Someone on the curb: \"Banner. They said you left science.\"",
  "A cart vendor stops pouring. \"I know that face. You shouldn't be on a bus.\"",
];

export function actForOrder(order: number): ActId {
  return Math.min(5, Math.max(1, Math.ceil(order / 10))) as ActId;
}

export function actDef(id: ActId): ActDef {
  return ACTS[id - 1]!;
}

export function cityStory(id: string): CityStory {
  return (
    CITY_STORY[id] ?? {
      line: "Another gate on the chain.",
      trailTitle: "Next Gate",
      trailBlurb: "Clear the capital dungeon. Voss is still west.",
    }
  );
}

export function storyObjectiveId(cityId: string): string {
  const special: Record<string, string> = {
    "new-york": "ledger-open",
    milwaukee: "fermenter",
    austin: "ten-thousand",
    orlando: "mirror-twin",
    "salt-lake-city": "brine",
    anchorage: "last-gate",
  };
  return special[cityId] ?? `trail-${cityId}`;
}

export function codexUnlocked(save: SaveData, act: ActId): boolean {
  return (save.codexPages ?? []).includes(act);
}

export function unlockCodex(save: SaveData, act: ActId): CodexPage | null {
  if (!save.codexPages) save.codexPages = [];
  if (save.codexPages.includes(act)) return null;
  save.codexPages.push(act);
  return CODEX[act - 1] ?? null;
}

export function recognizeLine(seed: number): string {
  return RECOGNIZE_LINES[Math.abs(seed) % RECOGNIZE_LINES.length]!;
}
