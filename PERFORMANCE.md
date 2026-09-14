# Performance

Three.js only. No engine migrate. The image is sold with lighting, a small post stack, animation, and VFX — not raw polycount. The frame is protected with LODs, instancing, pools, dynamic resolution, and a lag safety net. Unity / Godot checklist items map in `LOOK.md`.

Target: **~60 fps** idle / empty street, **≥30 fps** (aim 45–60) in fights on RTX 3050-class laptops.

## Look

Post lives in `src/systems/PostStack.ts` (EffectComposer). Quality gates each pass.

| Pass | Role | On |
| --- | --- | --- |
| Color grade | Crush, lift/gain, sat, vignette, aerial haze | Medium+ |
| Bloom | Unreal bloom (lean on Medium) | Medium / High / Cinematic |
| SSAO | Contact darkening | High / Cinematic |
| Rim | Cool back light opposite the sun | Medium+ |
| Hulk motion blur | Afterimage, only while raging or charging | High+ titan rush |
| Sky dome | Gradient + sun disc, scaled inside `farClip` | Always |
| Distance fog | `fogRange(farClip)` — far at 94% of clip | Always (mesh city) |

Smash VFX: `SmashFx` is a **pre-warmed pool** (160 bits / 16 rings). `DebrisPool` is **300** pre-fractured shards, reused. Healthy shards **sleep at 2 s** and **delete at 6 s**. Under hitch they vanish in ~0.28 s. Skipped entirely when FrameGuard is overloaded. No runtime fracture.

Shaders compile from a **dummy kit at boot**. The live NY scene is never passed to `renderer.compile`. **No MeshPhysical `transmission`.**

## Speed

- **Instancing** — towers, cornices, lamps, street dressing, crowd. Frustum culled.
- **LODs** — near = full lots + physics; mid = visuals; far = impostor tiles + 48-box skyline (`STREAMING.md`).
- **AI LOD** — `EnemyDirector`: full approach brain **< 50 m**, cheap walk **< 200 m**, asleep beyond.
- **Colliders** — AABB only, and only on **near** chunks.
- **Shadows** — off below High. High/Cinematic: PCF soft, 1024 map, ortho follows the player (`shadowDist` 100–120 m).
- **Dynamic render scale** — composer / pixel budget. Floor **50%**.
- **Debris** — pooled, hard cap **300**. Sleep 2 s / delete 6 s. Skipped under load.
- **Lots** — 3–4 packed buildings per block. Street dressing instanced (dumpsters / bollards / parked cars).
- **Traffic / crowd** — NY up to 14 moving cars + 28 parked instances; curb crowd cap 48.
- **Chunk spawns** — max **2** chunk ops / frame when healthy, **1** under load.
- **Atmosphere** — fog object reused, lights at ~4 Hz. Fog far tracks `farClip` so the horizon is haze, not a black void.
- **Far clip** — Low 520 / Medium 640 / High 780 / Cinematic 860.

The render loop **presents at most ~60 Hz** (`15.2 ms` gate). FrameGuard still measures presented-frame CPU time.

## If it lags — P0 emergency net

`FrameGuard` runs on **every** preset.

If a frame sits **> 18 ms for 6 consecutive frames**:

1. Drop render scale by **15%** (floor **50%** of the preset)
2. Halve particles; skip smash debris while overloaded
3. Shrink stream load radius **→ 220 m**; **1** chunk op / frame
4. Cut post (bloom / SSAO / motion blur)

A single hitch **> 18 ms** still throttles debris without waiting for the dynres step.

If the frame sits **< 14 ms** with no slow streak, scale and radius creep back.

**Low** is the panic button: 0.70 scale, no post, no shadows. City density, sky, and fog stay on.

## Quality menu

Pause → **Settings** → Quality. **Default is Medium** (laptop visual target). Existing Low saves bump to Medium once (`titan-streets-look-v1`).

| Preset | Intent |
| --- | --- |
| Auto | Same as Medium look. FrameGuard owns scale. |
| Low | Freeze-safe. No bloom/SSAO/shadows. Far 520. |
| Medium | Grade + lean bloom, far 640, shadows off. RTX 3050 target. |
| High | SSAO, rim, bloom, 100 m shadows. Far 780. |
| Cinematic | All post + Hulk motion blur. Far 860. Shadows 120 m. |

Saved on `settings.quality` (`titan-streets-save-v2`).

## Hub city

The skeleton is wired on **New York** first (and follows you to other capitals). Feature systems — Ces keyboard, five forms, jobs, bestiary, Crime Wave, dungeon zombies — stay on the same renderer. Quality must not disable them; it only changes how expensive the frame is.

## Crime Wave

Accept from the quest board (`cw-*`). HUD mission line shows the active contact. Smash that connects (crime / building / car) advances one objective, gated at **1.35 s** so combos do not skip the whole job.
