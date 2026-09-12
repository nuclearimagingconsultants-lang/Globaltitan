# Performance

Three.js only. No engine migrate. The image is sold with lighting, a small post stack, animation, and VFX — not raw polycount. The frame is protected with LODs, instancing, pools, dynamic resolution, and a lag safety net. Unity / Godot checklist items map in `LOOK.md`.

Target: **~60 fps** idle / empty street, **≥45 fps** in fights and leaps.

## Look

Post lives in `src/systems/PostStack.ts` (EffectComposer). Quality gates each pass.

| Pass | Role | On |
| --- | --- | --- |
| Color grade | Crush, lift/gain, sat, vignette. Bold warm/green street. | Medium+ |
| Bloom | Unreal bloom | High / Cinematic only |
| SSAO | Contact darkening | High / Cinematic |
| Rim | Cool back light opposite the sun | High / Cinematic |
| Hulk motion blur | Afterimage, only while raging or charging | Cinematic + titan rush |

Smash VFX: `SmashFx` is a **pre-warmed pool** (160 bits / 16 rings). `DebrisPool` is **300** pre-fractured shards, reused. Healthy shards **sleep at 2 s** (physics stop, stay visible) and **delete at 6 s**. Under hitch they vanish in ~0.28 s. Skipped entirely when FrameGuard is overloaded. No runtime fracture. Charge / leap does **not** spawn extra particles.

Shaders compile from a **dummy lambert/phong/basic kit at boot**. The live NY scene is never passed to `renderer.compile`.

## Speed

- **Instancing** — towers, cornices, lamps, props share `InstancedMesh`. Frustum culled.
- **LODs** — near = full lots + physics; mid = visuals; far = impostor tiles + skyline shell (`STREAMING.md`).
- **AI LOD** — `EnemyDirector`: full approach brain **< 50 m**, cheap walk **< 200 m**, asleep beyond. Razorback is exempt. Tunable in `APPROACH.fullBrainM` / `cheapBrainM`.
- **Colliders** — AABB only, and only on **near** chunks.
- **Shadows** — off below High. When on, ortho distance follows `shadowDist` (80–120 m), 1024 map.
- **Dynamic render scale** — composer / pixel budget scales with the preset and the frame guard. Floor **70%**.
- **Debris** — pooled, hard cap **300**. Sleep 2 s / delete 6 s. Skipped under load.
- **Lots / lamps** — OSM graph lots cap **260**, placed over frames (spawn neighborhood first). Lamps **140**. Traffic **6** cars.
- **Chunk spawns** — max **2** chunk ops / frame when healthy, **1** under load. Impostor sculpt spread over **3–5 frames**. Shared box geometry.
- **Atmosphere** — fog object reused, lights at ~4 Hz. No `new Fog` per frame. Day hemi ~1.85 / sun ~2.25. Open-Meteo mixes in cloud/rain.
- **Far clip** — quality `farClip` only (Low 280 m). No 1100 m OSM override.

The render loop **presents at most ~60 Hz** (`15.2 ms` gate) so an uncapped display cannot busy-spin the main thread. FrameGuard still measures presented-frame CPU time.

HUD / minimap / pin collect run at **~7 Hz** play, **~4 Hz** on the full map. Street strokes batch by kind (one path per layer).

## If it lags — P0 emergency net

`FrameGuard` runs on **every** preset (not only Auto). HUD city chip shows live fps.

If a frame sits **> 18 ms for 30 consecutive frames**:

1. Drop render scale by **10%** (floor **70%** of the preset)
2. Halve particles (`particleMul = 0.5`); skip smash debris while overloaded
3. Shrink stream load radius **300 → 220 m**; **1** chunk op / frame
4. Cut post (bloom / SSAO / motion blur / shadows)

A single hitch **> 18 ms** still throttles debris (short life / skip) without waiting for the 30-frame dynres step.

Hub lots **pump over frames** (nearby first, ~4–6 lots / frame). Opening the map (**M**) skips the 3D present. Overlay screens no longer blank pointer-events for 280 ms.

If the frame sits **< 14 ms** with no slow streak, scale and radius creep back.

Low is the default panic button: 0.70 scale, no post, **220 m** load (already at the emergency radius).

## Quality menu

Pause → **Settings** → Quality. **Default is Low.**

| Preset | Intent |
| --- | --- |
| Auto | Canonical 300 / 400 m stream. Scale creeps; 30×18 ms net still owns it. |
| Low | Default snappy. No post, 220 m load, pooled debris. |
| Medium | Grade only, no bloom/shadows. 300 / 400 m. Raise from Low when fps stays near 60. |
| High | SSAO, rim, bloom, 100 m shadows. Safety net still owns scale. |
| Cinematic | All post + Hulk motion blur. 300 debris. |

Saved on `settings.quality` (`titan-streets-save-v2`). Existing Medium saves snap to Low once when the legend field is first migrated.

## Hub city

The skeleton is wired on **New York** first (and follows you to other capitals). Feature systems — Ces keyboard, five forms, jobs, bestiary, dungeon zombies — stay on the same renderer. Quality must not disable them; it only changes how expensive the frame is.
