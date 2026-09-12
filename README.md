# Titan Streets

A single-player browser game. **DROP IN** puts **World Breaker Hulk** on the **New York** play path immediately — Google Maps Midtown under a transparent Three.js overlay (saturated green + bright red radiance, HD CGI materials). Hub / Smack / Jump&Pound on the left rail hit that same scene (Arrows move, WASD look, Enter smash, Space leap). After NY, the next city is **Los Angeles (Toad)**. Capital bosses stay on the debug picker. Fifty states run **1 New York → 50 Huntsville**.

Built with **Vite + TypeScript + Three.js**. Original procedural art only. No Pokémon IP. No official Marvel assets.

**Playable streets are Google Maps.** Drop-in uses the official Maps JavaScript API as the live city backdrop. If the Maps key is missing, a yellow banner says so and a NY curb stub stays playable — never a grey placeholder robot as the game. Heavy OSM `CityWorld` mesh is opt-in (`VITE_CITY_MESH=1` or Settings). **71 Sanctuary downtowns stay** (Austin, Miami, DC, Dallas, the Bay, Hartford, Tulsa…). Charleston SC + Bridgeport sit on the 50-state chain, so the travel map lists **73 shells**. No tile scrape.

**Fifty real US cities (not a fictional Meridian).** Travel map is the **largest city in each US state**, Ces-canonical unlock **1 New York … 50 Huntsville**. Unique ids for **Portland, OR** / **Portland, ME** and **Charleston, SC** / **Charleston, WV**. Each city has real downtown bones (named avenues, districts, landmark silhouette), a unique palette, a capital dungeon, and a 50-entry street bestiary. NY is playable first; cities 2–50 are selectable shells (preview unlocked, drop-in gated). Private geography notes live in `Docs/CityRefs/` — Google Map / Satellite / Street View / Terrain are **reference only**, never scraped.

**Hero look.** World Breaker is the default titan: saturated green MeshPhysical skin with bright red corona that scales with Rage and Gamma. Fixit / Red / Immortal / Maestro stay distinct palettes at the same physical-material bar. Bruce is an original photoreal human, not a likeness. See `LOOK.md`.

City-proper **Census 2023** population is the HUD number (New York is 8.26 million). Sidewalk walkers are a nearby InstancedMesh slice (about a dozen to forty people, density-scaled) — never one mesh per resident. Traffic count follows the same density table. Comic issues on the curb are large lime beacons you can walk into. After the first transform, original-named era contacts (Mira Voss, Kesh Reed, Dorian Vale, Wren Hollow, Scout Bramble) walk up and hail the titan — **H** to talk. No borrowed comic dialogue.

