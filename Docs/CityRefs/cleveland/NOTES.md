# 07 · Cleveland

Private layout notes. **Do not dump Google tiles, Street View frames, or satellite imagery here.**

## Playable identity

- **Slug:** `cleveland`
- **Order:** 7 / 50
- **Downtown origin:** 41.5, -81.69 (WGS84)
- **Districts:** Public Square, Warehouse District, The Flats
- **Skyline:** Lake wind, Terminal Tower spike, rust belt brick
- **Bones:** `lake-grid`
- **Landmark:** Terminal Tower (`lighthouse`)
- **Capital dungeon:** Lakeside Lighthouse — boss Lamp-Keeper
- **Hazard:** dark
- **Bestiary prefix:** Lake (50 street originals; NY uses `ny-bestiary.json`)
- **OSM 3D pack:** none yet — geoStub named streets until `npm run maps -- cleveland`

## Named downtown streets (geoStub)

- Euclid Avenue (avenue)
- Ontario Street (street)

## Anchors (offsets from downtown origin)

- `plaza` · Public Square (plaza)
- `civic` · Terminal Tower (civic)
- `dungeon` · Tower City gate (dungeon)
- `bus` · Euclid curb (bus)

## Google reference workflow (human, in a browser)

1. **Map** — numbered/named grid, plaza, dungeon door: https://www.google.com/maps/@41.5,-81.69,16z
2. **Satellite** — roof lots, parks, water, rail.
3. **Street View** — curb height, landmark silhouette, storefront rhythm. Never capture frames into this repo.
4. **Terrain** — optional; downtown is mostly a flat curb for smash play.

`flavor:` The lamp dies. Then it blinds.

## Ship rule

Keep NY playable first. This folder is notes for a recognizable shell, not a tile cache.
