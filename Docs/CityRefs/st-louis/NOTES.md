# 12 · St. Louis

Private layout notes. **Do not dump Google tiles, Street View frames, or satellite imagery here.**

## Playable identity

- **Slug:** `st-louis`
- **Order:** 12 / 50
- **Downtown origin:** 38.63, -90.2 (WGS84)
- **Districts:** Downtown, Laclede's Landing, Gateway Mall
- **Skyline:** Stainless catenary, brick warehouses, river mud
- **Bones:** `river-grid`
- **Landmark:** Gateway Arch (`arch`)
- **Capital dungeon:** The Gateway Crypt — boss Archkeeper
- **Hazard:** tar
- **Bestiary prefix:** Arch (50 street originals; NY uses `ny-bestiary.json`)
- **OSM 3D pack:** none yet — geoStub named streets until `npm run maps -- st-louis`

## Named downtown streets (geoStub)

- Market Street (street)
- Memorial Drive (avenue)

## Anchors (offsets from downtown origin)

- `plaza` · Kiener Plaza (plaza)
- `civic` · Gateway Arch (civic)
- `dungeon` · Arch crypt gate (dungeon)
- `bus` · Market curb (bus)

## Google reference workflow (human, in a browser)

1. **Map** — numbered/named grid, plaza, dungeon door: https://www.google.com/maps/@38.63,-90.2,16z
2. **Satellite** — roof lots, parks, water, rail.
3. **Street View** — curb height, landmark silhouette, storefront rhythm. Never capture frames into this repo.
4. **Terrain** — optional; downtown is mostly a flat curb for smash play.

`flavor:` The arch presses down.

## Ship rule

Keep NY playable first. This folder is notes for a recognizable shell, not a tile cache.
