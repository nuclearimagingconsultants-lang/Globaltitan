# Surgical Game.ts / Overlay wiring (additive)

## Imports (Game.ts)
```ts
import { CrimeWaveBoard } from "./systems/CrimeWaveBoard"; // or ../systems
import { DesertWarzone, ASH_FLATS_CITY_ID } from "../systems/DesertWarzone";
import { KaijuPit } from "../systems/KaijuPit";
import { CRIME_WAVE_CONTACTS, crimeWaveById } from "../data/crimeWave";
```

## Fields
```ts
private crimeWave = new CrimeWaveBoard();
private desert = new DesertWarzone();
private kaiju = new KaijuPit();
```

## loadCity / drop-in
- After world spawn: `this.desert.attachToNy(this.world.playerSpawn); this.scene.add(this.desert.group); this.scene.add(this.crimeWave.group); this.scene.add(this.kaiju.group);`
- Keep comment: `// Ces: do NOT auto-enter comics on proximity` — do not add comic auto-enter.
- DROP IN stays NY (`HUB_CITY_ID`), never auto desert.

## acceptQuest branch
If `id.startsWith("cw-")`, call `this.crimeWave.accept(this.save, id, hooks)` instead of hunt-only sync.
Hooks: `{ toast: m => this.pushToast(m), grantXp: n => this.grantXp(n), writeSave: () => writeSave(this.save), enterPlay: () => this.enterPlay(), travelTo: id => this.travelTo(id) }`.

## drawHud mission line
Before generic quest line:
```ts
const cw = this.crimeWave.missionLine(this.save);
if (cw) mission = cw;
else if (this.kaiju.active) mission = this.kaiju.hudLine();
```

## tryInteract additions (order matters)
1. If `this.kaiju.active` && interact → exit or `doFinish` if finish phase.
2. Else if desert `tryOpenKaijuPit` → `this.kaiju.enter(...)`; hide city groups like comic enter.
3. Else if desert near gate → `enterWarzone` or `leaveToNy` / `travelTo("new-york")`.
4. Existing comics / lore / dungeon unchanged.

## collectPins
`pins.push(...this.crimeWave.collectPins(this.save, { x: this.world.playerSpawn.x, z: this.world.playerSpawn.z }));`

## Overlay
- Merge `crimeWave.renderBoardHtml(save, save.cityId)` into `#quest-board` or a `#crime-wave-board` panel.
- Bind `data-crime-wave` buttons → `onAcceptQuest` / dedicated `onAcceptCrimeWave`.

## Update loop
```ts
if (this.kaiju.active) { this.kaiju.update(dt, { toast: m => this.pushToast(m) }); /* optional side cam */ return; }
const d = this.desert.update(dt, this.player.position); if (d.toast) this.pushToast(d.toast);
```

Do not change GRID, CameraRig collision, or MeshPhysical transmission.