Street data © [OpenStreetMap](https://www.openstreetmap.org/copyright) contributors still backs the optional 3D mesh path and the minimap graph. Google tiles are Maps JS only.

Graphics stay on this engine: 100 m chunk streaming (`STREAMING.md`), dynamic resolution, and a quality menu (`PERFORMANCE.md`, `LOOK.md`). Pause → Settings → Quality. **Default is Low** (snappy freeze net). FrameGuard drops render scale 10% after **30 frames over 18 ms**, floor **70%**, and shrinks stream load **300 → 220 m**. Street chase camera is third-person, character slightly right, FOV 72 idle / 84 sprint / 95 leap. Day lighting is warm (~5200K) with aerial haze; glass and asphalt pick up cheap specular. HUD fades when you stand still; HP bars return when you take a hit. Dungeons stay a readable dimetric fog box with a lamp on the player — not the photoreal street look. Raise Quality to Medium/High only when fps sits near 60.

## Run locally

```bash
npm install
cp .env.example .env   # then paste VITE_GOOGLE_MAPS_API_KEY=… (see Google Map tiles)
npm run dev
```

Open the URL Vite prints (defaults to **http://localhost:47331**). Vite must be restarted after changing `.env`.

**After DROP IN / Continue** the play scene is:

`http://127.0.0.1:47331/#play`

Same origin, hash route — not a separate `/play` page. Bookmark `#play` to skip the title sheet. Hub / Smack / Jump&Pound stay on the left rail in that scene.

```bash
npm run build
npm run preview
```

Save key: `titan-streets-save-v2`.

## Unreal port export

Browser smash stays the live game. For a UE ingest, see `Docs/UE_PORT_INVENTORY.md` (every shipped/partial system + paths). Dump live tables:

```bash
npm run export:ue
# writes /opt/cursor/artifacts/ue-port-data/*.json
```

Packs: cities (71 Sanctuary / 50 campaign / 23 extras), Anger Loop, Keyboard_Only binds, capital bosses + kill/spare, smash$ / Wanted, World Breaker forms. Source tarball (no `node_modules`): `/opt/cursor/artifacts/titan-streets-src.tgz`.

## Google Map tiles (2D map only)

Official [Maps JavaScript API](https://developers.google.com/maps/documentation/javascript) tiles on the full map (**M**). **Road / Satellite** on the toolbar. The same objective pins, click-to-track, dashed route, and legend sit on top. The circular minimap stays the cheap OSM radar; a **Google · M** chip means tiles are available on **M**.

**3D streets stay OSM.** Google is never used to build or scrape the playable world. Layout fidelity starts from Map + Satellite + Street View (+ Terrain where hills matter) in a browser — notes only, under `Docs/CityRefs/<slug>/`. Never commit those tiles.

The game reads **`import.meta.env.VITE_GOOGLE_MAPS_API_KEY`**. If that value is missing, empty, or the Maps script fails (including **BillingNotEnabled** / `gm_authFailure`), the Google layer is torn down and the map keeps the OSM/canvas fallback — no “Do you own this website?” dialog on the playable map.

### Local play — paste the key into `.env`

Do not commit the key. `.env` is gitignored.

```bash
cp .env.example .env
```

Open `.env` and paste your key on the single assignment line (no quotes, no spaces around `=`):

```
VITE_GOOGLE_MAPS_API_KEY=
```

After the `=` put the key from Google Cloud. Save the file. Restart Vite (`npm run dev`) — env is read at process start.

```bash
npm run dev
```

Drop in on New York and press **M**. You should see Midtown roadmap under the pins. **Satellite** switches to hybrid aerial. Without a key you still get OSM polylines.

### Google Cloud

1. Open [Google Cloud Console](https://console.cloud.google.com/) and create (or pick) a project.
2. **APIs & Services → Library** — enable **Maps JavaScript API**.
3. **APIs & Services → Credentials** — create an **API key**.
4. Restrict the key:
   - **API restriction:** Maps JavaScript API only.
   - **Application restriction:** HTTP referrers. Local: `http://localhost:47331/*` and `http://127.0.0.1:47331/*`. Production: your live origin, e.g. `https://your-domain.example/*`.
5. Billing must be on for that project. Maps JavaScript is billed per map load. A missing, restricted, over-quota, or **billing-disabled** key fails closed to OSM (the Google error overlay is dismissed).

### Cursor / Origin cloud preview

Yes — a project secret named **`VITE_GOOGLE_MAPS_API_KEY`** is accepted. Vite inlines that process env into `import.meta.env.VITE_GOOGLE_MAPS_API_KEY` at `npm run dev` / `npm run build`. No other name is required for the browser map.

On [Cloud Agents](https://cursor.com/dashboard/cloud-agents) → **Secrets** (Origin/project env secrets use the same name):

| Field | Value |
| --- | --- |
| Name | `VITE_GOOGLE_MAPS_API_KEY` |
| Type | **Runtime Secret** (value stays out of transcripts and commits) |

Prefer Runtime Secret over Environment Variable so agents never echo the key. A saved environment that booted **before** the secret was added will not see it until you refresh/rebuild that environment (or start a new agent).

`vite.config.ts` also copies a bare `GOOGLE_MAPS_API_KEY` into the `VITE_` name if the Vite var is empty. Prefer **`VITE_GOOGLE_MAPS_API_KEY`**.

Maps JS keys are always visible in the client bundle once loaded; HTTP referrer restriction is the real control.

OSM attribution is still required for the playable 3D roads even when Google tiles are on the 2D panel. Credit on the map screen names both.

## Real streets (OpenStreetMap)

NY hub bbox (WGS84, Midtown around Port Authority / Times Square):

| | south | west | north | east |
| --- | --- | --- | --- | --- |
| **New York** | 40.749 | −74.002 | 40.762 | −73.978 |

Origin (world 0,0): Port Authority Bus Terminal **40.7569, −73.9903**. +X is east, +Z is north, 1 unit = 1 metre.

**How to verify:** Drop in on New York. You spawn on the Port Authority curb. Avenues run long north–south (8th, 9th, 7th, Broadway); cross streets are denser east–west (42nd, 41st, 40th). Lots match OSM footprints (Penn 2, Port Authority, Times Square Tower heights). The HUD city chip names the street you are on and shows census population plus the nearby curb count. A large glowing comic issue sits a few metres from spawn. Minimap is a north-up radar of the same graph. Full map (M) shows OSM polylines, and Google roadmap/satellite tiles of that Midtown box when a Maps JS key is set. Plaza = Times Square. Dungeon door = Times Square–42nd Street station.

Cached packs live in `public/maps/{city-id}.json` (NY, Boston, Philadelphia, Washington DC). Loader swaps packs by city id; cities without a file fall back to a **named downtown geoStub** (real avenue names + plaza/dungeon/bus anchors from `src/data/cityShells.ts`), not a generic North/East cross.

```bash
npm run maps              # refresh NY + Boston (roads + building footprints)
npm run maps -- chicago   # any id in scripts/city-bboxes.json
```

## Keyboard (exact)

### Movement & camera

| Input | Action |
| --- | --- |
| **Arrow keys** | Move. Hold 1.5s → charging run that smashes through. Steers in air. |
| **W A S D** | Camera only. **W look up, S look down, A look left, D look right.** Auto-center when sprinting or locked on. **S is never reverse.** |
| **Space** | Tap = hop. Hold up to 3s = charged super-leap; release to launch. In air = ground pound. **Hold Shift + arrows toward a lot, then Space** to magnet onto that roof. After you land, **Space** hops the next building in the facing/arrow direction. |
| **Right Ctrl** | Sprint / bull rush (hold). |
| **Numpad Enter** | Brace (no knockback). Double-tap = dodge roll in arrow direction. |
| **Numpad .** | Wall climb/run (hold toward a wall while airborne). Maestro cannot climb. |
| **C** | Cycle cameras: 3rd-person chase (default) → close → over-shoulder. FOV and boom length follow the street look bible. |
| **Q / E** | Camera zoom out / in. |

### Combat

| Input | Action |
| --- | --- |
| **Enter** | Stance smash. Tap / hold change with the fighting style (see below). |
| **Shift** | **Tap** (no jump) = rip a nearby lot, car, or lamp. Shift again throws. **Hold + arrows + Space** = magnetic roof hop. G sets a wreck down. |
| **B / K / U / J** | Boxing / Karate / Judo / Jiu-jitsu. Same key again = Savage brawl. 0.3s stance change. |
| **G** | Set held wreck down. Hulk with Spirit of Vengeance: Shift is a fire chain; hold G stares. |
| **Numpad 0 / 7 / 9** | Lock-on nearest / cycle / release. |
| **Numpad 5** | Roar (stagger, build Rage). |
| **Numpad 8** | Rage mode 20s when Rage is full (Maestro 30s). Red Hulk: vents Heat explosion instead. |
| **Numpad 2** | Gamma roar (wide stun, long cooldown). |

### Specials (number row)

| Key | Special |
| --- | --- |
| 1 | Thunderclap |
| 2 | Seismic stomp (Immortal: extra gamma AoE) |
| 3 | Shoulder charge (Joe Fixit street bonus) |
| 4 | Ground rip / slab |
| 5 | Gamma burst (Red: fire) |
| 6 | Leap slam onto locked target |
| 7 | Whirlwind (held object; Fixit street bonus) |
| 8 | Meteor throw ×3, charged |
| 9 | Earthquake punch (Red: fire · Immortal: gamma AoE) |
| **0** | **Tap** cycles Savage → Fixit → Red → Immortal → Maestro. **Hold ~0.45s** opens the form radial. **Hold 2s** = Calm Down to Bruce (Gamma 0–19). 20–49 breathe fail. 50+ greyed out. Locked / Overcharged: no form switch. |

### Open world

| Input | Action |
| --- | --- |
| **R** | Banner ↔ Hulk (separate from the five Hulk forms). A hard hit also forces the titan. |
| **H** | Interact: job, diner, sleep, catch, dungeon door, Skyline Heroes, era contacts who hail you, large glowing comic issues (walk into them or H). |
| **M** | Map. Click a pin, **Go here** row, or objective to track — HUD arrow + distance. Hover a pin for name + type. Arrows cycle cities, Enter drops in. |
| **L** | Toggle the map legend (icon → meaning) on the HUD minimap and the full map. Remembers open/closed. Filters still work. |
| **V** | Objective marker toggle. |
| **Bestiary** | Pause or the HUD Bestiary button (B is Boxing now). |
| **K** | Skill trees. |
| **Esc** | Pause / settings. Keybind rows are **rebind stubs** (labels only). |
| **P** | Test spawn rival **RAZORBACK** in free-roam (not dungeons or street bosses). |
| **X / G / N / T** | Hulk borrowed powers (one at a time). Bruce: **X** zooms only; G/N/T off. |

## Rage + Gamma (Anger Loop v2)

Canonical. Tune in `src/data/meters.ts`. HUD shows Rage (Calm / Angry / Furious / Worldbreaker / Meltdown), Gamma band, **DAMAGE$** (top-right, ticks green), Wanted 1–5 stars, and HERO / MENACE.

**Rage 0–100** (contact). +2 light landed, +5 heavy landed, +3 light taken, +8 heavy / vehicle / explosion taken, +1 property (+3 cars), +6 roar, +10 civilian or ally hurt in front. Decays **−2/s** after 5s with no contact.

Rage **tiers** drive lift and destruction: Calm 0–19 · Angry 20–49 · Furious 50–79 (burrow: grounded **Numpad .**) · Worldbreaker 80–99 (shockwave sprint) · Meltdown at 100 / rage mode.

**Gamma 0–100** charges from Rage **while contact is hot** (≤5s): **+(Rage/20)/s** (Savage is faster). Absorb energy +12 (Red +18). Plaza / dungeon door / Gamma Zone +3/s. Spend: light punch −1, heavy −3, specials/borrowed −5…−15, heal 0.5 Gamma per 1% life regen, super-leap −4/100 m. Natural **−1/s** after 8s no contact. Maestro burns Gamma at half rate. Fixit caps at 79. Red stores as Heat and floors at 30 while lit.

| Gamma | Band | Effect |
| --- | --- | --- |
| 0–19 | Bruce window | Dull skin. **Hold 0 for 2s** Calm Down works. Weakest. No heal, no powers. |
| 20–49 | Controllable | Faint glow. Heal on. Form switch OK. Hold 0 fails a breathe anim. |
| 50–79 | Locked | Glow/hum. Cannot Bruce. No form switch. Heal ×2. Splash burn. Wanted +1 feel (stars). |
| 80–99 | Overcharged | Full glow. Powers free. No form switch. Heal ×3. |
| 100 | Meltdown | Burst. If Rage is also 100 → Rage mode + Gamma Zone, then Gamma 40 / Rage 50. |

**Bruce lock.** Hold 0 for 2s only below 20. 20–49: breathe fail. 50+: greyed out, and no titan-to-titan switch. Immortal has **no Bruce window at night**. KO → Bruce 0/0 (hospital, or a cell if Wanted is hot).

A hot 2-minute brawl typically needs a **60–90s** walk before Gamma drops into the Bruce window (Rage→Gamma feed stops after 5s quiet, then −1 Gamma/s after 8s). Glow/emissive = Gamma/100. Anim aggression = Rage/100. Hum keys to Gamma.

## Smash economy (NY slice)

Fan prototype of an open-city skeleton with **destruction instead of money**. No licensed trademarks.

**HUD.** DAMAGE$ top-right (property destroyed, ticks green). Wanted stars 1–5 above it with the heat unit. Mission text top-left (beat prefix: trigger → cutscene → travel → setup → escalation → set-piece → cool-down → Smash Report). Radar bottom-left, same OSM crop, with the tracked route line.

**Wanted.** NYPD → SWAT → Hulkbusters → Gamma cannons → Red Hulk / Abomination. Packs spawn on the street (cap 3, skipped when FrameGuard is overloaded). Escape: **Bruce** only if Gamma is under 20, **or leave the borough** (Skyline / Warrens gate) to dump heat. Bruce in the window also bleeds stars fast.

**Rage Rep.** Lifetime DAMAGE$ / 50. Unlocks Skyline Heroes (80), Joe Fixit (180), Iron Warrens (280), Red (400), Immortal (550), Maestro (700), borrowed powers (900). Skill trees still spend Titan Points. Diner tabs are not progression.

**Smash Report.** Street jobs and Smash Rampages end on a report: damage, vehicles, buildings/craters, Hero/Menace civilians, time, style switches, bronze/silver/gold. Enter or Walk on dismisses.

**Side (NY).** Smash Rampage (~2 min damage target after the first Hulk). Gamma Freaks (era contacts on the curb, H to talk). Hero/Menace resolutions when you leave a district. Gamma echoes X / G / N / T near spawn. Codex and smash craters still count.

## Forms (tap 0 / hold radial / hold 2s Calm Down)

**R** is Banner ↔ last titan. Banner stays the civilian (jobs, diner, sleep).

**Tap 0** cycles unlocked titans (Savage first). **Hold ~0.45s** opens the form radial — locked forms show the Rage Rep they need. **Hold 2s** is Calm Down to Bruce (Gamma under 20, or leave the borough to dump heat). Locked (50+) and Overcharged cannot switch forms. Fixit / Red / Immortal / Maestro unlock from Rage Rep, not cash.

1. **Savage Hulk** (default) — green, balanced, best jump/smash. Rage: madder = stronger.
2. **Joe Fixit** — grey suit and fedora, faster, longer combos, lower leap. Street-brawl specials 3 / 7.
3. **Red Hulk** — Heat builds with hits (damage up, drains HP at cap). Absorbs the heat meter. No Rage — Numpad 8 vents a Heat explosion. Fire versions of 5 / 9.
4. **Immortal Hulk** — night flesh, regenerates. Die = horror rebuild, not game over. Slower, heavier. 2 / 4 / 9 gamma AoE.
5. **Maestro** — old, bearded, permanent weapon. Strongest armor. No wall climb. Heavy Enter cleaves. Rage lasts 30s. Cannot enter Jiu-jitsu.
6. **Bruce** — fragile gadget form. Three hits force the last titan.

### Bruce gadgets (1–9, Bruce only)

Scanner · Tranq · EMP · Hack · Adrenaline · Shield · Decoy · Repair · **Anger Trigger** (instant Hulk, ×2 damage for 20s).

Bruce-only: **H** on a car to drive (H to bail), stealth until close, Hack (4), calm thugs with **H**.

### Borrowed powers (Hulk only, one at a time)

Swap zeros the meter. HUD bar under Heat.

| Key | Power | Use |
| --- | --- | --- |
| **X** | Eye of the Omega | Beam. Hold carves. Empty meter = blind. |
| **G** | Spirit of Vengeance | Shift = fire chain. Run leaves a smash trail. Hold G on a lock = stare (damage they dealt), then exhausted Bruce for 10s. |
| **N** | Emerald Will | Enter builds a construct. Space flies. Meter refills only out of damage. |
| **T** | Silent King | T+Enter cone. Hold T = mega shout once per day, 20% self-hit. |

Bruce: **X** zooms. G/N/T do not borrow.

## Fighting styles

HUD icon (letter + name) flashes for 0.3s on a stance change. Press the same style key again to return to **Savage brawl**.

| Key | Style | Enter tap | Enter hold | Shift |
| --- | --- | --- | --- | --- |
| (default) | Savage brawl | Smash combo | Haymaker | Rip wreck |
| **B** | Boxing | Punch combo | Haymaker | Clinch |
| **K** | Karate | Kick combo | Axe kick | Sweep |
| **U** | Judo | Throw | Slam | Toss |
| **J** | Jiu-jitsu | Mount | Submission | Takedown |

Specials **1–9** keep their identity (thunderclap, stomp, charge…) and pick up stance flavor in the toast.

**Synergies**

- Joe Fixit: Boxing is 20% faster.
- Maestro: Jiu-jitsu is locked.
- Red Hulk: Karate heavies add fire (damage + heat burst).
- Hit with **three different styles** inside one combo to fill Rage faster (HUD says MIX).

## Banner daily life (Sims slice)

While human, a day/night clock runs and three needs drain: **Energy**, **Hunger**, **Mood**. Street jobs still pay diner tabs. Progression is **Rage Rep** from DAMAGE$, never cash.

Walk-up kiosks on the plaza ring:

- **Walk-up** — sleep. Restores energy, skips ~7.5 hours.
- **All-night diner** — $12 plate. Restores hunger.
- **Municipal Lab / Steam & Stoop / Pier Freight / Records Annex** — hire with H, then H again to work a compressed shift for cash. One shift per day.

Transform on command (R / 0) or when hit. Low needs slow Banner’s jog.

## Grand Bestiary

50 original creatures per city, codes **C-01 … C-50**. **01–30** normal, **31–45** champ, **46–50** unique. **New York’s 50 are fully authored** in `src/data/ny-bestiary.json` (C-01 Steam Rat … C-50 Borough Basilisk). Other cities get seeded civic rosters with the same rank bands.

- Spawn on streets (NY weighted mix of 10 wilds) and in dungeon side rooms.
- Soften, then **H** to catch (Banner has the better chance). Catchable; evolve stages 1 → Prime → Apex.
- Each beastie has **four moves**. Party of **three** deploys in capital dungeons and fights undead + boss.
- Evolution: stage 2 at level 16 **or** 10 wins. Stage 3 at level 32 **or** after a boss kill (tamed only).

## Capital dungeons

Each city has a plaza door. After enough street jobs (2, or 3 on act cities; New York also needs one transform), press **H**.

Rooms before the named boss are packed with **undead WWII-style soldier zombie packs** (helmets, coats, swarm AI). Pulp / arcade trash mobs — not political content. Bosses stay as listed (Turnstile Ghoul, Bell-Ringer Wight, …).

**MVP loop:** NY job + daily life → catch C-01–10 on the plaza → **R** then one street smash → lime Turnstile door → beat the Ghoul → **Boston unlocks**.

Cities play **strict order 1 → 50** (NY → … → Anchorage). Act bosses at **10 / 20 / 30 / 40**; final **50 World-Ender**. Clearing dungeon N unlocks city N+1’s waypoint.

## Rival: RAZORBACK

A 5′4″ hunched mutant with a metal skeleton, cigar, brown/yellow jacket, and three retractable claws per hand. He tracks by smell, regenerates **3%/s** (heal only sticks if you do not re-hit for **2s**), and goes berserk under **30% HP**. KO only — he never stays down.

**Free-roam spawn** (not in dungeons, street bosses, or cutscenes):

- Every **6–10 min**, **35%** chance he appears **40–80 m** off-camera.
- No rematch within **3 min** of the last fight.
- Smashing civilian buildings raises the next roll.
- **100%** the first time each day you walk the NY **walk-up stoop**, **all-night diner**, or **Pier Freight**.
- Banner: *RAZORBACK has found you.* Music swaps to a low pulse. He stalks **60s**, then pounces.

**Fight:** fast duel. Claws apply **Bleed 1%/s for 5s**. He dodges Boxing and heavies, punishes whiffs. He can ride Hulk’s back — **mash Enter** to throw him off.

| Counter | Why it works |
| --- | --- |
| **Shift** grab | Strong. Throws him off a ride. |
| **J** Jiu-jitsu | Pin cuts through regen. |
| **U** Judo | Throws ×3 (metal weight). |
| **B** Boxing | Weak — he ducks. |
| **1** Thunderclap | Staggers. |
| Red Heat | Halves his regen. |

Win: 20s KO, hat tip, full Rage, **Claw Mark** collectible, rivalry++. Loss: you are left at **10% HP**; the next fight is **+5%** tougher. Level = Hulk+2. Every 5 encounters a new trick (wall run, claw-pin, manhole, bike). Cap ~4 min. AI: Stalk → Engage → Pounce/Ride → Retreat & heal → Re-engage.

Tune times and ranges in `src/data/razorback.ts` → `RAZOR_VARS`. Rivalry is stored on the save (`titan-streets-save-v2`).

### How to trigger a test fight

1. Drop into **New York** free-roam (streets, not the plaza dungeon door).
2. Press **P**. He spawns behind the camera and stalks; the pounce comes in about **4 seconds**.
3. If he latches on, mash **Enter**. **Shift** / **J** / **U** / **1** are the clean counters.

(Test key is **P** so **N** can be Emerald Will.)

Natural hunts still use the 6–10 min timer, wreck heat, and the three daily landmarks.

## How enemies come at you

Shared `EnemyDirector` (`src/systems/EnemyDirector.ts`). Tune distances in `src/data/approach.ts` → `APPROACH`. Razorback keeps his own brain.

**Feel checklist**

- Packs do **not** all charge the same line. Groups of 3+ split rusher / flanker / support (gun, spit, molotov-range).
- They **spot then commit**: sight, smash sound, or wanted heat. Crimes start on civilians until you step in.
- **Bruce** gets rushed and surrounded. **Hulk** gets a 0.5–1.5s hesitate, then flanks; high smash chaos calls reinforcements.
- Every swing **telegraphs** (glow ring + lean + whoosh). Dodge or brace through the wind-up.
- HUD **Danger** climbs if you idle on a hotspot or keep wrecking. Thunderclap / ground pound makes packs **back off**, then re-close.
- Dungeon zombies: shamblers up front, runners from the sides, armored elites. Door spill when you push in. No silent spawn on your face.
- Low-HP thugs **flee**. Bosses bait, punish a whiff, then special; they wait while adds are up.
- AI LOD: full brain **<50 m**, cheap **<200 m**, none beyond (`PERFORMANCE.md`).

## Campaign story

Original throughline. Not a Marvel script. Narrative lives in `src/data/story.ts`. Gameplay systems stay the same — this is data, intro pages, map flavor, and a Codex.

**Opening.** A scientist steps off a night bus at Port Authority. Locals may know the face from the papers. He left science; the city did not leave him. **Calder Voss**, the Cartographer, built Sanctuary’s Shadow — fifty buried gates under the largest city in each US state — to breed a living weapon, then walked the roster. Banner is the first civilian the circuit took. Hunt Voss city by city until Huntsville.

New game plays a three-page intro (bus → recognition → hunt), then drops you on the New York curb beside the Grey-line coach. Walk near a civilian or sit the diner and someone clocks the name.

### Act beats

| Act | Region | Cities | Act boss | Codex |
| --- | --- | --- | --- | --- |
| **I The Big Five** | Giants | 1–10 New York → Seattle | Drowned Rainlord | Page I |
| **II High Plains to Harbor** | Interior | 11–20 Denver → Baltimore | Drowned Captain Ashe | Page II |
| **III Lakes to Fire** | Heart | 21–30 Milwaukee → Honolulu | Fire Goddess's Shade | Page III |
| **IV Yards and Sound** | North | 31–40 Newark → Bridgeport | Sound Warden | Page IV |
| **V Last Range** | Small giants | 41–50 Fargo → Huntsville | Range Warden | Page V |

Act IV lands on **Bridgeport**’s harbor pit — two Portlands and two Charlestons already uniquely id’d on the chain. Las Vegas (city 15) still plays night house-odds flavor. Huntsville writes the last Codex page.

Each city has a one-line map flavor. The HUD tracks **13 story beats** plus side jobs and **comic vignettes**. Pin extras from the map. City dungeons still unlock the next campaign city even when they are not a numbered story beat.

**Codex.** Pause or the HUD **Codex** button. Five short lore pages unlock only after the act bosses (cities 10 / 20 / 30 / 40 / 50). Search filed comic stories on the same screen.

## Comic story pickups

Glowing issues on the curb (NY Origin + World War Hulk; Vegas Joe Fixit; one per other capital; Worldbreaker in the NY dungeon). **Touch** the book or press **H** to enter a short smash / reach / hold vignette. Esc leaves. Cleared issues file in the Codex.

## Lighting and weather

Streets run a brighter day rig (hemi ~1.85, sun ~2.25). Banner’s clock still drives dusk/night. **Open-Meteo** current conditions for the capital mix fog, sun, and a HUD weather chip. Fetches are async and cached 10 minutes — never awaited on the render tick.

## Objectives

**62** distinct trackable objectives in `src/data/objectives.ts` (asserted at load):

| Kind | Count |
| --- | --- |
| Story | 16 (13 campaign + Origin, World War Hulk, Vegas Fixit comics) |
| Boss | 15 named capital clears |
| Crime | 14 street-job counts |
| Exploration | 10 (roofs, districts, wrecks, hunts, team-up, cash, level, five gates) |
| Travel | 7 city drop-ins (Vegas after dark is the House Ticket; night is forced on first arrival) |

Pin from the map. HUD shows the active story beat. Save key `titan-streets-save-v2`.
