# Titan Streets — Unreal port inventory

Browser smash is the live product (Vite + TypeScript + Three.js). Unity 6 / Unreal PDFs are **reference only**. Port every system below; do not strip. App name stays **Titan Streets**.

Live play: `http://127.0.0.1:5473/#play` — DROP IN is World Breaker on New York Maps overlay.

JSON packs for ingest: `/opt/cursor/artifacts/ue-port-data/`  
Source tarball: `/opt/cursor/artifacts/titan-streets-src.tgz`  
Exporter: `npm run export:ue` (`scripts/export-ue-port-data.mjs`) dumps live TS tables — do not hand-copy.

Packs: `cities_71.json`, `anger_loop.json`, `controls.json`, `bosses.json`, `smash_economy.json`, `forms.json`, plus `dungeons.json`, `missions_vol2.json`, `ny_bestiary.json`, `manifest.json`. Palettes and form colors are `#rrggbb`. Ids are unchanged.

Status: **DONE** = playable in the browser build. **PARTIAL** = stubbed, data-only, or missing art. **UNSHIPPED** = present on disk, not in the live game (do not port unless Ces asks).

---

## Boot / loop

| System | Status | Paths |
| --- | --- | --- |
| Entry + canvas | DONE | `src/main.ts`, `index.html`, `src/style.css` |
| Game loop, screens, DROP IN | DONE | `src/game/Game.ts` |
| Save `titan-streets-save-v2` | DONE | `src/save/SaveGame.ts`, `src/data/types.ts` (`SaveData`) |
| Shared types | DONE | `src/data/types.ts` |

DROP IN (`Game.dropIntoStreets`) loads `new-york`, forces World Breaker, hides hub placeholders, hashes `#play`. Continue / New / Hub rail all hit that path.

---

## Cities / travel map

| System | Status | Paths |
| --- | --- | --- |
| 50 largest-per-state unlock chain (1 NY → 50 Huntsville) | DONE | `src/data/cities.ts` (`CITIES`, `nextCity`) |
| 71 Sanctuary downtowns kept (Austin, Miami, DC, …) | DONE | `src/data/cities.ts` (`SANCTUARY_IDS`, `EXTRA_CITIES`, `TRAVEL_CITIES`) |
| Map shells 73 (71 + Charleston SC + Bridgeport) | DONE | `src/data/cities.ts` (`MAP_HUBS`) |
| Unique Portland OR/ME, Charleston SC/WV | DONE | ids `portland` / `portland-me`, `charleston-sc` / `charleston-wv` |
| Districts, palettes, named streets, landmarks | DONE | `src/data/cityShells.ts` |
| Act bands + Codex + intro | DONE | `src/data/story.ts` |
| City refs (Google Map/Sat/SV/Terrain = **notes only**) | DONE | `Docs/CityRefs/` — never scrape/ship Google tiles |
| OSM 3D packs (NY, Boston, Philly, DC) | PARTIAL | `public/maps/*.json`, `scripts/fetch-osm.mjs`, `src/world/streetPack.ts` |
| Named geoStub for other downtowns | DONE | `src/world/streetPack.ts` `geoStub()` |

Campaign unlocks sequential. Extras are map-selectable and drop-in playable; they do **not** advance the 50-chain.

---

## Maps overlay (playfield)

| System | Status | Paths |
| --- | --- | --- |
| Google Maps JS 2D backdrop (Road / Satellite) | DONE if key | `src/ui/playfieldMap.ts`, `src/ui/googleBasemap.ts`, `.env.example` (`VITE_GOOGLE_MAPS_API_KEY`) |
| Missing-key NY curb stub + yellow banner | DONE | `src/game/Game.ts` `loadCity` maps-lite |
| Full map M + pins + legend + filters | DONE | `src/systems/MapAtlas.ts`, `src/systems/Minimap.ts`, Overlay map screen |
| Heavy OSM CityWorld mesh | PARTIAL / opt-in | `src/world/cityPath.ts` (`VITE_CITY_MESH=1`), `src/world/CityWorld.ts` |
| Chunk streaming | DONE | `src/systems/ChunkStreamer.ts`, `src/world/streaming.ts`, `STREAMING.md` |
| Weather (Open-Meteo) | PARTIAL | `src/systems/Weather.ts` |
| Themes / palettes | DONE | `src/world/themes.ts` |

Google is **2D Maps JS only**. Never scrape or cook tiles into Unreal. OSM Overpass is the allowed 3D street path.

---

## Hulk / World Breaker / forms

