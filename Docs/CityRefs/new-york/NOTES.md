# 01 · New York

Private layout notes. **Do not dump Google tiles, Street View frames, or satellite imagery here.**

## Playable identity

- **Slug:** `new-york`
- **Order:** 1 / 50
- **Downtown origin:** 40.758, -73.9855 (WGS84)
- **Districts:** Times Square, Hell's Kitchen, Bryant Park, Midtown West
- **Skyline:** Numbered grid, glass towers, yellow cabs, 42nd Street cut
- **Bones:** `manhattan-grid`
- **Landmark:** Times Square + Port Authority (`towers`)
- **Capital dungeon:** The Turnstile Tunnels — boss Turnstile Ghoul
- **Hazard:** flood
- **Bestiary prefix:** Curb (50 street originals; NY uses `ny-bestiary.json`)
- **OSM 3D pack:** `public/maps/new-york.json`

## Named downtown streets (geoStub)

- 7th Avenue (avenue)
- Broadway (avenue)
- 6th Avenue (avenue)
- 42nd Street (street)
- 44th Street (street)
- 40th Street (street)

## Anchors (offsets from downtown origin)

- `bus` · Port Authority Bus Terminal (bus)
- `plaza` · Times Square (plaza)
- `park` · Bryant Park (park)
- `civic` · New York Public Library (civic)
- `dungeon` · Times Square–42nd Street (dungeon)
- `diner` · 42nd Street & 8th Avenue (diner)

## Google reference workflow (human, in a browser)

1. **Map** — numbered/named grid, plaza, dungeon door: https://www.google.com/maps/@40.758,-73.9855,16z
2. **Satellite** — roof lots, parks, water, rail.
3. **Street View** — curb height, landmark silhouette, storefront rhythm. Never capture frames into this repo.
4. **Terrain** — optional; downtown is mostly a flat curb for smash play.

`flavor:` Flooded subway. Watch the waterline.

## Ship rule

Keep NY playable first. This folder is notes for a recognizable shell, not a tile cache.

## New York Midtown fidelity (playable)

- Maps JS hub / Times Square plaza: **40.758, −73.9855**
- OSM pack origin / drop-in curb: Port Authority Bus Terminal **40.7569, −73.9903**
- Avenues (N–S): 7th, Broadway, 6th; cross streets (E–W): 42nd, 44th, 40th
- Plaza = Times Square. Dungeon door = Times Square–42nd Street station
- Civic = New York Public Library. Park = Bryant Park
- Cached OSM: `public/maps/new-york.json` (do not Overpass-fetch the other 49 in this pass)
- Google Road / Satellite on the in-game **M** map only if a gitignored `VITE_GOOGLE_MAPS_API_KEY` is present
