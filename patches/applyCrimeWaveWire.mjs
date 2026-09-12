/**
 * Idempotent surgical wire for Game.ts + Overlay.ts in a titan-streets tree.
 * Run from game root: node patches/applyCrimeWaveWire.mjs
 * Or: node path/to/applyCrimeWaveWire.mjs --root C:\Users\csant\dev\titan-streets
 */
import fs from "fs";
import path from "path";

const root = process.argv.includes("--root")
  ? process.argv[process.argv.indexOf("--root") + 1]
  : process.cwd();

function findGameTs(r) {
  for (const p of ["src/Game.ts", "src/game/Game.ts", "src/core/Game.ts"]) {
    const full = path.join(r, p);
    if (fs.existsSync(full)) return full;
  }
  return null;
}

function ensureImport(text, clause) {
  if (text.includes(clause.split(" from ")[0].replace("import ", ""))) {
    // rough: if CrimeWaveBoard already imported, skip
  }
  if (text.includes(clause)) return text;
  const m = text.match(/^import .+;$/m);
  if (!m) return clause + "\n" + text;
  // insert after last import
  const lines = text.split("\n");
  let lastImport = 0;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith("import ")) lastImport = i;
  }
  lines.splice(lastImport + 1, 0, clause);
  return lines.join("\n");
}

const gamePath = findGameTs(root);
if (!gamePath) {
  console.error("Game.ts not found under", root);
  process.exit(1);
}

let game = fs.readFileSync(gamePath, "utf8");
const before = game;

game = ensureImport(
  game,
  'import { CrimeWaveBoard } from "./systems/CrimeWaveBoard";',
);
// fix path relative to Game.ts location
const gameDir = path.dirname(gamePath);
const systemsRel = path.relative(gameDir, path.join(root, "src/systems")).replace(/\\/g, "/") || ".";
const dataRel = path.relative(gameDir, path.join(root, "src/data")).replace(/\\/g, "/") || ".";
game = game.replace(
  'import { CrimeWaveBoard } from "./systems/CrimeWaveBoard";',
  `import { CrimeWaveBoard } from "${systemsRel}/CrimeWaveBoard";`,
);
if (!game.includes("DesertWarzone")) {
  game = ensureImport(game, `import { DesertWarzone, ASH_FLATS_CITY_ID } from "${systemsRel}/DesertWarzone";`);
}
if (!game.includes("KaijuPit")) {
  game = ensureImport(game, `import { KaijuPit } from "${systemsRel}/KaijuPit";`);
}
if (!game.includes("crimeWaveById")) {
  game = ensureImport(game, `import { crimeWaveById } from "${dataRel}/crimeWave";`);
}

if (!game.includes("private crimeWave")) {
  game = game.replace(
    /private quests!: QuestSystem;/,
    `private quests!: QuestSystem;\n  private crimeWave = new CrimeWaveBoard();\n  private desert = new DesertWarzone();\n  private kaiju = new KaijuPit();`,
  );
}

if (!game.includes("this.crimeWave.group")) {
  game = game.replace(
    /this\.scene\.add\(this\.quests\.group\);/,
    `this.scene.add(this.quests.group);\n    this.desert.attachToNy(this.world.playerSpawn);\n    this.scene.add(this.desert.group);\n    this.scene.add(this.crimeWave.group);\n    this.scene.add(this.kaiju.group);\n    this.crimeWave.syncFromSave(this.save);`,
  );
}