| System | Status | Paths |
| --- | --- | --- |
| World Breaker default titan | DONE | `src/data/hulkForms.ts`, `Docs/DEFAULT_HULK_WORLD_BREAKER.md`, `src/player/Hulk.ts` `dropInWorldBreaker` |
| Forms: WB / Fixit / Red / Immortal / Maestro / Feral / Hell / Cosmic / Bruce / Mephisto / Iron Strange | DONE kits | `src/data/hulkForms.ts`, Overlay form radial (0 tap / hold) |
| Procedural HD CGI mesh (no Marvel assets) | DONE / PARTIAL scan | `src/player/Hulk.ts`, `src/player/characterLook.ts`, `LOOK.md` |
| Form unlocks via Rage Rep + Kill/Spare | DONE | `src/data/smashEconomy.ts` `formUnlocked` |
| BalanceProfile Legacy vs Worldbreaker_v1 | DONE toggle, PARTIAL PDF tables | `src/data/balance.ts` |

Savage id aliases to World Breaker. Savage is not a weaker starter.

---

## Anger Loop (Rage / Gamma)

| System | Status | Paths |
| --- | --- | --- |
| Rage + Gamma meters, tiers, bands | DONE | `src/data/meters.ts` |
| Bruce window (Gamma < 20), Locked 50–79, Overcharged 80–99, Meltdown 100 | DONE | `src/data/meters.ts` `gammaBand`, `formSwitchAllowed` |
| Decay, splash, heat, leap-per-100m | DONE | `src/data/meters.ts` `METERS` |
| HUD chips BREAKER / RAGE / GAMMA | DONE | `src/ui/Overlay.ts`, `src/game/Game.ts` |

---

## Controls (Keyboard_Only)

| System | Status | Paths |
| --- | --- | --- |
| Arrows = move, WASD = look (**S is never reverse**, A is not strafe) | DONE | `src/input/Input.ts` `DEFAULT_BINDS` |
| Enter smash, Space leap, Right Ctrl sprint | DONE | `src/input/Input.ts` |
| Feel Default / Relaxed / Tight | DONE | `src/input/ControlFeel.ts` |
| Specials 1–9, Form 0, Banner R, Map M, Interact H | DONE | `src/input/Input.ts` `SPECIALS` |
| Gamepad (optional) | PARTIAL | `src/input/Input.ts` `gamepadOn` |
| Camera SPEC-A (FOV 72/84/95, right-biased) | DONE | `src/systems/CameraRig.ts` |

---

## Smash$ / Wanted / districts

| System | Status | Paths |
| --- | --- | --- |
| DAMAGE$ ledger (not a shop) | DONE | `src/data/smashEconomy.ts` `SMASH`, `src/systems/SmashEconomy.ts` |
| Wanted 1–5 (NYPD → SWAT → Hulkbusters → Gamma cannons → Red Hulk / Abomination) | DONE | `src/data/smashEconomy.ts` `WANTED_TIERS` |
| Rage Rep from DAMAGE$/50 | DONE | `rageRepFromDamage` |
| Rep unlocks (Heroes / Fixit / Warrens / Red / Immortal / Maestro / powers) | DONE | `REP_UNLOCKS` |
| Skyline Heroes / Iron Warrens gates | DONE | `src/data/districts.ts` |
| Street crimes | DONE | `src/systems/CrimeSystem.ts`, `src/data/types.ts` `CrimeKind` |
| Heat packs (capped, skip when FrameGuard overloaded) | DONE | `CrimeSystem.dispatchHeat` |

---

## Bosses / Kill-Spare / Razorback

| System | Status | Paths |
| --- | --- | --- |
| Capital dungeon bosses + debug roster | DONE | `src/systems/BossFight.ts`, `src/data/capitalBosses.ts`, `data/CAPITAL_BOSS_ROSTER.json`, `Docs/CAPITAL_BOSS_ROSTER.md` |
| NY TBD stub, LA Toad #70, Chicago Stilt-Man #69, Houston Leap-Frog #68, Anchorage Beyonder #01 | DONE data | roster JSON |
| Kill / Spare modal; 37 kills → Hell+Mephisto; 37 spares → Cosmic+Iron Strange | DONE | `src/data/bossFate.ts`, `Docs/BOSS_SPARE_KILL_UNLOCKS.md` |
| Post-boss beats | PARTIAL | NY Razorback DONE; cities 2+ toast stubs |
| Razorback rivalry (NY after first capital) | DONE | `src/systems/Razorback.ts`, `src/data/razorback.ts` |
| Dungeon run (dimetric fog box, hazards, zombies) | DONE | `src/systems/DungeonRun.ts`, `src/systems/ZombiePack.ts` |

---

## Bestiary / comics / lore

| System | Status | Paths |
| --- | --- | --- |
| NY 50 named street originals | DONE | `src/data/ny-bestiary.json`, `src/data/bestiary.ts` |
| Other cities: 50 seeded civic rosters (`bestiaryPrefix`) | DONE | `src/data/bestiary.ts` `rosterForCity` |
| Catch / party of 3 / dungeon fights / 3 stages | DONE | `src/systems/BestiarySystem.ts` |
| Comic curb pickups + vignettes | DONE | `src/systems/ComicSystem.ts`, `src/data/comics.ts` |
| Lore contacts hail Hulk (H to talk) | DONE | `src/systems/LoreContacts.ts` |

