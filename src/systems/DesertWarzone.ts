/**
 * Ash Flats desert warzone — intentional fight sandbox.
 * Separate from Origin / Gamma Bomb comic sand.
 * Game.ts must keep comic proximity auto-enter DISABLED; desert is travel-only.
 */
import * as THREE from "three";

export const ASH_FLATS_CITY_ID = "ash-flats";

export type DesertWarState = "idle" | "atGate" | "inWarzone" | "nearKaiju";

/**
 * Travel marker from NY (bus/gate). Call from Game.collectPins + tryInteract.
 * Does NOT auto-enter comics. Does NOT replace ComicSystem Origin sand.
 */
export class DesertWarzone {
  readonly group = new THREE.Group();
  state: DesertWarState = "idle";
  gatePos = new THREE.Vector3(42, 0, -28);
  kaijuEncounterPos = new THREE.Vector3(120, 0, 80);
  private gateMesh: THREE.Mesh;
  private kaijuBeacon: THREE.Mesh;
  private waveT = 0;
  private hostiles = 0;

  constructor() {
    this.group.name = "DesertWarzone";
    const gateMat = new THREE.MeshStandardMaterial({
      color: 0xc4a06a,
      roughness: 0.7,
      metalness: 0.15,
      // no transmission / thickness — GRID/perf rules
    });
    this.gateMesh = new THREE.Mesh(new THREE.BoxGeometry(6, 8, 2), gateMat);
    this.gateMesh.position.copy(this.gatePos).setY(4);
    this.group.add(this.gateMesh);

    const kaijuMat = new THREE.MeshBasicMaterial({ color: 0xff6644, transparent: true, opacity: 0.7 });
    this.kaijuBeacon = new THREE.Mesh(new THREE.SphereGeometry(2.2, 10, 10), kaijuMat);
    this.kaijuBeacon.position.copy(this.kaijuEncounterPos).setY(3);
    this.kaijuBeacon.visible = false;
    this.group.add(this.kaijuBeacon);

    // Sand plane for warzone only (not comic Origin).
    const sand = new THREE.Mesh(
      new THREE.PlaneGeometry(420, 420),
      new THREE.MeshStandardMaterial({ color: 0xc2a36b, roughness: 0.95, metalness: 0.02 }),
    );
    sand.rotation.x = -Math.PI / 2;
    sand.position.set(80, 0.02, 40);
    sand.visible = false;
    sand.name = "ash-flats-sand";
    this.group.add(sand);
  }

  /** Place gate relative to NY player spawn / plaza. */
  attachToNy(spawn: THREE.Vector3): void {
    this.gatePos.set(spawn.x + 42, 0, spawn.z - 28);
    this.gateMesh.position.set(this.gatePos.x, 4, this.gatePos.z);
  }

  nearGate(player: THREE.Vector3, radius = 7): boolean {
    return player.distanceTo(this.gatePos) < radius;
  }

  nearKaiju(player: THREE.Vector3, radius = 10): boolean {
    return this.state === "inWarzone" && player.distanceTo(this.kaijuEncounterPos) < radius;
  }

  /**
   * Intentional enter — call from tryInteract at bus gate, or travelTo("ash-flats").
   * Never from comic proximity.
   */
  enterWarzone(hooks: { toast: (m: string) => void; hideCity?: () => void }): void {
    this.state = "inWarzone";
    this.hostiles = 12;
    this.waveT = 0;
    const sand = this.group.getObjectByName("ash-flats-sand");
    if (sand) sand.visible = true;
    this.kaijuBeacon.visible = true;
    hooks.hideCity?.();
    hooks.toast("Ash Flats warzone — intentional sandbox. Bus gate returns to NY. Comics stay off.");
  }

  leaveToNy(hooks: { toast: (m: string) => void; showCity?: () => void; travelToNy?: () => void }): void {
    this.state = "idle";
    this.hostiles = 0;
    const sand = this.group.getObjectByName("ash-flats-sand");
    if (sand) sand.visible = false;
    this.kaijuBeacon.visible = false;
    hooks.showCity?.();
    hooks.travelToNy?.();
    hooks.toast("Back on NY asphalt. Origin comic sand was never this bus.");
  }

  update(dt: number, player: THREE.Vector3): { toast?: string; openKaijuPit?: boolean } {
    if (this.state === "idle") {
      if (this.nearGate(player)) {
        this.state = "atGate";
        return { toast: "H — board Ash Flats bus (desert warzone, not Origin comic)" };
      }
      return {};
    }
    if (this.state === "atGate" && !this.nearGate(player)) {
      this.state = "idle";
      return {};
    }
    if (this.state !== "inWarzone") return {};

    this.waveT += dt;
    this.kaijuBeacon.position.y = 3 + Math.sin(this.waveT * 2) * 0.4;
    if (this.nearKaiju(player)) {
      return {
        toast: "Kaiju silhouette restless — H to enter the Kaiju Pit arena",
        openKaijuPit: false,
      };
    }
    return {};
  }

  /** Interact while in warzone near kaiju beacon. */
  tryOpenKaijuPit(player: THREE.Vector3): boolean {
    return this.nearKaiju(player);
  }

  applySmash(_origin: THREE.Vector3, _r: number, _dmg: number): number {
    if (this.state !== "inWarzone" || this.hostiles <= 0) return 0;
    this.hostiles = Math.max(0, this.hostiles - 1);
    return 1;
  }

  prompt(player: THREE.Vector3): string {
    if (this.state === "atGate" || (this.state === "idle" && this.nearGate(player))) {
      return "H — Ash Flats bus (desert warzone)";
    }
    if (this.state === "inWarzone" && this.nearKaiju(player)) {
      return "H — enter Kaiju Pit";
    }
    if (this.state === "inWarzone" && this.nearGate(player)) {
      return "H — bus back to New York";
    }
    return "";
  }

  dispose(): void {
    this.group.traverse((o) => {
      if (o instanceof THREE.Mesh) {
        o.geometry.dispose();
        const m = o.material;
        if (Array.isArray(m)) m.forEach((x) => x.dispose());
        else m.dispose();
      }
    });
    this.group.clear();
  }
}
