# Capital boss Kill / Spare unlocks

Additive on the Maps+Hulk path. Do not strip existing forms, Anger Loop, or Vol2 modules.

## After every capital boss

Mandatory binary modal: **Kill** or **Spare**. No silent default. Esc / pause / menus blocked until a click.

Persist:

- `bossesKilled: CityId[]`
- `bossesSpared: CityId[]`

Both paths stay open. Hitting 37 on **both** counters unlocks **both** form pairs.

| Counter | Threshold | Unlocks |
| --- | --- | --- |
| `bossesKilled.length` | 37 | Hell Hulk + Mephisto Bruce |
| `bossesSpared.length` | 37 | Cosmic Hulk + Dr. Iron Strange (armor-wielding sorcerer) |

Form kits are stubs (palette + HUD + radial). Toast + comic splash on the 37th.

## Post-boss beats

- **City 1 New York**, after the choice: healing-factor + claws rival (IP alias **Razorback**). Queued if still in the dungeon; fires on street exit.
- **Cities 2+:** stub hook `PostBossBeat_<cityId>` only (toast). Ces TBD.

## Status

- **DONE:** modal, counters, NY Razorback beat after choice, form gates.
- **PARTIAL:** Hell / Cosmic / Mephisto / Iron Strange kit numbers. Cities 2+ beats.
