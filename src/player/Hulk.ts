import * as THREE from "three";
import type { AudioBus } from "../audio/AudioBus";
import { asTitan, canonicalKind, formDef, isBruceKind, isWorldBreaker, nextKind } from "../data/hulkForms";
import type { HulkKind, PlayerForm, SaveData, TitanKind } from "../data/types";
import {
  METERS,
  bandLabel,
  chargeRate,
  formSwitchAllowed,
  gammaBand,
  gammaCap,
  healMul,
  liftMul,
  powersAllowed,
  rageTier,
  rageTierLabel,
  spendMul,
  type GammaBand,
  type RageTier,
} from "../data/meters";
import { styleDef, type FightStyle } from "../data/styles";
import { computeMods, type TitanMods } from "../data/skills";
import { Attack, type AttackKind, type Input } from "../input/Input";
import type { CityWorld, LiftedBlock } from "../world/CityWorld";
import {
  SAVAGE_DEEP,
  SAVAGE_GREEN,
  RADIANCE_RED,
  bindHeroEnvMap,
  clothMat,
  eyeMat,
  humanSkin,
  makeCoronaSprite,
  makeHeroLights,
  hairMat as makeHair,
  radianceStrength,
  titanSkin,
  type HeroLights,
} from "./characterLook";

function lerpAngle(a: number, b: number, t: number): number {
  let d = b - a;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return a + d * t;
}

function damp(cur: number, target: number, k: number): number {
  return cur + (target - cur) * k;
}

function lathe(pts: [number, number][], segs = 20): THREE.LatheGeometry {
  return new THREE.LatheGeometry(
    pts.map(([x, y]) => new THREE.Vector2(x, y)),
    segs,
  );
}

function shade(color: number, shininess = 18): THREE.MeshPhysicalMaterial {
  return clothMat(color, shininess > 28);
}

function skinShade(color: number): THREE.MeshPhysicalMaterial {
  return titanSkin(color);
}

type Joints = {
  hips: THREE.Object3D;
  leftArm: THREE.Object3D;
  rightArm: THREE.Object3D;
  leftFore: THREE.Object3D;
  rightFore: THREE.Object3D;
  leftLeg: THREE.Object3D;
  rightLeg: THREE.Object3D;
  leftCalf: THREE.Object3D;
  rightCalf: THREE.Object3D;
  torso: THREE.Object3D;
  head: THREE.Object3D;
};

export class Hulk {
  readonly group = new THREE.Group();
  readonly position = new THREE.Vector3(6, 0, 10);
  velocity = new THREE.Vector3();
  yaw = 0;
  health = 200;
  maxHealth = 200;
  rage = 0;
  maxRage = 100;
  gamma = 0;
  maxGamma = 100;
  rageTimer = 0;
  contactT = 99;
  breathFail = 0;
  splashT = 0;
  leapFrom: THREE.Vector3 | null = null;
  meltdownBurst = false;
  wantedPulse = false;
  lastBand: GammaBand = "bruce";
  smashTimer = 0;
  smashActive = 0;
  poundQueued = false;
  attackKind: AttackKind = Attack.Smash;
  grounded = true;
  radius = 1.85;
  height = 8.4;
  combo = 0;
  comboTimer = 0;
  invuln = 0;
  facing = new THREE.Vector3(0, 0, -1);
  climbing = false;
  held: LiftedBlock | null = null;
  mods: TitanMods = computeMods({});
  form: PlayerForm = "human";
  formCd = 0;
  lastTransform: PlayerForm | null = null;
  hulkKind: HulkKind = "worldbreaker";
  heat = 0;
  maxHeat = 100;
  bracing = false;
  smashThrough = false;
  horrorRebuild = false;
  transformShock = false;
  clubSwing = false;
  lightCombo = 0;
  jumpChargeVis = 0;
  roarCd = 0;
  gammaCd = 0;
  specialCd = 0;
  rageDuration = 20;
  style: FightStyle = "savage";
  stanceCd = 0;
  lastMove = "brawl";
  mixReady = false;
  lastTitan: TitanKind = "worldbreaker";
  bruceHits = 0;
  angerMul = 1;
  gadgetIncoming = 1;
  gadgetSpeed = 1;
  willBuild = false;
  driving = false;
  constructQueued = false;
  tookHit = false;
  hopping = false;
  burrowing = false;
  emergeSmash = false;
  private burrowT = 0;
  private roofHop: { sx: number; sy: number; sz: number; tx: number; ty: number; tz: number; t: number; dur: number } | null = null;
  private skipJumpRelease = false;
  private styleLog: FightStyle[] = [];

  private hips: THREE.Object3D;
  private leftArm: THREE.Object3D;
  private rightArm: THREE.Object3D;
  private leftFore: THREE.Object3D;
  private rightFore: THREE.Object3D;
  private leftLeg: THREE.Object3D;
  private rightLeg: THREE.Object3D;
  private leftCalf: THREE.Object3D;
  private rightCalf: THREE.Object3D;
  private torso: THREE.Object3D;
  private head: THREE.Object3D;
  private walkPhase = 0;
  private smashFlash = 0;
  private coyote = 0;
  private baseScale = 3.42;
  private titanRoot = new THREE.Group();
  private humanRoot = new THREE.Group();
  private titanJoints!: Joints;
  private humanJoints!: Joints;
  private skinMat = skinShade(SAVAGE_GREEN);
  private skinDeepMat = skinShade(SAVAGE_DEEP);
  private khakiMat = shade(0xc8b892, 12);
  private khakiDarkMat = shade(0x9a8860, 10);
  private hairMat = makeHair(0x16130f);
  private extras = new THREE.Group();
  private fedora = new THREE.Group();
  private suit = new THREE.Group();
  private beard = new THREE.Mesh();
  private mace = new THREE.Group();
  private wbCrust = new THREE.Group();
  private hellHorns = new THREE.Group();
  private cosmicRing = new THREE.Mesh();
  private strangeCloak = new THREE.Group();
  private lodFine: THREE.Object3D[] = [];
  private glow!: THREE.Mesh;
  private humanSkinMat = humanSkin();
  private coronaInner = makeCoronaSprite(4.2);
  private coronaOuter = makeCoronaSprite(8.6);
  private heroLights: HeroLights = makeHeroLights();

