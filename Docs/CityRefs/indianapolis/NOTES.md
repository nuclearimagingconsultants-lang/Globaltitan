# 09 · Indianapolis

Private layout notes. **Do not dump Google tiles, Street View frames, or satellite imagery here.**

## Playable identity

- **Slug:** `indianapolis`
- **Order:** 9 / 50
- **Downtown origin:** 39.77, -86.16 (WGS84)
- **Districts:** Mile Square, Mass Ave, White River
- **Skyline:** Circle monument, brick, oval echo
- **Bones:** `colonial-spoke`
- **Landmark:** Monument Circle + Speedway ghost (`speedway`)
- **Capital dungeon:** The Speedway Crypt — boss Endless Racer
- **Hazard:** spark
- **Bestiary prefix:** Oval (50 street originals; NY uses `ny-bestiary.json`)
- **OSM 3D pack:** none yet — geoStub named streets until `npm run maps -- indianapolis`

## Named downtown streets (geoStub)

- Meridian Street (avenue)
- Washington Street (street)

## Anchors (offsets from downtown origin)

- `plaza` · Monument Circle (plaza)
- `dungeon` · Speedway crypt gate (dungeon)
- `bus` · Meridian curb (bus)

## Google reference workflow (human, in a browser)

1. **Map** — numbered/named grid, plaza, dungeon door: https://www.google.com/maps/@39.77,-86.16,16z
2. **Satellite** — roof lots, parks, water, rail.
3. **Street View** — curb height, landmark silhouette, storefront rhythm. Never capture frames into this repo.
4. **Terrain** — optional; downtown is mostly a flat curb for smash play.

`flavor:` A track that never stops.

## Ship rule

Keep NY playable first. This folder is notes for a recognizable shell, not a tile cache.
