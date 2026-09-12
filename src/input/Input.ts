import type { BorrowedPower } from "../data/types";
import { STYLE_BY_KEY, type FightStyle } from "../data/styles";
import { FEEL, feelOf, type ControlFeel, type FeelId } from "./ControlFeel";

export const Attack = {
  Smash: "smash",
  Super: "super",
  Ground: "ground",
  Clap: "clap",
} as const;

export type AttackKind = (typeof Attack)[keyof typeof Attack];

export { HULK_FORMS as HULK_KINDS } from "../data/hulkForms";
export type { HulkKind } from "../data/types";

export const SPECIALS = [
  { id: 1, name: "Thunderclap" },
  { id: 2, name: "Seismic stomp" },
  { id: 3, name: "Shoulder charge" },
  { id: 4, name: "Ground rip" },
  { id: 5, name: "Gamma burst" },
  { id: 6, name: "Leap slam" },
  { id: 7, name: "Whirlwind" },
  { id: 8, name: "Meteor throw" },
  { id: 9, name: "Earthquake punch" },
] as const;

export const DEFAULT_BINDS: Record<string, string> = {
  Move: "Arrow keys",
  Look: "W A S D",
  Cam: "C",
  Jump: "Space",
  Sprint: "Right Ctrl",
  Brace: "Numpad Enter",
  Climb: "Numpad .",
  Zoom: "Q / E",
  Smash: "Enter",
  Grab: "Shift tap",
  Rip: "Shift hold 1s",
  Lock: "Numpad 0 / 7 / 9",
  Roar: "Numpad 5",
  Rage: "Numpad 8",
  Gamma: "Numpad 2",
  Specials: "1Ã¢â‚¬â€œ9",
  Form: "0 tap Ã‚Â· hold radial",
  Phone: "Tab",
  Banner: "R",
  Map: "M",
  Objective: "V",
  Drop: "G drop (Banner) Ã‚Â· Hellbrand (relic)",
  Interact: "H",
  Stance: "B / K / U / J",
  Calm: "Hold 0 Ã‚Â· 2s",
  Sightfire: "X",
  Hellbrand: "G (relic)",
  Willforge: "N",
  Hushvoice: "T",
  Rival: "P (test fight)",
  Pause: "Esc",
};

export class Input {
  readonly keys = new Set<string>();
  mouseDx = 0;
  mouseDy = 0;
  pointerLocked = false;
  /** Left-drag orbits camera without pointer lock (Ces mouse look). */
  private dragLooking = false;
  private dragMoved = false;
  private dragStartX = 0;
  private dragStartY = 0;
  private contextMenuQueued = false;
  onLockChange: ((locked: boolean) => void) | null = null;
  moveHeld = 0;
  jumpCharge = 0;
  smashHold = 0;
  formHold = 0;
  zoom = 0;
  private wheelZoom = 0;
  sprintDown = false;
  braceDown = false;
  climbDown = false;
  smashHeld = false;
  jumpDown = false;
  grabDown = false;
  gHold = 0;
  tHold = 0;
  xHold = 0;
  shiftHold = 0;
  feel: ControlFeel = FEEL.default;
  gamepadOn = true;
  padConnected = false;
  readonly binds = { ...DEFAULT_BINDS };

