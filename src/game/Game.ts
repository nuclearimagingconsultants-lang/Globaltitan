import * as THREE from "three";
import { AudioBus } from "../audio/AudioBus";
import { CITIES, getCity, HUB_CITY_ID, hubOf, isExtraCity, nextCity } from "../data/cities";
import { OBJECTIVES, objectiveById, pinObjective, syncObjectives } from "../data/objectives";
import { questById, questStatus } from "../data/quests";
import { buySkill, progressFromXp } from "../data/skills";
import { asTitan, DEFAULT_ACTIVE_FORM, DEFAULT_HULK_KIND, formDef, formSaveId, HULK_FORMS, isBruceKind, nextKind } from "../data/hulkForms";
import { applyBossFate, judgedCity, markPostBossBeat, type BossFate } from "../data/bossFate";
import { capitalBossFor, remapBossName } from "../data/capitalBosses";
import { RAZOR_VARS } from "../data/razorback";
import { flavorSpecial, styleDef } from "../data/styles";
import { applyBalanceProfile, isBalanceProfile } from "../data/balance";
import { feelOf } from "../input/ControlFeel";
import type { GameScreen, HulkKind, HudSnapshot, SaveData } from "../data/types";
import { Attack, Input, SPECIALS } from "../input/Input";
import { Hulk } from "../player/Hulk";
import { BannerLife } from "../systems/BannerLife";
import { BestiarySystem } from "../systems/BestiarySystem";
import { defaultSave, hasSave, loadSave, writeSave } from "../save/SaveGame";
import { BossFight } from "../systems/BossFight";
import { CameraRig } from "../systems/CameraRig";
import { CrimeSystem } from "../systems/CrimeSystem";
import { drawMinimap } from "../systems/Minimap";
import { SmashFx } from "../systems/SmashFx";
import { Traffic } from "../systems/Traffic";
import { Overlay, type StreetAction } from "../ui/Overlay";
import { CityWorld } from "../world/CityWorld";
import { SkyDome } from "../world/skyDome";
import { followStreet, compassLabel } from "../world/streetPack";
import {
  hidePlayfield,
  mountPlayfieldMap,
  playfieldReady,
  showPlayfield,
  syncPlayMarkers,
  syncPlayfield,
  warmPlayfield,
} from "../ui/playfieldMap";
import { pathLength, routeTo, type MapPin, type MapSnapshot } from "../systems/MapAtlas";
import { DISTRICT_COPY, District, HERO_GATE_X, VILLAIN_GATE_X } from "../data/districts";
import { NeighborhoodSystem } from "../systems/NeighborhoodSystem";
import { QuestSystem, type QuestMonster } from "../systems/QuestSystem";
import { DungeonRun } from "../systems/DungeonRun";
import { ChunkStreamer } from "../systems/ChunkStreamer";
import { LOAD_UNDER_LOAD_M } from "../world/streaming";
import { DebrisPool } from "../systems/DebrisPool";
import { FrameGuard, QUALITY } from "../systems/Quality";
import { PostStack } from "../systems/PostStack";
import { Razorback } from "../systems/Razorback";
import { Powers } from "../systems/Powers";
import { EnemyDirector } from "../systems/EnemyDirector";
import { recognizeLine, unlockCodex, VEGAS_NIGHT_LINE } from "../data/story";
import { METERS, powerCostMul, specialCost, wantedStars } from "../data/meters";
import {
  BEAT_LABEL,
  formLockLine,
  formUnlocked,
  hasUnlock,
  unlockAt,
  wantedTier,
} from "../data/smashEconomy";
import { SmashLedger } from "../systems/SmashEconomy";
import { ComicSystem, markComicCleared, markComicFound, comicById } from "../systems/ComicSystem";
import { CrowdSystem } from "../systems/CrowdSystem";
import { LoreContacts } from "../systems/LoreContacts";
import { pullWeather, type WeatherSnap } from "../systems/Weather";
import { CrimeWaveBoard, type CrimeWaveBoardHooks } from "../systems/CrimeWaveBoard";
import { DesertWarzone } from "../systems/DesertWarzone";
import { KaijuPit } from "../systems/KaijuPit";

export class Game {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(72, 1, 0.2, 640);
  private hemi = new THREE.HemisphereLight(0xeef4fa, 0x7a7468, 2.15);
  private sun = new THREE.DirectionalLight(0xffeed0, 2.4);
  private rim = new THREE.DirectionalLight(0xb4dcff, 0.55);
  private sky = new SkyDome();
  private clock = new THREE.Clock();
  private hudTimer = 0;
  private input: Input;
  private audio = new AudioBus();
  private overlay: Overlay;
  private save: SaveData;
  private world!: CityWorld;
  private player = new Hulk();
  private cam = new CameraRig();
  private crimes!: CrimeSystem;
  private traffic!: Traffic;
  private boss!: BossFight;
  private quests!: QuestSystem;
  private crimeWave = new CrimeWaveBoard();
  private desert = new DesertWarzone();
  private kaiju = new KaijuPit();
  private hood!: NeighborhoodSystem;
  private dungeon = new DungeonRun();
  private fx = new SmashFx();
  private inDungeon = false;
  private objFlags = { plaza: false, roof: false, heroes: false, warrens: false, reverted: false };
  private screen: GameScreen = "title";
  private started = false;
  private menuReturn: GameScreen = "title";
  private smashConsumed = false;
  private toast = "";
  private toastTimer = 0;
  private inCombat = 0;
  private bossPrompted = false;
  private ignoreUiUntil = 0;
  private life = new BannerLife();
  private beasts = new BestiarySystem();
  private lockName = "";
  private lockPos: THREE.Vector3 | null = null;
  private lockIndex = 0;
  private showMarkers = true;
  private chargeSmash = 0;
  private radialIndex = 0;
  private meteorLeft = 0;
  private stompChain: number[] = [];
  private meteorT = 0;
  private streamer: ChunkStreamer | null = null;
  private debris = new DebrisPool(300);
  private radialWasOpen = false;
  private post!: PostStack;
  private guard = new FrameGuard();
  private lastScale = 1;
  private razor = new Razorback();
  private lastRazorLine = "";
  private powers = new Powers();
  private director = new EnemyDirector();
  private gammaZone: { mesh: THREE.Mesh; life: number } | null = null;
  private meterSaveT = 0;
  private lastPresent = 0;
  private cityReady = false;
  private loadGen = 0;
  private navPin: MapPin | null = null;
  private pathCache: { key: string; pts: { x: number; z: number }[] } | null = null;
  private pinCache: { t: number; pins: MapPin[] } | null = null;
  private readonly smashScratch = new THREE.Vector3();
  private comics = new ComicSystem();
  private pendingFate: string | null = null;
  private queuedNyRazor = false;
  private crowd: CrowdSystem | null = null;
  private lore = new LoreContacts();
  private dungeonLamp = new THREE.PointLight(0xffe2b0, 2.6, 36, 1.5);
  private hudQuietT = 0;
  private weather: WeatherSnap | null = null;
  private pendingComic: string | null = null;
  private shadersWarmed = false;
  private smash = new SmashLedger();
  private jobCrimeId = -1;
  private streetT = 0;
  private dropping = false;
  private cwSmashGate = 0;

  private canvas: HTMLCanvasElement;

