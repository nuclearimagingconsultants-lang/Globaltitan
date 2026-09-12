# Laptop freeze notes (RTX 3050)

## Use now
1. Hard refresh: Ctrl+Shift+R on http://127.0.0.1:5475/#play
2. Esc → Settings → Quality → **Low** (or Auto)
3. Avoid High / Cinematic on this laptop with Maps overlay

## Hotspots (Three.js)
- `Game.ts` render loop + Maps overlay compositing
- `PostStack.ts` bloom/SSAO (High+)
- `ChunkStreamer` / lot pump spikes
- `SmashFx` / `DebrisPool` under hitch (FrameGuard skips)
- Overlay/Minimap canvas DPR (now capped at 1)

## Applied local patches
- FrameGuard: trip after **10** slow frames (was 18); scale floor **0.55**; bigger steps
- Low preset: scale 0.55, load 180 m, debris 80, particles 6, far 180
- Overlay + Minimap DPR ≤ 1
- Save: High/Cinematic snap to Low once on load
