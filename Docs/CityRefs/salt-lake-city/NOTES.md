# 36 · Salt Lake City

Private layout notes. **Do not dump Google tiles, Street View frames, or satellite imagery here.**

## Playable identity

- **Slug:** `salt-lake-city`
- **Order:** 36 / 50
- **Downtown origin:** 40.76, -111.89 (WGS84)
- **Districts:** Downtown, Temple Square, Granary
- **Skyline:** White temple, wide blocks, salt light
- **Bones:** `mountain-grid`
- **Landmark:** Temple Square + Wasatch (`temple`)
- **Capital dungeon:** Salt Flats Barrow — boss Brine Prophet
- **Hazard:** salt
- **Bestiary prefix:** Brine (50 street originals; NY uses `ny-bestiary.json`)
- **OSM 3D pack:** none yet — geoStub named streets until `npm run maps -- salt-lake-city`

## Named downtown streets (geoStub)

- South Temple (street)
- State Street (avenue)

## Anchors (offsets from downtown origin)

- `plaza` · Temple Square (plaza)
- `dungeon` · Salt Flats gate (dungeon)
- `bus` · State curb (bus)

## Google reference workflow (human, in a browser)

1. **Map** — numbered/named grid, plaza, dungeon door: https://www.google.com/maps/@40.76,-111.89,16z
2. **Satellite** — roof lots, parks, water, rail.
3. **Street View** — curb height, landmark silhouette, storefront rhythm. Never capture frames into this repo.
4. **Terrain** — use it; elevation matters for this downtown.

`flavor:` Salt that eats the skin.

## Ship rule

Keep NY playable first. This folder is notes for a recognizable shell, not a tile cache.
