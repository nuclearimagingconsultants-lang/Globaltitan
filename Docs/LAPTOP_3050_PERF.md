# Laptop freeze notes (RTX 3050)

## Use now
1. `npm install && npm run dev` → http://127.0.0.1:47331/#play
2. Esc → Settings → Quality → **Medium** (visual target) or **Low** if the frame hitchs
3. FrameGuard will cut bloom/SSAO and drop scale if frames stay over 18 ms

## Freeze pack (keep)
- **No MeshPhysical `transmission` / SSS** — that stalled this laptop
- Dummy shader prewarm; never compile the live NY scene
- Pooled smash / debris; skip under hitch
- FrameGuard: 6 slow frames → scale step, load 220 m, `cutPost`

## Hotspots (Three.js)
- `Game.ts` render loop + post (`PostStack.ts` bloom/SSAO on High+)
- `ChunkStreamer` / lot pump spikes
- `SmashFx` / `DebrisPool` under hitch (FrameGuard skips)
- Overlay/Minimap canvas DPR (capped at 1)
- High/Cinematic shadows (1024 PCF) — leave those off on this GPU
