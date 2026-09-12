# 10 · Seattle

Private layout notes. **Do not dump Google tiles, Street View frames, or satellite imagery here.**

## Playable identity

- **Slug:** `seattle`
- **Order:** 10 / 50
- **Downtown origin:** 47.61, -122.33 (WGS84)
- **Districts:** Downtown, Pioneer Square, Waterfront
- **Skyline:** Needle, wet glass, streets under streets
- **Bones:** `harbor`
- **Landmark:** Space Needle + underground (`spire`)
- **Capital dungeon:** The Underground City — boss Drowned Rainlord
- **Hazard:** flood
- **Bestiary prefix:** Needle (50 street originals; NY uses `ny-bestiary.json`)
- **OSM 3D pack:** none yet — geoStub named streets until `npm run maps -- seattle`

## Named downtown streets (geoStub)

- 3rd Avenue (avenue)
- Pike Street (street)

## Anchors (offsets from downtown origin)

- `plaza` · Westlake Park (plaza)
- `civic` · Space Needle (civic)
- `dungeon` · Underground City gate (dungeon)
- `bus` · Pike curb (bus)

## Google reference workflow (human, in a browser)

1. **Map** — numbered/named grid, plaza, dungeon door: https://www.google.com/maps/@47.61,-122.33,16z
2. **Satellite** — roof lots, parks, water, rail.
3. **Street View** — curb height, landmark silhouette, storefront rhythm. Never capture frames into this repo.
4. **Terrain** — use it; elevation matters for this downtown.

`flavor:` Act I. Streets under streets, always wet.

## Ship rule

Keep NY playable first. This folder is notes for a recognizable shell, not a tile cache.
