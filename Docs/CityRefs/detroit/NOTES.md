# 18 · Detroit

Private layout notes. **Do not dump Google tiles, Street View frames, or satellite imagery here.**

## Playable identity

- **Slug:** `detroit`
- **Order:** 18 / 50
- **Downtown origin:** 42.33, -83.05 (WGS84)
- **Districts:** Downtown, Greektown, Riverfront
- **Skyline:** Glass cylinders on the river, wide empty lots
- **Bones:** `river-grid`
- **Landmark:** Renaissance Center (`towers`)
- **Capital dungeon:** The Assembly Line — boss Engine Wraith
- **Hazard:** spark
- **Bestiary prefix:** Motor (50 street originals; NY uses `ny-bestiary.json`)
- **OSM 3D pack:** none yet — geoStub named streets until `npm run maps -- detroit`

## Named downtown streets (geoStub)

- Woodward Avenue (avenue)
- Jefferson Avenue (street)

## Anchors (offsets from downtown origin)

- `plaza` · Campus Martius (plaza)
- `civic` · Renaissance Center (civic)
- `dungeon` · Assembly gate (dungeon)
- `bus` · Woodward curb (bus)

## Google reference workflow (human, in a browser)

1. **Map** — numbered/named grid, plaza, dungeon door: https://www.google.com/maps/@42.33,-83.05,16z
2. **Satellite** — roof lots, parks, water, rail.
3. **Street View** — curb height, landmark silhouette, storefront rhythm. Never capture frames into this repo.
4. **Terrain** — optional; downtown is mostly a flat curb for smash play.

`flavor:` Live rails. Sparks jump the floor.

## Ship rule

Keep NY playable first. This folder is notes for a recognizable shell, not a tile cache.
