# Crime Wave & Kaiju Pit (Titan Streets)

Original World Breaker / Gamma-crime content. **No GTA Online / Rockstar missions, characters, heist names, or dialogue.**

## How to play

### Crime Wave board
1. From pause / quests UI, open the **Crime Wave** board (same flow as quests: Overlay `onOpenQuests`, or pause → Quests).
2. Cards show contact, archetype, smash cash / XP, and a Rage/Gamma hint.
3. **Take job** → accept tracks via `activeQuestId` / `questProgress` (shared with existing QuestSystem save fields).
4. HUD mission line prefers active Crime Wave jobs (`CrimeWaveBoard.missionLine`).
5. Map pins: active beacons + **Ash Flats Bus Gate** on NY.

Archetypes: `smashGrab`, `escort`, `convoySmash`, `rooftopRace`, `gammaDelivery`, `turfClear`, `bounty`, `heistSetup`, `heistFinale`, `freemodeEvent`, `desertWar`.

### Desert warzone (Ash Flats)
- **Not** Origin / Gamma Bomb comic sand.
- Comic proximity auto-enter stays **DISABLED** (`Game.ts`: do NOT auto-enter comics).
- From NY: walk to **Ash Flats Bus Gate** pin → **H** to board (intentional travel).
- Or accept Crime Wave `Bus to Ash Flats` / travel to `ash-flats`.
- Fight sandbox waves; **H** at gate returns to NY.

### Kaiju Pit
- Side-camera arena (fighting-game fantasy; **no MK IP names**).
- Enter from desert **kaiju encounter** beacon → **H**.
- Rounds, health bars, specials from **Rage/Gamma**, block/combo stubs.
- Finish name: **Worldbreaker Seal**.
- **H** exits back to Ash Flats open world.

## Controls (unchanged)
- **Arrows** move · **WASD** look · **Enter** smash · **Space** leap · **H** interact · **R** titan · **M** map · Esc menus.
- Kaiju Pit: Enter = attack / seal finish; H = block stub / exit when done.

## Contact list summary (56)

| Archetype | Count | Sample contacts |
|-----------|------:|-----------------|
| smashGrab | 5 | Noxie Vale, Brick Delaney, Captain Rill |
| escort | 5 | Dr. Solene Hart, Nurse Keel, Aide Primm |
| convoySmash | 5 | Warden Kesh, Tessa Span, Rook Ash |
| rooftopRace | 5 | Slip Marrow, Gale Prynne, Byte Cord |
| gammaDelivery | 5 | Quill Amber, Doc Riven, Mina Drift |
| turfClear | 5 | Sergeant Vale, Iron Sable, Captain Lumen |
| bounty | 5 | Broker Nyx marks (Reed, Coil, Bishop, Current, Static) |
| heistSetup | 5 | Planner Orth, Byte Cord, Pilot Wren |
| heistFinale | 5 | Gamma Reserve, Choir Treasury, Lodestone Foundry… |
| freemodeEvent | 6 | City Feed / Watch / Capacitor events |
| desertWar | 5 | Driver Cobb, Major Flint, Scout Yara… |

Full definitions: `src/data/crimeWave.ts`.

## Files
- `src/data/crimeWave.ts`
- `src/systems/CrimeWaveBoard.ts`
- `src/systems/DesertWarzone.ts`
- `src/systems/KaijuPit.ts`
- `patches/GAME_CRIME_WAVE_WIRE.md` — surgical Game.ts / Overlay hooks

## Constraints honored
- Additive only · GRID stays 7 · no MeshPhysical transmission/thickness · CameraRig collision untouched · Freeze/Low floor untouched · product name **Titan Streets**.
