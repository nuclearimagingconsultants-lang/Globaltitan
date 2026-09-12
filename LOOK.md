# Look and performance (Three.js mapping)

The LOOK_AND_PERF pack mentions Unity / Godot only as a checklist. Titan Streets stays on **Vite + Three.js**. This is the mapping.

## Hero (HD CGI overlay)

Default Savage Hulk on the Maps overlay is **saturated green** MeshPhysicalMaterial skin (pores / normal / roughness maps, clearcoat, sheen SSS stand-in) with **bright red radiance** — emissive rim, additive corona sprites, and character-only key/fill/chest/rim lights. Intensity scales with Rage + Gamma (subtle at low; strong corona at Meltdown). Other forms keep distinct palettes (Fixit grey, Red, Immortal, Maestro) at the same physical-material bar. Bruce uses a photoreal original face (not a likeness). RoomEnvironment IBL. Full photoreal scan mesh is still PARTIAL — mid-poly procedural humanoid.

City background is **Google Maps JS**, not a second 3D city. Hero stays High-detail even when Quality is Low.


| Checklist | Three.js |
| --- | --- |
| Lighting | Hemisphere + directional sun (~5200 K) + cool rim (`Game` lights). Dungeons get a player `PointLight`, not a second city. |
| Post | `EffectComposer` in `PostStack.ts`: grade, bloom, SSAO, motion afterimage. Gated by Quality. FrameGuard cuts post under load. |
| Animation | Form meshes, hop arcs, smash wind-ups, crowd instances. No extra skeletal crowds. |
| VFX | Pooled `SmashFx` + `DebrisPool`. Leap afterimage only High/Cinematic while airborne or raging. |
| Bold sat + rim | Grade sat on Medium+. Rim light High/Cinematic. Hero (Hulk) keeps the detail budget; curb props stay instanced boxes. |

## Budget rules

| Checklist | Three.js |
| --- | --- |
| LODs | Chunk bands: near physics, mid visual, far impostor + skyline shell. Hulk extras hide with camera distance. |
| Instancing | `InstancedMesh` lots, lamps, crowd walkers. Shared box geo for streamed impostors. |
| Occlusion / frustum | Three.js frustum culling on. No extra occlusion queries (too expensive on Low). Far shell is a cheap ring, not occluded interiors. |
| Pre-fractured destruction | `DebrisPool` of 300 boxes. **No runtime CSG / fracture.** Smash deltas persist on unload. |
| Texture streaming mindset | OSM packs are static JSON. Lots pump over frames (cap 260). Dummy shader prewarm; never `renderer.compile` the live NY scene. |
| Hero detail | Hulk form kits, comics, era contacts. Street filler stays Lambert/Phong instances. |

## If it lags

See `PERFORMANCE.md`. 30 frames > 18 ms → −10% scale to 70% floor, load 300→220, particle half, debris skip, AI already LOD’d at 50 / 200 m.
