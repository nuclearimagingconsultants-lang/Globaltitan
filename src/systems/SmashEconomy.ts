import * as THREE from "three";
import {
  BEAT_LABEL,
  GAMMA_ECHOES,
  REP_UNLOCKS,
  SMASH,
  formUnlocked,
  medalFor,
  rageRepFromDamage,
  wantedTier,
  type GammaEchoId,
  type MissionBeat,
  type SmashReport,
} from "../data/smashEconomy";
import type { HulkKind, SaveData } from "../data/types";

export type EchoPickup = {
  id: GammaEchoId;
  mesh: THREE.Group;
};

export class SmashLedger {
  display = 0;
  hotT = 0;
  beat: MissionBeat = "travel";
  jobT = 0;
  jobHero = 0;
  jobMenace = 0;
  jobVehicles = 0;
  jobBuildings = 0;
  jobStyles = 0;
  jobTitle = "Street job";
  lastStars = 0;
  rampage: { left: number; target: number; startDamage: number } | null = null;
  rampageTried = false;
  report: SmashReport | null = null;
  readonly echoes = new THREE.Group();
  private echoNodes: EchoPickup[] = [];
  private lastKind: HulkKind | null = null;
  private targetDisplay = 0;

  hydrate(save: SaveData): void {
    this.display = save.damageCash;
    this.targetDisplay = save.damageCash;
    this.lastKind = save.hulkKind;
  }

  tick(dt: number): void {
    this.hotT = Math.max(0, this.hotT - dt);
    this.jobT += dt;
    if (this.rampage) this.rampage.left = Math.max(0, this.rampage.left - dt);
    const gap = Math.abs(this.targetDisplay - this.display);
    if (gap < 1) {
      this.display = this.targetDisplay;
      return;
    }
    const step = Math.max(40, gap * SMASH.tickPerSec * dt);
    this.display += Math.sign(this.targetDisplay - this.display) * Math.min(gap, step);
  }

  addDamage(save: SaveData, amount: number): number {
    if (amount <= 0) return save.reputation;
    save.damageCash += Math.floor(amount);
    const next = rageRepFromDamage(save.damageCash);
    const gained = next - save.reputation;
    save.reputation = next;
    this.targetDisplay = save.damageCash;
    this.hotT = 2.2;
    return gained;
  }

  noteProperty(save: SaveData, cars: number, buildings: number, chips: number): string | null {
    const before = save.reputation;
    if (cars) {
      save.vehiclesSmashed += cars;
      this.jobVehicles += cars;
    }
    if (buildings) {
      save.craters += buildings;
      this.jobBuildings += buildings;
    }
    this.addDamage(save, cars * SMASH.vehicle + buildings * SMASH.building + chips * SMASH.property);
    if (this.beat === "setup" || this.beat === "escalation" || this.beat === "travel") this.beat = "setpiece";
    return save.reputation > before ? this.unlockToast(before, save.reputation) : null;
  }

  noteBystander(save: SaveData, menace: boolean): void {
    if (menace) {
      save.menaceCivilians += 1;
      this.jobMenace += 1;
    } else {
      save.heroCivilians += 1;
      this.jobHero += 1;
    }
  }

  noteStyle(): void {
    this.jobStyles += 1;
    this.hotT = Math.max(this.hotT, 0.8);
  }

  noteForm(kind: HulkKind): void {
    if (this.lastKind && this.lastKind !== kind) this.jobStyles += 1;
    this.lastKind = kind;
  }

  beginJob(title: string): void {
    this.jobTitle = title;
    this.jobT = 0;
    this.jobHero = 0;
    this.jobMenace = 0;
    this.jobVehicles = 0;
    this.jobBuildings = 0;
    this.jobStyles = 0;
    this.beat = "trigger";
  }

  advanceBeat(next: MissionBeat): void {
    this.beat = next;
  }

  finishJob(save: SaveData, title: string, savedCivilians: number): SmashReport {
    this.addDamage(save, SMASH.crimeClear + savedCivilians * SMASH.civilianSaved);
    save.heroCivilians += savedCivilians;
    const raw = {
      title,
      damage: Math.round(save.damageCash),
      vehicles: this.jobVehicles,
      buildings: this.jobBuildings,
      heroCivilians: this.jobHero + savedCivilians,
      menaceCivilians: this.jobMenace,
      timeSec: this.jobT,
      styleSwitches: this.jobStyles,
    };
    const report: SmashReport = {
      ...raw,
      medal: medalFor(raw),
      beat: BEAT_LABEL.report,
    };
    this.report = report;
    this.beat = "report";
    return report;
  }

