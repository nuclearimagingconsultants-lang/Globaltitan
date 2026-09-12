# 03 · Chicago

Private layout notes. **Do not dump Google tiles, Street View frames, or satellite imagery here.**

## Playable identity

- **Slug:** `chicago`
- **Order:** 3 / 50
- **Downtown origin:** 41.88, -87.63 (WGS84)
- **Districts:** The Loop, River North, Grant Park
- **Skyline:** Black steel boxes, elevated tracks, grid to the lake
- **Bones:** `lake-grid`
- **Landmark:** Willis / Sears stack + river L (`towers`)
- **Capital dungeon:** Freight Tunnels of the Loop — boss Bootlegger King
- **Hazard:** dark
- **Bestiary prefix:** Loop (50 street originals; NY uses `ny-bestiary.json`)
- **OSM 3D pack:** none yet — geoStub named streets until `npm run maps -- chicago`

## Named downtown streets (geoStub)

- State Street (avenue)
- Madison Street (street)
- Michigan Avenue (avenue)

## Anchors (offsets from downtown origin)

- `plaza` · Millennium Park (plaza)
- `dungeon` · Washington/State station (dungeon)
- `bus` · State curb (bus)

## Google reference workflow (human, in a browser)

1. **Map** — numbered/named grid, plaza, dungeon door: https://www.google.com/maps/@41.88,-87.63,16z
2. **Satellite** — roof lots, parks, water, rail.
3. **Street View** — curb height, landmark silhouette, storefront rhythm. Never capture frames into this repo.
4. **Terrain** — optional; downtown is mostly a flat curb for smash play.

`flavor:` Black tunnels under the Loop.

## Ship rule

Keep NY playable first. This folder is notes for a recognizable shell, not a tile cache.
