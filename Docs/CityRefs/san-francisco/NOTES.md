# 43 · San Francisco

Private layout notes. **Do not dump Google tiles, Street View frames, or satellite imagery here.**

## Playable identity

- **Slug:** `san-francisco`
- **Order:** 43 / 50
- **Downtown origin:** 37.77, -122.42 (WGS84)
- **Districts:** Union Square, Financial District, Embarcadero
- **Skyline:** Fog wall, hills, Victorian trim, pyramid spike
- **Bones:** `fog-grid`
- **Landmark:** Transamerica spike + fog (`spire`)
- **Capital dungeon:** Fog Rock Prison — boss Warden Eternal
- **Hazard:** fog
- **Bestiary prefix:** Fog (50 street originals; NY uses `ny-bestiary.json`)
- **OSM 3D pack:** none yet — geoStub named streets until `npm run maps -- san-francisco`

## Named downtown streets (geoStub)

- Market Street (street)
- Powell Street (avenue)

## Anchors (offsets from downtown origin)

- `plaza` · Union Square (plaza)
- `civic` · Transamerica Pyramid (civic)
- `dungeon` · Fog Rock gate (dungeon)
- `bus` · Powell curb (bus)

## Google reference workflow (human, in a browser)

1. **Map** — numbered/named grid, plaza, dungeon door: https://www.google.com/maps/@37.77,-122.42,16z
2. **Satellite** — roof lots, parks, water, rail.
3. **Street View** — curb height, landmark silhouette, storefront rhythm. Never capture frames into this repo.
4. **Terrain** — use it; elevation matters for this downtown.

`flavor:` Fog so thick the warden is a wall.

## Ship rule

Keep NY playable first. This folder is notes for a recognizable shell, not a tile cache.
