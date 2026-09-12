# 12 · Oklahoma City

Private layout notes. **Do not dump Google tiles, Street View frames, or satellite imagery here.**

## Playable identity

- **Slug:** `oklahoma-city`
- **Order:** 12 / 50
- **Downtown origin:** 35.47, -97.52 (WGS84)
- **Districts:** Downtown, Bricktown, Automobile Alley
- **Skyline:** Brick warehouses, wide sky, canal cut
- **Bones:** `prairie`
- **Landmark:** Bricktown canal (`canal`)
- **Capital dungeon:** The Dust Bowl Barrow — boss Storm Caller
- **Hazard:** fog
- **Bestiary prefix:** Dust (50 street originals; NY uses `ny-bestiary.json`)
- **OSM 3D pack:** none yet — geoStub named streets until `npm run maps -- oklahoma-city`

## Named downtown streets (geoStub)

- Reno Avenue (street)
- Broadway (avenue)

## Anchors (offsets from downtown origin)

- `plaza` · Bricktown canal (plaza)
- `dungeon` · Dust Bowl gate (dungeon)
- `bus` · Broadway curb (bus)

## Google reference workflow (human, in a browser)

1. **Map** — numbered/named grid, plaza, dungeon door: https://www.google.com/maps/@35.47,-97.52,16z
2. **Satellite** — roof lots, parks, water, rail.
3. **Street View** — curb height, landmark silhouette, storefront rhythm. Never capture frames into this repo.
4. **Terrain** — optional; downtown is mostly a flat curb for smash play.

`flavor:` Dust so thick the boss is a rumor.

## Ship rule

Keep NY playable first. This folder is notes for a recognizable shell, not a tile cache.
