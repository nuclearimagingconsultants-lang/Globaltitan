# 17 · Portland, OR

Private layout notes. **Do not dump Google tiles, Street View frames, or satellite imagery here.**

## Playable identity

- **Slug:** `portland`
- **Order:** 17 / 50
- **Downtown origin:** 45.52, -122.68 (WGS84)
- **Districts:** Downtown, Pearl, Waterfront
- **Skyline:** Willamette bridges, moss, rose parks
- **Bones:** `river-grid`
- **Landmark:** Bridges + roses (`rose`)
- **Capital dungeon:** Rose Garden Labyrinth — boss Thorn Queen
- **Hazard:** root
- **Bestiary prefix:** Rose (50 street originals; NY uses `ny-bestiary.json`)
- **OSM 3D pack:** none yet — geoStub named streets until `npm run maps -- portland`

## Named downtown streets (geoStub)

- Burnside Street (street)
- SW 5th Avenue (avenue)

## Anchors (offsets from downtown origin)

- `plaza` · Pioneer Courthouse Square (plaza)
- `dungeon` · Rose Garden gate (dungeon)
- `bus` · Burnside curb (bus)

## Google reference workflow (human, in a browser)

1. **Map** — numbered/named grid, plaza, dungeon door: https://www.google.com/maps/@45.52,-122.68,16z
2. **Satellite** — roof lots, parks, water, rail.
3. **Street View** — curb height, landmark silhouette, storefront rhythm. Never capture frames into this repo.
4. **Terrain** — use it; elevation matters for this downtown.

`flavor:` Roses with a grip.

## Ship rule

Keep NY playable first. This folder is notes for a recognizable shell, not a tile cache.

**Legacy Portland folder.** `Docs/CityRefs/portland/` is **Portland, OR** (`portland`). Maine is `Docs/CityRefs/portland-me/` (`portland-me`). Do not collapse them.
