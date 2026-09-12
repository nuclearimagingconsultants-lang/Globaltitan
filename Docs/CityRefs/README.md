# CityRefs — private geography notes

Travel map is **seventy-one Sanctuary downtowns** (none dropped — Austin, Miami, DC stay) plus Charleston SC and Bridgeport on the largest-per-state chain. Primary unlock is still **1 New York → 50 Huntsville**. Unique ids: `portland` vs `portland-me`, `charleston-sc` vs `charleston-wv`. Legacy folder `Docs/CityRefs/portland/` is Oregon.

Old Sanctuary-Shadow downtowns that are not largest-in-state stay as selectable **extras** (not on the 1–50 chain).

This folder is **human reference**, not a tile cache.

## Google Maps (reference only)

Use **Map + Satellite + Street View**, and **Terrain** where elevation matters (Denver, Pittsburgh, Phoenix, the West Coast, Honolulu, Anchorage).

Do **not**:

- scrape Google tiles, Street View frames, or satellite imagery
- commit JPGs/PNGs/WebP under `Docs/CityRefs/`
- ship Google tiles as game assets

Google in the running game is **2D Maps JavaScript only** (Road / Satellite on the full map) when a gitignored `VITE_GOOGLE_MAPS_API_KEY` is present. No Street View or Terrain layer in-game.

## OSM for 3D streets

OpenStreetMap Overpass (`npm run maps -- <id>`) is the allowed 3D street/building path. Cached packs today: New York, Boston, Philadelphia, Washington DC. Do not Overpass-fetch all 50 in a freeze-net pass — other cities use named downtown **geoStub** bones from `src/data/cityShells.ts`.

## Layout

- [INDEX.md](INDEX.md) — order 1–50
- `<CitySlug>/NOTES.md` — districts, landmark, dungeon, named streets, anchors, Maps URL for a human browser session

Playable identity is code: `src/data/cityShells.ts` merged into `src/data/cities.ts`. NY stays first and playable.
