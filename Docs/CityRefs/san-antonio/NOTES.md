# 19 · San Antonio

Private layout notes. **Do not dump Google tiles, Street View frames, or satellite imagery here.**

## Playable identity

- **Slug:** `san-antonio`
- **Order:** 19 / 50
- **Downtown origin:** 29.42, -98.49 (WGS84)
- **Districts:** Downtown, River Walk, Alamo Plaza
- **Skyline:** Limestone mission, cypress water, low roofs
- **Bones:** `river-grid`
- **Landmark:** The Alamo + River Walk (`mission`)
- **Capital dungeon:** Mission Bell Tower — boss Siege Colonel
- **Hazard:** bell
- **Bestiary prefix:** Mission (50 street originals; NY uses `ny-bestiary.json`)
- **OSM 3D pack:** none yet — geoStub named streets until `npm run maps -- san-antonio`

## Named downtown streets (geoStub)

- Commerce Street (street)
- Alamo Street (avenue)

## Anchors (offsets from downtown origin)

- `plaza` · Alamo Plaza (plaza)
- `civic` · The Alamo (civic)
- `dungeon` · Mission bell gate (dungeon)
- `bus` · Commerce curb (bus)

## Google reference workflow (human, in a browser)

1. **Map** — numbered/named grid, plaza, dungeon door: https://www.google.com/maps/@29.42,-98.49,16z
2. **Satellite** — roof lots, parks, water, rail.
3. **Street View** — curb height, landmark silhouette, storefront rhythm. Never capture frames into this repo.
4. **Terrain** — optional; downtown is mostly a flat curb for smash play.

`flavor:` A siege bell that drops the knees.

## Ship rule

Keep NY playable first. This folder is notes for a recognizable shell, not a tile cache.