  private attackQueued: AttackKind | null = null;
  private interactQueued = false;
  private bannerQueued = false;
  private grabQueued = false;
  private dropQueued = false;
  private lockQueued = false;
  private lockCycle = 0;
  private roarQueued = false;
  private rageModeQueued = false;
  private gammaQueued = false;
  private specialQueued: number | null = null;
  private formTap = false;
  private radialConfirm = false;
  private radialCycle = 0;
  private calmQueued = false;
  private powerQueued: BorrowedPower | null = null;
  private objToggle = false;
  private airPound = false;
  private dodgeQueued = false;
  private styleQueued: FightStyle | null = null;
  private rivalTestQueued = false;
  private cameraQueued = false;
  private phoneQueued = false;
  private ripQueued = false;
  private ripFired = false;
  private padMove = { x: 0, z: 0 };
  private padLook = { dx: 0, dy: 0 };
  private padButtons = new Set<number>();
  private padPrev = new Set<number>();
  private pauseQueued = false;
  private braceTapAt = 0;
  private lockBusy = false;
  private jumpWasDown = false;
  private grabArmed = false;
  private grabHopped = false;
  private readonly canvas: HTMLCanvasElement;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);
    window.addEventListener("mousedown", this.onMouseDown);
    window.addEventListener("mouseup", this.onMouseUp);
    window.addEventListener("mousemove", this.onMouseMove);
    window.addEventListener("contextmenu", this.onContextMenu);
    document.addEventListener("pointerlockchange", this.onLock);
    window.addEventListener("wheel", this.onWheel, { passive: false });
  }

  dispose(): void {
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("keyup", this.onKeyUp);
    window.removeEventListener("mousedown", this.onMouseDown);
    window.removeEventListener("mouseup", this.onMouseUp);
    window.removeEventListener("mousemove", this.onMouseMove);
    window.removeEventListener("contextmenu", this.onContextMenu);
    document.removeEventListener("pointerlockchange", this.onLock);
    window.removeEventListener("wheel", this.onWheel);
  }

  requestLock(): void {
    if (document.pointerLockElement === this.canvas || this.lockBusy) return;
    this.lockBusy = true;
    const done = (): void => {
      this.lockBusy = false;
    };
    try {
      const p = this.canvas.requestPointerLock();
      if (p && typeof (p as Promise<void>).then === "function") {
        void (p as Promise<void>).then(done, done);
      } else {
        window.setTimeout(done, 120);
      }
    } catch {
      done();
    }
  }

  exitLock(): void {
    if (document.pointerLockElement === this.canvas) document.exitPointerLock();
  }

  
  private onWheel = (e: WheelEvent): void => {
    // scroll up = zoom out (match Q), scroll down = zoom in (match E)
    e.preventDefault();
    this.wheelZoom += e.deltaY > 0 ? -0.085 : 0.085;
  };
  tick(dt: number): void {
    this.pollGamepad(dt);
    const radial = this.keys.has("digit0") && this.formHold >= this.feel.formRadial;
    const arrows =
      this.keys.has("arrowup") || this.keys.has("arrowdown") || this.keys.has("arrowleft") || this.keys.has("arrowright");
    const stick = Math.hypot(this.padMove.x, this.padMove.z) > 0.25;
    const moving = !radial && (arrows || stick);
    this.moveHeld = moving ? this.moveHeld + dt : 0;
    this.sprintDown = this.keys.has("controlright") || this.padHeld(5);
    this.braceDown = this.keys.has("numpadenter") || this.padHeld(6);
    this.climbDown = this.keys.has("numpaddecimal");
    this.smashHeld = this.keys.has("enter") || this.padHeld(1);
    this.jumpDown = this.keys.has("space") || this.padHeld(0);
    this.grabDown = this.keys.has("shiftleft") || this.keys.has("shiftright") || this.padHeld(2);
    if (this.jumpDown) this.jumpCharge = Math.min(this.feel.jumpMax, this.jumpCharge + dt);
    if (this.smashHeld) this.smashHold += dt;
    if (this.keys.has("digit0") || this.padHeld(4)) {
      this.formHold += dt;
      if (this.formHold >= this.feel.calmHold) this.calmQueued = true;
    }
    this.gHold = this.keys.has("keyg") ? this.gHold + dt : 0;
    this.tHold = this.keys.has("keyt") ? this.tHold + dt : 0;
    this.xHold = this.keys.has("keyx") ? this.xHold + dt : 0;
    if (this.grabDown) {
      this.shiftHold += dt;
      if (!this.ripFired && this.shiftHold >= this.feel.shiftRip) {
        this.ripQueued = true;
        this.ripFired = true;
        this.grabArmed = false;
      }
    } else {
      this.shiftHold = 0;
      this.ripFired = false;
    }
    this.zoom = this.wheelZoom;
    this.wheelZoom = 0;
    if (this.keys.has("keyq")) this.zoom += dt;
    if (this.keys.has("keye")) this.zoom -= dt;
  }

  setFeel(id: FeelId): void {
    this.feel = feelOf(id);
  }

  consumeLook(): { dx: number; dy: number } {
    let dx = this.mouseDx;
    let dy = this.mouseDy;
    this.mouseDx = 0;
    this.mouseDy = 0;
    // Camera only. A look left, D look right, W look up, S look down. S is never reverse.
    if (this.keys.has("keya")) dx -= 22 * this.feel.lookScale;
    if (this.keys.has("keyd")) dx += 22 * this.feel.lookScale;
    if (this.keys.has("keyw")) dy -= 16 * this.feel.lookScale;
    if (this.keys.has("keys")) dy += 16 * this.feel.lookScale;
    dx += this.padLook.dx;
    dy += this.padLook.dy;
    this.padLook.dx = 0;
    this.padLook.dy = 0;
    return { dx, dy };
  }

  consumeAttack(): AttackKind | null {
    const v = this.attackQueued;
    this.attackQueued = null;
    return v;
  }

  consumeInteract(): boolean {
    const v = this.interactQueued;
    this.interactQueued = false;
    return v;
  }

  consumeBanner(): boolean {
    const v = this.bannerQueued;
    this.bannerQueued = false;
    return v;
  }

  consumeRage(): boolean {
    return this.consumeBanner();
  }

  consumeGrab(): boolean {
    const v = this.grabQueued;
    this.grabQueued = false;
    return v;
  }

  consumeDrop(): boolean {
    const v = this.dropQueued;
    this.dropQueued = false;
    return v;
  }

  consumeLock(): boolean {
    const v = this.lockQueued;
    this.lockQueued = false;
    return v;
  }

  consumeLockCycle(): number {
    const v = this.lockCycle;
    this.lockCycle = 0;
    return v;
  }

  consumeRoar(): boolean {
    const v = this.roarQueued;
    this.roarQueued = false;
    return v;
  }

  consumeRageMode(): boolean {
    const v = this.rageModeQueued;
    this.rageModeQueued = false;
    return v;
  }

  consumeGamma(): boolean {
    const v = this.gammaQueued;
    this.gammaQueued = false;
    return v;
  }

  consumeSpecial(): number | null {
    const v = this.specialQueued;
    this.specialQueued = null;
    return v;
  }

  consumeFormTap(): boolean {
    const v = this.formTap;
    this.formTap = false;
    return v;
  }

  consumeRadialConfirm(): boolean {
    const v = this.radialConfirm;
    this.radialConfirm = false;
    return v;
  }

  cancelRadial(): void {
    this.radialConfirm = false;
  }

  consumeRadialCycle(): number {
    const v = this.radialCycle;
    this.radialCycle = 0;
    return v;
  }

  consumeCalm(): boolean {
    const v = this.calmQueued;
    this.calmQueued = false;
    return v;
  }

  consumePower(): BorrowedPower | null {
    const v = this.powerQueued;
    this.powerQueued = null;
    return v;
  }

  consumeObjectiveToggle(): boolean {
    const v = this.objToggle;
    this.objToggle = false;
    return v;
  }

  consumeAirPound(): boolean {
    const v = this.airPound;
    this.airPound = false;
    return v;
  }

  consumeDodge(): boolean {
    const v = this.dodgeQueued;
    this.dodgeQueued = false;
    return v;
  }

  consumeStyle(): FightStyle | null {
    const v = this.styleQueued;
    this.styleQueued = null;
    return v;
  }

  consumeRivalTest(): boolean {
    const v = this.rivalTestQueued;
    this.rivalTestQueued = false;
    return v;
  }

  consumeCamera(): boolean {
    const v = this.cameraQueued;
    this.cameraQueued = false;
    return v;
  }

  consumePhone(): boolean {
    const v = this.phoneQueued;
    this.phoneQueued = false;
    return v;
  }

  consumeRip(): boolean {
    const v = this.ripQueued;
    this.ripQueued = false;
    return v;
  }

  consumePause(): boolean {
    const v = this.pauseQueued;
    this.pauseQueued = false;
    return v;
  }

  injectSmash(): void {
    this.attackQueued = Attack.Smash;
  }

  injectJumpPound(): void {
    this.jumpWasDown = true;
    this.jumpDown = false;
    this.jumpCharge = Math.max(this.jumpCharge, 0.55);
  }

  consumeJumpRelease(): number {
    if (this.jumpWasDown && !this.jumpDown) {
      const ch = this.jumpCharge;
      this.jumpCharge = 0;
      this.jumpWasDown = false;
      return ch;
    }
    this.jumpWasDown = this.jumpDown;
    return 0;
  }

  axis(): { x: number; z: number } {
    if (this.radialOpen) return { x: 0, z: 0 };
    let x = 0;
    let z = 0;
    if (this.keys.has("arrowleft")) x -= 1;
    if (this.keys.has("arrowright")) x += 1;
    if (this.keys.has("arrowup")) z -= 1;
    if (this.keys.has("arrowdown")) z += 1;
    x += this.padMove.x;
    z += this.padMove.z;
    const len = Math.hypot(x, z);
    if (len > 1) {
      x /= len;
      z /= len;
    }
    return { x, z };
  }

  chargingRun(): boolean {
    return this.moveHeld >= this.feel.chargeRun && !this.radialOpen;
  }

  get radialOpen(): boolean {
    return (this.keys.has("digit0") || this.padHeld(4)) && this.formHold >= this.feel.formRadial;
  }

  private padHeld(index: number): boolean {
    return this.gamepadOn && this.padButtons.has(index);
  }

  /** Left stick = arrows (move). Right stick = WASD (look). Never maps WASD keys to move. */
  private pollGamepad(_dt: number): void {
    this.padMove.x = 0;
    this.padMove.z = 0;
    this.padLook.dx = 0;
    this.padLook.dy = 0;
    const next = new Set<number>();
    if (!this.gamepadOn || typeof navigator === "undefined" || !navigator.getGamepads) {
      this.padConnected = false;
      this.padButtons = next;
      this.padPrev = next;
      return;
    }
    const pads = navigator.getGamepads();
    const pad = pads[0] ?? pads[1] ?? null;
    this.padConnected = Boolean(pad);
    if (!pad) {
      this.padButtons = next;
      this.padPrev = next;
      return;
    }
    const dead = 0.18;
    const lx = pad.axes[0] ?? 0;
    const ly = pad.axes[1] ?? 0;
    const rx = pad.axes[2] ?? 0;
    const ry = pad.axes[3] ?? 0;
    if (Math.hypot(lx, ly) > dead) {
      this.padMove.x = lx;
      this.padMove.z = ly;
    }
    if (Math.hypot(rx, ry) > dead) {
      this.padLook.dx = rx * 22 * this.feel.lookScale;
      this.padLook.dy = ry * 16 * this.feel.lookScale;
    }
    pad.buttons.forEach((b, i) => {
      if (b.pressed) next.add(i);
    });
    const edge = (i: number): boolean => next.has(i) && !this.padPrev.has(i);
    const release = (i: number): boolean => !next.has(i) && this.padPrev.has(i);
    if (edge(0)) {
      this.jumpCharge = 0;
      this.airPound = true;
      if (this.grabDown) {
        this.grabHopped = true;
        this.grabArmed = false;
      }
    }
    if (edge(1)) this.smashHold = 0;
    if (release(1)) {
      this.attackQueued = this.smashHold >= this.feel.smashSuper ? Attack.Super : Attack.Smash;
      this.smashHold = 0;
    }
    if (edge(2)) {
      this.grabArmed = true;
      this.grabHopped = false;
      this.shiftHold = 0;
      this.ripFired = false;
    }
    if (release(2)) {
      if (this.grabArmed && !this.grabHopped && !this.ripFired) this.grabQueued = true;
      this.grabArmed = false;
      this.grabHopped = false;
    }
    if (edge(3)) this.interactQueued = true;
    if (edge(4)) this.formHold = 0;
    if (release(4)) {
      if (this.formHold >= this.feel.calmHold) this.calmQueued = true;
      else if (this.formHold >= this.feel.formRadial) this.radialConfirm = true;
      else if (this.formHold > 0) this.formTap = true;
      this.formHold = 0;
    }
    if (edge(8)) this.phoneQueued = true;
    if (edge(9)) this.pauseQueued = true;
    this.padButtons = next;
    this.padPrev = next;
  }

  private readonly onKeyDown = (e: KeyboardEvent): void => {
    const code = e.code.toLowerCase();
    if (
      [
        "space",
        "arrowup",
        "arrowdown",
        "arrowleft",
        "arrowright",
        "enter",
        "numpadenter",
        "numpad0",
        "numpad2",
        "numpad5",
        "numpad7",
        "numpad8",
        "numpad9",
        "tab",
      ].includes(code)
    ) {
      e.preventDefault();
    }
    if (e.repeat) return;
    this.keys.add(code);
    if (code === "space") {
      this.jumpCharge = 0;
      this.airPound = true;
      if (this.grabDown) {
        this.grabHopped = true;
        this.grabArmed = false;
      }
    }
    if (code === "enter") {
      this.smashHold = 0;
    }
    if (code === "shiftleft" || code === "shiftright") {
      this.grabArmed = true;
      this.grabHopped = false;
      this.shiftHold = 0;
      this.ripFired = false;
    }
    if (code === "keyh") this.interactQueued = true;
    if (code === "keyr") this.bannerQueued = true;
    if (code === "keyg") this.dropQueued = true;
    if (code === "tab") this.phoneQueued = true;
    if (code === "keyv") this.objToggle = true;
    if (code === "keyn") this.powerQueued = "will";
    if (code === "keyt") this.powerQueued = "king";
    if (code === "keyx") this.powerQueued = "omega";
    if (code === "keyp") this.rivalTestQueued = true;
    if (code === "keyc") this.cameraQueued = true;
    const stance = STYLE_BY_KEY[code];
    if (stance) this.styleQueued = stance;
    if (code === "numpad0") this.lockQueued = true;
    if (code === "numpad7") this.lockCycle = -1;
    if (code === "numpad9") this.lockCycle = 1;
    if (code === "numpad5") this.roarQueued = true;
    if (code === "numpad8") this.rageModeQueued = true;
    if (code === "numpad2") this.gammaQueued = true;
    if (code === "numpadenter") {
      const now = performance.now();
      if (now - this.braceTapAt < this.feel.braceDoubleMs) this.dodgeQueued = true;
      this.braceTapAt = now;
    }
    if ((code === "arrowleft" || code === "arrowright") && this.keys.has("digit0")) {
      this.radialCycle = code === "arrowleft" ? -1 : 1;
    }
    if (code.startsWith("digit")) {
      const n = Number(code.slice(5));
      if (n >= 1 && n <= 9) this.specialQueued = n;
      if (n === 0) this.formHold = 0;
    }
  };

  private readonly onKeyUp = (e: KeyboardEvent): void => {
    const code = e.code.toLowerCase();
    this.keys.delete(code);
    if (code === "shiftleft" || code === "shiftright") {
      if (this.grabArmed && !this.grabHopped && !this.ripFired) this.grabQueued = true;
      this.grabArmed = false;
      this.grabHopped = false;
      this.shiftHold = 0;
    }
    if (code === "enter") {
      this.attackQueued = this.smashHold >= this.feel.smashSuper ? Attack.Super : Attack.Smash;
      this.smashHold = 0;
    }
    if (code === "digit0") {
      if (this.formHold >= this.feel.calmHold) this.calmQueued = true;
      else if (this.formHold >= this.feel.formRadial) this.radialConfirm = true;
      else this.formTap = true;
      this.formHold = 0;
    }
  };

  /** Right-click menu (pause / action sheet). */
  consumeContextMenu(): boolean {
    if (!this.contextMenuQueued) return false;
    this.contextMenuQueued = false;
    return true;
  }

  private readonly onContextMenu = (e: MouseEvent): void => {
    // Always steal browser context menu in-game canvas; Game opens pause/actions.
    if (e.target === this.canvas || this.canvas.contains(e.target as Node)) {
      e.preventDefault();
      this.contextMenuQueued = true;
    }
  };

  private readonly onMouseDown = (e: MouseEvent): void => {
    if (e.button === 2) {
      e.preventDefault();
      this.contextMenuQueued = true;
      return;
    }
    if (e.button === 0) {
      // Click-drag orbits camera; short click still smashes on mouseup.
      this.dragLooking = true;
      this.dragMoved = false;
      this.dragStartX = e.clientX;
      this.dragStartY = e.clientY;
    }
  };

  private readonly onMouseUp = (e: MouseEvent): void => {
    if (e.button !== 0) return;
    const wasDrag = this.dragLooking;
    this.dragLooking = false;
    if (wasDrag && !this.dragMoved && !this.pointerLocked) {
      this.attackQueued = Attack.Smash;
    }
  };

  private readonly onMouseMove = (e: MouseEvent): void => {
    if (this.pointerLocked) {
      this.mouseDx += e.movementX;
      this.mouseDy += e.movementY;
      return;
    }
    if (!this.dragLooking) return;
    const dx = e.movementX || e.clientX - this.dragStartX;
    const dy = e.movementY || e.clientY - this.dragStartY;
    if (Math.hypot(e.clientX - this.dragStartX, e.clientY - this.dragStartY) > 4) this.dragMoved = true;
    // Drag up = look up / pull camera so more of Hulk is in frame (invert Y feels natural).
    this.mouseDx += e.movementX;
    this.mouseDy += e.movementY;
    this.dragStartX = e.clientX;
    this.dragStartY = e.clientY;
  };

  private readonly onLock = (): void => {
    const locked = document.pointerLockElement === this.canvas;
    const was = this.pointerLocked;
    this.pointerLocked = locked;
    if (was !== locked) this.onLockChange?.(locked);
  };
}
