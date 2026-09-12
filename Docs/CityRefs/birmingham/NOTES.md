# 32 · Birmingham

Private layout notes. **Do not dump Google tiles, Street View frames, or satellite imagery here.**

## Playable identity

- **Slug:** `birmingham`
- **Order:** 32 / 50
- **Downtown origin:** 33.52, -86.81 (WGS84)
- **Districts:** Downtown, Five Points, Railroad Park
- **Skyline:** Iron statue, red brick, furnace hills
- **Bones:** `mountain-grid`
- **Landmark:** Vulcan on the mountain (`capitol`)
- **Capital dungeon:** Vulcan's Forge — boss Iron Titan
- **Hazard:** heat
- **Bestiary prefix:** Vulcan (50 street originals; NY uses `ny-bestiary.json`)
- **OSM 3D pack:** none yet — geoStub named streets until `npm run maps -- birmingham`

## Named downtown streets (geoStub)

- 20th Street N (avenue)
- 1st Avenue N (street)

## Anchors (offsets from downtown origin)

- `plaza` · Linn Park (plaza)
- `dungeon` · Vulcan's Forge gate (dungeon)
- `bus` · 20th curb (bus)

## Google reference workflow (human, in a browser)

1. **Map** — numbered/named grid, plaza, dungeon door: https://www.google.com/maps/@33.52,-86.81,16z
2. **Satellite** — roof lots, parks, water, rail.
3. **Street View** — curb height, landmark silhouette, storefront rhythm. Never capture frames into this repo.
4. **Terrain** — optional; downtown is mostly a flat curb for smash play.

`flavor:` The statue's basement still burns.

## Ship rule

Keep NY playable first. This folder is notes for a recognizable shell, not a tile cache.
