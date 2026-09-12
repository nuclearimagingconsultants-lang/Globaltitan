/**
 * Crime Wave board — extends the existing quest board fantasy.
 * Reuses SaveData activeQuestId / questProgress / completedQuests so Overlay
 * and Game.acceptQuest patterns keep working. Prefer wiring via Game hooks
 * rather than replacing QuestSystem.
 */
import * as THREE from "three";
import {
  CRIME_WAVE_CONTACTS,
  crimeWaveById,
  crimeWaveStatus,
  desertBusGatePin,
  type CrimeWaveContact,
  type CrimeWavePin,
} from "../data/crimeWave";

export type CrimeWaveSaveSlice = {
  activeQuestId: string | null;
  questProgress: number;
  completedQuests: string[];
  cash: number;
  xp: number;
  cityId: string;
};

export type CrimeWaveBoardHooks = {
  toast: (msg: string) => void;
  grantXp: (amount: number) => void;
  writeSave: () => void;
  enterPlay?: () => void;
  travelTo?: (cityId: string) => void;
};

/** Lightweight world markers for active Crime Wave jobs (map pins + beacons). */
export class CrimeWaveBoard {
  readonly group = new THREE.Group();
  markers: { id: string; x: number; z: number; mesh: THREE.Mesh }[] = [];
  private beaconMat = new THREE.MeshBasicMaterial({ color: 0xb6ff55, transparent: true, opacity: 0.85 });
  private active: CrimeWaveContact | null = null;
  private objectiveIndex = 0;

  constructor() {
    this.group.name = "CrimeWaveBoard";
  }

  list(): CrimeWaveContact[] {
    return CRIME_WAVE_CONTACTS;
  }

  status(save: CrimeWaveSaveSlice, id: string): "active" | "done" | "open" {
    const c = crimeWaveById(id);
    return c ? crimeWaveStatus(save, c) : "open";
  }

  /** HTML fragment for Overlay board (additive panel or merge into #quest-board). */
  renderBoardHtml(save: CrimeWaveSaveSlice, filterCity?: string): string {
    const rows = CRIME_WAVE_CONTACTS.filter((c) => !filterCity || c.cityId === filterCity || c.cityId === "ash-flats");
    return rows
      .map((q) => {
        const st = crimeWaveStatus(save, q);
        const label = st === "active" ? "On the job" : st === "done" ? "Finished" : "Take job";
        const extra =
          st === "active"
            ? `${save.questProgress}/${q.objectives.length}`
            : `$${q.rewards.smashCash} · ${q.rewards.xp} XP`;
        return `<article class="quest-card crime-wave ${st}" data-archetype="${q.archetype}">
        <p class="eyebrow">${q.contact} · ${q.archetype}</p>
        <h3>${q.title}</h3>
        <p>${q.blurb}</p>
        <p class="lock">${extra} · ${q.rewards.rageHint}</p>
        <div class="actions">
          <button type="button" class="cta" data-crime-wave="${q.id}" ${st === "open" ? "" : "disabled"}>${label}</button>
        </div>
      </article>`;
      })
      .join("");
  }

  accept(save: CrimeWaveSaveSlice, id: string, hooks: CrimeWaveBoardHooks): boolean {
    const def = crimeWaveById(id);
    if (!def || crimeWaveStatus(save, def) !== "open") return false;
    save.activeQuestId = def.id;
    save.questProgress = 0;
    this.active = def;
    this.objectiveIndex = 0;
    this.rebuildMarkers(save);
    hooks.writeSave();
    hooks.toast(`Crime Wave: ${def.title} — ${def.contact}`);
    if (def.archetype === "desertWar" && def.cityId === "ash-flats" && save.cityId !== "ash-flats") {
      hooks.toast("Board the Ash Flats bus gate (map pin) — intentional desert warzone.");
    }
    hooks.enterPlay?.();
    return true;
  }

  abandon(save: CrimeWaveSaveSlice, hooks: CrimeWaveBoardHooks): void {
    save.activeQuestId = null;
    save.questProgress = 0;
    this.active = null;
    this.clearMarkers();
    hooks.writeSave();
    hooks.toast("Crime Wave job dropped");
  }

