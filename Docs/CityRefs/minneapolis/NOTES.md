# 27 · Minneapolis

Private layout notes. **Do not dump Google tiles, Street View frames, or satellite imagery here.**

## Playable identity

- **Slug:** `minneapolis`
- **Order:** 27 / 50
- **Downtown origin:** 44.98, -93.27 (WGS84)
- **Districts:** Downtown East, Nicollet Mall, Mill District
- **Skyline:** Glass over the Mississippi, skyways, grain mills
- **Bones:** `river-grid`
- **Landmark:** Stone Arch + mill ruins (`mill`)
- **Capital dungeon:** Frozen Mill Ruins — boss Grain Wight
- **Hazard:** ice
- **Bestiary prefix:** Mill (50 street originals; NY uses `ny-bestiary.json`)
- **OSM 3D pack:** none yet — geoStub named streets until `npm run maps -- minneapolis`

## Named downtown streets (geoStub)

- Nicollet Mall (avenue)
- Washington Avenue (street)

## Anchors (offsets from downtown origin)

- `plaza` · Peavey Plaza (plaza)
- `dungeon` · Mill ruins gate (dungeon)
- `bus` · Nicollet curb (bus)

## Google reference workflow (human, in a browser)

1. **Map** — numbered/named grid, plaza, dungeon door: https://www.google.com/maps/@44.98,-93.27,16z
2. **Satellite** — roof lots, parks, water, rail.
3. **Street View** — curb height, landmark silhouette, storefront rhythm. Never capture frames into this repo.
4. **Terrain** — optional; downtown is mostly a flat curb for smash play.

`flavor:` Ice on the grain floors. Jumps die.

## Ship rule

Keep NY playable first. This folder is notes for a recognizable shell, not a tile cache.