  startRampage(): void {
    if (this.rampageTried) return;
    this.rampageTried = true;
    this.rampage = { left: SMASH.rampageSec, target: SMASH.rampageTarget, startDamage: this.targetDisplay };
    this.beat = "setpiece";
  }

  rampageLine(save: SaveData): string {
    if (!this.rampage) return "";
    const got = Math.max(0, save.damageCash - this.rampage.startDamage);
    const sec = Math.ceil(this.rampage.left);
    const m = Math.floor(sec / 60);
    const s = (sec % 60).toString().padStart(2, "0");
    return `RAMPAGE ${m}:${s}  ${got.toLocaleString()} / ${this.rampage.target.toLocaleString()}`;
  }

  closeRampage(save: SaveData): SmashReport | null {
    if (!this.rampage) return null;
    const got = Math.max(0, save.damageCash - this.rampage.startDamage);
    const raw = {
      title: got >= this.rampage.target ? "Smash Rampage — target smashed" : "Smash Rampage — time",
      damage: got,
      vehicles: this.jobVehicles,
      buildings: this.jobBuildings,
      heroCivilians: this.jobHero,
      menaceCivilians: this.jobMenace,
      timeSec: SMASH.rampageSec - this.rampage.left,
      styleSwitches: this.jobStyles,
    };
    const report: SmashReport = {
      ...raw,
      medal: medalFor(raw, this.rampage.target),
      beat: BEAT_LABEL.report,
    };
    this.rampage = null;
    this.report = report;
    this.beat = "report";
    return report;
  }

  spawnEchoes(origin: THREE.Vector3, collected: string[]): void {
    this.clearEchoes();
    for (const def of GAMMA_ECHOES) {
      if (collected.includes(def.id)) continue;
      const g = new THREE.Group();
      const mat = new THREE.MeshLambertMaterial({
        color: def.color,
        emissive: def.color,
        emissiveIntensity: 0.55,
      });
      const core = new THREE.Mesh(new THREE.OctahedronGeometry(0.55, 0), mat);
      core.position.y = 1.4;
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(0.7, 0.95, 20),
        new THREE.MeshBasicMaterial({
          color: def.color,
          transparent: true,
          opacity: 0.45,
          side: THREE.DoubleSide,
          depthWrite: false,
        }),
      );
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = 0.08;
      g.add(core, ring);
      g.position.set(origin.x + def.ox, 0, origin.z + def.oz);
      this.echoes.add(g);
      this.echoNodes.push({ id: def.id, mesh: g });
    }
  }

  collectEcho(from: THREE.Vector3, save: SaveData): string | null {
    for (let i = 0; i < this.echoNodes.length; i++) {
      const n = this.echoNodes[i]!;
      if (n.mesh.position.distanceTo(from) > 2.6) continue;
      this.echoes.remove(n.mesh);
      this.echoNodes.splice(i, 1);
      if (!save.echoes.includes(n.id)) save.echoes.push(n.id);
      this.addDamage(save, SMASH.echo);
      return `Gamma echo ${n.id} filed. ${4 - save.echoes.length} left.`;
    }
    return null;
  }

  tickEchoes(t: number): void {
    for (const n of this.echoNodes) {
      const core = n.mesh.children[0];
      if (!core) continue;
      core.rotation.y = t * 1.4;
      core.position.y = 1.4 + Math.sin(t * 3 + n.id.charCodeAt(0)) * 0.12;
    }
  }

  clearEchoes(): void {
    this.echoes.clear();
    this.echoNodes = [];
  }

  starToast(stars: number): string | null {
    if (stars === this.lastStars) return null;
    const prev = this.lastStars;
    this.lastStars = stars;
    if (stars > prev) {
      const tier = wantedTier(stars);
      return tier ? `Wanted ${"★".repeat(stars)} · ${tier.unit}` : null;
    }
    if (stars === 0 && prev > 0) return "Heat gone. Walk it off.";
    return null;
  }

  canPickForm(kind: HulkKind, save: SaveData | number): boolean {
    return formUnlocked(kind, save);
  }

  private unlockToast(before: number, after: number): string | null {
    const hit = REP_UNLOCKS.filter((u) => before < u.rep && after >= u.rep);
    if (!hit.length) return null;
    return `Rage Rep ${after} — ${hit.map((h) => h.label).join(" · ")}`;
  }
}