if (!game.includes("id.startsWith(\"cw-\")") && !game.includes("id.startsWith('cw-')")) {
  game = game.replace(
    /private acceptQuest\(id: string\): void \{/,
    `private acceptQuest(id: string): void {\n    if (id.startsWith("cw-")) {\n      this.crimeWave.accept(this.save, id, {\n        toast: (m) => this.pushToast(m),\n        grantXp: (n) => this.grantXp(n),\n        writeSave: () => writeSave(this.save),\n        enterPlay: () => this.enterPlay(),\n        travelTo: (cid) => this.travelTo(cid),\n      });\n      return;\n    }`,
  );
}

if (!game.includes("this.crimeWave.missionLine")) {
  game = game.replace(
    /let mission = obj \?/,
    `const cwMission = this.crimeWave.missionLine(this.save);\n    if (this.kaiju.active) {\n      mission = this.kaiju.hudLine();\n    } else if (cwMission) {\n      mission = cwMission;\n    }\n    let mission = obj ?`,
  );
  // Fix double-declaration if the naive replace broke — prefer safer block
  if (game.includes("if (this.kaiju.active)") && game.includes("let mission = obj") && game.includes("mission = this.kaiju")) {
    // rewrite drawHud mission init more carefully
    game = game.replace(
      /const cwMission = this\.crimeWave\.missionLine\(this\.save\);\n    if \(this\.kaiju\.active\) \{\n      mission = this\.kaiju\.hudLine\(\);\n    \} else if \(cwMission\) \{\n      mission = cwMission;\n    \}\n    let mission = obj \? `\$\{obj\.title\} — \$\{obj\.blurb\}` : `\$\{city\.storyLine\} Open the map \(M\) for the chain\.`;/,
      `let mission = obj ? \`\${obj.title} — \${obj.blurb}\` : \`\${city.storyLine} Open the map (M) for the chain.\`;\n    const cwMission = this.crimeWave.missionLine(this.save);\n    if (this.kaiju.active) mission = this.kaiju.hudLine();\n    else if (cwMission) mission = cwMission;`,
    );
  }
}

if (!game.includes("this.crimeWave.collectPins")) {
  game = game.replace(
    /private collectPins\(\): MapPin\[\] \{/,
    `private collectPins(): MapPin[] {\n    // Crime Wave pins appended near end — see marker CRIME_WAVE_PINS`,
  );
  if (!game.includes("CRIME_WAVE_PINS_APPLIED")) {
    game = game.replace(
      /this\.pinCache = \{ t: now, pins \};/,
      `pins.push(...(this.crimeWave.collectPins(this.save, { x: this.world.playerSpawn.x, z: this.world.playerSpawn.z }) as unknown as MapPin[])); // CRIME_WAVE_PINS_APPLIED\n    this.pinCache = { t: now, pins };`,
    );
  }
}

if (!game.includes("kaiju.active") || !game.includes("tryOpenKaijuPit")) {
  // Insert at start of tryInteract body
  if (!game.includes("CRIME_WAVE_INTERACT")) {
    game = game.replace(
      /private tryInteract\(\): void \{\n    if \(this\.player\.driving\) \{/,
      `private tryInteract(): void {\n    // CRIME_WAVE_INTERACT\n    if (this.kaiju.active) {\n      if (this.kaiju.phase === "finish") this.kaiju.doFinish({ toast: (m) => this.pushToast(m) });\n      else this.kaiju.exit({ toast: (m) => this.pushToast(m) });\n      return;\n    }\n    if (this.desert.tryOpenKaijuPit(this.player.position)) {\n      this.kaiju.enter({ toast: (m) => this.pushToast(m) });\n      return;\n    }\n    if (this.desert.nearGate(this.player.position)) {\n      if (this.desert.state === "inWarzone") this.desert.leaveToNy({ toast: (m) => this.pushToast(m), travelToNy: () => this.travelTo("new-york") });\n      else this.desert.enterWarzone({ toast: (m) => this.pushToast(m) });\n      return;\n    }\n    if (this.player.driving) {`,
    );
  }
}

if (!game.includes("this.desert.update") && game.includes("this.comics.tick(dt, this.player)")) {
  game = game.replace(
    /this\.comics\.tick\(dt, this\.player\);\n    \/\/ Ces: do NOT auto-enter comics/,
    `this.comics.tick(dt, this.player);\n    if (this.kaiju.active) {\n      this.kaiju.update(dt, { toast: (m) => this.pushToast(m) });\n      this.cam.update(dt, this.camera, this.player, false);\n      return;\n    }\n    {\n      const d = this.desert.update(dt, this.player.position);\n      if (d.toast) this.pushToast(d.toast);\n    }\n    // Ces: do NOT auto-enter comics`,
  );
}

if (game !== before) {
  fs.writeFileSync(gamePath, game);
  console.log("Patched", gamePath);
} else {
  console.log("No Game.ts changes needed (already wired or patterns unmatched)");
}

// Overlay: append crime wave HTML into renderQuests if present
const overlayCandidates = ["src/Overlay.ts", "src/ui/Overlay.ts"].map((p) => path.join(root, p));
const overlayPath = overlayCandidates.find((p) => fs.existsSync(p));
if (overlayPath) {
  let ov = fs.readFileSync(overlayPath, "utf8");
  if (!ov.includes("CrimeWaveBoard") && !ov.includes("crime-wave")) {
    if (!ov.includes('from "../data/crimeWave"') && !ov.includes("crimeWave")) {
      ov = `import { CRIME_WAVE_CONTACTS, crimeWaveStatus } from "./data/crimeWave";\n` + ov;
      // fix relative
      const odir = path.dirname(overlayPath);
      const drel = path.relative(odir, path.join(root, "src/data")).replace(/\\/g, "/") || ".";
      ov = ov.replace(
        'import { CRIME_WAVE_CONTACTS, crimeWaveStatus } from "./data/crimeWave";',
        `import { CRIME_WAVE_CONTACTS, crimeWaveStatus } from "${drel}/crimeWave";`,
      );
    }
    if (ov.includes("board.innerHTML = QUESTS.map") && !ov.includes("CRIME_WAVE_BOARD_HTML")) {
      ov = ov.replace(
        /board\.innerHTML = QUESTS\.map/,
        `board.innerHTML = (QUESTS.map`,
      );
      // Too risky — instead append after join
      ov = ov.replace(
        /\}\)\.join\(""\);\n    const drop = this\.root\.querySelector/,
        `}).join("")) + "<!-- CRIME_WAVE_BOARD_HTML -->" + CRIME_WAVE_CONTACTS.map((q) => {\n      const st = crimeWaveStatus(save, q);\n      const label = st === "active" ? "On the job" : st === "done" ? "Finished" : "Take job";\n      const extra = st === "active" ? \`\${save.questProgress}/\${q.objectives.length}\` : \`$\${q.rewards.smashCash} · \${q.rewards.xp} XP\`;\n      return \`<article class="quest-card crime-wave \${st}"><p class="eyebrow">\${q.contact} · \${q.archetype}</p><h3>\${q.title}</h3><p>\${q.blurb}</p><p class="lock">\${extra}</p><div class="actions"><button type="button" class="cta" data-quest="\${q.id}" \${st === "open" ? "" : "disabled"}>\${label}</button></div></article>\`;\n    }).join("");\n    const drop = this.root.querySelector`,
      );
      // Fix the broken QUESTS.map paren if we only half-applied
      ov = ov.replace("board.innerHTML = (QUESTS.map", "board.innerHTML = QUESTS.map");
    }
    fs.writeFileSync(overlayPath, ov);
    console.log("Patched", overlayPath);
  } else {
    console.log("Overlay already has crime-wave hooks or skipped");
  }
} else {
  console.log("Overlay.ts not found — board HTML via CrimeWaveBoard.renderBoardHtml");
}

console.log("Done. See Docs/CRIME_WAVE_AND_KAIJU_PIT.md");
