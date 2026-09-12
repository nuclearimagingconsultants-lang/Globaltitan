# 11 · Denver

Private layout notes. **Do not dump Google tiles, Street View frames, or satellite imagery here.**

## Playable identity

- **Slug:** `denver`
- **Order:** 11 / 50
- **Downtown origin:** 39.74, -104.99 (WGS84)
- **Districts:** LoDo, Civic Center, Capitol Hill
- **Skyline:** Thin air, gold dome, mountains west
- **Bones:** `mountain-grid`
- **Landmark:** Capitol gold dome + Front Range (`mountain`)
- **Capital dungeon:** Mile-High Necropolis — boss Thin-Air Lich
- **Hazard:** thin
- **Bestiary prefix:** Mile (50 street originals; NY uses `ny-bestiary.json`)
- **OSM 3D pack:** none yet — geoStub named streets until `npm run maps -- denver`

## Named downtown streets (geoStub)

- 16th Street Mall (avenue)
- Colfax Avenue (street)

## Anchors (offsets from downtown origin)

- `plaza` · Civic Center Park (plaza)
- `civic` · Colorado State Capitol (civic)
- `dungeon` · Mile-High gate (dungeon)
- `bus` · 16th curb (bus)

## Google reference workflow (human, in a browser)

1. **Map** — numbered/named grid, plaza, dungeon door: https://www.google.com/maps/@39.74,-104.99,16z
2. **Satellite** — roof lots, parks, water, rail.
3. **Street View** — curb height, landmark silhouette, storefront rhythm. Never capture frames into this repo.
4. **Terrain** — use it; elevation matters for this downtown.

`flavor:` Thin air. Every leap costs more.

## Ship rule

Keep NY playable first. This folder is notes for a recognizable shell, not a tile cache.
