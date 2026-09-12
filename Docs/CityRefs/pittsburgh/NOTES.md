# 06 · Pittsburgh

Private layout notes. **Do not dump Google tiles, Street View frames, or satellite imagery here.**

## Playable identity

- **Slug:** `pittsburgh`
- **Order:** 6 / 50
- **Downtown origin:** 40.44, -80.0 (WGS84)
- **Districts:** Golden Triangle, Strip District, Mount Washington
- **Skyline:** Two rivers, yellow bridges, mill rust
- **Bones:** `river-grid`
- **Landmark:** Point bridges + steel stacks (`bridge`)
- **Capital dungeon:** The Steel Cathedral — boss Slag Golem
- **Hazard:** heat
- **Bestiary prefix:** Slag (50 street originals; NY uses `ny-bestiary.json`)
- **OSM 3D pack:** none yet — geoStub named streets until `npm run maps -- pittsburgh`

## Named downtown streets (geoStub)

- Boulevard of the Allies (avenue)
- Grant Street (street)

## Anchors (offsets from downtown origin)

- `plaza` · Point State Park (plaza)
- `dungeon` · Steel Cathedral gate (dungeon)
- `bus` · Grant curb (bus)

## Google reference workflow (human, in a browser)

1. **Map** — numbered/named grid, plaza, dungeon door: https://www.google.com/maps/@40.44,-80.0,16z
2. **Satellite** — roof lots, parks, water, rail.
3. **Street View** — curb height, landmark silhouette, storefront rhythm. Never capture frames into this repo.
4. **Terrain** — use it; elevation matters for this downtown.

`flavor:` Open furnaces. Slag rains.

## Ship rule

Keep NY playable first. This folder is notes for a recognizable shell, not a tile cache.
