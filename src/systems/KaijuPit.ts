/**
 * Kaiju Pit — side-camera arena (Mortal Kombat–style fantasy, NO MK IP names).
 * Enter from desert kaiju encounter; exit back to open-world Ash Flats / NY.
 * Specials draw from Rage / Gamma. Block/combo stubs. Original finish name.
 */
import * as THREE from "three";

export type KaijuPitPhase = "out" | "intro" | "fight" | "roundEnd" | "finish" | "victory" | "defeat";

/** Original finish — not Fatality / Friendship / etc. */
export const KAIJU_FINISH_NAME = "Worldbreaker Seal";

export type KaijuFighter = {
  name: string;
  hp: number;
  maxHp: number;
  blocking: boolean;
  comboStep: number;
  mesh: THREE.Group;
};

export class KaijuPit {
  readonly group = new THREE.Group();
  phase: KaijuPitPhase = "out";
  round = 1;
  readonly maxRounds = 3;
  playerWins = 0;
  foeWins = 0;
  player!: KaijuFighter;
  foe!: KaijuFighter;
  private sideCamOffset = new THREE.Vector3(0, 6, 14);
  private arenaFloor: THREE.Mesh;
  private clock = 0;
  private finishArmed = false;

  constructor() {
    this.group.name = "KaijuPit";
    this.group.visible = false;

    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x3a2a1a,
      roughness: 0.85,
      metalness: 0.08,
      // no transmission / thickness
    });
    this.arenaFloor = new THREE.Mesh(new THREE.BoxGeometry(28, 1, 10), floorMat);
    this.arenaFloor.position.y = -0.5;
    this.group.add(this.arenaFloor);

    // Side walls (depth cue for side-camera)
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x1a120c, roughness: 0.9, metalness: 0.05 });
    const back = new THREE.Mesh(new THREE.BoxGeometry(28, 10, 1), wallMat);
    back.position.set(0, 5, -5);
    this.group.add(back);

    this.player = this.makeFighter("World Breaker", 0x3d9b4a, -6);
    this.foe = this.makeFighter("Ash Kraken Spawn", 0x8b4518, 6);
  }

  private makeFighter(name: string, color: number, x: number): KaijuFighter {
    const g = new THREE.Group();
    const body = new THREE.Mesh(
      new THREE.CapsuleGeometry(1.1, 2.4, 4, 8),
      new THREE.MeshStandardMaterial({ color, roughness: 0.55, metalness: 0.05 }),
    );
    body.position.y = 2.2;
    g.add(body);
    g.position.set(x, 0, 0);
    this.group.add(g);
    return { name, hp: 100, maxHp: 100, blocking: false, comboStep: 0, mesh: g };
  }

  get active(): boolean {
    return this.phase !== "out";
  }

  /** Enter from desert kaiju encounter. */
  enter(hooks: { toast: (m: string) => void }): void {
    this.phase = "intro";
    this.round = 1;
    this.playerWins = 0;
    this.foeWins = 0;
    this.player.hp = this.player.maxHp;
    this.foe.hp = this.foe.maxHp;
    this.player.comboStep = 0;
    this.foe.comboStep = 0;
    this.finishArmed = false;
    this.clock = 0;
    this.group.visible = true;
    hooks.toast(`Kaiju Pit — Round ${this.round}. Specials burn Rage/Gamma. Finish: ${KAIJU_FINISH_NAME}.`);
  }

  exit(hooks: { toast: (m: string) => void }): void {
    this.phase = "out";
    this.group.visible = false;
    hooks.toast("Left Kaiju Pit — back to Ash Flats open sand.");
  }

  /** Side-camera: place camera on +Z looking at mid arena. Does not touch CameraRig collision. */
  applySideCamera(camera: THREE.PerspectiveCamera, arenaOrigin: THREE.Vector3): void {
    if (!this.active) return;
    const mid = arenaOrigin.clone().add(new THREE.Vector3(0, 4, 0));
    camera.position.copy(mid).add(this.sideCamOffset);
    camera.lookAt(mid);
  }

  healthBars(): { player: number; foe: number; round: number; finishName: string } {
    return {
      player: this.player.hp / this.player.maxHp,
      foe: this.foe.hp / this.foe.maxHp,
      round: this.round,
      finishName: KAIJU_FINISH_NAME,
    };
  }

  /** Stub block — hold interact / dedicated block later. */
  setBlock(on: boolean): void {
    if (!this.active) return;
    this.player.blocking = on;
  }

  /**
   * Smash / attack stub. Combo steps 0→1→2; special consumes rageOrGamma fraction.
   * Returns damage dealt to foe.
   */
  strike(opts: {
    power: "light" | "heavy" | "special";
    rage: number;
    gamma: number;
    spendRageGamma?: (rage: number, gamma: number) => void;
  }): { dmg: number; toast?: string; finish?: boolean } {
    if (this.phase !== "fight" && this.phase !== "intro") return { dmg: 0 };
    if (this.phase === "intro") this.phase = "fight";

    if (this.foe.blocking && opts.power === "light") return { dmg: 0, toast: "Blocked" };

    let dmg = opts.power === "light" ? 8 : opts.power === "heavy" ? 16 : 28;
    if (opts.power === "special") {
      if (opts.rage < 0.25 && opts.gamma < 0.25) return { dmg: 0, toast: "Need Rage or Gamma for special" };
      opts.spendRageGamma?.(0.25, 0.15);
      dmg = 28 + Math.floor(opts.rage * 10 + opts.gamma * 8);
      this.player.comboStep = 0;
    } else {
      this.player.comboStep = Math.min(3, this.player.comboStep + 1);
      if (this.player.comboStep >= 3) {
        dmg += 10;
        this.player.comboStep = 0;
        // toast combo stub
      }
    }

    if (this.player.blocking) dmg = Math.floor(dmg * 0.35);
    this.foe.hp = Math.max(0, this.foe.hp - dmg);

    if (this.foe.hp <= 0) {
      this.finishArmed = true;
      this.phase = "finish";
      return { dmg, toast: `${KAIJU_FINISH_NAME} ready — Enter to seal`, finish: true };
    }
    return { dmg };
  }

  /** Perform original finish when armed. */
  doFinish(hooks: { toast: (m: string) => void }): boolean {
    if (!this.finishArmed || this.phase !== "finish") return false;
    this.finishArmed = false;
    this.playerWins += 1;
    hooks.toast(`${KAIJU_FINISH_NAME}! Round ${this.round} — World Breaker.`);
    if (this.playerWins >= 2) {
      this.phase = "victory";
      hooks.toast("Kaiju Pit cleared. H exits to Ash Flats.");
      return true;
    }
    this.round += 1;
    this.player.hp = this.player.maxHp;
    this.foe.hp = this.foe.maxHp;
    this.phase = "fight";
    hooks.toast(`Round ${this.round}`);
    return true;
  }

  update(dt: number, hooks: { toast: (m: string) => void }): void {
    if (!this.active) return;
    this.clock += dt;
    // Simple foe AI stub
    if (this.phase === "fight" && this.clock > 1.2) {
      this.clock = 0;
      this.foe.blocking = Math.random() < 0.25;
      if (!this.player.blocking && Math.random() < 0.7) {
        const hit = 6 + Math.floor(Math.random() * 8);
        this.player.hp = Math.max(0, this.player.hp - hit);
        if (this.player.hp <= 0) {
          this.foeWins += 1;
          if (this.foeWins >= 2) {
            this.phase = "defeat";
            hooks.toast("Kaiju Pit loss — H to limp back to the flats.");
          } else {
            this.round += 1;
            this.player.hp = this.player.maxHp;
            this.foe.hp = this.foe.maxHp;
            this.phase = "fight";
            hooks.toast(`Down. Round ${this.round}`);
          }
        }
      }
    }
  }

  hudLine(): string {
    if (!this.active) return "";
    const bars = this.healthBars();
    return `Kaiju Pit R${bars.round} | You ${Math.round(bars.player * 100)}% | ${this.foe.name} ${Math.round(bars.foe * 100)}% | ${KAIJU_FINISH_NAME}`;
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
