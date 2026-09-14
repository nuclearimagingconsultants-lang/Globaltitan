# Look and performance (Three.js mapping)

The LOOK_AND_PERF pack mentions Unity / Godot only as a checklist. Titan Streets stays on **Vite + Three.js**. This is the mapping.

Visual target is **GTA5-tier techniques** (dense readable city, daylight/night contrast, scale fog, character materials) on **original** procedural art. No Rockstar IP, maps, trademarks, or assets.

## Hero (HD CGI overlay)

Default Savage Hulk is **saturated green** MeshPhysicalMaterial skin (512 pore / normal / roughness maps, clearcoat, **sheen SSS stand-in**) with **bright red radiance**. **No `transmission` SSS** — that froze RTX 3050 WebGL. Outdoor PMREM IBL (sky + ground), not RoomEnvironment. Intensity scales with Rage + Gamma. Other forms keep distinct palettes at the same physical-material bar. Bruce uses a photoreal original face (not a likeness). Full photoreal scan mesh is still PARTIAL — mid-poly procedural humanoid.

Playable 3D streets are the **CityWorld** mesh (`cityMeshEnabled` is on). Google Maps remains the 2D **M** overlay, not the smash stage.

| Checklist | Three.js |
| --- | --- |
| Lighting | Hemisphere + directional sun (~5200 K) + cool rim. Soft PCF shadows on High+. Dungeons get a player `PointLight`. |
| Post | `PostStack.ts`: grade + aerial haze, Unreal bloom (Medium+), SSAO (High+), motion afterimage. FrameGuard cuts post under load. |
| Animation | Form meshes, hop arcs, smash wind-ups, crowd instances. No extra skeletal crowds. |
| VFX | Pooled `SmashFx` + `DebrisPool`. Leap afterimage only High/Cinematic while airborne or raging. |
| Bold sat + rim | Grade sat on Medium+. Rim on Medium+. Hero stays MeshPhysical; curb props are instanced Standard. |

## Budget rules

Numbers live in `src/world/lookBudget.ts`.

| Checklist | Three.js |
| --- | --- |
| LODs | Chunk bands: near physics, mid visual, far impostor + **48-building two-ring skyline**. Fog far = 94% of camera far so the clip is never a black void. |
| Instancing | Lots, lamps, crowd, street dressing (dumpsters, bollards, parked cars, kiosks). Shared box geo for streamed impostors. |
| Occlusion / frustum | Three.js frustum culling on. No extra occlusion queries on Low. |
| Pre-fractured destruction | `DebrisPool` of 300 boxes. **No runtime CSG / fracture.** Smash deltas persist on unload. |
| Texture streaming mindset | Procedural asphalt / brick / facades (AO baked into windows). Dummy shader prewarm; never `renderer.compile` the live NY scene. |
| Hero detail | 512 skin maps, cloth weave, outdoor IBL. Street filler stays instanced Standard. |

## GTA5-tier remaining gaps (honest)

Techniques only — this is still a browser mid-poly city, not a Rockstar streaming world.

- No photogrammetry / scanned buildings, no real Midtown mesh
- No cascaded shadow maps, no SSAO on Medium (3050 budget)
- No volumetric godrays, no water SSR, no car paint flakes
- Hero is still a procedural humanoid, not a film scan
- Pedestrians are capsules, not skinned crowds
- Draw distance is hundreds of metres, not kilometres of unique LODs
- Destruction is squash + pooled debris, not pre-fractured interiors

## If it lags

See `PERFORMANCE.md`. FrameGuard: 6 slow frames > 18 ms → −15% scale to **50%** floor, load 220 m, cut post. **Low** is the freeze button. Do not re-enable MeshPhysical `transmission`.
