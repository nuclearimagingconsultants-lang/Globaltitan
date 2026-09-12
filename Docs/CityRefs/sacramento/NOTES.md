# 46 · Sacramento

Private layout notes. **Do not dump Google tiles, Street View frames, or satellite imagery here.**

## Playable identity

- **Slug:** `sacramento`
- **Order:** 46 / 50
- **Downtown origin:** 38.58, -121.49 (WGS84)
- **Districts:** Downtown, Midtown, Capitol Mall
- **Skyline:** Gold dome, grid, river confluence
- **Bones:** `river-grid`
- **Landmark:** Gold capitol dome (`capitol`)
- **Capital dungeon:** Gold Rush Mine — boss Claim-Jumper Lich
- **Hazard:** dark
- **Bestiary prefix:** Gold (50 street originals; NY uses `ny-bestiary.json`)
- **OSM 3D pack:** none yet — geoStub named streets until `npm run maps -- sacramento`

## Named downtown streets (geoStub)

- Capitol Mall (street)
- 10th Street (avenue)

## Anchors (offsets from downtown origin)

- `plaza` · Capitol Park (plaza)
- `dungeon` · Gold Rush mine gate (dungeon)
- `bus` · Mall curb (bus)

## Google reference workflow (human, in a browser)

1. **Map** — numbered/named grid, plaza, dungeon door: https://www.google.com/maps/@38.58,-121.49,16z
2. **Satellite** — roof lots, parks, water, rail.
3. **Street View** — curb height, landmark silhouette, storefront rhythm. Never capture frames into this repo.
4. **Terrain** — optional; downtown is mostly a flat curb for smash play.

`flavor:` A claim that never closed.

## Ship rule

Keep NY playable first. This folder is notes for a recognizable shell, not a tile cache.
