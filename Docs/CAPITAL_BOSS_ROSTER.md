# Capital boss roster

Additive overlay on the Maps+Hulk path. Existing original dungeon names in `src/data/cities.ts` stay as Legacy flavor. Live capital fights read `data/CAPITAL_BOSS_ROSTER.json`.

## Rules

- **City 1 New York:** `TBD_NY_CapitalBoss` (stub). After mandatory Kill/Spare → **Razorback** post-boss beat.
- **Cities 2+:** reverse Marvel Threat Compendium (weak → strong).
  - Los Angeles = **Toad** (#70)
  - Chicago = **Stilt-Man** (#69)
  - Houston = **Leap-Frog** (#68)
  - Boston onward = **Trapster** (#67) climbing to **Beyonder** (#01) on Anchorage.
- Threat ranks **46–50** are screenshot gaps: `TBD_ThreatRank_46` … `TBD_ThreatRank_50`.
- Every capital boss: mandatory **Kill / Spare** (`bossesKilled` / `bossesSpared`). No silent default.
- Working **Marvel names** in JSON. `remapKey` / `ipAlias` are Worldbreaker IP-alias hooks (identity for now). **Original faces** only — procedural mesh, no likeness.
- Do not strip World Breaker default form, Anger Loop, or extra forms.

## Debug

Pause or title → **Capital bosses (debug)**. NY → LA chain is listed first and selectable (Drop in / Fight).

## Status

- **DONE:** JSON loads, NY stub + LA Toad encounters, debug picker, Kill/Spare gate.
- **PARTIAL:** kit numbers for ranks 46–50 and most move sets; cities 2+ post-boss beats are stub hooks.