No Pokémon IP. Untracked poke files must **not** ship.

---

## Vol2 missions / objectives / quests / jobs

| System | Status | Paths |
| --- | --- | --- |
| Vol2 45 mission beat stubs (ADD) | DONE data | `src/data/missionBeats.ts` |
| Story + side objectives (~62) | DONE | `src/data/objectives.ts` |
| Quest board | DONE | `src/data/quests.ts`, `src/systems/QuestSystem.ts` |
| Banner life: hunger / energy / mood / jobs | DONE | `src/systems/BannerLife.ts`, `src/data/jobs.ts` |
| Skill trees Smash / Gamma / Mind | DONE | `src/data/skills.ts` |
| Neighborhood kiosks (diner, jobs, walk-up) | DONE | `src/systems/NeighborhoodSystem.ts` |

---

## Combat extras

| System | Status | Paths |
| --- | --- | --- |
| Fight styles (brawl / boxing / karate / judo / jiujitsu) | DONE | `src/data/styles.ts` |
| Borrowed powers Omega / Vengeance / Will / King + Banner gadgets 1–9 | DONE | `src/data/powers.ts`, `src/systems/Powers.ts` |
| Enemy AI LOD | DONE | `src/systems/EnemyDirector.ts`, `src/data/approach.ts` |
| Census crowd density | DONE | `src/data/census.ts`, `src/systems/CrowdSystem.ts` |
| Traffic | DONE | `src/systems/Traffic.ts` |

---

## HUD / audio / look / freeze net

| System | Status | Paths |
| --- | --- | --- |
| Overlay: title, intro, play HUD, pause, map, skills, quests, bestiary, codex, bosses, settings, help | DONE | `src/ui/Overlay.ts` |
| Left rail Hub / Smack / Jump&Pound | DONE | Overlay + `Game.onStreetAction` |
| Audio bus | DONE / PARTIAL SFX | `src/audio/AudioBus.ts` |
| Smash VFX + debris pools | DONE | `src/systems/SmashFx.ts`, `src/systems/DebrisPool.ts` |
| Post stack (grade/bloom/SSAO) gated by Quality | DONE | `src/systems/PostStack.ts`, `LOOK.md` |
| Quality Low default + FrameGuard | DONE | `src/systems/Quality.ts`, `PERFORMANCE.md` |
| Procedural textures | DONE | `src/world/textures.ts` |

Default Quality **Low** (0.70 scale, no post, 220 m load). FrameGuard: 30 frames > 18 ms → drop scale 10%, floor 70%, skip debris, 1 chunk op/frame.

---

## Controls / balance rules that must survive the port

- **S is never reverse. A is not strafe.** Smash is **Enter**.
- World Breaker is default titan, not an upgrade.
- BalanceProfile **Legacy** default.
- Keyboard_Only: Arrows move, WASD look.
- ADDITIVE: do not strip Vol2 45, Kill/Spare, capital roster, extras, Anger Loop.
- Do not rename the live app off Titan Streets.
- No Google tile scrape. OSM OK for 3D streets.

---

## UNSHIPPED (do not ingest unless Ces asks)

| Tree | Why |
| --- | --- |
| `src/holt/` | Untracked Crown Borough / Holt kit — not the live smash loop |
| `src/data/pokedex.ts`, `pokeMeta.ts`, `src/systems/PokeSystem.ts` | Untracked; Pokémon-shaped; never commit |

---

## Suggested Unreal module map

| UE module | Browser source |
| --- | --- |
| `TsGameMode` / `TsPlayerController` | `src/game/Game.ts`, `src/input/Input.ts` |
| `TsHulkPawn` | `src/player/Hulk.ts` |
| `TsAngerLoop` | `src/data/meters.ts` |
| `TsSmashWanted` | `src/data/smashEconomy.ts` |
| `TsCitySubsystem` | `src/data/cities.ts`, `cityShells.ts` |
| `TsMapsOverlay` | `playfieldMap.ts` (Maps JS) + Cesces tileset, **not** cooked Google |
| `TsDungeon` | `DungeonRun.ts`, `BossFight.ts`, `bossFate.ts` |
| `TsBestiary` | `bestiary.ts` |
| `TsRazorback` | `Razorback.ts` |
| `TsHud` | `Overlay.ts` (rebuild in UMG) |
| `TsFrameGuard` | `Quality.ts` |

Ingest JSON from `ue-port-data/` first; then reimplement loop/feel in C++ / Blueprints to match Keyboard_Only.
