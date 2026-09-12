# 02 · Los Angeles

Private layout notes. **Do not dump Google tiles, Street View frames, or satellite imagery here.**

## Playable identity

- **Slug:** `los-angeles`
- **Order:** 2 / 50
- **Downtown origin:** 34.05, -118.24 (WGS84)
- **Districts:** Downtown, Bunker Hill, Arts District
- **Skyline:** Palm haze, City Hall, hills west
- **Bones:** `desert`
- **Landmark:** City Hall + Hollywood hills ghost (`hollywood`)
- **Capital dungeon:** The Tar Pits — boss Saber-Wraith Matriarch
- **Hazard:** tar
- **Bestiary prefix:** Tar (50 street originals; NY uses `ny-bestiary.json`)
- **OSM 3D pack:** none yet — geoStub named streets until `npm run maps -- los-angeles`

## Named downtown streets (geoStub)

- Figueroa Street (avenue)
- 7th Street (street)

## Anchors (offsets from downtown origin)

- `plaza` · Pershing Square (plaza)
- `civic` · Los Angeles City Hall (civic)
- `dungeon` · La Brea / Tar Pits gate (dungeon)
- `bus` · Figueroa curb (bus)

## Google reference workflow (human, in a browser)

1. **Map** — numbered/named grid, plaza, dungeon door: https://www.google.com/maps/@34.05,-118.24,16z
2. **Satellite** — roof lots, parks, water, rail.
3. **Street View** — curb height, landmark silhouette, storefront rhythm. Never capture frames into this repo.
4. **Terrain** — use it; elevation matters for this downtown.

`flavor:` Tar that holds a leap.

## Ship rule

Keep NY playable first. This folder is notes for a recognizable shell, not a tile cache.