  /** Advance one objective; completes when all done. */
  noteObjective(save: CrimeWaveSaveSlice, hooks: CrimeWaveBoardHooks, amount = 1): void {
    if (!save.activeQuestId) return;
    const def = crimeWaveById(save.activeQuestId);
    if (!def) return;
    save.questProgress = Math.min(def.objectives.length, save.questProgress + amount);
    this.objectiveIndex = save.questProgress;
    if (save.questProgress >= def.objectives.length) this.complete(save, hooks);
    else {
      hooks.writeSave();
      const next = def.objectives[save.questProgress];
      if (next) hooks.toast(`Next: ${next}`);
    }
  }

  complete(save: CrimeWaveSaveSlice, hooks: CrimeWaveBoardHooks): void {
    const def = save.activeQuestId ? crimeWaveById(save.activeQuestId) : undefined;
    if (!def) return;
    save.cash += def.rewards.smashCash;
    hooks.grantXp(def.rewards.xp);
    if (!save.completedQuests.includes(def.id)) save.completedQuests.push(def.id);
    save.activeQuestId = null;
    save.questProgress = 0;
    this.active = null;
    this.clearMarkers();
    hooks.writeSave();
    hooks.toast(`${def.title} done  +$${def.rewards.smashCash} · ${def.rewards.rageHint}`);
  }

  /** HUD mission line when a Crime Wave job is active. */
  missionLine(save: CrimeWaveSaveSlice): string | null {
    const objIdx = this.objectiveIndex; void objIdx;
    if (!save.activeQuestId?.startsWith("cw-")) return null;
    const def = crimeWaveById(save.activeQuestId);
    if (!def) return null;
    const step = def.objectives[Math.min(save.questProgress, def.objectives.length - 1)] ?? def.blurb;
    return `Crime Wave · ${def.title}: ${save.questProgress}/${def.objectives.length} — ${step}`;
  }

  collectPins(save: CrimeWaveSaveSlice, spawn: { x: number; z: number }): CrimeWavePin[] {
    const pins: CrimeWavePin[] = [];
    if (save.cityId === "new-york") pins.push(desertBusGatePin(spawn.x, spawn.z));
    for (const m of this.markers) {
      const def = crimeWaveById(m.id);
      if (!def) continue;
      pins.push({
        id: `cw-pin-${m.id}`,
        kind: "crime",
        filter: "crime",
        x: m.x,
        z: m.z,
        title: def.title,
        blurb: def.blurb,
        typeLabel: def.archetype,
        trackable: true,
        objectiveId: def.id,
        travelCityId: def.cityId !== save.cityId ? def.cityId : undefined,
      });
    }
    return pins;
  }

  private rebuildMarkers(save: CrimeWaveSaveSlice): void {
    this.clearMarkers();
    const def = save.activeQuestId ? crimeWaveById(save.activeQuestId) : undefined;
    if (!def) return;
    // Procedural beacons around spawn ring — QuestSystem-compatible positions.
    const base = 18;
    def.objectives.forEach((_, i) => {
      const ang = (i / Math.max(1, def.objectives.length)) * Math.PI * 2;
      const x = Math.cos(ang) * (base + i * 6);
      const z = Math.sin(ang) * (base + i * 6);
      const mesh = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 8, 6), this.beaconMat);
      mesh.position.set(x, 4, z);
      this.group.add(mesh);
      this.markers.push({ id: def.id, x, z, mesh });
    });
  }

  private clearMarkers(): void {
    for (const m of this.markers) {
      this.group.remove(m.mesh);
      m.mesh.geometry.dispose();
    }
    this.markers = [];
  }

  syncFromSave(save: CrimeWaveSaveSlice): void {
    if (save.activeQuestId?.startsWith("cw-")) {
      this.active = crimeWaveById(save.activeQuestId) ?? null;
      this.rebuildMarkers(save);
    } else {
      this.active = null;
      this.clearMarkers();
    }
  }

  dispose(): void {
    this.clearMarkers();
    this.beaconMat.dispose();
    this.group.clear();
  }
}
