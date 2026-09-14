# Streaming

Titan Streets stays on **Three.js**. This is the city chunk contract Ces sent, implemented as a live skeleton on the hub city (New York) and reused when you travel.

## Contract

| Rule | Value |
| --- | --- |
| Chunk size | **100 m** |
| Load radius | **300 m** (Low starts at **220 m**. FrameGuard under load clamps any preset to **220 m**) |
| Unload radius | **400 m** (always at least load + 100 m hysteresis) |
| Load | Async, spread over **3–5 frames**, **≤ 2 chunk ops / frame** (1 under load) |
| Look-ahead | Player XZ + velocity × **1.15 s**. Leaps / air use **2.2 s** so the landing block preloads. |
| Near (≤ 160 m) | Full physics + NPC colliders. Simple AABB only. |
| Mid | Visuals. No physics. |
| Far | Impostor tiles + **skyline shell** (48 boxes, two rings ~380 m / ~470 m) |
| Unload | Hide/recycle the chunk. **Smash deltas** (hp / destroyed) are stored and reapplied on reload. Deltas older than **3 min** time-heal and are dropped. |

Plaza chunk `0,0` never drops physics so the dungeon door and Banner kiosks stay solid.

## What the skeleton does today

`src/systems/ChunkStreamer.ts` + `src/world/streaming.ts`

- Existing hub buildings are **seeded** into 100 m keys (the current 7×7 grid is ~294 m across).
- Walking toward the rim **queues** outer 100 m tiles. Each tile waits 3–5 frames, then builds a cheap box impostor (async, ≤2/frame).
- Walking away past unload **unloads** those tiles and writes smash deltas first.
- The far skyline shell stays up so the horizon never pops to empty fog.
- Quality **Low** and FrameGuard shrink load/unload radii (`PERFORMANCE.md`).

This is not yet a full replace of `CityWorld` instancing. Hub towers stay in shared `InstancedMesh` buffers (already instanced). The streamer owns the **policy**, the **far shell**, and **on-demand outer chunks**. Next pass can move hub blocks onto per-chunk groups without changing the distances.

## Velocity look-ahead

```
probe = player.xz + velocity.xz * (leaping ? 2.2 : 1.15)
```

Chunks are tested against the probe, not the feet, so a charging run or charged leap starts loading the block you are about to smash.

## Smash deltas

On unload:

```
{ at, mats: { id, hp, destroyed }[] }
```

On reload of that key, `CityWorld.applySmashDeltas` restamps wrecked lots so a smashed mid block does not heal when it streams back — unless **3 minutes** have passed (optional time-heal).

## Debug

Pause → Settings → Quality. Auto reports the live radii. The streamer counts `loaded / near / mid / far / queued` internally for the next HUD chip.