  constructor(canvas: HTMLCanvasElement, ui: HTMLElement) {
    this.canvas = canvas;
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: false,
      powerPreference: "high-performance",
      stencil: false,
      depth: true,
      premultipliedAlpha: false,
    });
    this.renderer.setPixelRatio(Math.min(1, window.devicePixelRatio || 1));
    this.renderer.setClearColor(0x8aa8c4, 1);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.08;
    this.renderer.shadowMap.enabled = false;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.scene.add(this.hemi, this.sun, this.sun.target, this.rim, this.sky.mesh);
    this.sun.position.set(48, 82, 28);
    this.sun.castShadow = false;
    this.sun.shadow.bias = -0.0008;
    this.sun.shadow.normalBias = 0.04;
    this.rim.position.set(-36, 40, -48);
    this.rim.visible = false;
    this.sun.shadow.mapSize.set(1024, 1024);
    this.sun.shadow.camera.near = 4;
    this.sun.shadow.camera.far = 220;
    this.sun.shadow.camera.left = -150;
    this.sun.shadow.camera.right = 150;
    this.sun.shadow.camera.top = 150;
    this.sun.shadow.camera.bottom = -150;
    this.input = new Input(canvas);
    this.input.onLockChange = (locked) => {
      if (!locked && this.screen === "play") this.ignoreUiUntil = performance.now() + 480;
    };
    this.save = loadSave() ?? defaultSave();
    this.overlay = new Overlay(ui);
    this.bindUi();
    void this.bootHub();
    this.scene.add(this.player.group);
    this.scene.add(this.fx.group);
    this.scene.add(this.debris.group);
    this.scene.add(this.razor.group);
    this.scene.add(this.powers.group);
    this.scene.add(this.comics.group);
    this.scene.add(this.lore.group);
    this.scene.add(this.smash.echoes);
    this.smash.hydrate(this.save);
    this.dungeonLamp.intensity = 0;
    this.scene.add(this.dungeonLamp);
    this.prewarmShaders();
    this.razor.bindSave(this.save);
    this.player.lastTitan = this.save.lastTitan;
    this.player.enableFilmLook(this.renderer);
    this.player.group.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (mesh.isMesh) {
        mesh.castShadow = true;
        mesh.receiveShadow = true;
      }
    });
    this.post = new PostStack(this.renderer, this.scene, this.camera);
    this.applyQuality();
    this.applySavedControls();
    this.paintSettings();
    this.overlay.setLegendOpen(this.save.settings.legendOpen);
    this.audio.setMuted(this.save.settings.muted);
    this.setScreen("title");
    window.addEventListener("resize", this.resize);
    window.addEventListener("keydown", this.onMenuKey);
    canvas.addEventListener("click", () => {
      if (this.screen === "play") {
        this.audio.unlock();
        this.input.requestLock();
      }
    });
    this.resize();
  }

  start(): void {
    this.clock.start();
    this.renderer.setAnimationLoop(() => this.frame());
  }

  private bindUi(): void {
    this.overlay.onNewGame = () => {
      void this.dropIntoStreets("new");
    };
    this.overlay.onIntroNext = () => {
      if (!this.uiLive()) return;
      this.audio.ui();
      if (this.overlay.advanceIntro()) {
        this.save.introSeen = true;
        writeSave(this.save);
        void this.dropIntoStreets("resume");
      }
    };
    this.overlay.onContinue = () => {
      void this.dropIntoStreets("continue");
    };
    this.overlay.onDropIn = () => {
      void this.dropIntoStreets("resume");
    };
    this.overlay.onStreetAction = (action) => {
      void this.onStreetAction(action);
    };
    this.overlay.onSaveNow = () => {
      writeSave(this.save);
      this.pushToast("Saved.");
    };
    this.overlay.onOpenStreetRoster = () => {
      this.menuReturn = this.started ? (this.screen === "pause" ? "pause" : "play") : "title";
      this.setScreen("street-roster");
      this.overlay.renderStreetRoster(this.collectStreetRoster());
    };
    this.overlay.onResume = () => {
      if (!this.uiLive()) return;
      this.closeMenu();
    };
    this.overlay.onOpenMap = () => {
      if (!this.uiLive()) return;
      this.openMap();
    };
    this.overlay.onOpenHelp = () => {
      if (!this.uiLive()) return;
      this.menuReturn = this.started ? (this.screen === "pause" ? "pause" : "play") : "title";
      this.setScreen("help");
    };
    this.overlay.onOpenSettings = () => {
      if (!this.uiLive()) return;
      this.menuReturn = this.started ? "pause" : "title";
      this.overlay.applySettings(this.save.settings.sensitivity, this.save.settings.muted, this.save.settings.quality);
      this.overlay.renderBinds({ ...this.input.binds, ...this.save.settings.binds });
      this.setScreen("settings");
    };
    this.overlay.onBackToTitle = () => {
      if (!this.uiLive()) return;
      if (this.screen !== "pause" && this.screen !== "intro") return;
      this.started = false;
      this.input.exitLock();
      this.clearPlayHash();
      this.setScreen("title");
    };
    this.overlay.onTravel = (id) => this.travelTo(id);
    this.overlay.onUnlockRoute = (_id) => {
      this.pushToast("Clear the capital dungeon to open the next city");
    };
    this.overlay.onPinObjective = (id) => {
      if (pinObjective(this.save, id)) {
        writeSave(this.save);
        this.overlay.renderTravel(this.save, this.save.cityId);
      }
      const pin =
        this.collectPins().find((p) => p.objectiveId === id) ?? this.collectPins().find((p) => p.id === `obj-${id}`);
      if (pin) this.trackPin(pin);
      else this.pushToast(`Tracking: ${objectiveById(id)?.title ?? id}`);
    };
    this.overlay.onTrackPin = (pin) => this.trackPin(pin);
    this.overlay.onCloseMap = () => this.closeMenu();
    this.overlay.onOpenSkills = () => {
      if (!this.uiLive()) return;
      this.openSkills();
    };
    this.overlay.onBuySkill = (id) => this.buySkill(id);
    this.overlay.onOpenQuests = () => {
      if (!this.uiLive()) return;
      this.openQuests();
    };
    this.overlay.onAcceptQuest = (id) => this.acceptQuest(id);
    this.overlay.onAbandonQuest = () => this.abandonQuest();
    this.overlay.onSensitivity = (v) => {
      this.save.settings.sensitivity = v;
      writeSave(this.save);
    };
    this.overlay.onMute = (v) => {
      this.save.settings.muted = v;
      this.audio.setMuted(v);
      writeSave(this.save);
    };
    this.overlay.onQuality = (id) => {
      this.save.settings.quality = id;
      writeSave(this.save);
      this.applyQuality();
      this.paintSettings();
      this.pushToast(`Quality: ${QUALITY[id].label}`);
    };
    this.overlay.onBalance = (id) => {
      this.save.settings.balanceProfile = id;
      applyBalanceProfile(id);
      writeSave(this.save);
      this.paintSettings();
      this.pushToast(`Balance: ${id}`);
    };
    this.overlay.onFeel = (id) => {
      this.save.settings.controlFeel = id;
      this.input.setFeel(id);
      writeSave(this.save);
      this.paintSettings();
      this.pushToast(`Feel: ${feelOf(id).label}`);
    };
    this.overlay.onGamepad = (v) => {
      this.save.settings.gamepad = v;
      this.input.gamepadOn = v;
      writeSave(this.save);
      this.paintSettings();
    };
    this.overlay.onToggleLegend = () => this.toggleLegend();
    this.overlay.onStoryEnter = () => {
      if (this.pendingComic) this.enterComicById(this.pendingComic);
    };
    this.overlay.onStoryStay = () => {
      this.pendingComic = null;
      this.overlay.hideStoryGate();
    };
    this.overlay.onOpenBestiary = () => {
      if (!this.uiLive()) return;
      this.menuReturn = this.started ? "pause" : "title";
      this.overlay.renderBestiary(this.save, getCity(this.save.cityId).name);
      this.setScreen("bestiary");
    };
    this.overlay.onOpenCodex = () => {
      if (!this.uiLive()) return;
      this.menuReturn = this.started ? "pause" : "title";
      this.overlay.renderCodex(this.save);
      this.setScreen("codex");
    };
    this.overlay.onParty = (uid) => this.toggleParty(uid);
    this.overlay.onRebind = (action, label) => {
      this.save.settings.binds[action] = label;
      this.input.binds[action] = label;
      writeSave(this.save);
      this.overlay.renderBinds(this.input.binds);
    };
    this.overlay.onQuitJob = () => {
      this.pushToast(this.life.quitJob(this.save));
      writeSave(this.save);
    };
    this.overlay.onFormPick = (kind) => {
      this.input.cancelRadial();
      this.overlay.setRadial(false, this.radialIndex, this.save);
      this.pickForm(kind as HulkKind);
    };
    this.overlay.onSmashDismiss = () => {
      this.overlay.hideSmashReport();
      this.smash.report = null;
      if (this.player.gamma >= 50) this.smash.advanceBeat("cooldown");
    };
    this.overlay.onBossFate = (fate) => this.resolveBossFate(fate);
    this.overlay.onOpenBossRoster = () => {
      if (this.overlay.killSpareOpen()) return;
      this.menuReturn = this.started ? (this.screen === "pause" ? "pause" : "play") : "title";
      this.overlay.renderBossRoster();
      this.setScreen("boss-roster");
    };
    this.overlay.onDebugBoss = (cityId, fight) => {
      void this.debugCapitalBoss(cityId, fight);
    };
  }

  private async bootHub(): Promise<void> {
    await this.loadCity(this.save.cityId || HUB_CITY_ID, true);
    this.player.formCd = 0;
    this.player.dropInWorldBreaker(null);
    this.hideStreetPlaceholders();
    const hash = location.hash.replace(/^#/, "");
    if (hash === "play" || hash === "drop") await this.dropIntoStreets("continue");
    window.addEventListener("hashchange", () => {
      const next = location.hash.replace(/^#/, "");
      if ((next === "play" || next === "drop") && this.screen !== "play") void this.dropIntoStreets("continue");
    });
  }

  private hideStreetPlaceholders(): void {
    this.world?.hideHubPlaceholders();
    if (this.world?.mapsLite && this.hood) this.hood.group.visible = false;
  }

  private markPlayHash(): void {
    if (location.hash !== "#play") history.replaceState(null, "", `${location.pathname}${location.search}#play`);
  }

  private clearPlayHash(): void {
    if (location.hash === "#play" || location.hash === "#drop") {
      history.replaceState(null, "", `${location.pathname}${location.search}`);
    }
  }

  private async dropIntoStreets(mode: "new" | "continue" | "resume"): Promise<void> {
    if (this.dropping) return;
    this.dropping = true;
    try {
      this.audio.unlock();
      this.audio.ui();
      if (mode === "new") {
        this.save = defaultSave();
        this.save.cityId = HUB_CITY_ID;
        this.save.introSeen = true;
        this.save.everHulked = true;
        this.save.hulkKind = DEFAULT_HULK_KIND;
        this.save.lastTitan = DEFAULT_HULK_KIND;
        this.save.activeForm = DEFAULT_ACTIVE_FORM;
        writeSave(this.save);
        this.player.formCd = 0;
        await this.loadCity(HUB_CITY_ID, true);
      } else if (mode === "continue") {
        this.save = loadSave() ?? defaultSave();
        this.save.introSeen = true;
        this.save.everHulked = true;
        this.save.cityId = HUB_CITY_ID; // Ces: DROP IN always NY smash, never desert city
        this.save.hulkKind = this.save.hulkKind || DEFAULT_HULK_KIND;
        this.save.lastTitan = this.save.lastTitan || DEFAULT_HULK_KIND;
        this.save.activeForm = this.save.activeForm || DEFAULT_ACTIVE_FORM;
        writeSave(this.save);
        this.overlay.applySettings(this.save.settings.sensitivity, this.save.settings.muted, this.save.settings.quality);
        this.overlay.setLegendOpen(this.save.settings.legendOpen);
        await this.loadCity(HUB_CITY_ID, true);
      } else {
        this.save.introSeen = true;
        this.save.everHulked = true;
        this.save.cityId = HUB_CITY_ID;
        writeSave(this.save);
        await this.loadCity(HUB_CITY_ID, true);
      }
      this.hideStreetPlaceholders();
      this.player.formCd = 0;
      this.player.dropInWorldBreaker(this.audio);
      this.enterPlay();
    } finally {
      this.dropping = false;
    }
  }

  private async onStreetAction(action: StreetAction): Promise<void> {
    this.overlay.setStreetAction(action);
    if (!this.started || this.screen !== "play") {
      await this.dropIntoStreets(hasSave() ? "continue" : "new");
    }
    if (action === "hub") {
      this.player.position.copy(this.world.playerSpawn);
      this.player.velocity.set(0, 0, 0);
      this.pushToast("NY hub — World Breaker on the drop-in path");
      return;
    }
    if (action === "smack") {
      this.input.injectSmash();
      this.pushToast("Smack");
      return;
    }
    this.input.injectJumpPound();
    this.pushToast("Jump&Pound");
  }

  private enterPlay(): void {
    // leaveDesertComicBoot — never leave Ces in Origin sand on DROP IN
    if (this.comics.active) this.leaveComic();
    if (this.save.cityId !== HUB_CITY_ID) {
      this.save.cityId = HUB_CITY_ID;
      writeSave(this.save);
      void this.loadCity(HUB_CITY_ID, true).then(() => this.enterPlay());
      return;
    }

    this.started = true;
    this.input.consumeAttack();
    this.input.consumeInteract();
    this.input.consumeRage();
    this.input.consumeGrab();
    this.input.consumeRivalTest();
    this.player.formCd = 0;
    this.player.dropInWorldBreaker(null);
    this.hideStreetPlaceholders();
    this.setScreen("play");
    this.markPlayHash();
    this.input.requestLock();
    this.hudTimer = 1;
    this.player.applyGrowth(this.save);
    this.player.rage = this.save.rage ?? 0;
    this.player.gamma = this.save.gamma ?? 0;
    this.flushObjectives();
  }


  private collectStreetRoster(): { name: string; kind: string; dist: number; hp?: string }[] {
    const rows: { name: string; kind: string; dist: number; hp?: string }[] = [];
    if (!this.crimes || !this.player) return rows;
    const origin = this.player.position;
    for (const ev of this.crimes.events ?? []) {
      if (ev.cleared) continue;
      for (const e of ev.enemies ?? []) {
        if (!e.alive) continue;
        const dist = origin.distanceTo(e.mesh.position);
        rows.push({
          name: e.kind.toUpperCase(),
          kind: ev.kind ?? e.kind,
          dist: Math.round(dist),
          hp: String(Math.max(0, Math.round(e.hp))) + "/" + String(Math.round(e.maxHp)),
        });
      }
    }
    rows.sort((a, b) => a.dist - b.dist);
    return rows.slice(0, 40);
  }

  private uiLive(): boolean {
    return performance.now() >= this.ignoreUiUntil;
  }

  private openPause(): void {
    if (this.overlay.killSpareOpen()) return;
    this.ignoreUiUntil = performance.now() + 350;
    this.menuReturn = "play";
    this.setScreen("pause");
  }

  private closeMenu(): void {
    if (this.started) {
      if (this.menuReturn === "pause" && this.screen !== "pause") {
        this.setScreen("pause");
        return;
      }
      this.enterPlay();
      return;
    }
    this.clearPlayHash();
    this.setScreen("title");
  }

  private openMap(): void {
    if (!this.started && this.screen !== "pause") {
      this.menuReturn = "title";
    } else {
      this.menuReturn = this.screen === "pause" ? "pause" : "play";
    }
    this.input.exitLock();
    this.setScreen("map");
    this.overlay.renderTravel(this.save, this.save.cityId);
    if (this.cityReady) {
      this.overlay.noteWorld(getCity(this.save.cityId), this.world.graph, {
        x: this.player.position.x,
        z: this.player.position.z,
      });
      this.overlay.drawLiveMap(this.mapSnapshot());
    }
  }

  private toggleLegend(): void {
    this.save.settings.legendOpen = !this.save.settings.legendOpen;
    writeSave(this.save);
    this.overlay.setLegendOpen(this.save.settings.legendOpen);
    if (this.screen === "map" && this.cityReady) this.overlay.drawLiveMap(this.mapSnapshot());
  }

  private openSkills(): void {
    if (!this.started && this.screen !== "pause") {
      this.menuReturn = "title";
    } else {
      this.menuReturn = this.screen === "pause" ? "pause" : "play";
    }
    this.input.exitLock();
    this.setScreen("skills");
    this.overlay.renderSkills(this.save);
  }

  private openQuests(): void {
    if (!this.started && this.screen !== "pause") {
      this.menuReturn = "title";
    } else {
      this.menuReturn = this.screen === "pause" ? "pause" : "play";
    }
    this.input.exitLock();
    this.setScreen("quests");
    this.overlay.renderQuests(this.save);
  }

  private crimeWaveHooks(): CrimeWaveBoardHooks {
    return {
      toast: (m) => this.pushToast(m),
      grantXp: (n) => this.grantXp(n),
      writeSave: () => writeSave(this.save),
      enterPlay: () => this.enterPlay(),
      travelTo: (cid) => this.travelTo(cid),
    };
  }

  private acceptQuest(id: string): void {
    if (id.startsWith("cw-")) {
      this.crimeWave.accept(this.save, id, this.crimeWaveHooks());
      return;
    }
    const def = questById(id);
    if (!def || questStatus(this.save, def) !== "open") return;
    this.save.activeQuestId = def.id;
    this.save.questProgress = 0;
    writeSave(this.save);
    this.syncHunt();
    this.audio.ui();
    this.pushToast(`Job taken: ${def.name}`);
    if (this.started) this.enterPlay();
    else this.overlay.renderQuests(this.save);
  }

  private abandonQuest(): void {
    if (this.save.activeQuestId?.startsWith("cw-")) {
      this.crimeWave.abandon(this.save, this.crimeWaveHooks());
      this.overlay.renderQuests(this.save);
      return;
    }
    this.save.activeQuestId = null;
    this.save.questProgress = 0;
    writeSave(this.save);
    this.quests.clear();
    this.audio.ui();
    this.overlay.renderQuests(this.save);
    this.pushToast("Job dropped");
  }

  private syncHunt(): void {
    const def = this.save.activeQuestId ? questById(this.save.activeQuestId) : undefined;
    this.quests.clear();
    if (def?.kind === "hunt") this.quests.spawnHunt(def);
  }

  private noteQuest(kind: "hunt" | "crimes" | "wreck", amount: number): void {
    const def = this.save.activeQuestId ? questById(this.save.activeQuestId) : undefined;
    if (!def || def.kind !== kind || amount <= 0) return;
    this.save.questProgress = Math.min(def.goal, this.save.questProgress + amount);
    if (this.save.questProgress >= def.goal) this.completeQuest(def.id);
    else writeSave(this.save);
  }

  private completeQuest(id: string): void {
    const def = questById(id);
    if (!def) return;
    this.save.cash += def.rewardCash;
    this.save.reputation += 18;
    this.grantXp(def.rewardXp);
    if (!def.repeatable && !this.save.completedQuests.includes(def.id)) {
      this.save.completedQuests.push(def.id);
    }
    this.save.activeQuestId = null;
    this.save.questProgress = 0;
    this.quests.clear();
    writeSave(this.save);
    this.audio.success();
    this.pushToast(`${def.name} done  +$${def.rewardCash}`);
  }

  private buySkill(id: string): void {
    if (!buySkill(this.save, id)) return;
    this.player.applyGrowth(this.save);
    writeSave(this.save);
    this.overlay.renderSkills(this.save);
    this.audio.ui();
    this.pushToast("Hulk grows stronger");
  }

  private grantXp(amount: number): void {
    const before = progressFromXp(this.save.xp).level;
    this.save.xp += amount;
    const after = progressFromXp(this.save.xp);
    this.save.level = after.level;
    if (after.level > before) {
      this.save.skillPoints += after.level - before;
      this.player.applyGrowth(this.save);
      this.pushToast(`Level ${after.level} — +${after.level - before} Titan Point`);
    }
  }

  private travelTo(id: string): void {
    if (!this.save.unlockedCities.includes(id) && !isExtraCity(id)) return;
    if (id === this.save.cityId && this.started) {
      this.enterPlay();
      return;
    }
    this.audio.ui();
    this.save.cityId = id;
    const vegasNight = id === "las-vegas" && !this.save.objectiveProgress.vegasNight;
    if (vegasNight) {
      this.save.life.hour = 22.2;
      this.save.objectiveProgress.vegasNight = 1;
    }
    writeSave(this.save);
    void (async () => {
      await this.loadCity(id, true);
      if (vegasNight) {
        this.world.applyAtmosphere(this.scene, this.hemi, this.sun, this.life.applyAtmosphereMix(this.save.life.hour));
        this.pushToast(VEGAS_NIGHT_LINE);
      } else {
        this.pushToast(`Arrived: ${getCity(id).name}. ${getCity(id).storyLine}`);
      }
      this.flushObjectives();
      this.enterPlay();
    })();
  }

  private async loadCity(id: string, resetPlayer: boolean): Promise<void> {
    const gen = ++this.loadGen;
    this.cityReady = false;
    this.weather = null;
    this.pendingComic = null;
    if (this.comics.active) this.leaveComic();
    const city = getCity(id);
    const meshOn = true; // always mesh city
    const graph = null; // procedural city blocks (street pack was leaving Ces in desert)
    if (gen !== this.loadGen) return;
    this.streamer?.dispose();
    this.streamer = null;
    if (this.world) {
      this.scene.remove(this.world.group);
      this.world.dispose();
    }
    if (this.crimes) {
      this.scene.remove(this.crimes.group);
      this.crimes.dispose();
    }
    if (this.traffic) {
      this.scene.remove(this.traffic.group);
      this.traffic.dispose();
    }
    if (this.crowd) {
      this.scene.remove(this.crowd.group);
      this.crowd.dispose();
      this.crowd = null;
    }
    this.lore.dispose();
    this.lore = new LoreContacts();
    if (this.boss) {
      this.scene.remove(this.boss.group);
      this.boss.dispose();
    }
    if (this.quests) {
      this.scene.remove(this.quests.group);
      this.quests.dispose();
    }
    if (this.hood) {
      this.scene.remove(this.hood.group);
      this.hood.dispose();
    }
    this.scene.remove(this.beasts.group);
    this.beasts.dispose();
    this.beasts = new BestiarySystem();

    this.world = new CityWorld(city, null, { lite: false }); // null graph => buildBlocks city
    this.world.setFarClip(QUALITY[this.save.settings.quality].farClip);
    this.overlay.noteWorld(city, graph, { x: this.world.playerSpawn.x, z: this.world.playerSpawn.z });
    this.world.applyAtmosphere(this.scene, this.hemi, this.sun, this.life.applyAtmosphereMix(this.save.life.hour));
    this.scene.add(this.world.group);
    this.crimes = new CrimeSystem(this.world);
    this.scene.add(this.crimes.group);
    this.traffic = new Traffic(this.world);
    this.scene.add(this.traffic.group);
    if (meshOn) {
      this.crowd = new CrowdSystem(this.world);
      this.scene.add(this.crowd.group);
    }
    this.lore.spawn(city.id, graph, this.world.playerSpawn);
    this.scene.add(this.lore.group);
    this.smash.clearEchoes();
    if (city.id === "new-york") this.smash.spawnEchoes(this.world.playerSpawn, this.save.echoes);
    this.scene.add(this.smash.echoes);
    this.smash.hydrate(this.save);
    this.streetT = 0;
    this.jobCrimeId = -1;
    this.boss = new BossFight(city);
    this.scene.add(this.boss.group);
    this.quests = new QuestSystem(this.world);
    this.scene.add(this.quests.group);
    this.desert.attachToNy(this.world.playerSpawn);
    this.scene.add(this.desert.group);
    this.scene.add(this.crimeWave.group);
    this.scene.add(this.kaiju.group);
    this.crimeWave.syncFromSave(this.save);
    this.hood = new NeighborhoodSystem(this.world);
    this.scene.add(this.hood.group);
    this.beasts.loadCity(city.id, city.name, this.save, this.world.playerSpawn);
    this.scene.add(this.beasts.group);
    this.crimes.bindDirector(this.director);
    this.hood.bindDirector(this.director);
    this.dungeon.zombies.bindDirector(this.director);
    this.boss.director = this.director;
    this.streamer = meshOn ? new ChunkStreamer(this.world) : null;
    document.getElementById("app")?.classList.toggle("maps-live", !meshOn);
    if (!meshOn) {
      const host = this.ensureStreetMap();
      void mountPlayfieldMap(host, hubOf(id)).then((ok) => {
        if (gen !== this.loadGen) return;
        if (ok && playfieldReady()) {
          this.world.setCurbVisible(false);
          this.overlay.setMapsBanner(null);
        } else {
          this.world.setCurbVisible(true);
          this.overlay.setMapsBanner(
            "Maps key missing — NY curb overlay. World Breaker still plays. Set VITE_GOOGLE_MAPS_API_KEY.",
          );
        }
      });
      const nxt = nextCity(id);
      if (nxt) warmPlayfield(hubOf(nxt.id));
      showPlayfield();
    } else {
      hidePlayfield();
    }
    this.world.onSmashDebris = (origin, count, power) => {
      if (this.guard.overloaded) return;
      this.debris.spawn(origin, this.guard.hitchWarn ? Math.min(1, count) : count, power);
    };
    this.comics.spawnCity(city.id, graph, this.world.plaza, this.world.playerSpawn);
    void pullWeather(city).then((snap) => {
      if (gen !== this.loadGen) return;
      this.weather = snap;
      this.world.setWeather(snap);
      this.world.applyAtmosphere(this.scene, this.hemi, this.sun, this.life.applyAtmosphereMix(this.save.life.hour));
    });
    this.applyQuality();
    this.dungeon.prepare(city);
    this.applyDungeonRoster(city.id);
    if (!this.dungeon.group.parent) this.scene.add(this.dungeon.group);
    this.dungeon.group.visible = false;
    this.world.group.visible = true;
    this.inDungeon = false;
    this.razor.reset(this.audio);
    this.razor.bindSave(this.save);
    this.syncHunt();
    if (this.save.beatenBosses.includes(id)) {
      this.boss.defeated = true;
      this.boss.active = false;
      this.boss.mesh.visible = false;
    } else {
      this.boss.mesh.visible = false;
    }
    if (resetPlayer) {
      this.player.position.copy(this.world.playerSpawn);
      this.player.velocity.set(0, 0, 0);
      this.player.hulkKind = this.save.hulkKind;
      this.player.applyGrowth(this.save);
      this.player.health = this.player.maxHealth;
      this.player.rage = this.save.rage ?? this.player.rage;
      this.player.gamma = this.save.gamma ?? this.player.gamma;
    } else {
      this.player.hulkKind = this.save.hulkKind;
      this.player.applyGrowth(this.save);
      this.player.rage = this.save.rage ?? this.player.rage;
      this.player.gamma = this.save.gamma ?? this.player.gamma;
    }
    this.bossPrompted = false;
    if (id === "las-vegas" && !this.save.objectiveProgress.vegasNight) {
      this.save.life.hour = 22.2;
      this.save.objectiveProgress.vegasNight = 1;
      this.world.applyAtmosphere(this.scene, this.hemi, this.sun, this.life.applyAtmosphereMix(22.2));
    }
    this.cityReady = true;
  }

  private prewarmShaders(): void {
    if (this.shadersWarmed) return;
    this.shadersWarmed = true;
    const geo = new THREE.BoxGeometry(0.35, 0.35, 0.35);
    const kit = new THREE.Group();
    kit.add(new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ color: 0x889988 })));
    kit.add(new THREE.Mesh(geo, new THREE.MeshPhongMaterial({ color: 0x668866, shininess: 22 })));
    kit.add(
      new THREE.Mesh(
        geo,
        new THREE.MeshBasicMaterial({ color: 0x88ff66, transparent: true, opacity: 0.5, depthWrite: false }),
      ),
    );
    kit.position.set(0, -90, 0);
    this.scene.add(kit);
    try {
      this.renderer.compile(this.scene, this.camera);
    } catch {
      /* dummy kit only — never compile the live NY mesh */
    }
    this.scene.remove(kit);
    geo.dispose();
  }

  private setScreen(screen: GameScreen): void {
    this.screen = screen;
    if (screen !== "play") this.input.exitLock();
    this.overlay.setScreen(screen, hasSave());
  }

  private readonly onMenuKey = (e: KeyboardEvent): void => {
    if (e.code === "Escape") {
      e.preventDefault();
      if (this.screen === "play" && performance.now() < this.ignoreUiUntil) return;
      if (this.screen === "play") {
        if (this.overlay.killSpareOpen()) return;
        if (this.comics.active) {
          this.leaveComic();
          return;
        }
        if (this.input.pointerLocked) {
          this.input.exitLock();
          this.ignoreUiUntil = performance.now() + 250;
          return;
        }
        this.openPause();
        return;
      }
      if (this.screen === "pause") {
        this.enterPlay();
        return;
      }
      if (this.screen === "map" || this.screen === "street-roster" || this.screen === "help" || this.screen === "settings" || this.screen === "skills" || this.screen === "quests" || this.screen === "bestiary" || this.screen === "codex" || this.screen === "boss-roster") {
        this.closeMenu();
      }
      return;
    }
    if (e.code === "KeyM") {
      if (this.screen === "map") {
        e.preventDefault();
        this.closeMenu();
        return;
      }
      if (this.screen === "play" || this.screen === "pause" || this.screen === "title") {
        this.openMap();
      }
    }
    if (e.code === "KeyL") {
      const t = e.target;
      if (t instanceof HTMLInputElement || t instanceof HTMLTextAreaElement) return;
      if (this.screen === "play" || this.screen === "map" || this.screen === "pause") {
        e.preventDefault();
        this.toggleLegend();
      }
    }
    if (e.code === "KeyK" && this.screen === "pause") {
      this.openSkills();
    }
    if (this.screen === "map") {
      if (e.code === "ArrowRight" || e.code === "ArrowDown") this.overlay.cycleCity(1);
      if (e.code === "ArrowLeft" || e.code === "ArrowUp") this.overlay.cycleCity(-1);
      if (e.code === "Enter") this.overlay.confirmTravel();
    }
    if (this.screen === "bestiary" && e.code === "Escape") this.closeMenu();
  };

  private resize = (): void => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.camera.aspect = w / Math.max(1, h);
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h, false);
    this.canvas.style.width = `${w}px`;
    this.canvas.style.height = `${h}px`;
    const q = QUALITY[this.save.settings.quality];
    this.post?.setSize(w, h, Math.max(0.7, q.scale * this.guard.scale));
    this.lastScale = Math.max(0.7, q.scale * this.guard.scale);
  };

  private frame(): void {
    const now = performance.now();
    if (now - this.lastPresent < 15.2) return;
    this.lastPresent = now;
    const t0 = now;
    const dt = Math.min(0.05, this.clock.getDelta());
    if (!this.cityReady) {
      this.drawFrame();
      return;
    }
    if (this.screen === "play") {
      this.updatePlay(dt);
      if (!this.inDungeon && !this.comics.active) {
        this.world.pump(this.guard.overloaded ? 2 : 4);
        this.streamer?.tick(
          this.player.position.x,
          this.player.position.z,
          this.player.velocity.x,
          this.player.velocity.z,
          this.player.hopping || !this.player.grounded,
        );
      }
    } else if (this.screen === "map") {
      this.toastTimer = Math.max(0, this.toastTimer - dt);
      if (this.toastTimer <= 0) this.toast = "";
      this.world?.pump(8);
      this.guard.tick(Math.min(8, performance.now() - t0));
      return;
    } else {
      this.world?.pump(10);
      this.cam.yaw += dt * 0.35;
      const t = this.cam.yaw;
      const p = this.player.position;
      this.player.group.position.copy(p);
      this.player.group.rotation.y = Math.PI * 0.15 + Math.sin(t) * 0.45;
      const lift = this.player.lookY;
      this.camera.position.set(p.x + (this.player.isHulk ? 10.2 : 5.4), p.y + lift + 1.4, p.z + 4.8);
      this.camera.lookAt(p.x - 0.4, p.y + lift, p.z);
    }
    this.toastTimer = Math.max(0, this.toastTimer - dt);
    if (this.toastTimer <= 0) this.toast = "";
    this.fx.update(dt);
    this.debris.update(dt);
    this.hudTimer += dt;
    const hudEvery = this.smash.hotT > 0 || this.director.wanted > 4 ? 0.05 : 0.14;
    if (this.screen === "play" && this.hudTimer >= hudEvery) {
      this.hudTimer = 0;
      this.drawHud();
    }
    this.drawFrame();
    this.guard.tick(performance.now() - t0);
    this.fx.skip = this.guard.overloaded;
    this.debris.skip = this.guard.overloaded;
    this.debris.short = this.guard.hitchWarn;
    if (this.streamer) this.streamer.maxOps = this.guard.maxOps;
    const q = QUALITY[this.save.settings.quality];
    this.applyStreamRadii(q.loadM, q.unloadM);
    this.fx.cap = Math.floor(q.particleCap * this.guard.particleMul);
    this.debris.setCap(Math.floor(q.debrisCap * this.guard.particleMul));
    const scale = Math.max(0.7, q.scale * this.guard.scale);
    if (Math.abs(scale - this.lastScale) > 0.02) {
      this.lastScale = scale;
      this.post.setSize(window.innerWidth, window.innerHeight, scale);
    }
  }

  private drawFrame(): void {
    const q = QUALITY[this.save.settings.quality];
    const maps = Boolean(this.world?.mapsLite) && !this.inDungeon;
    const cut = this.guard.cutPost || maps;
    const rush =
      !cut &&
      this.player.isHulk &&
      (this.player.raging || this.player.smashThrough || (!this.player.grounded && this.player.velocity.y > 18));
    const shadows = q.shadows && !cut && !maps;
    if (this.renderer.shadowMap.enabled !== shadows) this.renderer.shadowMap.enabled = shadows;
    this.sun.castShadow = shadows;
    if (this.world && !maps) {
      const p = this.player.position;
      const dist = q.shadowDist;
      this.sun.position.set(p.x + this.world.sunDir.x * dist, p.y + this.world.sunDir.y * dist, p.z + this.world.sunDir.z * dist);
      this.sun.target.position.set(p.x, 0, p.z);
      this.sun.target.updateMatrixWorld();
      this.sky.follow(p.x, p.z);
      this.sky.apply(this.world.theme, this.life.applyAtmosphereMix(this.save.life.hour), this.world.sunDir);
    }
    if (maps) {
      this.renderer.autoClear = true;
      this.renderer.setClearColor(0x000000, 0);
      this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
      this.renderer.toneMappingExposure = 1.08;
      this.renderer.render(this.scene, this.camera);
      return;
    }
    const night = this.life.applyAtmosphereMix(this.save.life.hour);
    this.post.apply(q, rush, cut, night);
    if (!cut && (q.bloom || q.ssao || q.grade || (q.motionBlur && rush))) this.post.render();
    else this.renderer.render(this.scene, this.camera);
  }

  private applySavedControls(): void {
    const s = this.save.settings;
    applyBalanceProfile(isBalanceProfile(s.balanceProfile) ? s.balanceProfile : "Legacy");
    this.input.setFeel(s.controlFeel);
    this.input.gamepadOn = s.gamepad !== false;
  }

  private paintSettings(): void {
    const s = this.save.settings;
    this.overlay.applySettings(s.sensitivity, s.muted, s.quality, {
      balanceProfile: s.balanceProfile,
      controlFeel: s.controlFeel,
      gamepad: s.gamepad,
      padConnected: this.input.padConnected,
    });
  }

  private applyQuality(): void {
    const q = QUALITY[this.save.settings.quality];
    this.camera.far = q.farClip;
    this.camera.updateProjectionMatrix();
    this.sky.setRadius(q.farClip);
    this.world?.setFarClip(q.farClip);
    this.renderer.shadowMap.enabled = q.shadows;
    this.sun.castShadow = q.shadows;
    this.world?.setShadowCasters(q.shadows);
    const d = q.shadowDist;
    const map = q.id === "cinematic" ? 1024 : q.id === "high" ? 1024 : 512;
    this.sun.shadow.mapSize.set(map, map);
    this.sun.shadow.camera.near = 4;
    this.sun.shadow.camera.far = d + 80;
    this.sun.shadow.camera.left = -d;
    this.sun.shadow.camera.right = d;
    this.sun.shadow.camera.top = d;
    this.sun.shadow.camera.bottom = -d;
    this.sun.shadow.camera.updateProjectionMatrix();
    this.rim.visible = q.rim;
    this.rim.intensity = q.rim ? 0.45 : 0;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = q.grade ? 1.1 : 1.02;
    this.fx.cap = Math.floor(q.particleCap * this.guard.particleMul);
    this.debris.setCap(Math.floor(q.debrisCap * this.guard.particleMul));
    this.applyStreamRadii(q.loadM, q.unloadM);
    this.post?.setSize(window.innerWidth || 1280, window.innerHeight || 720, Math.max(0.7, q.scale * this.guard.scale));
    this.lastScale = Math.max(0.7, q.scale * this.guard.scale);
  }

  private applyStreamRadii(loadM: number, unloadM: number): void {
    const load = this.guard.overloaded ? Math.min(loadM, LOAD_UNDER_LOAD_M) : loadM;
    this.streamer?.setRadii(load, Math.max(unloadM, load + 100));
  }

  private updatePlay(dt: number): void {
    if (this.overlay.killSpareOpen()) {
      this.input.tick(dt);
      this.input.consumeAttack();
      this.input.consumeInteract();
      return;
    }
    this.input.tick(dt);
    this.cwSmashGate = Math.max(0, this.cwSmashGate - dt);
    // Ces: right-click opens the pause / action menu
    if (this.input.consumeContextMenu()) {
      this.input.exitLock();
      this.openPause();
      return;
    }
    if (this.overlay.smashOpen()) {
      if (this.input.consumeAttack() || this.input.consumeInteract()) {
        this.overlay.onSmashDismiss?.();
      }
    }
    if (this.input.consumeCamera()) {
      this.pushToast(`Camera · ${this.cam.cycle()}`);
    }
    const look = this.input.consumeLook();
    if (!this.inDungeon && !this.comics.active) {
      this.cam.applyLook(look.dx, look.dy, this.save.settings.sensitivity);
    }
    const zoom = this.input.zoom + (!this.player.isHulk && this.input.keys.has("keyx") ? dt : 0);
    if (!this.inDungeon) this.cam.applyZoom(zoom);
    this.handleForms();
    this.handlePowers(dt);
    this.handleStyle();
    this.handleLock();
    this.handleCombatExtras(dt);
    if (this.razor.riding && this.input.consumeAttack()) {
      const thrown = this.razor.mashRide();
      this.audio.thud();
      this.cam.bump(0.35);
      if (thrown) this.pushToast("Threw him off");
    }
    const prevForm = this.player.form;
    const lifeMul = this.player.isHulk ? 1 : this.life.speedMul(this.save.life);
    this.player.update(dt, this.input, this.world, this.cam.yaw, this.audio, lifeMul);
    if (this.player.emergeSmash) {
      this.player.emergeSmash = false;
      const o = this.player.position.clone();
      this.world.smashEnvironment(o, 9, "super", this.player.mods.demo);
      this.crimes.applySmash(o, 9, 36, this.audio, this.player.facing, true);
      this.fx.burst(o, 0x88ff44, 16);
      this.cam.bump(0.7);
      this.pushToast("Burrow break.");
    }
    this.tickAnger(dt);
    if (this.player.driving) this.traffic.drive(dt, this.input.axis(), this.player);
    if (this.player.hulkKind !== this.save.hulkKind || this.player.lastTitan !== this.save.lastTitan) {
      this.save.hulkKind = this.player.hulkKind;
      this.save.lastTitan = this.player.lastTitan;
      writeSave(this.save);
    }
    this.life.tick(dt, this.save, !this.player.isHulk, this.input.moveHeld > 0);
    if (!this.inDungeon) {
      this.world.applyAtmosphere(this.scene, this.hemi, this.sun, this.life.applyAtmosphereMix(this.save.life.hour));
    }
    if ((this.input.sprintDown || this.lockPos) && this.player.isHulk) this.cam.autoCenter(this.player.yaw, dt);
    const nearestCrime = this.crimes.nearest(this.player.position);
    this.director.tick(dt, this.player, Boolean(nearestCrime && this.player.position.distanceTo(nearestCrime.position) < 28));
    if (this.player.isBruce && this.player.gamma < 20) {
      this.director.wanted = Math.max(0, this.director.wanted - dt * 22);
    }
    const heatStars = wantedStars(this.director.wanted + (this.player.band === "locked" || this.player.band === "overcharged" ? 12 : 0));
    this.crimes.dispatchHeat(heatStars, this.player.position, this.guard.overloaded);
    const starLine = this.smash.starToast(heatStars);
    if (starLine) this.pushToast(starLine);
    const wildHit = this.beasts.updateWilds(dt, this.player, this.director);
    if (wildHit > 0) this.player.takeHit(wildHit, this.audio);
    if (this.input.consumeObjectiveToggle()) {
      this.showMarkers = !this.showMarkers;
      this.pushToast(this.showMarkers ? "Objective markers on" : "Objective markers off");
    }
    if (this.input.consumeDrop() && this.player.held) {
      const block = this.player.dropHeld();
      if (block) {
        const p = this.player.position.clone();
        p.y += 1;
        this.world.dropGentle(block, p);
        this.pushToast("Set it down");
      }
    }
    if (this.player.horrorRebuild) {
      this.player.horrorRebuild = false;
      this.pushToast("Immortal rebuilds. Not a game over.");
    }
    if (this.player.transformShock) {
      this.player.transformShock = false;
      const o = this.player.position.clone();
      this.world.smashEnvironment(o, 6, "smash", 0.35);
      this.fx.burst(o, 0x88ff66, 10);
      this.cam.bump(0.5);
    }
    if (this.player.form === "hulk" && prevForm === "human") {
      this.save.everHulked = true;
      this.save.hulkKind = asTitan(this.player.hulkKind);
      this.save.lastTitan = this.player.lastTitan;
      this.save.activeForm = formSaveId(this.save.lastTitan);
      writeSave(this.save);
      this.flushObjectives();
      this.pushToast(
        this.save.cityId === "new-york"
          ? `${formDef(this.player.hulkKind).name}. One street job opens the lime Turnstile door.`
          : `${formDef(this.player.hulkKind).name} takes the street`,
      );
    }
    if (this.player.form === "human" && prevForm === "hulk") {
      this.objFlags.reverted = true;
      this.flushObjectives();
      this.pushToast("Banner holds");
    }
    if (this.player.position.distanceTo(this.world.plaza) < 16) this.objFlags.plaza = true;
    if (this.player.position.y > 12) this.objFlags.roof = true;
    if (this.hood.district === District.Heroes) this.objFlags.heroes = true;
    if (this.hood.district === District.Villains) this.objFlags.warrens = true;
    if (!this.save.recognized && !this.player.isHulk && !this.inDungeon) {
      const civ = this.crimes.nearestCivilian(this.player.position);
      if (civ && civ.dist < 5.4) this.markRecognized();
    }

    if (this.comics.active) {
      this.updateComicPlay(dt);
      this.cam.update(dt, this.camera, this.player, false, this.world ? { colliders: this.world.colliders, colliderLive: (b) => this.world!.colliderLive(b) } : null);
      return;
    }

    this.comics.tick(dt, this.player);
    // Ces: do NOT auto-enter comics on proximity — Origin/Gamma Bomb is desert sand and was eating DROP IN.
    // Newsstands stay on the street; enter only via H / interact (tryInteract).

    if (this.inDungeon) {
      const dd = this.dungeon.update(dt, this.player, this.audio);
      if (dd > 0) this.player.takeHit(dd, this.audio);
      const pack: { pos: THREE.Vector3; hp: number }[] = this.dungeon.zombies.living();
      const bossProxy = { pos: this.dungeon.bossPos, hp: this.dungeon.hp };
      pack.push(bossProxy);
      this.beasts.updateAllies(dt, this.player.position, pack, this.audio);
      if (bossProxy.hp < this.dungeon.hp) this.dungeon.hurt(this.dungeon.hp - bossProxy.hp, this.audio);
      if (this.dungeon.cleared && !this.save.beatenBosses.includes(this.save.cityId)) this.beginBossJudgment();
      if (this.player.smashActive > 0 && !this.smashConsumed) {
        this.smashConsumed = true;
        const origin = this.player.smashOrigin();
        const hit = this.dungeon.applySmash(origin, this.player.smashRadius, this.player.smashDamage, this.audio);
        if (hit) {
          this.player.noteHit();
          this.grantXp(18);
          this.cam.bump(0.55);
          this.fx.burst(origin, 0x7adf55, 8);
        }
        this.player.poundQueued = false;
      }
      if (this.player.smashActive <= 0) this.smashConsumed = false;
      if (this.input.consumeInteract()) this.tryInteract();
      this.input.consumeGrab();
      this.player.heal(dt, true);
      this.inCombat = 2;
      if (this.player.health <= 0 && !(this.player.isHulk && this.player.hulkKind === "immortal")) {
        this.player.health = this.player.maxHealth * 0.55;
        this.exitDungeon(false);
        this.pushToast("The dungeon throws you out");
      }
      this.cam.update(dt, this.camera, this.player, true);
      this.dungeonLamp.intensity = 2.8;
      this.dungeonLamp.position.set(this.player.position.x, this.player.position.y + 3.2, this.player.position.z);
      return;
    }

    this.traffic.update(dt);
    this.crowd?.tick(dt, this.player.position.x, this.player.position.z, this.save.life.hour, this.guard.overloaded);
    this.lore.tick(dt, this.player, Boolean(this.save.everHulked));
    this.smash.tick(dt);
    this.smash.tickEchoes(performance.now() / 1000);
    if (!this.inDungeon) {
      const echo = this.smash.collectEcho(this.player.position, this.save);
      if (echo) {
        writeSave(this.save);
        this.pushToast(echo);
      }
    }
    this.streetT += dt;
    if (
      !this.inDungeon &&
      this.save.cityId === "new-york" &&
      this.save.everHulked &&
      this.player.isHulk &&
      this.streetT > 8 &&
      !this.smash.rampageTried
    ) {
      this.smash.startRampage();
      this.pushToast("Smash Rampage — 2:00. Hit the damage target.");
    }
    if (this.smash.rampage) {
      const got = this.save.damageCash - this.smash.rampage.startDamage;
      if (this.smash.rampage.left <= 0 || got >= this.smash.rampage.target) {
        const report = this.smash.closeRampage(this.save);
        if (report) this.overlay.showSmashReport(report);
        writeSave(this.save);
      }
    }
    this.hood.heroUnlocked = hasUnlock(this.save.reputation, "heroes");
    this.hood.villainUnlocked = hasUnlock(this.save.reputation, "villains");
    const thrownHits = this.world.updateThrown(dt);
    if (thrownHits) {
      this.grantXp(14 * Math.min(4, thrownHits));
      this.player.noteHit();
    }

    const crime = this.crimes.update(dt, this.player, this.audio);
    if (crime.playerHit > 0) this.player.takeHit(crime.playerHit, this.audio);
    const nearJob = this.crimes.nearest(this.player.position);
    if (nearJob && !this.inDungeon) {
      const dist = this.player.position.distanceTo(nearJob.position);
      if (nearJob.id !== this.jobCrimeId && dist < 48) {
        this.jobCrimeId = nearJob.id;
        this.smash.beginJob(nearJob.title);
        this.smash.advanceBeat("travel");
      }
      if (nearJob.engaged && this.smash.beat === "travel") this.smash.advanceBeat("setup");
      if (nearJob.engaged && this.player.form === "hulk" && this.smash.beat === "setup") this.smash.advanceBeat("escalation");
      if (dist < 8 && this.smash.beat === "travel") this.smash.advanceBeat("cutscene");
    }
    if (crime.cleared) {
      const cityId = this.save.cityId;
      const saved = crime.cleared.enemies.filter((e) => e.kind === "civilian" && e.alive).length;
      this.grantXp(55);
      this.save.crimesCleared[cityId] = (this.save.crimesCleared[cityId] ?? 0) + 1;
      const report = this.smash.finishJob(this.save, crime.cleared.title, saved);
      writeSave(this.save);
      this.overlay.showSmashReport(report);
      this.noteQuest("crimes", 1);
      this.flushObjectives();
      this.inCombat = 0.4;
      if (this.player.gamma >= 50) this.smash.advanceBeat("cooldown");
      if (this.bossReady() && !this.bossPrompted && !this.save.beatenBosses.includes(cityId)) {
        this.bossPrompted = true;
        this.pushToast("Capital dungeon open — plaza door, press H");
        this.audio.boss();
      }
    }

    const hunt = this.quests.update(dt, this.player, this.audio);
    if (hunt.playerHit > 0) this.player.takeHit(hunt.playerHit, this.audio);
    if (hunt.kills) {
      this.noteQuest("hunt", hunt.kills);
      this.save.hunts += hunt.kills;
      this.flushObjectives();
      this.inCombat = 2.2;
    }

    const prevDistrict = this.hood.district;
    const hood = this.hood.update(dt, this.player, this.crimes, this.audio, this.scene, this.hemi, this.sun);
    if (hood.playerHit > 0) this.player.takeHit(hood.playerHit, this.audio);
    if (hood.toast) this.pushToast(hood.toast);
    if (hood.districtChanged && this.director.wanted > 4) {
      this.director.wanted = 0;
      this.crimes.clearHeat();
      this.smash.lastStars = 0;
      this.pushToast("Left the borough. Heat gone.");
    } else if (hood.districtChanged && prevDistrict === District.Heroes) {
      this.pushToast("Hero resolution filed. The watch stands down.");
    } else if (hood.districtChanged && prevDistrict === District.Villains) {
      this.pushToast("Menace resolution filed. Warrens forget a little.");
    }

    if (this.boss.active) {
      const bd = this.boss.update(dt, this.player, this.audio);
      if (bd > 0) this.player.takeHit(bd, this.audio);
      if (this.boss.defeated) this.onBossDown();
    }

    this.updateRazorback(dt);

    if (this.player.smashActive > 0 && !this.smashConsumed) {
      this.smashConsumed = true;
      if (this.player.held) this.hurlHeld();
      const origin = this.player.smashOrigin();
      const r = this.player.smashRadius;
      const dmg = this.player.smashDamage;
      const kind = this.player.attackKind;
      const power = kind === "super" || kind === "ground" ? "super" : "smash";
      const hits = this.inDungeon ? 0 : this.crimes.applySmash(origin, r, dmg, this.audio, this.player.facing, power === "super");
      const huntHit = this.inDungeon ? 0 : this.quests.applySmash(origin, r, dmg, this.audio, this.player.facing, power === "super");
      const hoodHit = this.inDungeon ? 0 : this.hood.applySmash(origin, r, dmg, this.audio, this.player.facing, power === "super");
      const bossHit = this.inDungeon
        ? this.dungeon.applySmash(origin, r, dmg, this.audio)
        : this.boss.applySmash(origin, r, dmg, this.audio);
      const cars = this.player.isHulk ? this.traffic.smashNear(origin, r, power === "super" ? 28 : 16) : 0;
      const buildings = this.player.isHulk ? this.world.smashEnvironment(origin, r, power, this.player.mods.demo) : 0;
      if (buildings) {
        this.noteQuest("wreck", buildings);
        this.save.wrecked += buildings;
        this.razor.noteWreck();
      }
      if (this.save.activeQuestId?.startsWith("cw-") && this.cwSmashGate <= 0 && (hits || buildings || cars || huntHit || hoodHit)) {
        this.crimeWave.noteObjective(this.save, this.crimeWaveHooks());
        this.cwSmashGate = 1.35;
      }
      this.director.noteSmash(kind === "clap" || kind === "ground", buildings);
      const razorHit = this.razor.applySmash(
        origin,
        r,
        dmg,
        this.player.style,
        kind,
        false,
        kind === "clap",
        this.player.hulkKind,
        this.player.heat,
        this.audio,
      );
      if (this.powers.borrowed === "king" && this.input.keys.has("keyt")) {
        const cone = this.powers.kingCone(this.player);
        if (cone) this.applyPowerSmash(cone);
      }
      const smashXp = hits * 10 + huntHit * 20 + hoodHit * 16 + (bossHit ? 14 : 0) + cars * 8 + buildings * 12;
      if (smashXp > 0) {
        this.grantXp(smashXp);
        writeSave(this.save);
      }
      const dropped = this.hood.consumeDowned();
      if (dropped.length) {
        this.smash.addDamage(this.save, dropped.length * 1400);
        this.grantXp(40 * dropped.length);
        writeSave(this.save);
        this.pushToast(`${dropped.join(", ")} down`);
      }
      if (hits || huntHit || hoodHit || bossHit || cars || buildings || razorHit) {
        if (power === "super") this.player.noteHeavyLanded();
        else this.player.noteLightLanded();
        this.player.noteProperty(cars, buildings);
        const unlock = this.smash.noteProperty(this.save, cars, buildings, Math.max(0, hits + huntHit + hoodHit));
        if (unlock) this.pushToast(unlock);
        if (!this.inDungeon) {
          const by = this.crimes.hurtBystanders(origin, r, this.player.facing);
          if (by) {
            this.player.noteBystander();
            this.smash.noteBystander(this.save, this.director.wanted > 28 || this.player.band === "locked" || this.player.band === "overcharged");
          }
        }
        if (this.player.band === "overcharged") {
          this.crimes.applySmash(origin, r + 3.2, dmg * 0.35, this.audio, this.player.facing, true);
          this.fx.burst(origin, 0xc8ff66, 10);
        }
        const color =
          this.player.hulkKind === "red" && this.player.style === "karate" && (kind === "super" || kind === "ground")
            ? 0xff4411
            : kind === "super"
              ? 0xc45a18
              : kind === "clap"
                ? 0x88eeff
                : kind === "ground"
                  ? 0xc4a06a
                  : styleDef(this.player.style).color;
        this.cam.bump(kind === "super" || kind === "ground" ? 1.15 : 0.45);
        this.fx.burst(origin, this.player.raging ? 0xb6ff55 : color, kind === "ground" || kind === "super" ? 8 : 5);
        this.inCombat = 2.5;
        writeSave(this.save);
      } else {
        this.cam.bump(power === "super" ? 0.7 : 0.22);
        this.fx.burst(origin, power === "super" ? 0xb56a32 : 0x88aa77, power === "super" ? 6 : 3);
      }
      this.player.poundQueued = false;
    }
    if (this.player.smashActive <= 0) this.smashConsumed = false;

    if (this.input.consumeInteract()) this.tryInteract();
    if (this.input.consumeGrab()) this.tryGrab();
    if (this.input.consumeRivalTest()) this.tryTestRazor();

    this.player.heal(dt, this.inCombat > 0);
    this.inCombat = Math.max(0, this.inCombat - dt);
    const busy =
      this.inCombat > 0 ||
      this.input.moveHeld > 0 ||
      this.player.smashActive > 0 ||
      !this.player.grounded ||
      this.player.held !== null;
    this.hudQuietT = busy ? 0 : this.hudQuietT + dt;

    if (
      this.player.health <= 0 &&
      !this.razor.fighting &&
      !(this.player.isHulk && this.player.hulkKind === "immortal")
    ) {
      this.wakeFromKo();
    }

    this.cam.update(dt, this.camera, this.player, false, this.world ? { colliders: this.world.colliders, colliderLive: (b) => this.world!.colliderLive(b) } : null);
    this.dungeonLamp.intensity = 0;
    this.syncStreetMap();
  }

  private tryGrab(): void {
    if (this.player.isHulk && this.powers.borrowed === "vengeance") {
      const chain = this.powers.fireChain(this.player.smashOrigin(), this.player.facing);
      if (chain) {
        this.applyPowerSmash(chain);
        this.pushToast("Hell chain.");
        return;
      }
    }
    if (this.razor.active) {
      const grabbed = this.razor.applySmash(
        this.player.smashOrigin(),
        4.2,
        this.player.smashDamage * 1.1,
        this.player.style,
        Attack.Smash,
        true,
        false,
        this.player.hulkKind,
        this.player.heat,
        this.audio,
      );
      if (grabbed) {
        this.player.noteHit();
        this.fx.burst(this.razor.pos, 0xc9a227, 8);
        this.cam.bump(0.5);
        this.pushToast(this.player.style === "judo" ? "Metal weight — tossed" : "Grabbed the mutant");
        if (this.razor.riding) return;
      }
    }
    if (!this.player.isHulk) {
      this.pushToast("Only the titan rips buildings. Press R.");
      return;
    }
    if (this.player.stanceCd > 0) return;
    if (this.player.held) {
      this.hurlHeld();
      return;
    }
    const st = styleDef(this.player.style);
    const origin = this.player.smashOrigin();
    if (this.player.style !== "savage") {
      this.player.noteStyle();
      this.player.lastMove = st.grab;
      this.player.beginSpecial(
        this.player.style === "karate" || this.player.style === "judo" ? Attack.Ground : Attack.Smash,
      );
      if (this.player.style === "jiujitsu") this.player.smashActive = 0.36;
      if (this.player.style === "judo") {
        this.player.velocity.y = 8;
        this.player.poundQueued = true;
      }
      if (this.player.style === "boxing") this.player.velocity.addScaledVector(this.player.facing, 10);
      if (this.inDungeon) this.dungeon.zombies.stunAll(this.player.style === "jiujitsu" ? 1.2 : 0.55);
      this.fx.burst(origin, st.color, 8);
      this.cam.bump(0.4);
      this.audio.smash();
      this.pushToast(st.grab);
      if (this.player.style === "boxing" || this.player.style === "jiujitsu") return;
    }
    const car = this.traffic.liftNearest(this.player.position, this.player.radius + 10);
    if (car) {
      this.player.grab(car);
      this.grantXp(18);
      this.save.cash += 20;
      writeSave(this.save);
      this.audio.smash();
      this.cam.bump(0.45);
      this.pushToast("Ripped the car free");
      return;
    }
    const block = this.world.grabNearest(this.player.position.x, this.player.position.z, this.player.radius + 16);
    if (!block) {
      if (this.player.style === "savage") this.pushToast("Get closer to a building, car, or lamp, then Shift");
      return;
    }
    this.player.grab(block);
    this.grantXp(22);
    this.save.cash += 25;
    writeSave(this.save);
    this.audio.smash();
    this.cam.bump(0.55);
    this.pushToast(this.player.style === "judo" ? "Toss — wreck in hand" : "Ripped the building free  +XP");
  }

  private updateRazorback(dt: number): void {
    const blocked = this.boss.active || this.inDungeon || this.screen !== "play";
    const found = this.razor.considerSpawn(dt, this.player, this.cam.yaw, this.audio, this.save, blocked);
    if (found) {
      this.pushToast(found);
      writeSave(this.save);
    }
    const rz = this.razor.update(dt, this.player, this.world, this.audio, this.save);
    if (rz.dmg > 0) {
      if (this.razor.riding) this.player.chip(rz.dmg);
      else this.player.takeHit(rz.dmg, this.audio);
      this.inCombat = 2.8;
    }
    if (this.razor.bleedT > 0) {
      this.player.chip(this.player.maxHealth * RAZOR_VARS.bleedPct * dt);
    }
    if (this.razor.fighting) this.inCombat = Math.max(this.inCombat, 1.6);
    if (rz.line && rz.line !== this.lastRazorLine) {
      this.lastRazorLine = rz.line;
      if (rz.ended || /Claw Mark|next week|Get up|Clock/.test(rz.line)) this.pushToast(rz.line);
    }
    if (rz.ended) {
      writeSave(this.save);
      this.fx.burst(this.player.position, 0xc9a227, 14);
    }
  }

  private tryTestRazor(): void {
    if (this.inDungeon || this.boss.active || this.screen !== "play") {
      this.pushToast("RAZORBACK only hunts free-roam streets");
      return;
    }
    this.lastRazorLine = "";
    this.pushToast(this.razor.forceSpawn(this.player, this.cam.yaw, this.audio, this.save));
    writeSave(this.save);
  }

  private hurlHeld(): void {
    const block = this.player.dropHeld();
    if (!block) return;
    const origin = this.player.position.clone().addScaledVector(this.player.facing, 5);
    origin.y += 6;
    this.world.throwBlock(block, origin, this.player.facing, this.player.raging ? 54 : 40);
    this.audio.smash();
    this.cam.bump(0.9);
    this.fx.burst(origin, 0xc4a06a, 10);
    this.grantXp(16);
    this.pushToast("Building thrown");
  }

  private tryInteract(): void {
    if (this.player.driving) {
      this.traffic.exit();
      this.player.driving = false;
      this.pushToast("Out of the car.");
      return;
    }
    const issue = this.comics.nearest(this.player.position, 7.5);
    if (issue) {
      this.touchComic(issue.arc.id);
      return;
    }
    const loreTalk = this.lore.talk(this.player.position);
    if (loreTalk) {
      this.pushToast(loreTalk);
      return;
    }
    if (this.player.isBruce && !this.inDungeon) {
      const car = this.traffic.nearest(this.player.position, 3.4);
      if (car) {
        this.traffic.enter(car);
        this.player.driving = true;
        this.pushToast("Bruce drives. H to bail.");
        return;
      }
      const calmed = this.crimes.calmNear(this.player.position, 7);
      if (calmed) {
        this.pushToast(`Talked ${calmed} down.`);
        return;
      }
    }
    if (this.inDungeon) {
      const caught = this.beasts.tryCatch(this.player.position, this.save, !this.player.isHulk, this.audio);
      if (caught) {
        writeSave(this.save);
        this.pushToast(caught);
        return;
      }
      if (this.dungeon.cleared) {
        if (this.overlay.killSpareOpen() || this.pendingFate) {
          this.pushToast("Kill or Spare — no walking away");
          return;
        }
        this.exitDungeon(true);
      }
      else this.pushToast("Beat the capital boss, or fall back to the street");
      return;
    }
    const caught = this.beasts.tryCatch(this.player.position, this.save, !this.player.isHulk, this.audio);
    if (caught) {
      writeSave(this.save);
      this.pushToast(caught);
      return;
    }
    if (!this.player.isHulk) {
      const site = this.world.nearestSite(this.player.position);
      if (site && (site.kind === "diner" || site.kind === "job" || site.kind === "apartment")) {
        this.markRecognized();
      }
      const face = this.crimes.nearestCivilian(this.player.position);
      if (face && face.dist < 4.8) {
        this.markRecognized();
      }
      const lifeMsg = this.life.trySite(site, this.save, this.audio);
      if (lifeMsg) {
        writeSave(this.save);
        this.pushToast(lifeMsg);
        return;
      }
    }
    const recruit = this.hood.tryRecruit(this.player.position);
    if (recruit) {
      this.save.teamed = true;
      this.flushObjectives();
      this.audio.ui();
      this.pushToast(recruit);
      return;
    }
    const city = getCity(this.save.cityId);
    const nearDoor = this.player.position.distanceTo(this.world.dungeonDoor) < 8;
    if (nearDoor && this.save.beatenBosses.includes(city.id)) {
      this.pushToast(`${city.dungeonName} is quiet. The next city is on the map.`);
      return;
    }
    if (nearDoor && this.bossReady()) {
      this.enterDungeon();
    } else if (nearDoor) {
      this.pushToast(`Clear ${city.boss.crimesToUnlock} street jobs, then H to enter ${city.dungeonName}`);
    }
  }

  private touchComic(id: string): void {
    this.enterComicById(id);
  }

  private enterComicById(id: string): void {
    const arc = comicById(id);
    if (!arc || this.comics.active) return;
    if (markComicFound(this.save, id)) writeSave(this.save);
    this.pendingComic = null;
    this.overlay.hideStoryGate();
    this.world.group.visible = false;
    this.crimes.group.visible = false;
    this.traffic.group.visible = false;
    if (this.crowd) this.crowd.group.visible = false;
    this.lore.group.visible = false;
    this.smash.echoes.visible = false;
    this.quests.group.visible = false;
    this.hood.group.visible = false;
    this.dungeon.group.visible = false;
    this.comics.enter(arc, this.player, this.scene);
    this.world.ghost = true;
    this.pushToast(arc.brief);
    this.hudTimer = 1;
  }

  private updateComicPlay(dt: number): void {
    const beat = this.comics.tick(dt, this.player);
    if (beat === "cleared") {
      this.finishComic();
      return;
    }
    if (beat) this.pushToast(beat);
    if (this.player.smashActive > 0 && !this.smashConsumed) {
      this.smashConsumed = true;
      const origin = this.player.smashOrigin();
      const n = this.comics.applySmash(origin, this.player.smashRadius, this.player.smashDamage);
      if (n) {
        this.player.noteHit();
        this.fx.burst(origin, this.comics.arc?.accent ?? 0x88ff44, 6);
        this.cam.bump(0.4);
      }
    }
    if (this.player.smashActive <= 0) this.smashConsumed = false;
  }

  private finishComic(): void {
    const arc = this.comics.arc;
    const blurb = arc?.returnBlurb ?? "Back on the street.";
    if (arc && markComicCleared(this.save, arc.id)) {
      writeSave(this.save);
      this.flushObjectives();
    }
    this.leaveComic();
    this.pushToast(blurb);
  }

  private leaveComic(): void {
    if (!this.comics.active) {
      this.overlay.hideStoryGate();
      this.pendingComic = null;
      return;
    }
    this.comics.leave(this.player, this.scene);
    this.world.ghost = false;
    this.overlay.hideStoryGate();
    this.pendingComic = null;
    if (this.inDungeon) {
      this.dungeon.group.visible = true;
      this.comics.hideStreet(true);
    } else {
      this.world.group.visible = true;
      this.crimes.group.visible = true;
      this.traffic.group.visible = true;
      if (this.crowd) this.crowd.group.visible = true;
      this.lore.group.visible = true;
      this.smash.echoes.visible = true;
      this.quests.group.visible = true;
      this.hood.group.visible = true;
      this.comics.hideStreet(false);
    }
  }

  private enterDungeon(): void {
    const city = getCity(this.save.cityId);
    this.inDungeon = true;
    hidePlayfield();
    this.world.group.visible = false;
    this.crimes.group.visible = false;
    this.traffic.group.visible = false;
    if (this.crowd) this.crowd.group.visible = false;
    this.lore.group.visible = false;
    this.smash.echoes.visible = false;
    this.quests.group.visible = false;
    this.hood.group.visible = false;
    this.dungeon.enter(this.scene, this.player);
    this.beasts.group.visible = true;
    this.beasts.spawnDungeonSide(this.dungeon.sideRooms, this.save);
    this.beasts.deployAllies(this.save);
    this.comics.hideStreet(true);
    this.comics.spawnDungeon(city.id, this.dungeon.sideRooms);
    this.audio.boss();
    this.cam.bump(0.6);
    this.pushToast(`${city.dungeonName} — ${this.dungeon.name}`);
  }

  private exitDungeon(victory: boolean): void {
    this.inDungeon = false;
    this.world.group.visible = true;
    this.crimes.group.visible = true;
    this.traffic.group.visible = true;
    if (this.crowd) this.crowd.group.visible = true;
    this.lore.group.visible = true;
    this.smash.echoes.visible = true;
    this.quests.group.visible = true;
    this.hood.group.visible = true;
    this.dungeon.leave(this.scene, this.player, this.world.playerSpawn);
    this.beasts.loadCity(getCity(this.save.cityId).id, getCity(this.save.cityId).name, this.save, this.world.playerSpawn);
    this.comics.hideStreet(false);
    this.world.applyAtmosphere(this.scene, this.hemi, this.sun, this.life.applyAtmosphereMix(this.save.life.hour));
    if (this.world.mapsLite) showPlayfield();
    if (victory) this.pushToast("Back on the street");
    if (victory && this.queuedNyRazor && this.cityIdNy()) this.fireNyRazorback();
  }

  private cityIdNy(): boolean {
    return this.save.cityId === "new-york";
  }

  private ensureStreetMap(): HTMLElement {
    let el = document.getElementById("street-map");
    if (el) return el;
    el = document.createElement("div");
    el.id = "street-map";
    this.canvas.parentElement?.insertBefore(el, this.canvas);
    return el;
  }

  private syncStreetMap(): void {
    if (!this.world?.mapsLite || this.inDungeon || this.screen !== "play") {
      if (this.inDungeon) hidePlayfield();
      return;
    }
    showPlayfield();
    const g = this.world.graph;
    if (!g) return;
    const ll = g.unproject(this.player.position.x, this.player.position.z);
    const heading = THREE.MathUtils.radToDeg(this.cam.yaw) + 180;
    const leaping = this.player.isHulk && !this.player.grounded;
    const hub = hubOf(this.save.cityId);
    const zoom = (leaping ? hub.zoom - 0.85 : hub.zoom) - this.cam.zoom * 0.04;
    syncPlayfield(ll.lat, ll.lon, zoom, heading, leaping ? 58 : 47.5);
    const marks: { id: string; lat: number; lng: number; title: string; color: string }[] = [];
    const door = g.unproject(this.world.dungeonDoor.x, this.world.dungeonDoor.z);
    marks.push({ id: "door", lat: door.lat, lng: door.lon, title: this.world.city.dungeonName, color: "#7dff6a" });
    const plaza = g.unproject(this.world.plaza.x, this.world.plaza.z);
    marks.push({ id: "plaza", lat: plaza.lat, lng: plaza.lon, title: "Plaza", color: "#f0c400" });
    syncPlayMarkers(marks);
  }

  private bossReady(): boolean {
    const city = getCity(this.save.cityId);
    const cleared = this.save.crimesCleared[city.id] ?? 0;
    if (city.id === "new-york" && !this.save.everHulked) return false;
    return cleared >= city.boss.crimesToUnlock;
  }

  private applyDungeonRoster(cityId: string): void {
    const row = capitalBossFor(cityId);
    if (!row) return;
    this.dungeon.applyRoster(remapBossName(row), row.encounter.hp, row.encounter.tint, row.encounter.move);
  }

  private beginBossJudgment(): void {
    const city = getCity(this.save.cityId);
    if (this.pendingFate || judgedCity(this.save, city.id) || this.save.beatenBosses.includes(city.id)) {
      if (!this.save.beatenBosses.includes(city.id)) this.onDungeonClear();
      return;
    }
    this.pendingFate = city.id;
    this.input.exitLock();
    const row = capitalBossFor(city.id);
    const name = row ? remapBossName(row) : city.boss.name;
    this.overlay.showKillSpare(
      `${name} is down`,
      "Kill ends them. Spare leaves them breathing. Both paths stay open — 37 of each unlocks a form pair. No walking away.",
      this.save.bossesKilled.length,
      this.save.bossesSpared.length,
    );
    this.pushToast("Kill or Spare");
  }

  private resolveBossFate(fate: BossFate): void {
    const cityId = this.pendingFate ?? this.save.cityId;
    if (this.overlay.killSpareOpen() === false && !this.pendingFate) return;
    const unlocked = applyBossFate(this.save, cityId, fate);
    this.overlay.hideKillSpare();
    this.pendingFate = null;
    this.onDungeonClear();
    this.runPostBossBeat(cityId);
    writeSave(this.save);
    if (unlocked.length) {
      this.overlay.showFormSplash(unlocked.join(" + "), "Additive unlock. Kit numbers PARTIAL. Cycle 0 / radial when Gamma allows.");
      this.pushToast(`Unlocked ${unlocked.join(" · ")}`);
    }
  }

  private runPostBossBeat(cityId: string): void {
    const row = capitalBossFor(cityId);
    if (!row) return;
    if (cityId === "new-york" && row.postBoss === "Razorback") {
      this.queuedNyRazor = true;
      this.pushToast("Razorback is waiting on the street. H to leave.");
      return;
    }
    if (markPostBossBeat(this.save, cityId)) {
      this.pushToast(row.postBoss);
    }
  }

  private fireNyRazorback(): void {
    this.queuedNyRazor = false;
    if (markPostBossBeat(this.save, "new-york")) writeSave(this.save);
    this.lastRazorLine = "";
    this.pushToast(this.razor.forceSpawn(this.player, this.cam.yaw, this.audio, this.save));
    this.pushToast("RAZORBACK — claws and a healing factor. The NY post-boss beat.");
  }

  private async debugCapitalBoss(cityId: string, fight: boolean): Promise<void> {
    this.audio.unlock();
    this.audio.ui();
    if (!this.save.unlockedCities.includes(cityId)) this.save.unlockedCities.push(cityId);
    this.save.cityId = cityId;
    if (fight) {
      const city = getCity(cityId);
      this.save.everHulked = true;
      this.save.crimesCleared[cityId] = Math.max(this.save.crimesCleared[cityId] ?? 0, city.boss.crimesToUnlock);
    }
    writeSave(this.save);
    await this.loadCity(cityId, true);
    this.player.formCd = 0;
    this.player.dropInWorldBreaker(this.audio);
    this.hideStreetPlaceholders();
    this.started = true;
    this.enterPlay();
    const row = capitalBossFor(cityId);
    this.pushToast(row ? `Capital boss: ${remapBossName(row)}${row.threatRank != null ? ` (#${row.threatRank})` : ""}` : "Capital boss");
    if (fight) {
      if (!this.player.isHulk) this.player.setKind(this.save.lastTitan, this.audio);
      this.enterDungeon();
    }
  }

  private onDungeonClear(): void {
    const city = getCity(this.save.cityId);
    if (!this.save.beatenBosses.includes(city.id)) this.save.beatenBosses.push(city.id);
    const nxt = nextCity(city.id);
    const unlocked: string[] = [];
    if (nxt && !this.save.unlockedCities.includes(nxt.id)) {
      this.save.unlockedCities.push(nxt.id);
      unlocked.push(nxt.name);
    }
    const actPay = city.act === 5 ? 2200 : city.act ? 1100 : 520;
    this.save.cash += actPay;
    this.smash.addDamage(this.save, 18000);
    this.grantXp(city.act === 5 ? 420 : city.act ? 260 : 180);
    this.beasts.noteBossKill(this.save);
    this.flushObjectives();
    writeSave(this.save);
    const page = city.act ? unlockCodex(this.save, city.act) : null;
    if (page) writeSave(this.save);
    const extra = unlocked.length ? ` Next city unlocked: ${unlocked[0]}.` : " The chain ends here.";
    const codex = page ? ` Codex: ${page.title}.` : "";
    const name = this.dungeon.name || city.boss.name;
    this.pushToast(`${name} down.${extra}${codex} H to leave.`);
    this.audio.success();
  }

  private markRecognized(): void {
    if (this.save.recognized) return;
    this.save.recognized = true;
    this.flushObjectives();
    writeSave(this.save);
    this.pushToast(recognizeLine(this.save.life.day + Math.floor(this.save.life.hour)));
  }

  private onBossDown(): void {
    this.onDungeonClear();
  }

  private flushObjectives(): void {
    const fresh = syncObjectives(this.save, this.objFlags);
    writeSave(this.save);
    if (fresh.length) {
      const first = objectiveById(fresh[0]!);
      if (first) this.pushToast(`Objective: ${first.title}`);
    }
  }

  private pushToast(text: string): void {
    this.toast = text;
    this.toastTimer = 3.4;
  }

  private handleForms(): void {
    if (this.input.consumeCalm()) {
      this.overlay.setRadial(false, this.radialIndex, this.save);
      this.input.consumeRadialConfirm();
      this.applyCalmDown("Calm Down. Bruce.");
      this.radialWasOpen = false;
      return;
    }

    const opened = this.input.radialOpen;
    if (opened && !this.radialWasOpen) {
      const i = HULK_FORMS.findIndex((f) => f.id === this.player.hulkKind);
      this.radialIndex = i < 0 ? 0 : i;
    }
    this.radialWasOpen = opened;

    const cycle = this.input.consumeRadialCycle();
    if (opened && cycle) {
      this.radialIndex = (this.radialIndex + cycle + HULK_FORMS.length) % HULK_FORMS.length;
    }
    this.overlay.setRadial(opened, this.radialIndex, this.save);

    if (this.input.consumeRadialConfirm()) {
      this.overlay.setRadial(false, this.radialIndex, this.save);
      this.pickForm(HULK_FORMS[this.radialIndex]!.id);
      this.input.consumeFormTap();
      return;
    }
    if (opened) {
      this.input.consumeFormTap();
      return;
    }
    if (this.input.consumeFormTap()) {
      if (this.player.band === "overcharged" || this.player.band === "locked") {
        this.pushToast(this.player.band === "locked" ? "Locked. No form switch." : "Overcharged. No form switch.");
      } else {
        let next = nextKind(this.player.isBruce ? "bruce" : this.player.hulkKind);
        let picked: HulkKind | null = null;
        for (let i = 0; i < HULK_FORMS.length; i++) {
          if (!isBruceKind(next) && formUnlocked(next, this.save)) {
            picked = next;
            break;
          }
          next = nextKind(next);
        }
        if (picked && this.player.setKind(picked, this.audio)) {
          this.smash.noteForm(picked);
          this.save.hulkKind = this.player.hulkKind;
          this.save.lastTitan = this.player.lastTitan;
          this.save.activeForm = formSaveId(this.save.lastTitan);
          writeSave(this.save);
          this.pushToast(this.player.formLabel);
        } else if (!picked) {
          this.pushToast("Smash for Rage Rep to unlock forms.");
        }
      }
    }
  }

  private pickForm(kind: HulkKind): void {
    if (kind === "bruce") {
      this.applyCalmDown("Bruce.");
      return;
    }
    if (!formUnlocked(kind, this.save)) {
      this.pushToast(`${formDef(kind).name} locked. ${formLockLine(kind, this.save)}.`);
      return;
    }
    if (this.player.band === "overcharged" || this.player.band === "locked") {
      this.pushToast(this.player.band === "locked" ? "Locked. No form switch." : "Overcharged. No form switch.");
      return;
    }
    if (this.player.setKind(kind, this.audio)) {
      this.smash.noteForm(kind);
      this.save.hulkKind = this.player.hulkKind;
      this.save.lastTitan = this.player.lastTitan;
      this.save.activeForm = formSaveId(isBruceKind(this.player.hulkKind) ? this.player.lastTitan : this.player.hulkKind);
      writeSave(this.save);
      this.pushToast(this.player.formLabel);
    }
  }

  private applyCalmDown(okLine: string): void {
    const night = this.save.life.hour < 6 || this.save.life.hour >= 20;
    const r = this.player.tryCalmDown(this.audio, night);
    if (r === "ok") {
      this.save.hulkKind = "bruce";
      this.save.lastTitan = this.player.lastTitan;
      this.persistMeters();
      this.pushToast(okLine);
    } else if (r === "breathe") {
      this.pushToast("Trying to breathe. Gamma still too high.");
    } else {
      this.pushToast(
        this.player.hulkKind === "immortal" && night
          ? "Immortal has no Bruce window at night."
          : "Calm Down greyed out. Gamma locked.",
      );
    }
  }

  private handlePowers(dt: number): void {
    this.powers.bindDay(this.save.life.day, this.save.kingShoutDay);
    this.player.gadgetIncoming = this.powers.incomingMul();
    this.player.gadgetSpeed = this.powers.speedMul();
    this.player.angerMul = this.powers.damageMul();
    this.player.willBuild = this.player.isHulk && this.powers.borrowed === "will";
    const tap = this.input.consumePower();
    if (tap) {
      if (!hasUnlock(this.save.reputation, "powers")) {
        this.pushToast(`Borrowed powers unlock at Rage Rep ${unlockAt("powers")}.`);
      } else if (this.player.isHulk && !this.player.canUsePowers) {
        this.pushToast("Gamma too low. Borrowed powers sleep in the Bruce window.");
      } else if (this.player.isHulk) {
        this.player.spendGamma(METERS.powerMin * powerCostMul(this.player.band));
        const line = this.powers.select(tap, true);
        if (line) this.pushToast(line);
      } else if (tap === "omega") {
        this.pushToast("X zooms. Borrowed powers wait for the titan.");
      } else {
        this.pushToast("G / N / T stay dark until you Hulk. G still drops a wreck.");
      }
    }
    if (this.player.constructQueued) {
      this.player.constructQueued = false;
      const line = this.powers.buildConstruct(this.player, this.audio);
      if (line) this.pushToast(line);
    }
    const tick = this.powers.update(
      dt,
      this.player,
      this.input,
      this.world,
      this.audio,
      this.lockName,
      this.lockPos,
      this.save.life.day,
    );
    if (tick.toast) this.pushToast(tick.toast);
    if (tick.smash) this.applyPowerSmash(tick.smash);
    if (tick.wreck) {
      this.world.smashEnvironment(tick.wreck.origin, tick.wreck.radius, tick.wreck.power, this.player.mods.demo);
      this.fx.burst(tick.wreck.origin, 0xff6611, 8);
    }
    if (this.powers.shoutDay() !== this.save.kingShoutDay) {
      this.save.kingShoutDay = this.powers.shoutDay();
      writeSave(this.save);
    }
    this.crimes.lure = this.player.isBruce ? this.powers.decoyPos : null;
  }

  private applyPowerSmash(hit: { origin: THREE.Vector3; radius: number; damage: number; color: number }): void {
    const dmg = hit.damage * this.player.angerMul;
    const f = this.player.facing;
    if (this.inDungeon) this.dungeon.applySmash(hit.origin, hit.radius, dmg, this.audio);
    else {
      const n = this.crimes.applySmash(hit.origin, hit.radius, dmg, this.audio, f, true);
      this.quests.applySmash(hit.origin, hit.radius, dmg, this.audio, f, true);
      this.hood.applySmash(hit.origin, hit.radius, dmg, this.audio, f, true);
      this.boss.applySmash(hit.origin, hit.radius, dmg, this.audio);
      this.razor.applySmash(hit.origin, hit.radius, dmg, this.player.style, this.player.attackKind, false, false, this.player.hulkKind, this.player.heat, this.audio);
      if (n) this.powers.noteDealt("crime", dmg);
    }
    this.fx.burst(hit.origin, hit.color, 10);
    this.cam.bump(0.4);
    this.powers.refillCombat();
  }

  private lockTargets(): { name: string; pos: THREE.Vector3 }[] {
    const out: { name: string; pos: THREE.Vector3 }[] = [];
    if (this.inDungeon) {
      for (const z of this.dungeon.zombies.living()) out.push({ name: "Undead soldier", pos: z.pos });
      if (this.dungeon.active) out.push({ name: this.dungeon.name, pos: this.dungeon.bossPos });
    } else {
      const c = this.crimes.nearest(this.player.position);
      if (c) out.push({ name: c.title, pos: c.position });
      for (const w of this.beasts.wilds) {
        if (w.hp > 0) out.push({ name: w.species.name, pos: w.pos });
      }
      if (this.razor.active) out.unshift({ name: "RAZORBACK", pos: this.razor.pos });
    }
    return out;
  }

  private handleLock(): void {
    const targets = this.lockTargets();
    if (this.input.consumeLock()) {
      if (this.lockPos) {
        this.lockPos = null;
        this.lockName = "";
        this.pushToast("Lock-on released");
      } else if (targets.length) {
        this.lockIndex = 0;
        this.lockPos = targets[0]!.pos;
        this.lockName = targets[0]!.name;
        this.pushToast(`Lock: ${this.lockName}`);
      }
    }
    const cycle = this.input.consumeLockCycle();
    if (cycle && targets.length) {
      this.lockIndex = (this.lockIndex + cycle + targets.length) % targets.length;
      this.lockPos = targets[this.lockIndex]!.pos;
      this.lockName = targets[this.lockIndex]!.name;
    }
    if (this.lockPos && this.lockName && !targets.some((t) => t.name === this.lockName)) {
      this.lockPos = null;
      this.lockName = "";
    }
  }

  private handleCombatExtras(dt: number): void {
    if (this.input.consumeRoar() && this.player.fireRoar()) {
      if (this.inDungeon) this.dungeon.zombies.stunAll(1.4);
      this.fx.burst(this.player.position, 0xffaa44, 12);
      this.pushToast("Roar");
      this.audio.smash();
    }
    const rage = this.input.consumeRageMode() ? this.player.tryRageMode(this.audio) : "skip";
    if (rage === "rage") this.pushToast(`${formDef(this.player.hulkKind).name} — RAGE`);
    if (rage === "vent") {
      this.pushToast("Heat vent");
      this.dungeon.zombies.stunAll(1.2);
      this.fx.burst(this.player.position, 0xff5522, 16);
    }
    if (rage === "need") this.pushToast(this.player.hulkKind === "red" ? "Need Heat" : "Rage not full");
    if (this.input.consumeGamma() && this.player.fireGamma()) {
      if (this.inDungeon) this.dungeon.zombies.stunAll(2.4);
      this.fx.burst(this.player.position, 0x66ff88, 18);
      this.cam.bump(0.8);
      this.pushToast("Gamma roar");
    }
    const spec = this.input.consumeSpecial();
    if (spec) this.fireSpecial(spec);
    if (this.player.smashThrough && this.player.isHulk) {
      this.chargeSmash += dt;
      const worldbreaker = this.player.tier === "worldbreaker" || this.player.tier === "meltdown";
      const gap = worldbreaker ? 0.28 : 0.4;
      if (this.chargeSmash > gap) {
        this.chargeSmash = 0;
        this.smashScratch.copy(this.player.position).addScaledVector(this.player.facing, 2);
        const rad = worldbreaker ? 7.2 : 4.2;
        if (this.world.smashEnvironment(this.smashScratch, rad, worldbreaker ? "super" : "smash", this.player.mods.demo)) this.razor.noteWreck();
        if (worldbreaker) this.crimes.applySmash(this.smashScratch, rad, 18, this.audio, this.player.facing, false);
        if (this.inDungeon) this.dungeon.applySmash(this.smashScratch, rad, worldbreaker ? 36 : 22, this.audio);
      }
    } else this.chargeSmash = 0;
    if (this.meteorLeft > 0) {
      this.meteorT -= dt;
      if (this.meteorT <= 0) {
        this.meteorLeft -= 1;
        this.meteorT = 0.28;
        const aim = this.lockPos ?? this.player.position.clone().addScaledVector(this.player.facing, 8);
        const o = aim.clone();
        o.y = 0;
        this.player.beginSpecial(Attack.Super);
        if (this.inDungeon) this.dungeon.applySmash(o, 7, this.player.smashDamage, this.audio);
        else this.world.smashEnvironment(o, 7, "super", this.player.mods.demo);
        this.fx.burst(o, 0xff8844, 12);
        this.cam.bump(0.4);
      }
    }
  }

  private fireSpecial(id: number): void {
    if (this.player.isBruce) {
      this.pushToast(
        this.powers.gadget(id, this.player, this.audio, this.crimes, this.hood, this.dungeon, this.traffic, this.inDungeon, this.player.lastTitan),
      );
      writeSave(this.save);
      return;
    }
    if (!this.player.isHulk) {
      this.pushToast("Specials need the titan — or Calm Down to Bruce for gadgets.");
      return;
    }
    if (!this.player.canUsePowers) {
      this.pushToast("Gamma too low. No powers in the Bruce window.");
      return;
    }
    if (!this.player.spendGamma(specialCost(id) * powerCostMul(this.player.band))) {
      this.pushToast("Not enough Gamma.");
      return;
    }
    const name = SPECIALS.find((s) => s.id === id)?.name ?? `Special ${id}`;
    const immortal = this.player.hulkKind === "immortal";
    const red = this.player.hulkKind === "red";
    const fixit = this.player.hulkKind === "fixit";
    if (id === 1) {
      this.player.beginSpecial(Attack.Clap);
      if (this.inDungeon) this.dungeon.zombies.stunAll(0.8);
    } else if (id === 2) {
      this.player.beginSpecial(Attack.Ground);
      this.player.velocity.y = this.player.grounded ? 8 : this.player.velocity.y;
    } else if (id === 3) {
      const mul = fixit ? 1.4 : 1;
      this.player.velocity.x += this.player.facing.x * 28 * mul;
      this.player.velocity.z += this.player.facing.z * 28 * mul;
      this.player.beginSpecial(Attack.Smash);
    } else if (id === 4) {
      this.tryGrab();
      if (immortal) this.player.beginSpecial(Attack.Ground);
    } else if (id === 5) {
      this.player.beginSpecial(Attack.Clap);
      this.fx.burst(this.player.position, red ? 0xff4411 : 0x66ff88, 14);
    } else if (id === 6) {
      const dest = this.lockPos ?? this.player.position.clone().addScaledVector(this.player.facing, 10);
      this.player.position.x = dest.x;
      this.player.position.z = dest.z;
      this.player.velocity.y = -20;
      this.player.poundQueued = true;
      this.player.beginSpecial(Attack.Ground);
    } else if (id === 7) {
      if (!this.player.held && !fixit) {
        this.pushToast("Whirlwind needs a held object — Shift");
        return;
      }
      this.player.clubSwing = true;
      this.player.beginSpecial(Attack.Clap);
    } else if (id === 8) {
      this.meteorLeft = 3;
      this.meteorT = 0.05;
    } else if (id === 9) {
      this.player.beginSpecial(Attack.Super);
      if (immortal || red) this.fx.burst(this.player.position, red ? 0xff3300 : 0x44ff99, 16);
    }
    this.pushToast(flavorSpecial(id, this.player.style, name));
    this.audio.smash();
    this.stompChain.push(id);
    if (this.stompChain.length > 3) this.stompChain.shift();
    if (this.stompChain[0] === 2 && this.stompChain[1] === 9 && this.stompChain[2] === 1) {
      this.stompChain = [];
      const o = this.player.position.clone();
      this.world.smashEnvironment(o, 16, "super", this.player.mods.demo);
      this.crimes.applySmash(o, 14, 40, this.audio, this.player.facing, true);
      this.fx.burst(o, 0xddff66, 20);
      this.cam.bump(1.1);
      this.pushToast("Thunder-stomp. 2 → 9 → 1.");
    }
  }

  private handleStyle(): void {
    const next = this.input.consumeStyle();
    if (!next) return;
    const r = this.player.setStyle(next);
    if (r === "blocked") {
      this.pushToast("Maestro does not fold. Jiu-jitsu locked.");
      return;
    }
    if (r === "busy") return;
    const st = styleDef(this.player.style);
    this.smash.noteStyle();
    this.pushToast(r === "off" ? "Savage brawl" : `${st.name} — ${st.tap} / ${st.hold}`);
    this.audio.ui();
  }

  private toggleParty(uid: string): void {
    const i = this.save.bestiary.party.indexOf(uid);
    if (i >= 0) this.save.bestiary.party.splice(i, 1);
    else if (this.save.bestiary.party.length < 3) this.save.bestiary.party.push(uid);
    writeSave(this.save);
    this.overlay.renderBestiary(this.save, getCity(this.save.cityId).name);
  }

  private drawHud(): void {
    const city = getCity(this.save.cityId);
    const cleared = this.save.crimesCleared[city.id] ?? 0;
    const beaten = this.save.beatenBosses.includes(city.id);
    const nearest = this.crimes.nearest(this.player.position);
    const prog = progressFromXp(this.save.xp);
    const quest = this.save.activeQuestId ? questById(this.save.activeQuestId) : undefined;
    const obj = this.save.activeObjectiveId ? objectiveById(this.save.activeObjectiveId) : undefined;
    let mission = obj ? `${obj.title} — ${obj.blurb}` : `${city.storyLine} Open the map (M) for the chain.`;
    const cwMission = this.crimeWave.missionLine(this.save);
    if (this.kaiju.active) mission = this.kaiju.hudLine();
    else if (cwMission) mission = cwMission;
    if (this.comics.active) mission = this.comics.beatTitle();
    else if (this.inDungeon) mission = `${this.dungeon.title} — ${this.dungeon.name}. Smash the capital boss.`;
    else if (this.hood.district === District.Heroes) {
      const squad = this.hood.squad;
      mission = squad.length
        ? `Skyline Heroes — squad: ${squad.join(", ")}. They smash crime with you on this block.`
        : "Skyline Heroes. The watch is checking the streets. Press H next to a hero to team up.";
    } else if (this.hood.district === District.Villains) {
      mission = "Iron Warrens. Lodestone, The Choir, and Rime hold this block. Smash them.";
    } else if (quest) {
      const nearestHunt = quest.kind === "hunt" ? nearestLiving(this.quests.living, this.player.position) : null;
      const huntHint = nearestHunt
        ? ` Follow the purple beacon — ${this.dirAlong(nearestHunt.mesh.position)}.`
        : quest.kind === "hunt"
          ? " Last target is down."
          : ` ${quest.blurb}`;
      mission = `${quest.name}: ${this.save.questProgress}/${quest.goal}.${huntHint}`;
    } else if (obj) {
      const nearTxt = nearest
        ? ` ${nearest.engaged ? "In the fight:" : "Nearest:"} ${nearest.title}.`
        : "";
      mission = `${obj.title} — ${obj.blurb}${nearTxt}`;
    } else if (beaten) mission = "District secured. Open the map (M) or the quest board from pause.";
    else if (this.bossReady()) {
      const cap = capitalBossFor(city.id);
      mission = `${city.dungeonName} is open${cap ? ` — ${remapBossName(cap)}` : ""}. ${this.dirAlong(this.world.dungeonDoor)}. Plaza door, press H.`;
    }
    else {
      const nearTxt = nearest
        ? ` ${nearest.engaged ? "In the fight:" : "Nearest:"} ${nearest.title} — smash the crew.`
        : "";
      mission = `Clear street crimes ${cleared}/${city.boss.crimesToUnlock}.${nearTxt}`;
    }

    let prompt = "";
    const nearIssue = this.comics.nearest(this.player.position, 12);
    if (this.screen === "play" && this.comics.active) {
      prompt = "Enter smash · reach the marker · hold the ring · Esc leaves the vignette";
    } else if (this.screen === "play" && !this.input.pointerLocked) {
      prompt = this.player.isHulk
        ? "Click to look · Arrows move · WASD camera · Enter smash · Space leap"
        : "Click to look · Arrows move · WASD camera · H job / catch · R titan";
    }
    const nearDoor = this.player.position.distanceTo(this.world.dungeonDoor) < 8;
    const site = this.world.nearestSite(this.player.position);
    const wild = this.beasts.nearestWild(this.player.position);
    if (this.screen === "play" && this.overlay.killSpareOpen()) {
      prompt = "Kill or Spare — click. No walking away.";
    } else if (this.screen === "play" && this.inDungeon && this.dungeon.cleared) {
      prompt = "H — leave the dungeon";
    } else if (this.screen === "play" && nearDoor && this.bossReady() && !beaten && !this.inDungeon) {
      prompt = `H — enter ${city.dungeonName}`;
    } else if (this.screen === "play" && wild) {
      prompt = `H — catch ${wild.species.name}`;
    } else if (this.screen === "play" && site && !this.player.isHulk) {
      prompt =
        site.kind === "apartment"
          ? "H — sleep at the walk-up"
          : site.kind === "diner"
            ? "H — eat ($12)"
            : `H — ${site.label}`;
    } else if (this.screen === "play" && !this.player.isHulk) {
      prompt = prompt || "R or 0 — become Hulk · H — jobs, food, sleep, catch";
    }
    const recruit = this.hood.nearestRecruit(this.player.position);
    if (this.screen === "play" && this.hood.district === District.Heroes && recruit) {
      prompt = recruit.teamed ? `H — release ${recruit.def.name}` : `H — team up with ${recruit.def.name}`;
    }
    if (this.screen === "play" && this.player.driving) {
      prompt = "H — leave the car";
    } else if (this.screen === "play" && this.player.isBruce) {
      prompt = "1–9 gadgets · H car / calm · Hold 0 2s Calm Down · 3 hits force Hulk";
    } else if (this.screen === "play" && this.razor.riding) {
      prompt = `Mash Enter — throw RAZORBACK off (${this.razor.rideMash}/${RAZOR_VARS.rideMash})`;
    } else if (this.screen === "play" && this.razor.stalking) {
      prompt = "RAZORBACK is stalking you. He pounces after a minute.";
    } else if (this.screen === "play" && this.razor.fighting) {
      prompt = "Bleed claws. Shift grab · J pin · U throw ×3 · 1 thunderclap. Boxing ducks.";
    }
    if (this.razor.active) {
      mission = this.razor.stalking
        ? "RAZORBACK has your scent. Sixty seconds."
        : "RAZORBACK — claws bleed. J pin · U throw · Shift grab · 1 clap.";
    }
    if (this.screen === "play" && nearIssue && !this.comics.active && !this.inDungeon && !this.razor.active && !this.player.driving) {
      prompt = `Glowing issue — ${nearIssue.arc.title}. Walk into it (or H).`;
    }
    const loreHail = this.lore.hailLine(this.player.position);
    if (this.screen === "play" && loreHail && !this.comics.active && !this.inDungeon && !this.razor.active && !nearIssue) {
      prompt = this.lore.nearest(this.player.position, 5.4)
        ? `H — Gamma Freak. ${loreHail}`
        : `Gamma Freak — ${loreHail}`;
    }
    const onRoof = (this.player.isHulk && this.player.grounded && this.player.position.y > 5.2) || this.player.hopping;
    if (this.screen === "play" && onRoof && !this.razor.active && !nearIssue) {
      prompt = this.player.hopping
        ? "Roof hop — land, then Space for the next lot"
        : "Space — hop the next roof · or hold Shift + arrows + Space from the street";
    } else if (
      this.screen === "play" &&
      this.player.isHulk &&
      !this.inDungeon &&
      this.world.nearStructure(this.player.position.x, this.player.position.z, this.player.radius + 14) &&
      !this.razor.active &&
      !nearIssue
    ) {
      prompt = this.player.held
        ? "Shift — throw the wreck · G sets down"
        : "Shift tap — rip this lot · Enter smash · Shift+jump hops roofs";
    }

    const huntTarget =
      quest?.kind === "hunt" ? nearestLiving(this.quests.living, this.player.position) : null;
    const villain = this.hood.focusedVillain;
    const atlas = this.mapSnapshot();
    const snap: HudSnapshot = {
      health: this.player.health,
      maxHealth: this.player.maxHealth,
      rage: this.player.raging ? 100 : this.player.rage,
      maxRage: this.player.maxRage,
      rageActive: this.player.raging,
      gamma: this.player.gamma,
      maxGamma: this.player.maxGamma,
      gammaBand: this.player.band,
      gammaLabel: this.player.bandLabel,
      rageTier: this.player.tierLabel,
      wantedStars: wantedStars(this.director.wanted + (this.player.band === "locked" || this.player.band === "overcharged" ? 12 : 0)),
      wantedTier: wantedTier(wantedStars(this.director.wanted + (this.player.band === "locked" || this.player.band === "overcharged" ? 12 : 0)))?.unit ?? "",
      damageCash: this.save.damageCash,
      damageDisplay: this.smash.display,
      rageRep: this.save.reputation,
      missionBeat: this.inDungeon || this.comics.active ? "" : BEAT_LABEL[this.smash.beat],
      rampageLine: this.smash.rampageLine(this.save),
      stanceMark:
        this.hood.district === District.Heroes && this.hood.squad.length
          ? "HERO"
          : this.director.wanted > 28 || this.player.band === "locked" || this.player.band === "overcharged"
            ? "MENACE"
            : "",
      calmLocked: this.player.gamma >= 50 || (this.player.hulkKind === "immortal" && (this.save.life.hour < 6 || this.save.life.hour >= 20)),
      cash: this.save.cash,
      reputation: this.save.reputation,
      cityName: this.streetChip(city.name),
      cityCountry: city.country,
      mission,
      prompt,
      toast: this.toast,
      crimesCleared: cleared,
      crimesNeeded: city.boss.crimesToUnlock,
      bossReady: this.bossReady() && !beaten,
      bossBeaten: beaten,
      bossHp: this.inDungeon
        ? this.dungeon.hp
        : this.boss.active
          ? this.boss.hp
          : this.razor.active
            ? this.razor.hp
            : huntTarget
              ? huntTarget.hp
              : villain
                ? villain.hp
                : 0,
      bossMaxHp: this.inDungeon
        ? this.dungeon.maxHp
        : this.boss.active
          ? this.boss.maxHp
          : this.razor.active
            ? this.razor.maxHp
            : huntTarget
              ? huntTarget.maxHp
              : villain
                ? villain.maxHp
                : 0,
      bossName: this.inDungeon
        ? `${this.dungeon.name} · ${this.dungeon.zombies.remaining} undead`
        : this.boss.active
          ? `${this.boss.name} — ${this.boss.title}`
          : this.razor.active
            ? "RAZORBACK"
            : huntTarget
              ? huntTarget.name
              : villain
                ? villain.name
                : "",
      combo: this.player.combo,
      level: prog.level,
      xpInto: prog.into,
      xpNeed: prog.need,
      skillPoints: this.save.skillPoints,
      questTitle: obj ? obj.title : quest ? `${quest.name}  ${this.save.questProgress}/${quest.goal}` : "",
      questDetail: obj?.blurb ?? quest?.blurb ?? "",
      districtName: this.save.cityId === "new-york" ? DISTRICT_COPY[this.hood.district].name : "",
      districtId: this.hood.district,
      squadLine: this.hood.squad.join(" · "),
      form: this.player.form,
      hulkKind: this.player.hulkKind,
      formLabel: this.player.formLabel,
      style: this.player.style,
      styleLabel: styleDef(this.player.style).short,
      styleIcon: styleDef(this.player.style).icon,
      stanceFlash: this.player.stanceCd > 0,
      mixReady: this.player.mixReady,
      heat: this.player.heat,
      jumpCharge: this.player.jumpChargeVis,
      clock: this.life.clockLabel(this.save.life),
      energy: this.save.life.energy,
      hunger: this.save.life.hunger,
      mood: this.save.life.mood,
      jobName: this.life.jobName(this.save),
      lockName: this.lockName,
      partyLine: this.beasts.partyLine(this.save),
      zombieLeft: this.inDungeon ? this.dungeon.zombies.remaining : 0,
      showMarkers: this.showMarkers,
      objectiveTitle: obj ? `${obj.type} · ${obj.title}` : "",
      dungeonName: city.dungeonName,
      rivalBanner: this.razor.riding
        ? `On your back — mash Enter (${this.razor.rideMash}/${RAZOR_VARS.rideMash})`
        : this.razor.stalking || (this.razor.active && this.razor.banner)
          ? this.razor.banner
          : "",
      rivalRide: this.razor.riding,
      powerName: this.player.isHulk ? this.powers.name : "",
      powerMeter: this.powers.meter,
      powerBlind: this.powers.blindT > 0,
      gadgetLine: this.powers.gadgetLine,
      calmCharge: this.input.formHold >= 0.2 ? Math.min(1, this.input.formHold / 2) : 0,
      danger: this.director.danger,
      fps: Math.round(this.guard.fps),
      frameMs: this.guard.emaMs,
      hitchMs: this.guard.hitchMs,
      weatherLine: this.weather
        ? `${this.weather.label} ${Math.round(this.weather.tempC)}°`
        : "",
      popLine: this.crowd && !this.inDungeon && !this.comics.active ? this.crowd.hudLine() : "",
      cameraHint: this.cam.modeName(),
      quietHud: this.hudQuietT > 3.2 && !this.inDungeon && !this.comics.active && this.inCombat <= 0 && this.player.rage < 12 && this.player.gamma < 20 && this.smash.hotT <= 0 && this.director.wanted < 5,
      hpUrgent: this.player.health < this.player.maxHealth * 0.92 || this.inCombat > 0 || this.player.raging,
      navTitle: atlas.navTitle,
      navDist: atlas.navDist,
      navBearing: atlas.navBearing,
      navAlong: atlas.navAlong,
      navVisible: Boolean(atlas.navTitle),
    };
    this.overlay.updateHud(snap);
    if (this.screen === "play") {
      drawMinimap(this.overlay.minimap, atlas);
    }
  }

  private persistMeters(): void {
    this.save.rage = this.player.rage;
    this.save.gamma = this.player.gamma;
    this.save.hulkKind = this.player.hulkKind;
    this.save.lastTitan = asTitan(this.player.lastTitan);
    this.save.activeForm = formSaveId(isBruceKind(this.player.hulkKind) ? this.player.lastTitan : this.player.hulkKind);
    writeSave(this.save);
  }

  private tickAnger(dt: number): void {
    const hour = this.save.life.hour;
    const night = hour < 6 || hour >= 20;
    if (this.gammaZone) {
      this.gammaZone.life -= dt;
      this.gammaZone.mesh.rotation.y += dt * 0.8;
      const mat = this.gammaZone.mesh.material as THREE.MeshBasicMaterial;
      mat.opacity = 0.12 + Math.sin(performance.now() * 0.004) * 0.04;
      if (this.gammaZone.life <= 0) {
        this.scene.remove(this.gammaZone.mesh);
        this.gammaZone = null;
      }
    }
    const inZone = Boolean(
      this.gammaZone && this.player.position.distanceTo(this.gammaZone.mesh.position) < METERS.zoneR,
    );
    const nearDevice = this.player.position.distanceTo(this.world.plaza) < 7 || this.player.position.distanceTo(this.world.dungeonDoor) < 6;
    this.player.tickMeters(dt, night, inZone, nearDevice && this.player.isHulk);
    if (this.player.wantedPulse) {
      this.player.wantedPulse = false;
      this.director.wanted = Math.min(100, this.director.wanted + 18);
      this.pushToast("Wanted heat up. Locked Gamma.");
    }
    if (this.player.meltdownBurst) {
      this.player.meltdownBurst = false;
      const o = this.player.position.clone();
      this.world.smashEnvironment(o, 16, "super", this.player.mods.demo);
      this.crimes.applySmash(o, 16, 80, this.audio, this.player.facing, true);
      this.fx.burst(o, 0x88ff44, 22);
      this.cam.bump(1.4);
      this.spawnGammaZone();
      this.pushToast(this.player.raging ? "Meltdown. Rage mode. Gamma Zone." : "Meltdown burst.");
      this.audio.rage();
    }
    if (
      (this.player.band === "locked" || this.player.band === "overcharged") &&
      this.player.splashT <= 0 &&
      this.player.isHulk
    ) {
      this.player.splashT = METERS.splashEvery;
      const o = this.player.position.clone();
      this.crimes.applySmash(o, METERS.splashR, METERS.splashDmg, this.audio, this.player.facing, false);
      this.fx.burst(o, 0x66cc55, 3);
    }
    this.audio.gammaHum(this.player.isHulk ? this.player.gamma / 100 : 0);
    this.meterSaveT += dt;
    if (this.meterSaveT > 8) {
      this.meterSaveT = 0;
      this.save.rage = this.player.rage;
      this.save.gamma = this.player.gamma;
      writeSave(this.save);
    }
  }

  private spawnGammaZone(): void {
    if (this.gammaZone) this.scene.remove(this.gammaZone.mesh);
    const mesh = new THREE.Mesh(
      new THREE.RingGeometry(4, METERS.zoneR, 32),
      new THREE.MeshBasicMaterial({ color: 0x66ff55, transparent: true, opacity: 0.16, side: THREE.DoubleSide }),
    );
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.copy(this.player.position);
    mesh.position.y = 0.08;
    this.scene.add(mesh);
    this.gammaZone = { mesh, life: METERS.zoneLife };
  }

  private wakeFromKo(): void {
    const wanted = this.director.wanted > 35 || (this.save.crimesCleared[this.save.cityId] ?? 0) > 4;
    this.player.wakeBroken();
    this.player.dropHeld();
    const bed = this.world.sites.find((s) => s.kind === "apartment")?.pos ?? this.world.playerSpawn;
    this.player.position.copy(wanted ? this.world.plaza : bed);
    this.player.position.y = 0;
    this.player.velocity.set(0, 0, 0);
    this.save.life.hour = wanted ? 7.2 : 9.4;
    this.save.life.day += 1;
    this.save.life.energy = wanted ? 40 : 86;
    this.save.life.mood = wanted ? 28 : 54;
    this.save.cash = Math.floor(this.save.cash * (wanted ? 0.55 : 0.85));
    this.save.hulkKind = "bruce";
    this.persistMeters();
    this.pushToast(wanted ? "Cell. Dawn. Bruce. Rage 0 · Gamma 0." : "Hospital. You wake as Bruce. Meters empty.");
    if (this.boss.active) {
      this.boss.active = false;
      this.boss.mesh.visible = false;
    }
    if (this.inDungeon) this.exitDungeon(false);
  }

  private dirAlong(to: THREE.Vector3): string {
    const g = this.world.graph;
    if (g) return followStreet(g, this.player.position.x, this.player.position.z, to.x, to.z);
    return bearing(this.player.position, to);
  }

  private streetChip(cityName: string): string {
    const g = this.world.graph;
    if (!g) return cityName;
    const n = g.nearest(this.player.position.x, this.player.position.z);
    if (!n.name || n.dist > 28) return cityName;
    return `${cityName} · ${n.name}`;
  }

  private trackPin(pin: MapPin): void {
    this.navPin = pin;
    this.pathCache = null;
    this.pinCache = null;
    if (pin.objectiveId && pinObjective(this.save, pin.objectiveId)) writeSave(this.save);
    this.pushToast(`Tracking: ${pin.title}`);
    if (this.save) this.overlay.renderTravel(this.save, this.save.cityId);
    if (this.screen === "map" && this.cityReady) {
      this.overlay.syncPlayer({ x: this.player.position.x, z: this.player.position.z });
      this.overlay.drawLiveMap(this.mapSnapshot());
    }
  }

  private navTarget(): MapPin | null {
    if (this.razor.active) {
      return {
        id: "rival-razor",
        kind: "rival",
        filter: "story",
        x: this.razor.pos.x,
        z: this.razor.pos.z,
        title: "RAZORBACK",
        blurb: "He has your scent.",
        typeLabel: "Rival",
        trackable: true,
      };
    }
    if (this.navPin) {
      if (this.navPin.kind === "crime") {
        const live = this.crimes.events.find((e) => !e.cleared && `crime-${e.id}` === this.navPin!.id);
        if (live) {
          this.navPin = { ...this.navPin, x: live.position.x, z: live.position.z };
        }
      }
      return this.navPin;
    }
    const obj = this.save.activeObjectiveId ? objectiveById(this.save.activeObjectiveId) : undefined;
    if (!obj) return null;
    const anchor = this.objectiveAnchor(obj);
    if (!anchor) return null;
    return {
      id: `obj-${obj.id}`,
      kind: obj.type === "crime" ? "crime" : obj.type === "boss" ? "dungeon" : "story",
      filter: obj.type === "crime" ? "crime" : obj.type === "boss" ? "dungeon" : "story",
      x: anchor.x,
      z: anchor.z,
      title: obj.title,
      blurb: obj.blurb,
      typeLabel: obj.type,
      trackable: true,
      objectiveId: obj.id,
      travelCityId: obj.cityId && obj.cityId !== this.save.cityId ? obj.cityId : undefined,
    };
  }

  private objectiveAnchor(obj: { id: string; cityId: string | null; when: { kind: string; city?: string } }): { x: number; z: number } | null {
    if (obj.cityId && obj.cityId !== this.save.cityId && obj.when.kind !== "arrive") return null;
    const w = obj.when.kind;
    if (w === "arrive" && obj.when.city && obj.when.city !== this.save.cityId) return null;
    if (w === "dungeon" || w === "plaza") return { x: this.world.dungeonDoor.x, z: this.world.dungeonDoor.z };
    if (w === "heroes") return { x: HERO_GATE_X + 8, z: 0 };
    if (w === "warrens") return { x: VILLAIN_GATE_X - 8, z: 0 };
    if (w === "recognized") {
      const diner = this.world.sites.find((s) => s.kind === "diner");
      return diner ? { x: diner.pos.x, z: diner.pos.z } : { x: this.world.plaza.x, z: this.world.plaza.z };
    }
    if (w === "crime") {
      const c = this.crimes.events.find((e) => !e.cleared);
      return c ? { x: c.position.x, z: c.position.z } : { x: this.world.plaza.x, z: this.world.plaza.z };
    }
    if (w === "hunt") {
      const q = this.quests.markers[0];
      return q ? { x: q.x, z: q.z } : { x: this.world.plaza.x, z: this.world.plaza.z };
    }
    return { x: this.world.playerSpawn.x, z: this.world.playerSpawn.z };
  }

  private collectPins(): MapPin[] {
    // Crime Wave pins appended near end — see marker CRIME_WAVE_PINS
    const now = performance.now();
    if (this.pinCache && now - this.pinCache.t < 220) return this.pinCache.pins;
    const pins: MapPin[] = [];
    pins.push({
      id: "dungeon-door",
      kind: "dungeon",
      filter: "dungeon",
      x: this.world.dungeonDoor.x,
      z: this.world.dungeonDoor.z,
      title: getCity(this.save.cityId).dungeonName,
      blurb: "Capital gate. H when street jobs are done.",
      typeLabel: "Dungeon",
      trackable: true,
      objectiveId: OBJECTIVES.find((o) => o.when.kind === "dungeon" && o.cityId === this.save.cityId)?.id,
    });
    pins.push({
      id: "plaza",
      kind: "landmark",
      filter: "story",
      x: this.world.plaza.x,
      z: this.world.plaza.z,
      title: "Plaza",
      blurb: "Civic pad. Story beats and the dungeon door sit here.",
      typeLabel: "Landmark",
      trackable: true,
      objectiveId: OBJECTIVES.find((o) => o.when.kind === "plaza" && (o.cityId === this.save.cityId || o.cityId === null))?.id,
    });
    for (const site of this.world.sites) {
      pins.push({
        id: `site-${site.id}`,
        kind: "job",
        filter: "job",
        x: site.pos.x,
        z: site.pos.z,
        title: site.label,
        blurb: site.kind === "job" ? "Civilian shift. H as Banner to clock in." : site.kind === "diner" ? "Eat. Locals may know the face." : "Sleep it off.",
        typeLabel: site.kind === "job" ? "Job" : site.kind === "diner" ? "Diner" : "Walk-up",
        trackable: true,
      });
    }
    for (const ev of this.crimes.events) {
      if (ev.cleared) continue;
      pins.push({
        id: `crime-${ev.id}`,
        kind: "crime",
        filter: "crime",
        x: ev.position.x,
        z: ev.position.z,
        title: ev.title,
        blurb: "Street job. Smash the crew.",
        typeLabel: "Crime",
        trackable: true,
      });
    }
    for (const lm of this.world.graph?.landmarks ?? []) {
      if (lm.kind === "dungeon") continue;
      pins.push({
        id: `lm-${lm.id}`,
        kind: "landmark",
        filter: "story",
        x: lm.x,
        z: lm.z,
        title: lm.name,
        blurb: "Named OSM anchor.",
        typeLabel: lm.kind,
        trackable: true,
      });
    }
    this.beasts.wilds.forEach((w, i) => {
      if (w.hp <= 0) return;
      pins.push({
        id: `beast-${w.species.id}-${i}`,
        kind: "collectible",
        filter: "collectible",
        x: w.pos.x,
        z: w.pos.z,
        title: w.species.name,
        blurb: "Soften, then H to catch. Banner has the better chance.",
        typeLabel: "Bestiary",
        trackable: true,
      });
    });
    this.quests.markers.forEach((pos, i) => {
      pins.push({
        id: `quest-${i}`,
        kind: "story",
        filter: "story",
        x: pos.x,
        z: pos.z,
        title: this.quests.living[i]?.name ?? "Quest",
        blurb: "Board job marker.",
        typeLabel: "Quest",
        trackable: true,
      });
    });
    for (const m of this.hood.markers) {
      pins.push({
        id: `hood-${m.kind}-${m.x}`,
        kind: m.kind === "gate" ? "gate" : m.kind === "villain" ? "rival" : "story",
        filter: m.kind === "villain" ? "story" : "story",
        x: m.x,
        z: m.z,
        title: m.kind === "gate" ? "District gate" : m.kind === "hero" ? "Skyline Heroes" : "Iron Warrens",
        blurb: m.kind === "hero" ? "Press H to team up." : m.kind === "villain" ? "Hostile ground." : "East heroes, west warrens.",
        typeLabel: m.kind,
        trackable: true,
      });
    }
    if (this.razor.active) {
      pins.push({
        id: "rival-razor",
        kind: "rival",
        filter: "story",
        x: this.razor.pos.x,
        z: this.razor.pos.z,
        title: "RAZORBACK",
        blurb: "Stalking. Do not let him ride.",
        typeLabel: "Rival",
        trackable: true,
      });
    }
    for (const c of this.comics.pins(this.save.cityId, this.save)) {
      pins.push({
        id: c.id,
        kind: "comic",
        filter: "comic",
        x: c.x,
        z: c.z,
        title: c.title,
        blurb: c.blurb,
        typeLabel: "Comic",
        trackable: true,
      });
    }
    for (const obj of OBJECTIVES) {
      if (obj.cityId && obj.cityId !== this.save.cityId && obj.cityId !== this.save.cityId) continue;
      if (this.save.completedObjectives.includes(obj.id)) continue;
      if (obj.cityId && obj.cityId !== this.save.cityId) {
        pins.push({
          id: `obj-${obj.id}`,
          kind: "story",
          filter: "story",
          x: this.world.plaza.x,
          z: this.world.plaza.z,
          title: obj.title,
          blurb: obj.blurb,
          typeLabel: obj.type,
          trackable: true,
          objectiveId: obj.id,
          travelCityId: obj.cityId,
        });
        continue;
      }
      if (obj.cityId === this.save.cityId || obj.cityId === null) {
        const a = this.objectiveAnchor(obj);
        if (!a) continue;
        if (pins.some((p) => p.objectiveId === obj.id)) continue;
        pins.push({
          id: `obj-${obj.id}`,
          kind: obj.type === "crime" ? "crime" : obj.type === "boss" ? "dungeon" : "story",
          filter: obj.type === "crime" ? "crime" : obj.type === "boss" ? "dungeon" : "story",
          x: a.x,
          z: a.z,
          title: obj.title,
          blurb: obj.blurb,
          typeLabel: obj.type,
          trackable: true,
          objectiveId: obj.id,
        });
      }
    }
    pins.push(...(this.crimeWave.collectPins(this.save, { x: this.world.playerSpawn.x, z: this.world.playerSpawn.z }) as unknown as MapPin[])); // CRIME_WAVE_PINS_APPLIED
    this.pinCache = { t: now, pins };
    return pins;
  }

  private mapSnapshot(): MapSnapshot {
    const pins = this.collectPins();
    const target = this.navTarget();
    let route: { x: number; z: number }[] = [];
    if (target && this.showMarkers) {
      const key = `${Math.round(this.player.position.x / 14)},${Math.round(this.player.position.z / 14)},${target.id}`;
      if (this.pathCache?.key === key) route = this.pathCache.pts;
      else {
        route = routeTo(
          this.world.graph,
          { x: this.player.position.x, z: this.player.position.z },
          { x: target.x, z: target.z },
        );
        this.pathCache = { key, pts: route };
      }
    }
    const dx = (target?.x ?? 0) - this.player.position.x;
    const dz = (target?.z ?? 0) - this.player.position.z;
    const crow = target ? Math.hypot(dx, dz) : 0;
    const along = target
      ? this.world.graph
        ? followStreet(this.world.graph, this.player.position.x, this.player.position.z, target.x, target.z)
        : compassLabel(dx, dz)
      : "";
    return {
      segs: this.world.graph?.segs ?? null,
      extent: this.world.extent,
      pins,
      route,
      player: { x: this.player.position.x, z: this.player.position.z, yaw: this.player.yaw },
      showMarkers: this.showMarkers,
      trackedId: target?.id ?? null,
      navTitle: target?.title ?? "",
      navDist: route.length > 1 ? Math.max(crow, pathLength(route)) : crow,
      navBearing: target ? Math.atan2(dx, -dz) : 0,
      navAlong: along,
      cityNight: this.world.theme.night,
    };
  }
}

function nearestLiving(list: QuestMonster[], from: THREE.Vector3): QuestMonster | null {
  let best: QuestMonster | null = null;
  let bestD = Infinity;
  for (const m of list) {
    const d = m.mesh.position.distanceToSquared(from);
    if (d < bestD) {
      bestD = d;
      best = m;
    }
  }
  return best;
}

function bearing(from: THREE.Vector3, to: THREE.Vector3): string {
  const dx = to.x - from.x;
  const dz = to.z - from.z;
  const dist = Math.hypot(dx, dz);
  const ang = Math.atan2(dx, -dz);
  const dirs = ["north", "northeast", "east", "southeast", "south", "southwest", "west", "northwest"];
  const i = (((Math.round(ang / (Math.PI / 4)) % 8) + 8) % 8);
  return `${Math.max(1, Math.round(dist))}m ${dirs[i]}`;
}

export const CITY_COUNT = CITIES.length;