  constructor() {
    const skin = this.skinMat;
    const skinDeep = this.skinDeepMat;
    const khaki = this.khakiMat;
    const khakiDark = this.khakiDarkMat;
    const hair = this.hairMat;
    const eyeWhite = eyeMat(0xf7f2ea);
    const iris = eyeMat(0x1a140c);
    const lip = shade(0x2f6e22, 28);

    const hips = new THREE.Group();
    hips.position.y = 1.12;
    this.group.add(hips);
    this.hips = hips;

    const torso = new THREE.Group();
    hips.add(torso);
    this.torso = torso;

    const body = new THREE.Mesh(
      lathe(
        [
          [0.48, 0.0],
          [0.54, 0.16],
          [0.58, 0.38],
          [0.66, 0.62],
          [0.82, 0.92],
          [0.98, 1.18],
          [1.08, 1.36],
          [0.96, 1.52],
          [0.62, 1.64],
          [0.28, 1.72],
        ],
        64,
      ),
      skin,
    );
    body.scale.set(1.12, 1, 0.86);
    torso.add(body);

    for (const x of [-0.5, 0.5]) {
      const pec = new THREE.Mesh(new THREE.SphereGeometry(0.5, 36, 28), skin);
      pec.scale.set(1.22, 0.7, 0.88);
      pec.position.set(x, 1.24, 0.4);
      torso.add(pec);
    }
    const sternum = new THREE.Mesh(new THREE.SphereGeometry(0.2, 20, 16), skin);
    sternum.scale.set(0.55, 1.2, 0.38);
    sternum.position.set(0, 1.2, 0.48);
    torso.add(sternum);
    for (let r = 0; r < 3; r++) {
      for (const x of [-0.18, 0.18]) {
        const ab = new THREE.Mesh(new THREE.SphereGeometry(0.14, 18, 14), skin);
        ab.scale.set(1.2, 0.58, 0.42);
        ab.position.set(x, 0.42 + r * 0.2, 0.46);
        torso.add(ab);
      }
    }
    const lat = new THREE.Mesh(new THREE.SphereGeometry(0.64, 22, 16), skin);
    lat.scale.set(1.72, 1.02, 0.62);
    lat.position.set(0, 1.02, -0.2);
    torso.add(lat);
    const trap = new THREE.Mesh(new THREE.SphereGeometry(0.38, 28, 18), skin);
    trap.scale.set(2.05, 0.52, 0.95);
    trap.position.set(0, 1.54, 0.04);
    torso.add(trap);
    const neck = new THREE.Mesh(new THREE.CapsuleGeometry(0.26, 0.2, 12, 24), skin);
    neck.position.y = 1.74;
    torso.add(neck);

    const shorts = new THREE.Mesh(
      lathe(
        [
          [0.5, 0.36],
          [0.58, 0.28],
          [0.6, 0.1],
          [0.66, -0.08],
          [0.74, -0.3],
          [0.78, -0.44],
          [0.7, -0.48],
        ],
        28,
      ),
      khaki,
    );
    hips.add(shorts);
    const waist = new THREE.Mesh(new THREE.TorusGeometry(0.56, 0.05, 12, 28), khakiDark);
    waist.rotation.x = Math.PI / 2;
    waist.position.y = 0.34;
    hips.add(waist);
    const buckle = new THREE.Mesh(new THREE.SphereGeometry(0.09, 12, 10), khakiDark);
    buckle.scale.set(1.15, 0.7, 0.35);
    buckle.position.set(0, 0.32, 0.58);
    hips.add(buckle);
    const fly = new THREE.Mesh(new THREE.SphereGeometry(0.08, 10, 8), khakiDark);
    fly.scale.set(0.35, 1.8, 0.2);
    fly.position.set(0, 0.02, 0.62);
    hips.add(fly);
    for (const x of [-0.48, 0.48]) {
      const pocket = new THREE.Mesh(new THREE.SphereGeometry(0.16, 14, 10), khakiDark);
      pocket.scale.set(0.85, 1.15, 0.22);
      pocket.position.set(x, -0.02, 0.42);
      hips.add(pocket);
    }
    for (let i = 0; i < 11; i++) {
      const a = (i / 11) * Math.PI * 2;
      const flap = new THREE.Mesh(new THREE.SphereGeometry(0.11, 10, 8), khaki);
      flap.scale.set(0.55, 1.35 + (i % 3) * 0.25, 0.22);
      flap.position.set(Math.sin(a) * 0.7, -0.5, Math.cos(a) * 0.7);
      flap.rotation.z = Math.sin(a) * 0.35;
      hips.add(flap);
    }

    const head = new THREE.Group();
    head.position.y = 2.02;
    hips.add(head);
    this.head = head;
    const skull = new THREE.Mesh(new THREE.SphereGeometry(0.3, 64, 48), skin);
    skull.scale.set(0.88, 1.02, 0.86);
    head.add(skull);
    const jaw = new THREE.Mesh(new THREE.SphereGeometry(0.24, 40, 32), skin);
    jaw.scale.set(1.12, 0.72, 1.02);
    jaw.position.set(0, -0.2, 0.1);
    head.add(jaw);
    const jawBlock = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.14, 0.22), skin);
    jawBlock.position.set(0, -0.26, 0.14);
    head.add(jawBlock);
    const hairMesh = new THREE.Mesh(new THREE.SphereGeometry(0.32, 28, 20, 0, Math.PI * 2, 0, 1.15), hair);
    hairMesh.position.set(0, 0.08, -0.03);
    head.add(hairMesh);
    const brow = new THREE.Mesh(new THREE.SphereGeometry(0.22, 28, 20), skinDeep);
    brow.scale.set(1.95, 0.42, 0.55);
    brow.position.set(0, 0.1, 0.24);
    brow.rotation.x = -0.55;
    head.add(brow);
    // Heavy supraorbital ridge (movie brow)
    const browShelf = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.06, 0.14), skinDeep);
    browShelf.position.set(0, 0.12, 0.28);
    browShelf.rotation.x = -0.35;
    head.add(browShelf);
    for (const x of [-0.1, 0.1]) {
      const white = new THREE.Mesh(new THREE.SphereGeometry(0.062, 18, 14), eyeWhite);
      white.scale.set(1.2, 0.7, 0.6);
      white.position.set(x, 0.015, 0.275);
      head.add(white);
      const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.028, 14, 12), iris);
      pupil.position.set(x, 0.012, 0.31);
      head.add(pupil);
    }
    const nose = new THREE.Mesh(new THREE.SphereGeometry(0.055, 14, 12), skinDeep);
    nose.scale.set(0.65, 1.1, 0.95);
    nose.position.set(0, -0.05, 0.28);
    head.add(nose);
    const mouth = new THREE.Mesh(new THREE.SphereGeometry(0.07, 14, 10), lip);
    mouth.scale.set(1.4, 0.28, 0.5);
    mouth.position.set(0, -0.18, 0.25);
    head.add(mouth);
    for (const x of [-0.26, 0.26]) {
      const ear = new THREE.Mesh(new THREE.SphereGeometry(0.06, 16, 12), skin);
      ear.scale.set(0.4, 1.05, 0.7);
      ear.position.set(x, 0.0, 0.02);
      head.add(ear);
    }
    const collar = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.045, 10, 24), khaki);
    collar.rotation.x = Math.PI / 2;
    collar.position.set(0, 1.62, 0.06);
    torso.add(collar);
    this.dressTitanDetail(skin, skinDeep, khaki);

    const madeL = this.makeArm(skin, skinDeep, true);
    const madeR = this.makeArm(skin, skinDeep, false);
    this.leftArm = madeL.root;
    this.rightArm = madeR.root;
    this.leftFore = madeL.fore;
    this.rightFore = madeR.fore;
    hips.add(this.leftArm, this.rightArm);

    const madeLL = this.makeLeg(skin, khaki, true);
    const madeRL = this.makeLeg(skin, khaki, false);
    this.leftLeg = madeLL.root;
    this.rightLeg = madeRL.root;
    this.leftCalf = madeLL.calf;
    this.rightCalf = madeRL.calf;
    this.group.add(this.leftLeg, this.rightLeg);
    this.titanJoints = this.snapshotJoints();
    this.group.remove(hips, this.leftLeg, this.rightLeg);
    this.titanRoot.add(hips, this.leftLeg, this.rightLeg);
    this.buildFormExtras();
    this.titanRoot.add(this.extras);
    this.group.add(this.titanRoot);
    this.buildHuman();
    this.humanJoints = this.snapshotJoints();
    this.applyJoints(this.humanJoints);
    this.titanRoot.visible = false;
    this.humanRoot.visible = true;
    this.form = "human";

    this.glow = new THREE.Mesh(
      new THREE.SphereGeometry(2.15, 32, 24),
      new THREE.MeshBasicMaterial({
        color: RADIANCE_RED,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );
    this.glow.position.y = 1.8;
    this.group.add(this.glow);
    this.coronaInner.position.y = 1.55;
    this.coronaOuter.position.y = 1.7;
    this.group.add(this.coronaInner, this.coronaOuter);
    const lights = this.heroLights;
    this.group.add(lights.key, lights.key.target, lights.fill, lights.rim, lights.chest);
    lights.key.target.position.set(0, 1.6, 0);

    const shadow = new THREE.Mesh(
      new THREE.CircleGeometry(0.95, 24),
      new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.32, depthWrite: false }),
    );
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.03;
    this.group.add(shadow);

    this.titanRoot.scale.setScalar(this.baseScale);
    this.humanRoot.scale.setScalar(1.12);
    this.group.scale.setScalar(1);
    this.applyKindLook();
    this.applyHumanStats();
  }

  enableFilmLook(renderer: THREE.WebGLRenderer): void {
    bindHeroEnvMap(renderer, [
      this.skinMat,
      this.skinDeepMat,
      this.khakiMat,
      this.khakiDarkMat,
      this.hairMat,
      this.humanSkinMat,
    ]);
  }

  get raging(): boolean {
    return this.form === "hulk" && this.rageTimer > 0;
  }

  get band(): GammaBand {
    return gammaBand(this.gamma);
  }

  get bandLabel(): string {
    return bandLabel(this.band);
  }

  get tier(): RageTier {
    return rageTier(this.rage, this.raging);
  }

  get tierLabel(): string {
    return rageTierLabel(this.tier);
  }

  get canBurrow(): boolean {
    return this.isHulk && (this.tier === "furious" || this.tier === "worldbreaker" || this.tier === "meltdown");
  }

  get canUsePowers(): boolean {
    return this.isHulk && powersAllowed(this.band);
  }

  get calmLocked(): boolean {
    if (this.gamma >= 50) return true;
    if (this.hulkKind === "immortal" && this.isHulk) return false;
    return false;
  }

  get isHulk(): boolean {
    return this.form === "hulk";
  }

  get isBruce(): boolean {
    return this.form === "human" && isBruceKind(this.hulkKind);
  }

  get lookY(): number {
    return this.isHulk ? 4.4 : 1.55;
  }

  get chestY(): number {
    return this.position.y + (this.isHulk ? 6.4 : 1.55);
  }

  get smashRadius(): number {
    if (!this.isHulk) return 1.8;
    const kind = this.poundQueued ? Attack.Ground : this.attackKind;
    const base = kind === Attack.Super || kind === Attack.Ground ? 14 : kind === Attack.Clap ? 10 : this.clubSwing ? 9.4 : 7.2;
    const maestro = this.hulkKind === "maestro" && !this.poundQueued && this.attackKind === Attack.Super ? 1.35 : 1;
    const st = styleDef(this.style);
    const heavy = kind === Attack.Super || kind === Attack.Ground;
    return base * (this.raging ? 1.35 : 1) * this.mods.radius * maestro * (heavy ? st.heavyRadius : st.radius) * liftMul(this.tier);
  }

  get smashDamage(): number {
    if (!this.isHulk) return 12;
    const kind = this.poundQueued ? Attack.Ground : this.attackKind;
    const kit = formDef(this.hulkKind);
    const base = kind === Attack.Super ? 88 : kind === Attack.Ground ? 72 : kind === Attack.Clap ? 46 : this.clubSwing ? 54 : 46;
    const heat = this.hulkKind === "red" ? 1 + this.heat / 220 : 1;
    const fire = this.hulkKind === "red" && this.style === "karate" && kind === Attack.Super ? 1.28 : 1;
    const mix = this.mixReady ? 1.12 : 1;
    return base * (this.raging ? 1.55 : 1) * (1 + this.combo * 0.04) * this.mods.damage * kit.smash * heat * fire * mix * this.angerMul * liftMul(this.tier);
  }

  get formLabel(): string {
    if (this.isBruce) return "BRUCE";
    return this.isHulk ? formDef(this.hulkKind).short : "BANNER";
  }

  applyGrowth(save: SaveData): void {
    this.mods = computeMods(save.skills);
    const ratio = this.maxHealth > 0 ? this.health / this.maxHealth : 1;
    const muscle = 1 + Math.min(0.7, Math.max(0, save.level - 1) * 0.045);
    const presence = isWorldBreaker(this.hulkKind) ? 1.12 : this.hulkKind === "hell" || this.hulkKind === "cosmic" ? 1.08 : 1;
    this.baseScale = 3.05 * muscle * this.mods.size * presence;
    this.titanRoot.scale.setScalar(this.raging ? this.baseScale * 1.1 : this.baseScale);
    if (this.isHulk) {
      const kit = formDef(this.hulkKind);
      this.radius = 2.05 * muscle * presence * (this.hulkKind === "immortal" ? 1.08 : 1);
      this.maxHealth = Math.round(
        220 * this.mods.maxHp * muscle * presence * (this.hulkKind === "maestro" ? 1.2 : isWorldBreaker(this.hulkKind) ? 1.08 : 1),
      );
      this.height = 8.4;
      this.applyKindLook();
      void kit.speed;
    } else {
      this.applyHumanStats();
    }
    this.health = Math.max(1, Math.min(this.maxHealth, Math.round(this.maxHealth * ratio)));
  }

  private applyHumanStats(): void {
    this.radius = 0.48;
    this.maxHealth = this.isBruce ? 52 : 90;
    this.height = 1.85;
  }

  setForm(form: PlayerForm, audio: AudioBus | null): boolean {
    if (this.form === form || this.formCd > 0) return false;
    this.dropHeld();
    this.form = form;
    this.formCd = form === "hulk" ? 1.1 : 3.2;
    this.lastTransform = form;
    this.titanRoot.visible = form === "hulk";
    this.humanRoot.visible = form === "human";
    this.applyJoints(form === "hulk" ? this.titanJoints : this.humanJoints);
    if (form === "hulk") {
      this.radius = 2.05;
      this.maxHealth = Math.max(this.maxHealth, 220);
      this.health = Math.min(this.maxHealth, Math.max(this.health, 140));
      this.height = 8.4;
      this.rage = Math.max(this.rage, 18);
      this.noteContact();
      this.rageTimer = 0;
      this.transformShock = true;
      this.titanRoot.scale.setScalar(this.baseScale);
      this.applyKindLook();
      audio?.rage();
    } else {
      if (!isBruceKind(this.hulkKind)) this.lastTitan = asTitan(this.hulkKind);
      this.applyHumanStats();
      this.health = Math.min(this.maxHealth, this.health);
      this.rage = 0;
      this.rageTimer = 0;
      this.climbing = false;
      audio?.hurt();
    }
    return true;
  }

  toggleForm(audio: AudioBus): boolean {
    return this.setForm(this.isHulk ? "human" : "hulk", audio);
  }

  activateRage(audio: AudioBus): boolean {
    return this.toggleForm(audio);
  }

  /** Title / Drop-in: World Breaker is the player. Ignores form cooldown. */
  dropInWorldBreaker(audio: AudioBus | null): void {
    this.formCd = 0;
    this.hulkKind = "worldbreaker";
    this.lastTitan = "worldbreaker";
    if (this.form !== "hulk") this.setForm("hulk", audio);
    this.formCd = 0;
    this.humanRoot.visible = false;
    this.titanRoot.visible = true;
    this.applyJoints(this.titanJoints);
    this.applyKindLook();
    this.syncGlow();
  }

  setKind(kind: HulkKind, audio: AudioBus | null): boolean {
    kind = canonicalKind(kind);
    if (isBruceKind(kind)) return this.becomeBruce(audio, kind);
    if (this.isHulk && !this.isBruce && !formSwitchAllowed(this.band)) return false;
    if (this.isBruce) {
      this.hulkKind = kind;
      this.lastTitan = asTitan(kind);
      return this.setForm("hulk", audio);
    }
    if (!this.isHulk) {
      this.hulkKind = kind;
      this.lastTitan = asTitan(kind);
      return this.setForm("hulk", audio);
    }
    if (this.hulkKind === kind || this.formCd > 0) return false;
    this.hulkKind = kind;
    this.lastTitan = asTitan(kind);
    this.formCd = 1;
    this.transformShock = true;
    this.applyKindLook();
    audio?.rage();
    return true;
  }

  cycleKind(audio: AudioBus | null): boolean {
    if (this.isBruce) return this.setKind(nextKind("bruce"), audio);
    if (!this.isHulk) return this.setForm("hulk", audio);
    if (!formSwitchAllowed(this.band)) return false;
    const next = nextKind(this.hulkKind);
    if (next === "bruce") return false;
    return this.setKind(next, audio);
  }

  becomeBruce(audio: AudioBus | null, kind: HulkKind = "bruce"): boolean {
    kind = isBruceKind(kind) ? canonicalKind(kind) : "bruce";
    if (this.isBruce && this.formCd > 0) return false;
    if (this.isHulk && !isBruceKind(this.hulkKind)) this.lastTitan = asTitan(this.hulkKind);
    this.hulkKind = kind;
    this.bruceHits = 0;
    this.angerMul = 1;
    if (this.isHulk) {
      const ok = this.setForm("human", audio);
      this.hulkKind = kind;
      this.applyHumanStats();
      this.health = Math.min(this.maxHealth, this.health);
      this.applyKindLook();
      return ok;
    }
    this.applyHumanStats();
    this.health = Math.min(this.maxHealth, this.health);
    this.applyKindLook();
    audio?.hurt();
    return true;
  }

  tryCalmDown(audio: AudioBus | null, night: boolean): "ok" | "breathe" | "locked" {
    if (this.hulkKind === "immortal" && this.isHulk && night) return "locked";
    if (this.gamma >= 50) return "locked";
    if (this.gamma >= 20) {
      this.breathFail = 0.7;
      return "breathe";
    }
    return this.becomeBruce(audio) ? "ok" : "locked";
  }

  siphonToBruce(audio: AudioBus | null): void {
    this.gamma = Math.min(19, this.gamma);
    this.becomeBruce(audio);
  }

  forceGamma(n: number): void {
    this.gamma = Math.max(0, Math.min(gammaCap(this.hulkKind), n));
  }

  noteContact(): void {
    this.contactT = 0;
  }

  addRage(n: number): void {
    if (n <= 0) return;
    this.rage = Math.min(this.maxRage, this.rage + n * this.mods.rageGain);
    this.noteContact();
  }

  addGamma(n: number): void {
    if (n <= 0) return;
    const cap = gammaCap(this.hulkKind === "bruce" ? this.lastTitan : this.hulkKind);
    this.gamma = Math.min(cap, this.gamma + n);
  }

  spendGamma(n: number): boolean {
    if (n <= 0) return true;
    const cost = n * spendMul(this.hulkKind);
    if (this.band === "overcharged" || this.band === "meltdown") return true;
    if (this.gamma < cost * 0.35 && this.band === "bruce") return false;
    this.gamma = Math.max(0, this.gamma - cost);
    return true;
  }

  noteLightLanded(): void {
    this.addRage(METERS.lightLand);
    this.spendGamma(METERS.lightLand > 0 ? 1 : 0);
    this.noteHitCombo();
  }

  noteHeavyLanded(): void {
    this.addRage(METERS.heavyLand);
    this.spendGamma(3);
    this.noteHitCombo();
  }

  noteProperty(cars: number, buildings: number): void {
    if (cars) this.addRage(METERS.car * cars);
    if (buildings) this.addRage(METERS.property * buildings);
    if (cars) this.addGamma(this.hulkKind === "red" ? METERS.absorbRed : METERS.absorb);
  }

  noteBystander(): void {
    this.addRage(METERS.bystander);
  }

  noteLeap(meters: number): void {
    if (meters < 8) return;
    this.spendGamma(METERS.leapPer100m * (meters / 100));
  }

  private startRoofHop(world: CityWorld, fx: number, fz: number, onRoof: boolean, audio: AudioBus): boolean {
    const fl = Math.hypot(fx, fz) || 1;
    const nx = fx / fl;
    const nz = fz / fl;
    const roof = world.roofAhead(this.position.x, this.position.z, this.position.y, nx, nz, onRoof ? 120 : 92);
    if (!roof) return false;
    const dist = Math.hypot(roof.x - this.position.x, roof.z - this.position.z);
    const rise = Math.max(0, roof.h - this.position.y);
    this.roofHop = {
      sx: this.position.x,
      sy: this.position.y,
      sz: this.position.z,
      tx: roof.x,
      ty: roof.h,
      tz: roof.z,
      t: 0,
      dur: Math.max(0.34, Math.min(0.78, dist / 100 + rise / 200)),
    };
    this.hopping = true;
    this.grounded = false;
    this.climbing = false;
    this.coyote = 0;
    this.poundQueued = false;
    this.leapFrom = this.position.clone();
    this.velocity.set(0, 0, 0);
    this.yaw = Math.atan2(nx, nz);
    this.facing.set(nx, 0, nz);
    this.lastMove = "roof hop";
    audio.jump();
    return true;
  }

  private advanceRoofHop(dt: number, world: CityWorld): void {
    const hop = this.roofHop;
    if (!hop) return;
    hop.t += dt;
    const u = Math.min(1, hop.t / hop.dur);
    const ease = u * u * (3 - 2 * u);
    const dist = Math.hypot(hop.tx - hop.sx, hop.tz - hop.sz);
    const rise = hop.ty - hop.sy;
    const apex = Math.max(9, dist * 0.2, Math.abs(rise) * 0.4 + 7);
    this.position.x = hop.sx + (hop.tx - hop.sx) * ease;
    this.position.z = hop.sz + (hop.tz - hop.sz) * ease;
    this.position.y = hop.sy + rise * ease + Math.sin(Math.PI * u) * apex;
    this.velocity.set((hop.tx - hop.sx) / hop.dur, (hop.ty - hop.sy) / hop.dur, (hop.tz - hop.sz) / hop.dur);
    if (u < 1) return;
    this.position.set(hop.tx, hop.ty, hop.tz);
    const floor = world.floorAt(hop.tx, hop.tz, this.radius, hop.ty + 6);
    this.position.y = Math.max(hop.ty, floor);
    this.velocity.set(0, 0, 0);
    this.grounded = true;
    this.climbing = false;
    this.hopping = false;
    this.roofHop = null;
    this.poundQueued = false;
    if (this.leapFrom) {
      this.noteLeap(this.position.distanceTo(this.leapFrom));
      this.leapFrom = null;
    }
  }

  wakeBroken(): void {
    this.rage = 0;
    this.gamma = 0;
    this.rageTimer = 0;
    this.heat = 0;
    this.burrowing = false;
    this.burrowT = 0;
    this.becomeBruce(null);
    this.health = this.maxHealth;
  }

  private noteHitCombo(): void {
    this.combo += 1;
    this.comboTimer = 2.2;
    if (this.hulkKind === "red" && this.isHulk) this.heat = Math.min(this.maxHeat, this.heat + 10 * (this.mixReady ? 1.85 : 1));
  }

  angerTrigger(kind: Exclude<HulkKind, "bruce">, audio: AudioBus): boolean {
    this.angerMul = 2;
    this.bruceHits = 0;
    return this.setKind(kind, audio);
  }

  exhaustToBruce(audio: AudioBus): void {
    this.becomeBruce(audio);
  }

  tryRageMode(audio: AudioBus): "rage" | "vent" | "need" | "skip" {
    if (!this.isHulk) return "skip";
    if (this.hulkKind === "red") {
      if (this.heat < 18) return "need";
      this.heat = 0;
      this.attackKind = Attack.Clap;
      this.smashActive = 0.28;
      this.smashTimer = 0.4;
      this.smashFlash = 0.42;
      audio.smash();
      return "vent";
    }
    if (this.rage < this.maxRage * 0.96) return "need";
    this.rageDuration = formDef(this.hulkKind).rageSec;
    this.rageTimer = this.rageDuration;
    audio.rage();
    return "rage";
  }

  /** Bleed / chip that ignores invuln. Does not force a BannerÃ¢â€ â€™Hulk transform. */
  chip(amount: number): void {
    if (amount <= 0) return;
    this.health = Math.max(0, this.health - amount);
  }

  takeHit(amount: number, audio: AudioBus): void {
    if (this.invuln > 0) return;
    const kit = formDef(this.hulkKind);
    const armor = this.isHulk && this.hulkKind === "maestro" ? 0.72 : 1;
    const braced = this.bracing ? 0.12 : 1;
    const fragile = this.isBruce ? 1.7 : 1;
    const dmg = amount * this.mods.incoming * armor * braced * this.gadgetIncoming * fragile;
    this.health = Math.max(0, this.health - dmg);
    this.tookHit = true;
    this.invuln = this.isHulk ? 0.42 : 0.28;
    if (this.isHulk && kit.heat) this.heat = Math.min(this.maxHeat, this.heat + dmg * 0.9);
    this.addRage(dmg >= 22 ? METERS.heavyTaken : METERS.lightTaken);
    audio.hurt();
    if (this.health <= 0 && this.isHulk && this.hulkKind === "immortal") {
      this.health = this.maxHealth * 0.38;
      this.invuln = 2.4;
      this.horrorRebuild = true;
      audio.rage();
      return;
    }
    if (this.isBruce) {
      this.bruceHits += 1;
      if (this.bruceHits >= 3 && this.formCd <= 0) {
        this.angerMul = 1;
        this.setKind(this.lastTitan, audio);
      }
      return;
    }
    if (!this.isHulk && dmg >= 12 && this.formCd <= 0) this.setForm("hulk", audio);
  }

  heal(dt: number, inCombat: boolean): void {
    this.tickHeal(dt, inCombat);
  }

  tickMeters(dt: number, night: boolean, inZone: boolean, nearDevice: boolean): void {
    this.contactT += dt;
    this.breathFail = Math.max(0, this.breathFail - dt);
    this.splashT = Math.max(0, this.splashT - dt);
    const kind = this.isBruce ? "bruce" : this.hulkKind;
    const cap = gammaCap(kind === "bruce" ? this.lastTitan : kind);

    if (this.rageTimer > 0) {
      this.rageTimer = Math.max(0, this.rageTimer - dt);
      this.rage = (this.rageTimer / Math.max(0.01, this.rageDuration)) * this.maxRage;
    } else if (this.contactT > METERS.rageDecayDelay) {
      const drain = this.isBruce ? METERS.bruceRageDecay : METERS.rageDecay;
      this.rage = Math.max(0, this.rage - drain * dt);
    }

    if ((this.isHulk || this.isBruce) && this.contactT <= METERS.rageDecayDelay) {
      this.gamma += chargeRate(kind === "bruce" ? this.lastTitan : kind, this.rage) * dt;
    }
    if (inZone || nearDevice) this.gamma += METERS.zonePerSec * dt;
    if (this.contactT > METERS.gammaDecayDelay) {
      this.gamma = Math.max(0, this.gamma - METERS.gammaDecay * dt);
    }

    if (kind === "red" && this.isHulk) {
      this.heat = Math.max(this.heat, this.gamma * 0.9);
      if (this.heat >= METERS.redLitHeat) this.gamma = Math.max(this.gamma, METERS.redFloor);
    }
    this.gamma = Math.max(0, Math.min(cap, this.gamma));

    const band = this.band;
    if (band === "locked" && this.lastBand !== "locked" && this.lastBand !== "overcharged") {
      this.wantedPulse = true;
    }
    if (band === "meltdown") {
      this.meltdownBurst = true;
      if (this.rage >= 99) {
        this.rageDuration = formDef(this.hulkKind === "bruce" ? this.lastTitan : this.hulkKind).rageSec || 20;
        this.rageTimer = this.rageDuration * this.mods.rageTime;
        this.gamma = METERS.meltdownGamma;
        this.rage = METERS.meltdownRage;
      } else {
        this.gamma = METERS.meltdownGamma;
      }
    }
    this.lastBand = this.band;
    void night;
  }

  tickHeal(dt: number, inCombat: boolean): void {
    const mul = healMul(this.band);
    if (mul <= 0 || this.health <= 0) return;
    if (this.isHulk && this.hulkKind === "immortal") {
      const add = (this.raging ? 14 : 6) * dt * mul;
      this.applyHeal(add);
      return;
    }
    if (!inCombat) this.applyHeal(8 * dt * mul);
  }

  private applyHeal(amount: number): void {
    if (amount <= 0 || this.maxHealth <= 0) return;
    const before = this.health;
    this.health = Math.min(this.maxHealth, this.health + amount);
    const gained = this.health - before;
    const pct = (gained / this.maxHealth) * 100;
    if (pct > 0) this.spendGamma(pct * METERS.healGammaPerPct);
  }

  update(dt: number, input: Input, world: CityWorld, camYaw: number, audio: AudioBus, lifeMul = 1): void {
    const kit = formDef(this.hulkKind);
    this.invuln = Math.max(0, this.invuln - dt);
    this.smashTimer = Math.max(0, this.smashTimer - dt);
    this.smashActive = Math.max(0, this.smashActive - dt);
    this.comboTimer = Math.max(0, this.comboTimer - dt);
    this.smashFlash = Math.max(0, this.smashFlash - dt);
    this.formCd = Math.max(0, this.formCd - dt);
    this.stanceCd = Math.max(0, this.stanceCd - dt);
    this.roarCd = Math.max(0, this.roarCd - dt);
    this.gammaCd = Math.max(0, this.gammaCd - dt);
    this.specialCd = Math.max(0, this.specialCd - dt);
    this.coyote = this.grounded ? 0.14 : Math.max(0, this.coyote - dt);
    if (this.comboTimer <= 0) {
      this.combo = 0;
      this.lightCombo = 0;
      this.styleLog = [];
      this.mixReady = false;
    }
    if (this.isHulk && this.hulkKind === "red") {
      if (this.heat >= 99) this.health = Math.max(1, this.health - 7 * dt);
    }
    this.bracing = input.braceDown;
    this.smashThrough = this.isHulk && (input.chargingRun() || input.sprintDown);
    this.jumpChargeVis = input.jumpDown && this.grounded ? input.jumpCharge : 0;
    this.clubSwing = false;

    if (this.burrowing) {
      this.burrowT -= dt;
      this.position.x += this.facing.x * 38 * dt;
      this.position.z += this.facing.z * 38 * dt;
      this.position.y = -1.8;
      this.velocity.y = 0;
      this.grounded = false;
      if (this.burrowT <= 0) {
        this.burrowing = false;
        const support = world.floorAt(this.position.x, this.position.z, this.radius, 40);
        this.position.y = support;
        this.grounded = true;
        this.emergeSmash = true;
        this.attackKind = Attack.Ground;
        this.smashActive = 0.28;
        this.smashFlash = 0.3;
        audio.smash();
      }
    } else if (this.canBurrow && this.grounded && input.climbDown && !this.hopping) {
      this.burrowing = true;
      this.burrowT = 0.82;
      this.climbing = false;
      this.lastMove = "burrow";
    }

    if (this.burrowing) {
      input.consumeJumpRelease();
      this.animate(dt, true, 36);
      this.group.position.copy(this.position);
      this.group.rotation.y = this.yaw;
      this.holdPose();
      this.syncGlow();
      return;
    }

    const look = input.axis();
    const moving = look.x !== 0 || look.z !== 0;
    const sin = Math.sin(camYaw);
    const cos = Math.cos(camYaw);
    const wishX = look.x * cos + look.z * sin;
    const wishZ = -look.x * sin + look.z * cos;
    const wishLen = Math.hypot(wishX, wishZ);

    const sprint = input.sprintDown || input.chargingRun();
    const charge = input.chargingRun();
    const base = (this.isHulk ? (this.raging ? 128 : 110) * this.mods.speed * kit.speed : 11.5 * lifeMul) * this.gadgetSpeed;
    const speed = base * (sprint ? 1.55 : 1) * (charge ? 1.35 : 1);
    const accel = this.grounded ? (this.isHulk ? 280 : 52) : this.climbing ? 48 : 72;
    if (this.driving) {
      this.velocity.x = 0;
      this.velocity.z = 0;
    } else if (moving && wishLen > 0.01) {
      this.velocity.x += (wishX / wishLen) * accel * dt;
      this.velocity.z += (wishZ / wishLen) * accel * dt;
      const targetYaw = Math.atan2(wishX, wishZ);
      this.yaw = lerpAngle(this.yaw, targetYaw, 1 - Math.exp(-16 * dt));
      this.facing.set(Math.sin(this.yaw), 0, Math.cos(this.yaw));
    }
    const dampAmt = this.grounded ? (moving ? 1.15 : 14) : this.climbing ? 3.6 : 0.55;
    this.velocity.x -= this.velocity.x * dampAmt * dt;
    this.velocity.z -= this.velocity.z * dampAmt * dt;
    const cap = this.grounded ? speed : speed * 1.45;
    const hspeed = Math.hypot(this.velocity.x, this.velocity.z);
    if (hspeed > cap) {
      this.velocity.x *= cap / hspeed;
      this.velocity.z *= cap / hspeed;
    }

    if (input.consumeDodge()) {
      const dir = moving && wishLen > 0.01 ? new THREE.Vector3(wishX / wishLen, 0, wishZ / wishLen) : this.facing.clone();
      this.velocity.x += dir.x * (this.isHulk ? 48 : 22);
      this.velocity.z += dir.z * (this.isHulk ? 48 : 22);
      this.invuln = Math.max(this.invuln, 0.32);
    }

    const aimX = moving && wishLen > 0.01 ? wishX / wishLen : this.facing.x;
    const aimZ = moving && wishLen > 0.01 ? wishZ / wishLen : this.facing.z;
    const supportNow = world.floorAt(this.position.x, this.position.z, this.radius, this.position.y);
    const onRoof = this.grounded && supportNow > 5.2;

    if (this.roofHop) {
      this.advanceRoofHop(dt, world);
    } else {
      const wallNow = this.isHulk && kit.climb ? world.wallAt(this.position.x, this.position.z, this.radius, this.position.y) : null;
      const mantle = Boolean(wallNow) && this.position.y > wallNow!.height * 0.32;
      const wantClimb = Boolean(this.isHulk && kit.climb && wallNow) && !this.grounded && (input.climbDown || mantle);
      const canJump = this.grounded || this.coyote > 0 || this.climbing;

      if (this.isHulk && this.grounded && (input.grabDown || onRoof) && input.consumeAirPound()) {
        if (this.startRoofHop(world, aimX, aimZ, onRoof, audio)) {
          this.skipJumpRelease = true;
        }
      }

      const released = input.consumeJumpRelease();
      if (released > 0 && this.skipJumpRelease) {
        this.skipJumpRelease = false;
      } else if (released > 0 && canJump) {
        const hop = released < 0.2;
        const chargeJump = Math.min(3, released);
        const roofChain = this.isHulk && (input.grabDown || onRoof);
        if (this.climbing && wallNow) {
          this.position.y = wallNow.height + 0.4;
          this.velocity.y = 14 * this.mods.jump * kit.jump;
          this.climbing = false;
          this.grounded = true;
          audio.jump();
        } else if (roofChain && this.startRoofHop(world, aimX, aimZ, onRoof, audio)) {
          /* magnet to the next lot */
        } else {
          this.velocity.y = this.isHulk
            ? (hop ? 32 : 78 + chargeJump * 48) * this.mods.jump * kit.jump
            : hop
              ? 8.4
              : 9.2 + chargeJump * 2.2;
          if (this.isHulk && !hop) {
            this.velocity.x += this.facing.x * (22 + chargeJump * 18);
            this.velocity.z += this.facing.z * (22 + chargeJump * 18);
            this.leapFrom = this.position.clone();
          }
          this.grounded = false;
          this.climbing = false;
          this.coyote = 0;
          audio.jump();
        }
      } else if (input.consumeAirPound() && this.isHulk && !this.grounded && !this.climbing) {
        this.velocity.y = Math.min(this.velocity.y, -26 - Math.max(0, this.position.y) * 0.35);
        this.attackKind = Attack.Ground;
        this.poundQueued = true;
        this.smashFlash = 0.2;
      }

      this.climbing = Boolean(wantClimb && !this.grounded);
      if (this.climbing && wallNow) {
        const climbSpeed = (mantle ? 34 : 28) * this.mods.climb;
        this.velocity.y = Math.max(this.velocity.y, climbSpeed);
        if (this.position.y >= wallNow.height - 4.8) {
          this.position.y = wallNow.height;
          this.velocity.y = 8;
          this.climbing = false;
          this.grounded = true;
        }
      } else {
        this.velocity.y -= 34 * this.mods.gravity * dt;
      }

      this.position.x += this.velocity.x * dt;
      this.position.z += this.velocity.z * dt;
      this.position.y += this.velocity.y * dt;

      const resolved = world.resolveCircle(
        this.position.x,
        this.position.z,
        this.radius,
        this.position.y,
        this.climbing || (this.isHulk && charge),
      );
      this.position.x = resolved.x;
      this.position.z = resolved.z;

      const support = world.floorAt(this.position.x, this.position.z, this.radius, this.position.y);
      if (this.position.y <= support) {
        if (this.isHulk && !this.grounded && (this.poundQueued || this.velocity.y < -16)) {
          this.attackKind = Attack.Ground;
          this.poundQueued = true;
          this.smashTimer = 0.26;
          this.smashActive = 0.22;
          this.smashFlash = 0.22;
          audio.smash();
        }
        if (this.leapFrom) {
          const d = this.position.distanceTo(this.leapFrom);
          this.noteLeap(d);
          this.leapFrom = null;
        }
        this.position.y = support;
        this.velocity.y = 0;
        this.grounded = true;
        this.climbing = false;
      } else if (!this.climbing) {
        this.grounded = false;
      }
    }

    const attack = input.consumeAttack();
    if (attack && this.willBuild && this.isHulk) {
      this.constructQueued = true;
    } else if (attack && this.smashTimer <= 0 && this.stanceCd <= 0) {
      if (this.held && this.isHulk && attack === Attack.Smash) {
        this.clubSwing = true;
        this.attackKind = Attack.Smash;
        this.smashTimer = 0.22 * this.mods.smashCd;
        this.smashActive = 0.2;
        this.smashFlash = 0.26;
        audio.smash();
      } else if (!this.isHulk) {
        this.attackKind = Attack.Smash;
        this.smashTimer = 0.38;
        this.smashActive = 0.16;
        this.smashFlash = 0.2;
        if (attack === Attack.Super) this.invuln = Math.max(this.invuln, 0.28);
        audio.smash();
      } else {
        const st = styleDef(this.style);
        const boxingFast = this.style === "boxing" && this.hulkKind === "fixit" ? 0.8 : 1;
        const finisher = attack === Attack.Smash && this.lightCombo >= kit.comboLen - 1 && moving;
        const heavy = attack === Attack.Super;
        this.attackKind = this.style === "karate" && heavy ? Attack.Ground : heavy || finisher ? Attack.Super : Attack.Smash;
        if (this.style === "judo" && heavy) this.attackKind = Attack.Ground;
        if (this.style === "jiujitsu" && heavy) this.attackKind = Attack.Super;
        if (!heavy && !finisher) this.lightCombo = (this.lightCombo + 1) % kit.comboLen;
        else this.lightCombo = 0;
        this.lastMove = heavy ? st.hold : st.tap;
        this.noteStyle();
        const linger = this.style === "jiujitsu" ? 0.34 : 0.2;
        this.smashTimer = (heavy ? 0.36 : 0.16) * this.mods.smashCd / (st.speed * boxingFast);
        this.smashActive = linger;
        this.smashFlash = 0.26;
        if (heavy) {
          this.velocity.x += this.facing.x * (this.style === "judo" ? 4 : 10);
          this.velocity.z += this.facing.z * (this.style === "judo" ? 4 : 10);
          if (this.grounded) this.velocity.y = this.style === "karate" ? 12 : 6;
          if (this.style === "judo") {
            this.velocity.y = 10;
            this.poundQueued = true;
          }
        } else if (this.style === "judo") {
          this.velocity.x += this.facing.x * 6;
          this.velocity.z += this.facing.z * 6;
        } else if (this.style === "karate") {
          this.velocity.x += this.facing.x * 8;
          this.velocity.z += this.facing.z * 8;
        }
        audio.smash();
      }
    }

    if (input.consumeBanner()) this.toggleForm(audio);

    this.animate(dt, moving, hspeed);
    this.group.position.copy(this.position);
    this.group.rotation.y = this.yaw;
    if (this.isHulk) this.titanRoot.scale.setScalar(this.raging ? this.baseScale * 1.1 : this.baseScale);
    this.holdPose();
    this.syncGlow();
  }

  noteHit(): void {
    this.noteLightLanded();
  }

  setStyle(next: FightStyle): "ok" | "off" | "blocked" | "busy" {
    if (this.stanceCd > 0) return "busy";
    if (this.hulkKind === "maestro" && next === "jiujitsu") return "blocked";
    if (this.style === next) {
      this.style = "savage";
      this.stanceCd = 0.3;
      this.lastMove = "brawl";
      return "off";
    }
    this.style = next;
    this.stanceCd = 0.3;
    this.lastMove = styleDef(next).tap;
    return "ok";
  }

  noteStyle(): void {
    if (this.style === "savage") return;
    if (this.styleLog[this.styleLog.length - 1] !== this.style) this.styleLog.push(this.style);
    const uniq = new Set(this.styleLog);
    this.mixReady = uniq.size >= 3;
  }

  fireRoar(): boolean {
    if (!this.isHulk || this.roarCd > 0) return false;
    this.roarCd = 6;
    this.addRage(METERS.roar);
    this.smashFlash = 0.3;
    return true;
  }

  fireGamma(): boolean {
    if (!this.isHulk || this.gammaCd > 0 || !this.canUsePowers) return false;
    if (!this.spendGamma(12)) return false;
    this.gammaCd = 28;
    this.attackKind = Attack.Clap;
    this.smashActive = 0.32;
    this.smashFlash = 0.4;
    return true;
  }

  beginSpecial(kind: AttackKind, smash = true): void {
    this.attackKind = kind;
    if (smash) {
      this.smashActive = 0.24;
      this.smashTimer = 0.4;
      this.smashFlash = 0.28;
      this.specialCd = 0.8;
    }
  }

  private applyKindLook(): void {
    const kit = formDef(this.hulkKind);
    if (isWorldBreaker(this.hulkKind)) {
      this.skinMat.color.setHex(SAVAGE_GREEN);
      this.skinDeepMat.color.setHex(SAVAGE_DEEP);
    } else {
      this.skinMat.color.setHex(kit.skin);
      this.skinDeepMat.color.setHex(kit.deep);
    }
    this.khakiMat.color.setHex(kit.khaki);
    this.khakiDarkMat.color.setHex(kit.khaki);
    this.hairMat.color.setHex(kit.hair);
    this.skinMat.sheenColor.set(this.skinMat.color).multiplyScalar(0.55);
    this.syncGlow();
  }

  private syncGlow(): void {
    const kit = formDef(this.isBruce ? this.lastTitan : this.hulkKind);
    const dull = this.band === "bruce";
    const savage = this.isHulk && isWorldBreaker(this.hulkKind);
    const heat = radianceStrength(this.rage, this.gamma, this.raging, this.tier === "meltdown");
    const glowMat = this.glow.material as THREE.MeshBasicMaterial;
    const inner = this.coronaInner.material as THREE.SpriteMaterial;
    const outer = this.coronaOuter.material as THREE.SpriteMaterial;

    if (savage) {
      // Keep body GREEN — red emissive on skin reads yellow under sun/bloom
      this.skinMat.color.setHex(dull ? 0x3d8a48 : SAVAGE_GREEN);
      this.skinDeepMat.color.setHex(SAVAGE_DEEP);
      this.skinMat.emissive.setHex(0x0a2a0c);
      this.skinDeepMat.emissive.setHex(0x082008);
      this.skinMat.emissiveIntensity = dull ? 0.02 : 0.04;
      this.skinDeepMat.emissiveIntensity = 0.03;
      glowMat.color.setHex(RADIANCE_RED);
      glowMat.opacity = dull ? 0.04 : 0.08 + heat * 0.22;
      this.glow.visible = true;
      inner.color.setHex(RADIANCE_RED);
      outer.color.setHex(RADIANCE_RED);
      inner.opacity = dull ? 0.08 : 0.18 + heat * 0.55;
      outer.opacity = dull ? 0.04 : 0.1 + heat * 0.42;
      this.coronaInner.visible = true;
      this.coronaOuter.visible = true;
      const s = 3.6 + heat * 2.8;
      this.coronaInner.scale.setScalar(s);
      this.coronaOuter.scale.setScalar(s * 1.85);
      this.heroLights.chest.color.setHex(RADIANCE_RED);
      this.heroLights.rim.color.setHex(RADIANCE_RED);
      this.heroLights.chest.intensity = dull ? 0.15 : 0.35 + heat * 1.2;
      this.heroLights.rim.intensity = dull ? 0.1 : 0.25 + heat * 0.9;
      this.heroLights.key.intensity = 1.9 + heat * 0.35;
    } else {
      this.skinMat.emissive.setHex(kit.glow);
      this.skinDeepMat.emissive.setHex(kit.glow);
      this.skinMat.emissiveIntensity = this.isHulk ? (dull ? 0.04 : 0.12 + this.gamma / 220) : 0.02;
      this.skinDeepMat.emissiveIntensity = this.skinMat.emissiveIntensity * 0.6;
      glowMat.color.setHex(kit.glow);
      glowMat.opacity = this.isHulk && this.gamma > 4 ? 0.05 + this.gamma / 400 : 0;
      this.glow.visible = glowMat.opacity > 0.02;
      this.coronaInner.visible = false;
      this.coronaOuter.visible = false;
      this.heroLights.chest.intensity = this.isHulk ? 0.25 : 0.08;
      this.heroLights.rim.intensity = this.isHulk ? 0.2 : 0.05;
      this.heroLights.chest.color.setHex(kit.glow);
      this.heroLights.rim.color.setHex(0xffeedd);
      this.heroLights.key.intensity = this.isHulk ? 2.2 : 1.7;
    }
    this.heroLights.fill.intensity = this.isHulk ? 0.75 : 0.55;
    this.fedora.visible = this.hulkKind === "fixit";
    this.suit.visible = this.hulkKind === "fixit";
    this.beard.visible = this.hulkKind === "maestro";
    this.mace.visible = this.hulkKind === "maestro";
    this.wbCrust.visible = this.isHulk && isWorldBreaker(this.hulkKind);
    this.hellHorns.visible = this.hulkKind === "hell" || this.hulkKind === "mephisto";
    this.cosmicRing.visible = this.hulkKind === "cosmic";
    this.strangeCloak.visible = this.hulkKind === "ironstrange";
  }

  private buildFormExtras(): void {
    this.extras.clear();
    this.fedora = new THREE.Group();
    const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.04, 24), shade(0x1a1814, 8));
    brim.position.y = 0.28;
    const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.24, 0.22, 18), shade(0x1a1814, 8));
    crown.position.y = 0.4;
    this.fedora.add(brim, crown);
    this.fedora.position.y = 0.12;
    this.head.add(this.fedora);

    this.suit = new THREE.Group();
    const jacket = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.85, 0.7), shade(0x2a2c32, 14));
    jacket.position.set(0, 1.15, 0.05);
    const lapelL = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.55, 0.06), shade(0x1e2026, 12));
    lapelL.position.set(-0.22, 1.28, 0.36);
    lapelL.rotation.z = 0.18;
    const lapelR = lapelL.clone();
    lapelR.position.x = 0.22;
    lapelR.rotation.z = -0.18;
    const tie = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.42, 0.04), shade(0x8a2020, 22));
    tie.position.set(0, 1.18, 0.4);
    this.suit.add(jacket, lapelL, lapelR, tie);
    this.torso.add(this.suit);

    this.beard = new THREE.Mesh(new THREE.SphereGeometry(0.16, 16, 12), shade(0xc8c0b0, 8));
    this.beard.scale.set(1.1, 0.7, 0.7);
    this.beard.position.set(0, -0.22, 0.18);
    this.head.add(this.beard);

    this.mace = new THREE.Group();
    const haft = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 1.4, 12), shade(0x3a2a18, 10));
    haft.rotation.z = 0.3;
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.18, 16, 12), shade(0x6a6e68, 40));
    head.position.set(0.22, 0.72, 0);
    this.mace.add(haft, head);
    this.mace.position.set(0.2, -0.5, 0.1);
    this.rightFore.add(this.mace);

    this.fedora.visible = false;
    this.suit.visible = false;
    this.beard.visible = false;
    this.mace.visible = false;
  }

  setLod(camDist: number): void {
    const hi = camDist < 48; // keep defined face readable
    for (const g of this.lodFine) g.visible = hi;
  }

  private dressTitanDetail(skin: THREE.Material, deep: THREE.Material, khaki: THREE.Material): void {
    const headFine = new THREE.Group();
    headFine.name = "titan-face-lod";
    for (const x of [-0.16, 0.16]) {
      const cheek = new THREE.Mesh(new THREE.SphereGeometry(0.1, 16, 12), skin);
      cheek.scale.set(0.95, 0.72, 0.58);
      cheek.position.set(x, -0.08, 0.2);
      headFine.add(cheek);
    }
    for (const x of [-0.09, 0.09]) {
      const lid = new THREE.Mesh(new THREE.SphereGeometry(0.058, 12, 10), skin);
      lid.scale.set(1.25, 0.26, 0.72);
      lid.position.set(x, 0.045, 0.258);
      headFine.add(lid);
      const lower = lid.clone();
      lower.position.y = -0.02;
      lower.scale.y = 0.2;
      headFine.add(lower);
    }
    const teeth = new THREE.Mesh(
      new THREE.BoxGeometry(0.16, 0.032, 0.04),
      new THREE.MeshPhongMaterial({ color: 0xf2ece0, shininess: 70, specular: 0xffffff }),
    );
    teeth.position.set(0, -0.152, 0.258);
    headFine.add(teeth);
    const chin = new THREE.Mesh(new THREE.SphereGeometry(0.1, 16, 12), skin);
    chin.scale.set(1.15, 0.52, 0.82);
    chin.position.set(0, -0.28, 0.12);
    headFine.add(chin);
    for (const x of [-0.1, 0.1]) {
      const ridge = new THREE.Mesh(new THREE.SphereGeometry(0.08, 14, 10), deep);
      ridge.scale.set(1.35, 0.32, 0.55);
      ridge.position.set(x, 0.1, 0.24);
      ridge.rotation.z = x > 0 ? -0.22 : 0.22;
      headFine.add(ridge);
    }
    for (const x of [-0.018, 0.018]) {
      const nare = new THREE.Mesh(new THREE.SphereGeometry(0.016, 8, 8), deep);
      nare.position.set(x, -0.06, 0.318);
      headFine.add(nare);
    }
    this.head.add(headFine);
    this.lodFine.push(headFine);

    const bodyFine = new THREE.Group();
    bodyFine.name = "titan-muscle-lod";
    for (const x of [-0.42, 0.42]) {
      const ser = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 10), skin);
      ser.scale.set(0.7, 1.6, 0.45);
      ser.position.set(x, 0.72, 0.32);
      bodyFine.add(ser);
    }
    const cleft = new THREE.Mesh(new THREE.SphereGeometry(0.08, 10, 8), deep);
    cleft.scale.set(0.35, 1.4, 0.25);
    cleft.position.set(0, 1.22, 0.52);
    bodyFine.add(cleft);
    for (const x of [-0.22, 0.22]) {
      const strap = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.12, 0.08), khaki);
      strap.position.set(x, 1.58, 0.28);
      strap.rotation.z = x > 0 ? -0.4 : 0.4;
      bodyFine.add(strap);
    }
    this.torso.add(bodyFine);
    this.lodFine.push(bodyFine);
  }

  smashOrigin(): THREE.Vector3 {
    if (this.attackKind === Attack.Ground || this.poundQueued || this.attackKind === Attack.Super) {
      return this.position.clone();
    }
    return this.position.clone().addScaledVector(this.facing, 3.4);
  }

  grab(block: LiftedBlock): void {
    this.dropHeld();
    this.held = block;
    block.mesh.position.set(0, 2.15, 1.15);
    this.group.add(block.mesh);
  }

  dropHeld(): LiftedBlock | null {
    const block = this.held;
    if (!block) return null;
    this.group.remove(block.mesh);
    this.held = null;
    return block;
  }

  private holdPose(): void {
    if (!this.held) return;
    this.leftArm.rotation.x = -2.35;
    this.rightArm.rotation.x = -2.45;
    this.leftFore.rotation.x = 0.85;
    this.rightFore.rotation.x = 0.9;
    this.held.mesh.position.set(0, 2.15, 1.15);
  }

  private animate(dt: number, moving: boolean, speed: number): void {
    // Softer follow-through while smashing (less robotic snap)
    const smashEase = this.smashFlash > 0 || this.smashActive > 0;
    const k = 1 - Math.exp(-(smashEase ? 9.5 : 18) * dt);
    const breathe = Math.sin(this.walkPhase * 0.55) * 0.025;
    this.walkPhase += dt * (moving && this.grounded ? 14 + speed * 0.16 : 2.2);
    const agg = 0.72 + (this.rage / 100) * 0.55;
    const swing = (moving && this.grounded ? Math.sin(this.walkPhase) : Math.sin(this.walkPhase) * 0.06) * agg;
    const arm = moving && this.grounded ? swing * 0.72 : swing * 0.08;
    const leg = moving && this.grounded ? -swing * 0.7 : swing * 0.04;
    const lift = moving && this.grounded ? Math.max(0, Math.sin(this.walkPhase)) * 0.45 : 0.12;

    let laX = arm;
    let raX = -arm;
    let laY = 0;
    let raY = 0;
    let lfX = lift;
    let rfX = moving ? Math.max(0, Math.sin(this.walkPhase + Math.PI)) * 0.45 : 0.12;
    let llX = leg;
    let rlX = -leg;
    let lcX = lift * 0.7;
    let rcX = rfX * 0.7;
    let tX = breathe;
    let tY = moving && this.grounded ? swing * 0.08 : 0;
    let hX = moving ? 0.06 : breathe * 0.4;
    let hipY = this.grounded ? 1.12 + Math.abs(swing) * (moving ? 0.06 : 0) : 1.18;

    if (this.climbing) {
      const haul = Math.sin(this.walkPhase * 1.5);
      laX = -2.05 + haul * 0.4;
      raX = -2.05 - haul * 0.4;
      lfX = 1.1;
      rfX = 1.1;
      llX = 0.55;
      rlX = -0.4;
      tX = -0.16;
      hipY = 1.2;
    }
    if (this.smashFlash > 0 || this.smashActive > 0) {
      // Wind-up → impact → follow-through keyed off smashFlash remaining
      const u = Math.max(0, Math.min(1, this.smashFlash / 0.32));
      const wind = Math.sin((1 - u) * Math.PI); // 0 at start/end, 1 mid
      if (this.attackKind === Attack.Super || this.attackKind === Attack.Ground) {
        // Dual overhead slam — movie weight
        laX = -0.6 - wind * 1.85;
        raX = -0.7 - wind * 1.9;
        lfX = 0.15 + wind * 0.55;
        rfX = 0.2 + wind * 0.5;
        tX = 0.15 + wind * 0.55;
        hX = -0.12 + wind * 0.35;
        hipY = 1.05 + wind * 0.08;
        llX = 0.25;
        rlX = -0.15;
      } else {
        // Alternating haymaker with torso torque
        const side = Math.sin(this.walkPhase * 0.5) >= 0 ? 1 : -1;
        laX = side > 0 ? -0.4 - wind * 1.7 : -0.9 - wind * 0.5;
        raX = side > 0 ? -0.9 - wind * 0.55 : -0.45 - wind * 1.75;
        lfX = 0.25 + wind * 0.7;
        rfX = 0.25 + wind * 0.7;
        tX = 0.12 + wind * 0.38;
        tY = side * wind * 0.35;
        hX = 0.08 + wind * 0.15;
        laY = side * wind * -0.45;
        raY = side * wind * 0.45;
      }
    } else if (!this.grounded && !this.climbing) {
      laX = 0.35;
      raX = -0.15;
      llX = 0.45;
      rlX = -0.25;
      tX = -0.08;
    }

    if (this.breathFail > 0) {
      const shake = Math.sin(this.walkPhase * 18) * 0.12;
      tX += 0.28;
      hX += 0.2;
      laX += 0.35 + shake;
      raX += 0.35 - shake;
      hipY -= 0.08;
    }

    this.leftArm.rotation.x = damp(this.leftArm.rotation.x, laX, k);
    this.rightArm.rotation.x = damp(this.rightArm.rotation.x, raX, k);
    this.leftFore.rotation.x = damp(this.leftFore.rotation.x, lfX, k);
    this.rightFore.rotation.x = damp(this.rightFore.rotation.x, rfX, k);
    this.leftLeg.rotation.x = damp(this.leftLeg.rotation.x, llX, k);
    this.rightLeg.rotation.x = damp(this.rightLeg.rotation.x, rlX, k);
    this.leftCalf.rotation.x = damp(this.leftCalf.rotation.x, lcX, k);
    this.rightCalf.rotation.x = damp(this.rightCalf.rotation.x, rcX, k);
    this.torso.rotation.x = damp(this.torso.rotation.x, tX, k);
    this.torso.rotation.y = damp(this.torso.rotation.y, tY, k);
    this.head.rotation.x = damp(this.head.rotation.x, hX, k);
    this.hips.position.y = damp(this.hips.position.y, hipY, k);
    this.leftArm.rotation.y = damp(this.leftArm.rotation.y, laY, k);
    this.rightArm.rotation.y = damp(this.rightArm.rotation.y, raY, k);
    if (this.held) this.holdPose();
  }

  private makeArm(skin: THREE.Material, deep: THREE.Material, left: boolean): { root: THREE.Group; fore: THREE.Group } {
    const root = new THREE.Group();
    const side = left ? -1 : 1;
    root.position.set(side * 1.18, 1.48, 0.02);
    root.rotation.z = side * 0.2;
    const delt = new THREE.Mesh(new THREE.SphereGeometry(0.55, 22, 16), skin);
    delt.scale.set(1.2, 1.02, 1.12);
    delt.position.set(side * 0.16, 0.04, 0.02);
    root.add(delt);
    const bicep = new THREE.Mesh(new THREE.SphereGeometry(0.36, 28, 20), skin);
    bicep.scale.set(1.08, 1.42, 1.15);
    bicep.position.set(side * 0.18, -0.4, 0.1);
    root.add(bicep);
    const upper = new THREE.Mesh(new THREE.CapsuleGeometry(0.24, 0.34, 12, 24), skin);
    upper.position.set(side * 0.18, -0.54, 0);
    root.add(upper);
    const tricep = new THREE.Mesh(new THREE.SphereGeometry(0.26, 22, 16), deep);
    tricep.scale.set(0.92, 1.35, 0.82);
    tricep.position.set(side * 0.18, -0.5, -0.12);
    root.add(tricep);
    const fore = new THREE.Group();
    fore.position.set(side * 0.16, -0.88, 0);
    fore.rotation.x = 0.18;
    root.add(fore);
    const lower = new THREE.Mesh(new THREE.CapsuleGeometry(0.22, 0.38, 12, 24), skin);
    lower.position.y = -0.32;
    fore.add(lower);
    const forearm = new THREE.Mesh(new THREE.SphereGeometry(0.22, 22, 16), skin);
    forearm.scale.set(1.2, 1.45, 1.05);
    forearm.position.set(0, -0.22, 0.06);
    fore.add(forearm);
    const fist = new THREE.Mesh(new THREE.SphereGeometry(0.22, 24, 18), skin);
    fist.scale.set(1.2, 0.82, 1.28);
    fist.position.set(0, -0.66, 0.08);
    fore.add(fist);
    for (let i = 0; i < 4; i++) {
      const finger = new THREE.Mesh(new THREE.CapsuleGeometry(0.032, 0.15, 6, 10), skin);
      finger.position.set((i - 1.5) * 0.075, -0.82, 0.12);
      finger.rotation.x = 0.55;
      fore.add(finger);
    }
    const veins = new THREE.Group();
    for (const y of [-0.28, -0.48]) {
      const vein = new THREE.Mesh(new THREE.CapsuleGeometry(0.018, 0.2, 4, 6), deep);
      vein.position.set(side * 0.32, y, 0.16);
      vein.rotation.z = side * 0.15;
      veins.add(vein);
    }
    root.add(veins);
    this.lodFine.push(veins);
    return { root, fore };
  }

  private makeLeg(skin: THREE.Material, khaki: THREE.Material, left: boolean): { root: THREE.Group; calf: THREE.Group } {
    const root = new THREE.Group();
    const side = left ? -1 : 1;
    root.position.set(side * 0.4, 1.12, 0);
    const cuff = new THREE.Mesh(new THREE.CapsuleGeometry(0.32, 0.18, 12, 24), khaki);
    cuff.position.y = -0.08;
    root.add(cuff);
    const thigh = new THREE.Mesh(new THREE.CapsuleGeometry(0.3, 0.42, 12, 24), skin);
    thigh.position.y = -0.28;
    root.add(thigh);
    const quad = new THREE.Mesh(new THREE.SphereGeometry(0.3, 24, 18), skin);
    quad.scale.set(1.18, 1.4, 1.12);
    quad.position.set(0, -0.3, 0.1);
    root.add(quad);
    const calf = new THREE.Group();
    calf.position.y = -0.62;
    root.add(calf);
    const lower = new THREE.Mesh(new THREE.CapsuleGeometry(0.2, 0.42, 12, 24), skin);
    lower.position.y = -0.32;
    calf.add(lower);
    const gastroc = new THREE.Mesh(new THREE.SphereGeometry(0.22, 22, 16), skin);
    gastroc.scale.set(1.12, 1.5, 1.22);
    gastroc.position.set(0, -0.24, -0.07);
    calf.add(gastroc);
    const foot = new THREE.Mesh(new THREE.SphereGeometry(0.2, 20, 16), skin);
    foot.scale.set(1.08, 0.38, 2.05);
    foot.position.set(0, -0.66, 0.2);
    calf.add(foot);
    const heel = new THREE.Mesh(new THREE.SphereGeometry(0.12, 14, 12), skin);
    heel.scale.set(1, 0.7, 1.1);
    heel.position.set(0, -0.64, -0.06);
    calf.add(heel);
    for (let i = 0; i < 5; i++) {
      const big = i === 0 || i === 4;
      const toe = new THREE.Mesh(new THREE.SphereGeometry(big ? 0.055 : 0.042, 10, 8), skin);
      toe.scale.set(0.85, 0.5, 1.55);
      toe.position.set((i - 2) * 0.058, -0.68, 0.48);
      calf.add(toe);
    }
    return { root, calf };
  }

  private snapshotJoints(): Joints {
    return {
      hips: this.hips,
      leftArm: this.leftArm,
      rightArm: this.rightArm,
      leftFore: this.leftFore,
      rightFore: this.rightFore,
      leftLeg: this.leftLeg,
      rightLeg: this.rightLeg,
      leftCalf: this.leftCalf,
      rightCalf: this.rightCalf,
      torso: this.torso,
      head: this.head,
    };
  }

  private applyJoints(j: Joints): void {
    this.hips = j.hips;
    this.leftArm = j.leftArm;
    this.rightArm = j.rightArm;
    this.leftFore = j.leftFore;
    this.rightFore = j.rightFore;
    this.leftLeg = j.leftLeg;
    this.rightLeg = j.rightLeg;
    this.leftCalf = j.leftCalf;
    this.rightCalf = j.rightCalf;
    this.torso = j.torso;
    this.head = j.head;
  }

  private buildHuman(): void {
    const skin = this.humanSkinMat;
    const shirt = shade(0xd8cfc2, 16);
    const slacks = shade(0x3a3c44, 12);
    const shoe = shade(0x1a1816, 20);
    const hair = makeHair(0x3a2a18);
    const eyeWhite = eyeMat(0xf7f2ea);
    const iris = eyeMat(0x3d4a28);
    const frame = shade(0x1a1a1a, 40);

    const hips = new THREE.Group();
    hips.position.y = 1.12;
    const torso = new THREE.Group();
    hips.add(torso);
    const body = new THREE.Mesh(
      lathe(
        [
          [0.22, 0.0],
          [0.24, 0.2],
          [0.26, 0.5],
          [0.3, 0.85],
          [0.32, 1.15],
          [0.28, 1.38],
          [0.16, 1.48],
        ],
        40,
      ),
      shirt,
    );
    body.scale.set(1, 1, 0.82);
    torso.add(body);
    const collarL = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.12, 0.08), shirt);
    collarL.position.set(-0.1, 1.46, 0.16);
    collarL.rotation.z = 0.45;
    const collarR = collarL.clone();
    collarR.position.x = 0.1;
    collarR.rotation.z = -0.45;
    const tie = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.32, 0.03), shade(0x2a3a68, 22));
    tie.position.set(0, 1.22, 0.18);
    const belt = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.025, 8, 20), shade(0x2a2418, 10));
    belt.rotation.x = Math.PI / 2;
    belt.position.y = 0.08;
    torso.add(collarL, collarR, tie);
    hips.add(belt);
    const neck = new THREE.Mesh(new THREE.CapsuleGeometry(0.1, 0.12, 8, 16), skin);
    neck.position.y = 1.52;
    torso.add(neck);
    const head = new THREE.Group();
    head.position.y = 1.72;
    hips.add(head);
    const skull = new THREE.Mesh(new THREE.SphereGeometry(0.2, 40, 32), skin);
    skull.scale.set(0.9, 1.05, 0.88);
    head.add(skull);
    const jaw = new THREE.Mesh(new THREE.SphereGeometry(0.14, 18, 14), skin);
    jaw.scale.set(1.05, 0.55, 0.95);
    jaw.position.set(0, -0.12, 0.04);
    head.add(jaw);
    const hairMesh = new THREE.Mesh(new THREE.SphereGeometry(0.21, 20, 16, 0, Math.PI * 2, 0, 1.1), hair);
    hairMesh.position.set(0, 0.05, -0.02);
    head.add(hairMesh);
    for (const x of [-0.06, 0.06]) {
      const white = new THREE.Mesh(new THREE.SphereGeometry(0.035, 12, 10), eyeWhite);
      white.position.set(x, 0.02, 0.17);
      head.add(white);
      const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.016, 10, 8), iris);
      pupil.position.set(x, 0.02, 0.2);
      head.add(pupil);
    }
    const glasses = new THREE.Mesh(new THREE.TorusGeometry(0.055, 0.008, 8, 16), frame);
    glasses.position.set(-0.06, 0.02, 0.175);
    head.add(glasses);
    const glassesR = glasses.clone();
    glassesR.position.x = 0.06;
    head.add(glassesR);
    const bridge = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.01, 0.01), frame);
    bridge.position.set(0, 0.025, 0.18);
    head.add(bridge);

    const faceFine = new THREE.Group();
    for (const x of [-0.055, 0.055]) {
      const brow = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.012, 0.02), hair);
      brow.position.set(x, 0.07, 0.16);
      faceFine.add(brow);
      const lid = new THREE.Mesh(new THREE.SphereGeometry(0.038, 10, 8), skin);
      lid.scale.set(1.1, 0.28, 0.7);
      lid.position.set(x, 0.038, 0.168);
      faceFine.add(lid);
    }
    const nose = new THREE.Mesh(new THREE.SphereGeometry(0.028, 10, 8), skin);
    nose.scale.set(0.7, 1.15, 0.9);
    nose.position.set(0, -0.01, 0.185);
    faceFine.add(nose);
    const mouth = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.012, 0.02), shade(0x8a5a52, 20));
    mouth.position.set(0, -0.1, 0.175);
    faceFine.add(mouth);
    head.add(faceFine);
    this.lodFine.push(faceFine);

    const madeL = this.makeSlimArm(skin, shirt, true);
    const madeR = this.makeSlimArm(skin, shirt, false);
    hips.add(madeL.root, madeR.root);
    const madeLL = this.makeSlimLeg(slacks, shoe, true);
    const madeRL = this.makeSlimLeg(slacks, shoe, false);
    this.humanRoot.add(hips, madeLL.root, madeRL.root);
    this.group.add(this.humanRoot);

    this.hips = hips;
    this.torso = torso;
    this.head = head;
    this.leftArm = madeL.root;
    this.rightArm = madeR.root;
    this.leftFore = madeL.fore;
    this.rightFore = madeR.fore;
    this.leftLeg = madeLL.root;
    this.rightLeg = madeRL.root;
    this.leftCalf = madeLL.calf;
    this.rightCalf = madeRL.calf;
  }

  private makeSlimArm(skin: THREE.Material, shirt: THREE.Material, left: boolean): { root: THREE.Group; fore: THREE.Group } {
    const root = new THREE.Group();
    const side = left ? -1 : 1;
    root.position.set(side * 0.38, 1.32, 0);
    const upper = new THREE.Mesh(new THREE.CapsuleGeometry(0.08, 0.28, 8, 16), shirt);
    upper.position.set(side * 0.04, -0.22, 0);
    root.add(upper);
    const fore = new THREE.Group();
    fore.position.set(side * 0.04, -0.42, 0);
    root.add(fore);
    const lower = new THREE.Mesh(new THREE.CapsuleGeometry(0.065, 0.26, 8, 16), skin);
    lower.position.y = -0.18;
    fore.add(lower);
    const fist = new THREE.Mesh(new THREE.SphereGeometry(0.07, 14, 12), skin);
    fist.position.set(0, -0.36, 0.02);
    fore.add(fist);
    return { root, fore };
  }

  private makeSlimLeg(slacks: THREE.Material, shoe: THREE.Material, left: boolean): { root: THREE.Group; calf: THREE.Group } {
    const root = new THREE.Group();
    const side = left ? -1 : 1;
    root.position.set(side * 0.14, 1.12, 0);
    const thigh = new THREE.Mesh(new THREE.CapsuleGeometry(0.1, 0.32, 8, 16), slacks);
    thigh.position.y = -0.22;
    root.add(thigh);
    const calf = new THREE.Group();
    calf.position.y = -0.5;
    root.add(calf);
    const lower = new THREE.Mesh(new THREE.CapsuleGeometry(0.08, 0.34, 8, 16), slacks);
    lower.position.y = -0.22;
    calf.add(lower);
    const foot = new THREE.Mesh(new THREE.SphereGeometry(0.09, 14, 12), shoe);
    foot.scale.set(1, 0.45, 1.7);
    foot.position.set(0, -0.46, 0.08);
    calf.add(foot);
    return { root, calf };
  }
}
