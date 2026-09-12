# 07 · Jacksonville

Private layout notes. **Do not dump Google tiles, Street View frames, or satellite imagery here.**

## Playable identity

- **Slug:** `jacksonville`
- **Order:** 7 / 50
- **Downtown origin:** 30.33, -81.66 (WGS84)
- **Districts:** Downtown, Brooklyn, Sports Complex
- **Skyline:** Wide river, low brick, sports lights
- **Bones:** `river-grid`
- **Landmark:** St. Johns river forts (`fort`)
- **Capital dungeon:** Fort of the Drowned — boss Tide Warden
- **Hazard:** flood
- **Bestiary prefix:** StJohns (50 street originals; NY uses `ny-bestiary.json`)
- **OSM 3D pack:** none yet — geoStub named streets until `npm run maps -- jacksonville`

## Named downtown streets (geoStub)

- Bay Street (street)
- Main Street (avenue)

## Anchors (offsets from downtown origin)

- `plaza` · James Weldon Johnson Park (plaza)
- `dungeon` · Fort of the Drowned gate (dungeon)
- `bus` · Bay curb (bus)

## Google reference workflow (human, in a browser)

1. **Map** — numbered/named grid, plaza, dungeon door: https://www.google.com/maps/@30.33,-81.66,16z
2. **Satellite** — roof lots, parks, water, rail.
3. **Street View** — curb height, landmark silhouette, storefront rhythm. Never capture frames into this repo.
4. **Terrain** — optional; downtown is mostly a flat curb for smash play.

`flavor:` A brick fort that never drained.

## Ship rule

Keep NY playable first. This folder is notes for a recognizable shell, not a tile cache.
