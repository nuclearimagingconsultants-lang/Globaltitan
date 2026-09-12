import { CRIME_WAVE_CONTACTS, crimeWaveStatus } from "../data/crimeWave";
﻿import { BALANCE_PROFILES, balanceBlurb, type BalanceProfile } from "../data/balance";
import { CITIES, EXTRA_CITIES, TRAVEL_CITIES, getCity, isExtraCity } from "../data/cities";
import { OBJECTIVES, objectiveStatus } from "../data/objectives";
import { ACTS, CODEX, INTRO_PAGES, actDef, codexUnlocked } from "../data/story";
import { searchComics } from "../data/comics";
import { QUESTS, questById, questStatus } from "../data/quests";
import {
  SKILL_NODES,
  SKILL_TREES,
  canBuy,
  canUnlockRoute,
  progressFromXp,
  rankOf,
  reachableLocked,
  routeCost,
} from "../data/skills";
import { debugBossChain, remapBossName } from "../data/capitalBosses";
import { HULK_FORMS } from "../data/hulkForms";
import { BORROWED } from "../data/powers";
import { rosterForCity, stageName, speciesById, moveName } from "../data/bestiary";
import { DEFAULT_BINDS } from "../input/Input";
import { FEEL, FEEL_IDS, feelOf, type FeelId } from "../input/ControlFeel";
import { QUALITY, QUALITY_IDS, type QualityId } from "../systems/Quality";
import { formLockLine, formUnlocked, type SmashReport } from "../data/smashEconomy";
import type { CityDef, GameScreen, HulkKind, HudSnapshot, SaveData } from "../data/types";
import { drawStreetPreview, loadStreetPack, type StreetGraph } from "../world/streetPack";
import {
  currentBasemapType,
  googleMapsUsable,
  mapsFootnote,
  onBasemapAuthFailure,
  setBasemapTrackHandler,
  setBasemapType,
  showCityBasemap,
  syncBasemapPins,
  syncBasemapView,
  updatePlayerBasemap,
  type BasemapType,
} from "./googleBasemap";
import {
  MAP_FILTERS,
  MAP_LEGEND,
  PIN_STYLE,
  drawCityMap,
  fitCityCam,
  googleZoomForPpm,
  hitTestPin,
  pinKindTitle,
  pinMatches,
  screenToWorld,
  worldToScreen,
  type MapCam,
  type MapFilter,
  type MapPin,
  type MapSnapshot,
} from "../systems/MapAtlas";

type RosterEntry = {
  id: string;
  name: string;
  tag: string;
  blurb: string;
  tone: string;
};

export type StreetAction = "hub" | "smack" | "jump";

const ROSTER: RosterEntry[] = [
  {
    id: "hulk",
    name: "Hub",
    tag: "NY streets",
    tone: "lime",
    blurb:
      "DROP IN loads New York â€” Google Maps Midtown under World Breaker. Hub keeps you on that play path, not a grey placeholder pad.",
  },
  {
    id: "smash",
    name: "Smack",
    tag: "Enter",
    tone: "lime",
    blurb: "Smack is a real smash on the NY overlay. Tap Enter for a 4-hit combo. Hold Enter for a haymaker.",
  },
  {
    id: "super",
    name: "Jump&Pound",
    tag: "Space",
    tone: "gold",
    blurb: "Jump&Pound is a real leap on the NY overlay. Tap hop. Hold, release to super-leap. In air, Space pounds.",
  },
  {
    id: "ground",
    name: "Look",
    tag: "WASD camera",
    tone: "orange",
    blurb: "WASD is camera only â€” W look up, S look down, A look left, D look right. Arrows move. S is never reverse. Q/E zoom.",
  },
  {
    id: "clap",
    name: "Forms",
    tag: "0 cycle",
    tone: "cyan",
    blurb: "World Breaker first. Joe Fixit, Red, Immortal, Maestro, then Feral / Hell / Cosmic. Tap 0 to cycle. Hold 0.45s for the radial. Hold 2s Calm Down in the Bruce window. Banner stays separate â€” R.",
  },
];

const TONES = ["lime", "gold", "rose", "cyan", "violet", "orange"] as const;

function toneOf(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return TONES[Math.abs(h) % TONES.length]!;
}

export class Overlay {
  readonly root: HTMLElement;
  readonly minimap: HTMLCanvasElement;
  readonly worldMap: HTMLCanvasElement;
  readonly streetPreview: HTMLCanvasElement;
  readonly cityBasemap: HTMLElement;
  readonly cityMap: HTMLCanvasElement;
  onNewGame: (() => void) | null = null;
  onContinue: (() => void) | null = null;
  onSaveNow: (() => void) | null = null;
  onOpenStreetRoster: (() => void) | null = null;
  onResume: (() => void) | null = null;
  onOpenMap: (() => void) | null = null;
  onOpenHelp: (() => void) | null = null;
  onOpenSettings: (() => void) | null = null;
  onBackToTitle: (() => void) | null = null;
  onDropIn: (() => void) | null = null;
  onTravel: ((id: string) => void) | null = null;
  onUnlockRoute: ((id: string) => void) | null = null;
  onPinObjective: ((id: string) => void) | null = null;
  onOpenSkills: (() => void) | null = null;
  onBuySkill: ((id: string) => void) | null = null;
  onOpenQuests: (() => void) | null = null;
  onAcceptQuest: ((id: string) => void) | null = null;
  onAbandonQuest: (() => void) | null = null;
  onSensitivity: ((v: number) => void) | null = null;
  onMute: ((v: boolean) => void) | null = null;
  onOpenBestiary: (() => void) | null = null;
  onOpenCodex: (() => void) | null = null;
  onIntroNext: (() => void) | null = null;
  onParty: ((uid: string) => void) | null = null;
  onRebind: ((action: string, label: string) => void) | null = null;
  onQuitJob: (() => void) | null = null;
  onQuality: ((id: QualityId) => void) | null = null;
  onBalance: ((id: BalanceProfile) => void) | null = null;
  onFeel: ((id: FeelId) => void) | null = null;
  onGamepad: ((v: boolean) => void) | null = null;
  onPhonePower: ((id: string) => void) | null = null;
  onTrackPin: ((pin: MapPin) => void) | null = null;
  onCloseMap: (() => void) | null = null;
  onToggleLegend: (() => void) | null = null;
  onStoryEnter: (() => void) | null = null;
  onStoryStay: (() => void) | null = null;
  onFormPick: ((kind: string) => void) | null = null;
  onSmashDismiss: (() => void) | null = null;
  onBossFate: ((fate: "kill" | "spare") => void) | null = null;
  onOpenBossRoster: (() => void) | null = null;
  onDebugBoss: ((cityId: string, fight: boolean) => void) | null = null;
  onStreetAction: ((action: StreetAction) => void) | null = null;

  private selectedId = "new-york";
  private save: SaveData | null = null;
  private hpBar: HTMLElement | null = null;
  private rageBar: HTMLElement | null = null;
  private rageWrap: HTMLElement | null = null;
  private gammaBar: HTMLElement | null = null;
  private gammaWrap: HTMLElement | null = null;
  private promptEl: HTMLElement | null = null;
  private toastEl: HTMLElement | null = null;
  private bossWrap: HTMLElement | null = null;
  private bossBar: HTMLElement | null = null;
  private comboEl: HTMLElement | null = null;
  private xpBar: HTMLElement | null = null;
  private rivalBannerEl: HTMLElement | null = null;
  private lastHud = "";
  private cityQuery = "";
  private introPage = 0;
  private liveGraph: StreetGraph | null = null;
  private liveCity: CityDef | null = null;
  private livePlayer: { x: number; z: number } | null = null;
  private mapPaint = 0;
  private mapCam: MapCam | null = null;
  private mapFilter: MapFilter = "all";
  private selectedPin: MapPin | null = null;
  private hoverPin: MapPin | null = null;
  private lastSnap: MapSnapshot | null = null;
  private dragging = false;
  private dragMoved = false;
  private dragX = 0;
  private dragY = 0;
  private fitted = false;
  private goListKey = "";
  private legendOpen = false;
  private mapRaf = 0;
  private shownDamage = -1;

  constructor(host: HTMLElement) {
    host.innerHTML = this.html();
    this.root = host;
    this.minimap = host.querySelector("#minimap")!;
    this.worldMap = host.querySelector("#world-map")!;
    this.streetPreview = host.querySelector("#street-preview")!;
    this.cityBasemap = host.querySelector("#city-basemap")!;
    this.cityMap = host.querySelector("#city-map")!;
    this.hpBar = host.querySelector(".hp span");
    this.rageBar = host.querySelector(".rage span");
    this.rageWrap = host.querySelector(".rage");
    this.gammaBar = host.querySelector(".gamma span");
    this.gammaWrap = host.querySelector(".gamma");
    this.promptEl = host.querySelector("#prompt");
    this.toastEl = host.querySelector("#toast");
    this.bossWrap = host.querySelector("#boss-wrap");
    this.bossBar = host.querySelector("#boss-wrap .bar span");
    this.comboEl = host.querySelector("#combo");
    this.xpBar = host.querySelector(".xp span");
    this.rivalBannerEl = host.querySelector("#rival-banner");
    this.bind();
    this.selectRoster("hulk");
    this.setStreetAction("hub");
    this.fillLegend();
    this.paintGoogleChrome();
    setBasemapTrackHandler((pin) => this.trackPinNow(pin));
    onBasemapAuthFailure(() => this.dropGoogleTiles());
  }

  setScreen(screen: GameScreen, hasSave: boolean): void {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    for (const el of this.root.querySelectorAll<HTMLElement>("[data-screen]")) {
      const show = el.dataset.screen === screen && screen !== "play";
      el.classList.toggle("show", show);
      el.style.pointerEvents = show ? "auto" : "";
    }
    this.root.querySelector(".hud")?.classList.toggle("hud-hidden", screen !== "play");
    this.root.querySelector("#street-rail")?.classList.toggle("rail-hidden", screen !== "play" && screen !== "title");
    if (screen !== "play") this.hideSmashReport();
    const cont = this.root.querySelector<HTMLButtonElement>("#btn-continue");
    if (cont) cont.disabled = !hasSave;
    if (screen === "intro") this.renderIntro();
    if (screen === "codex" && this.save) this.renderCodex(this.save);
    if (screen === "boss-roster") this.renderBossRoster();
    if (screen === "map") this.fitted = false;
    if (screen !== "play") this.hideStoryGate();
    if (screen !== "play") this.setPhone(false);
  }

  showStoryGate(title: string, blurb: string, era = "Comic story"): void {
    const gate = this.root.querySelector("#story-gate") as HTMLElement | null;
    if (!gate) return;
    this.setText("#story-title", title);
    this.setText("#story-blurb", blurb);
    this.setText("#story-era", era);
    gate.hidden = false;
  }

  hideStoryGate(): void {
    const gate = this.root.querySelector("#story-gate") as HTMLElement | null;
    if (gate) gate.hidden = true;
  }

  smashOpen(): boolean {
    const el = this.root.querySelector("#smash-report");
    return el instanceof HTMLElement && !el.hidden;
  }

  showSmashReport(report: SmashReport): void {
    const box = this.root.querySelector("#smash-report") as HTMLElement | null;
    if (!box) return;
    this.setText("#sr-title", report.title);
    this.setText("#sr-medal", report.medal.toUpperCase());
    const medal = this.root.querySelector("#sr-medal");
    if (medal instanceof HTMLElement) medal.dataset.medal = report.medal;
    const stats = this.root.querySelector("#sr-stats");
    if (stats) {
      const rows = [
        ["DAMAGE$", `$${report.damage.toLocaleString()}`],
        ["Vehicles", String(report.vehicles)],
        ["Buildings / craters", String(report.buildings)],
        ["Hero civilians", String(report.heroCivilians)],
        ["Menace civilians", String(report.menaceCivilians)],
        ["Time", `${Math.max(1, Math.round(report.timeSec))}s`],
        ["Style switches", String(report.styleSwitches)],
      ];
      stats.innerHTML = rows.map(([k, v]) => `<li><span>${k}</span><b>${v}</b></li>`).join("");
    }
    box.hidden = false;
  }

  hideSmashReport(): void {
    const box = this.root.querySelector("#smash-report") as HTMLElement | null;
    if (box) box.hidden = true;
  }

  resetIntro(): void {
    this.introPage = 0;
    this.renderIntro();
  }

  advanceIntro(): boolean {
    if (this.introPage < INTRO_PAGES.length - 1) {
      this.introPage += 1;
      this.renderIntro();
      return false;
    }
    return true;
  }

  renderIntro(): void {
    const page = INTRO_PAGES[this.introPage] ?? INTRO_PAGES[0]!;
    this.setText("#intro-eyebrow", page.eyebrow);
    const title = this.root.querySelector("#intro-title");
    if (title) title.innerHTML = page.title;
    this.setText("#intro-lead", page.lead);
    this.setText("#intro-step", `${this.introPage + 1} / ${INTRO_PAGES.length}`);
    const next = this.root.querySelector<HTMLButtonElement>("#btn-intro-next");
    const drop = this.root.querySelector<HTMLButtonElement>("#btn-drop");
    const last = this.introPage >= INTRO_PAGES.length - 1;
    if (next) next.hidden = last;
    if (drop) drop.hidden = !last;
  }

  renderCodex(save: SaveData): void {
    this.save = save;
    const n = save.codexPages?.length ?? 0;
    const comics = save.comicsCleared?.length ?? 0;
    this.setText("#codex-count", `${n} act pages Â· ${comics} comic stories`);
    const box = this.root.querySelector("#codex-list");
    if (!box) return;
    const q = (this.root.querySelector("#comic-search") as HTMLInputElement | null)?.value ?? "";
    const acts = CODEX.map((page) => {
      const open = codexUnlocked(save, page.act);
      const act = actDef(page.act);
      return `<article class="codex-card ${open ? "open" : "locked"}">
        <p class="eyebrow">Act ${page.act} Â· ${act.region}</p>
        <h3>${open ? page.title : "Sealed page"}</h3>
        <p>${open ? page.body : `Clear ${page.unlockedBy} to open this page.`}</p>
      </article>`;
    }).join("");
    const hits = searchComics(q);
    const comicCards = hits
      .map((c) => {
        const open = save.comicsCleared.includes(c.id);
        const found = save.comicsFound.includes(c.id);
        return `<article class="codex-card ${open ? "open" : found ? "found" : "locked"}" data-comic="${c.id}">
          <p class="eyebrow">${c.era} Â· ${c.cityId.replace(/-/g, " ")}</p>
          <h3>${c.title}</h3>
          <p>${open ? c.codexBody : found ? "Issue found. Finish the instance to file the page." : `Unread. Look for the glowing issue in ${c.cityId.replace(/-/g, " ")}.`}</p>
        </article>`;
      })
      .join("");
    box.innerHTML = `${acts}<p class="eyebrow" style="margin-top:18px">Comic stories Â· search titles / eras / cities</p>${comicCards || "<p class='lock'>No arcs match.</p>"}`;
  }

  updateHud(h: HudSnapshot): void {
    const hp = Math.max(0, Math.min(1, h.health / h.maxHealth));
    const rage = Math.max(0, Math.min(1, h.rage / h.maxRage));
    const gamma = Math.max(0, Math.min(1, h.gamma / Math.max(1, h.maxGamma)));
    const xp = h.xpNeed ? Math.max(0, Math.min(1, h.xpInto / h.xpNeed)) : 0;
    if (this.hpBar) this.hpBar.style.width = `${(hp * 100).toFixed(1)}%`;
    if (this.rageBar) this.rageBar.style.width = `${(rage * 100).toFixed(1)}%`;
    if (this.gammaBar) this.gammaBar.style.width = `${(gamma * 100).toFixed(1)}%`;
    if (this.xpBar) this.xpBar.style.width = `${(xp * 100).toFixed(1)}%`;
    this.rageWrap?.classList.toggle("active", h.rageActive);
    this.gammaWrap?.classList.toggle("locked", h.gammaBand === "locked" || h.gammaBand === "overcharged");
    this.gammaWrap?.classList.toggle("over", h.gammaBand === "overcharged" || h.gammaBand === "meltdown");
    this.setText("#gamma-label", `Gamma ${Math.round(h.gamma)} Â· ${h.gammaLabel}`);
    this.setText("#rage-tier", `${Math.round(h.rage)} Â· ${h.rageTier}`);
    this.paintWanted(h.wantedStars, h.wantedTier);
    this.tickDamage(h.damageDisplay, h.wantedStars > 0 || Boolean(h.rampageLine));
    this.setText("#rep", `${h.rageRep} RAGE REP`);
    const ramp = this.root.querySelector("#rampage-chip");
    if (ramp instanceof HTMLElement) {
      ramp.hidden = !h.rampageLine;
      if (h.rampageLine) ramp.textContent = h.rampageLine;
    }
    const wallet = this.root.querySelector("#wallet");
    if (wallet instanceof HTMLElement) wallet.classList.toggle("hot", h.wantedStars > 0 || Boolean(h.rampageLine));
    const mark = this.root.querySelector("#stance-mark");
    if (mark instanceof HTMLElement) {
      mark.textContent = h.stanceMark;
      mark.style.display = h.stanceMark ? "block" : "none";
      mark.classList.toggle("menace", h.stanceMark === "MENACE");
      mark.classList.toggle("hero", h.stanceMark === "HERO");
    }
    const hitch = h.hitchMs > 32 ? ` Â· hitch ${Math.round(h.hitchMs)}ms` : "";
    this.setText("#fps-chip", `${h.fps} fps Â· ${h.frameMs.toFixed(0)}ms${hitch}`);
    const fpsEl = this.root.querySelector("#fps-chip");
    if (fpsEl instanceof HTMLElement) fpsEl.style.color = h.hitchMs > 80 || h.fps < 28 ? "#e88" : h.fps < 45 ? "#dc8" : "#8fd47a";
    this.root.querySelector("#calm-charge")?.classList.toggle("locked", h.calmLocked);
    const crimeHint = h.bossBeaten ? "District secured" : `${h.crimesCleared}/${h.crimesNeeded} crimes`;
    const key = `${h.cityName}|${h.mission}|${h.cash}|${h.rageRep}|${h.prompt}|${h.toast}|${h.bossName}|${h.combo}|${crimeHint}|${h.level}|${h.skillPoints}|${h.questTitle}|${h.formLabel}|${h.style}|${h.styleLabel}|${h.stanceFlash}|${h.mixReady}|${h.clock}|${h.jobName}|${h.lockName}|${h.partyLine}|${h.energy}|${h.hunger}|${h.mood}|${h.rivalBanner}|${h.rivalRide}|${h.powerName}|${h.gadgetLine}|${h.weatherLine}|${h.popLine}|${h.cameraHint}|${h.quietHud}|${h.hpUrgent}|${h.rageTier}|${h.wantedStars}|${h.wantedTier}|${h.stanceMark}|${h.missionBeat}|${h.rampageLine}`;
    const hud = this.root.querySelector(".hud");
    if (hud instanceof HTMLElement) {
      hud.classList.toggle("district-heroes", h.districtId === "heroes");
      hud.classList.toggle("district-villains", h.districtId === "villains");
      hud.classList.toggle("quiet", h.quietHud);
      hud.classList.toggle("hurt", h.hpUrgent);
    }
    this.root.classList.toggle("district-heroes", h.districtId === "heroes");
    this.root.classList.toggle("district-villains", h.districtId === "villains");
    if (key !== this.lastHud) {
      this.lastHud = key;
      this.setText("#city-name", h.cityName);
      this.setText("#city-country", h.districtName ? `${h.cityCountry} Â· ${h.districtName}` : h.cityCountry);
      this.setText("#pop-line", h.popLine);
      const popEl = this.root.querySelector("#pop-line");
      if (popEl instanceof HTMLElement) popEl.style.display = h.popLine ? "block" : "none";
      this.setText("#district-name", h.squadLine ? `Squad: ${h.squadLine}` : h.districtName);
      const districtEl = this.root.querySelector("#district-name");
      if (districtEl instanceof HTMLElement) districtEl.style.display = h.districtName ? "block" : "none";
      this.setText("#mission", h.missionBeat ? `${h.missionBeat} Â· ${h.mission}` : h.mission);
      this.setText("#crime-hint", crimeHint);
      this.setText("#tabs", h.form === "human" ? `tabs $${h.cash}` : "");
      this.setText("#lvl-label", `LV ${h.level}`);
      this.setText("#tp-label", `${h.skillPoints} TP`);
      const badge = this.root.querySelector("#skills-badge");
      if (badge) badge.classList.toggle("show", h.skillPoints > 0);
      this.setText("#quest-chip", h.questTitle || h.objectiveTitle);
      const chip = this.root.querySelector("#quest-chip");
      if (chip instanceof HTMLElement) chip.style.display = h.questTitle || h.objectiveTitle ? "block" : "none";
      this.setText("#clock-chip", h.weatherLine ? `${h.clock} Â· ${h.weatherLine}` : h.clock);
      this.setText("#form-chip", `${h.formLabel}${h.cameraHint ? ` Â· cam ${h.cameraHint}` : ""}`);
      this.root.querySelector("#form-chip")?.classList.toggle("is-hulk", h.form === "hulk");
      this.setText("#style-icon .style-letter", h.styleIcon);
      this.setText("#style-icon .style-name", h.mixReady ? `${h.styleLabel} MIX` : h.styleLabel);
      const styleEl = this.root.querySelector("#style-icon");
      if (styleEl instanceof HTMLElement) {
        styleEl.dataset.style = h.style;
        styleEl.classList.toggle("flash", h.stanceFlash);
        styleEl.classList.toggle("mix", h.mixReady);
      }
      this.setText("#hp-label", h.formLabel);
      const powerWrap = this.root.querySelector("#power-wrap");
      if (powerWrap instanceof HTMLElement) {
        powerWrap.style.display = h.powerName || h.gadgetLine ? "block" : "none";
        this.setText("#power-label", h.powerName || h.gadgetLine || "");
      }
      this.root.classList.toggle("blind", h.powerBlind);
      this.setText("#job-chip", h.jobName);
      this.setText("#lock-chip", h.lockName ? `LOCK ${h.lockName}` : "");
      this.setText("#party-chip", h.partyLine);
      const need = this.root.querySelector("#need-wrap");
      if (need instanceof HTMLElement) need.style.display = h.form === "human" ? "block" : "none";
      this.setBar(".energy span", h.energy / 100);
      this.setBar(".hunger span", h.hunger / 100);
      this.setBar(".mood span", h.mood / 100);
      this.setBar(".heat span", h.heat / 100);
      const heatWrap = this.root.querySelector("#heat-wrap");
      if (heatWrap instanceof HTMLElement) heatWrap.style.display = h.form === "hulk" && h.hulkKind === "red" ? "block" : "none";
      const jump = this.root.querySelector("#jump-charge");
      if (jump instanceof HTMLElement) {
        jump.style.display = h.jumpCharge > 0.15 ? "block" : "none";
        jump.style.width = `${Math.min(100, (h.jumpCharge / 3) * 100)}%`;
      }
      this.setText("#prompt", h.prompt);
      this.setText("#toast", h.toast);
      if (this.promptEl) this.promptEl.style.display = h.prompt ? "block" : "none";
      if (this.toastEl) this.toastEl.style.display = h.toast ? "block" : "none";
      if (this.bossWrap) {
        this.bossWrap.style.display = h.bossName && h.bossHp > 0 ? "block" : "none";
        this.setText("#boss-name", h.bossName);
      }
      if (this.comboEl) {
        this.comboEl.style.display = h.combo > 1 ? "block" : "none";
        this.comboEl.textContent = `${h.combo} HIT`;
      }
    }
    if (this.rivalBannerEl) {
      this.rivalBannerEl.style.display = h.rivalBanner ? "block" : "none";
      this.rivalBannerEl.textContent = h.rivalBanner;
      this.rivalBannerEl.classList.toggle("ride", h.rivalRide);
    }
    if (this.bossBar) {
      this.bossBar.style.width = `${(h.bossMaxHp ? h.bossHp / h.bossMaxHp : 0) * 100}%`;
    }
    this.setBar(".borrow span", h.powerName ? h.powerMeter / 100 : 0);
    this.setBar(".danger span", h.danger / 100);
    const calm = this.root.querySelector("#calm-charge");
    if (calm instanceof HTMLElement) {
      calm.style.display = h.calmCharge > 0.05 ? "block" : "none";
      calm.style.width = `${h.calmCharge * 100}%`;
    }
    const nav = this.root.querySelector("#nav-hud");
    if (nav instanceof HTMLElement) {
      nav.hidden = !h.navVisible;
      if (h.navVisible) {
        this.setText("#nav-title", h.navTitle);
        this.setText("#nav-dist", `${Math.max(1, Math.round(h.navDist))}m Â· ${h.navAlong}`);
        const arrow = this.root.querySelector("#nav-arrow");
        if (arrow instanceof HTMLElement) arrow.style.transform = `rotate(${h.navBearing}rad)`;
      }
    }
  }

  renderTravel(save: SaveData, selectedId: string): void {
    this.save = save;
    this.selectedId = selectedId;
    const unlocked = new Set(save.unlockedCities);
    const featured = this.root.querySelector("#featured-cities")!;
    featured.innerHTML = "";
    for (const city of CITIES.filter((c) => c.featured)) {
      const btn = document.createElement("button");
      btn.className = `hero-card tone-${toneOf(city.id)}`;
      if (city.id === selectedId) btn.classList.add("selected");
      if (!unlocked.has(city.id)) btn.classList.add("locked");
      const act = ACTS[city.actBand - 1]!;
      btn.innerHTML = `<span>${city.name}</span><small>${unlocked.has(city.id) ? `Act ${city.actBand} Â· ${act.name}` : "Locked"}</small>`;
      btn.addEventListener("click", () => this.renderTravel(save, city.id));
      featured.appendChild(btn);
    }
    const q = this.cityQuery.trim().toLowerCase();
    const list = this.root.querySelector("#city-list")!;
    list.innerHTML = "";
    for (const city of TRAVEL_CITIES) {
      const hay = `${city.name} ${city.landmarkName} ${city.districts.join(" ")} ${city.dungeonName} extra`.toLowerCase();
      if (q && !hay.includes(q)) continue;
      const extra = isExtraCity(city.id);
      const open = extra || unlocked.has(city.id);
      const btn = document.createElement("button");
      btn.className = extra ? "city-card extra" : "city-card";
      if (!open) btn.classList.add("locked");
      if (city.id === selectedId) btn.classList.add("selected");
      const n = extra ? "EX" : String(city.order).padStart(2, "0");
      const swatch = `#${city.palette.accent.toString(16).padStart(6, "0")}`;
      const lock = extra ? " Â· extra" : open ? "" : " Â· locked";
      btn.innerHTML = `<span class="city-swatch" style="background:${swatch}"></span><span>${n} Â· ${city.name}</span><small>${city.landmarkName} Â· ${city.districts[0]}${lock}</small>`;
      btn.addEventListener("click", () => this.renderTravel(save, city.id));
      list.appendChild(btn);
    }
    const selected = getCity(selectedId);
    this.fillDetail(selected, isExtraCity(selectedId) || unlocked.has(selectedId), save);
    this.drawWorld(save, selectedId);
    this.renderObjectives(save, selectedId);
    void this.paintCityMaps(selectedId);
  }

  noteWorld(city: CityDef, graph: StreetGraph | null, player: { x: number; z: number }): void {
    this.liveCity = city;
    this.liveGraph = graph;
    this.livePlayer = player;
    this.fitted = false;
    this.mapCam = null;
    this.goListKey = "";
    void this.paintCityMaps(city.id);
  }

  syncPlayer(player: { x: number; z: number }): void {
    this.livePlayer = player;
    if (this.liveGraph) updatePlayerBasemap(this.liveGraph, player.x, player.z);
  }

  private async paintCityMaps(cityId: string): Promise<void> {
    const token = ++this.mapPaint;
    const city = getCity(cityId);
    const graph = cityId === this.liveCity?.id ? this.liveGraph : await loadStreetPack(cityId);
    if (token !== this.mapPaint) return;
    const credit = this.root.querySelector("#map-credit");
    const googleOn = googleMapsUsable();
    const mapOpen = this.root.querySelector<HTMLElement>("[data-screen=\"map\"]")?.classList.contains("show") ?? false;
    this.paintGoogleChrome();
    if (googleOn && city && mapOpen) {
      this.cityBasemap.hidden = false;
      this.cityBasemap.closest(".city-map-stage")?.classList.add("google-live");
      const ok = await showCityBasemap(this.cityBasemap, city, graph ?? this.liveGraph, this.livePlayer);
      if (token !== this.mapPaint) return;
      const usable = googleMapsUsable() && ok;
      this.cityBasemap.hidden = !usable;
      this.cityBasemap.closest(".city-map-stage")?.classList.toggle("google-live", usable);
      this.worldMap.classList.toggle("inset", usable);
      this.paintGoogleChrome();
      if (credit) credit.textContent = mapsFootnote(true, usable);
      if (!usable && this.lastSnap) this.drawLiveMap(this.lastSnap);
    } else {
      this.cityBasemap.hidden = true;
      this.cityBasemap.closest(".city-map-stage")?.classList.remove("google-live");
      this.worldMap.classList.toggle("inset", false);
      if (credit) credit.textContent = mapsFootnote(mapOpen, false);
    }
    const canvas = this.streetPreview;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const w = Math.max(280, canvas.clientWidth || 320);
    const h = Math.max(140, canvas.clientHeight || 160);
    const dpr = Math.min(1, window.devicePixelRatio || 1);
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (graph) {
      drawStreetPreview(ctx, graph, w, h, cityId === this.liveCity?.id ? this.livePlayer : null);
    } else {
      ctx.fillStyle = "#14120f";
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = "#d7c4ae";
      ctx.font = "12px Outfit, sans-serif";
      ctx.fillText("No OSM pack yet â€” procedural grid in 3D.", 12, 28);
      ctx.fillStyle = "rgba(255,236,214,0.45)";
      ctx.font = "10px Outfit, sans-serif";
      ctx.fillText("npm run maps â€” Â© OpenStreetMap contributors", 12, h - 12);
    }
    this.paintFilters();
  }

  drawLiveMap(snap: MapSnapshot): void {
    this.lastSnap = snap;
    const canvas = this.cityMap;
    const stage = canvas.parentElement;
    const w = Math.max(280, stage?.clientWidth || 480);
    const h = Math.max(220, 340);
    const dpr = Math.min(1, window.devicePixelRatio || 1);
    if (canvas.width !== Math.floor(w * dpr) || canvas.height !== Math.floor(h * dpr)) {
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
    }
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (!this.mapCam || !this.fitted) {
      this.mapCam = fitCityCam(snap, w, h);
      this.fitted = true;
    }
    const googleOn = googleMapsUsable() && !this.cityBasemap.hidden;
    drawCityMap(ctx, snap, {
      w,
      h,
      cam: this.mapCam,
      transparent: googleOn,
      hoverId: this.hoverPin?.id ?? null,
      selectedId: this.selectedPin?.id ?? snap.trackedId,
      filter: this.mapFilter,
      showLegend: false,
      labels: true,
      basemap: googleOn,
    });
    if (googleOn && this.liveGraph) {
      const ll = this.liveGraph.unproject(this.mapCam.cx, this.mapCam.cz);
      syncBasemapView(ll.lat, ll.lon, googleZoomForPpm(this.mapCam.ppm, ll.lat));
      syncBasemapPins(this.liveGraph, snap.pins, this.mapFilter, snap.trackedId ?? this.selectedPin?.id ?? null);
      updatePlayerBasemap(this.liveGraph, snap.player.x, snap.player.z);
    }
    this.fillGoList(snap);
  }

  private scheduleMapDraw(): void {
    if (this.mapRaf) return;
    this.mapRaf = requestAnimationFrame(() => {
      this.mapRaf = 0;
      if (this.lastSnap) this.drawLiveMap(this.lastSnap);
    });
  }

  private localMap(ev: { clientX: number; clientY: number }): { x: number; y: number; w: number; h: number } {
    const r = this.cityMap.getBoundingClientRect();
    return { x: ev.clientX - r.left, y: ev.clientY - r.top, w: r.width, h: r.height };
  }

  private fillGoList(snap: MapSnapshot): void {
    const box = this.root.querySelector("#go-list");
    if (!box) return;
    const pins = snap.pins.filter((p) => p.trackable && pinMatches(p, this.mapFilter));
    const key = `${this.mapFilter}|${snap.trackedId ?? ""}|${this.selectedPin?.id ?? ""}|${pins.map((p) => p.id).join(",")}|${Math.round((this.livePlayer?.x ?? 0) / 10)}|${Math.round((this.livePlayer?.z ?? 0) / 10)}`;
    if (key === this.goListKey && box.childElementCount) return;
    this.goListKey = key;
    const rows = pins
      .slice(0, 32)
      .map((p) => {
        const dist = this.livePlayer ? Math.hypot(p.x - this.livePlayer.x, p.z - this.livePlayer.z) : 0;
        const on = snap.trackedId === p.id || this.selectedPin?.id === p.id;
        return `<button type="button" class="obj-row ${on ? "active" : ""}" data-go="${p.id}">
          <span class="obj-type">${p.typeLabel}</span>
          <b>${p.title}</b>
          <small>${Math.max(1, Math.round(dist))} m Â· click to go here</small>
        </button>`;
      })
      .join("");
    box.innerHTML = rows || "<p class='lock'>No landmarks on this filter.</p>";
  }

  private trackPinNow(pin: MapPin): void {
    this.selectPin(pin);
    this.setText("#pin-city", `${this.liveCity?.name ?? "This city"} Â· tracking â€” follow the HUD arrow`);
    this.onTrackPin?.(pin);
    if (this.lastSnap) this.fillGoList(this.lastSnap);
  }

  private selectPin(pin: MapPin | null): void {
    this.selectedPin = pin;
    const box = this.root.querySelector("#pin-detail");
    if (!(box instanceof HTMLElement)) return;
    box.hidden = !pin;
    if (!pin) return;
    this.setText("#pin-type", `${pinKindTitle(pin.kind)} Â· ${pin.typeLabel}`);
    this.setText("#pin-title", pin.title);
    this.setText("#pin-blurb", pin.blurb);
    this.setText("#pin-city", `${this.liveCity?.name ?? "This city"} Â· click to track â€” HUD arrow + distance`);
    const travel = this.root.querySelector<HTMLButtonElement>("#btn-pin-travel");
    if (travel) {
      const open = pin.travelCityId ? Boolean(this.save?.unlockedCities.includes(pin.travelCityId)) : false;
      travel.hidden = !pin.travelCityId;
      travel.disabled = !open;
      travel.textContent = open ? `Fast travel â€” ${pin.travelCityId}` : "Fast travel locked";
    }
    const track = this.root.querySelector<HTMLButtonElement>("#btn-track-pin");
    if (track) track.disabled = !pin.trackable;
  }

  private paintFilters(): void {
    this.root.querySelectorAll<HTMLElement>("#map-filters [data-filter]").forEach((el) => {
      el.classList.toggle("selected", el.dataset.filter === this.mapFilter);
    });
  }

  private dropGoogleTiles(): void {
    this.cityBasemap.hidden = true;
    this.cityBasemap.replaceChildren();
    this.cityBasemap.closest(".city-map-stage")?.classList.remove("google-live");
    this.worldMap.classList.toggle("inset", false);
    this.paintGoogleChrome();
    const credit = this.root.querySelector("#map-credit");
    if (credit) credit.textContent = mapsFootnote(true, false);
    if (this.lastSnap) this.drawLiveMap(this.lastSnap);
  }

  private paintGoogleChrome(): void {
    const show = googleMapsUsable() && !this.cityBasemap.hidden;
    this.root.querySelectorAll<HTMLElement>("[data-google-chrome]").forEach((el) => {
      el.hidden = !show;
    });
    const type = currentBasemapType();
    this.root.querySelectorAll<HTMLElement>("[data-map-type]").forEach((el) => {
      el.classList.toggle("selected", el.dataset.mapType === type);
      if (el instanceof HTMLButtonElement) el.disabled = !show;
    });
    this.root.querySelector(".minimap-wrap")?.classList.toggle("google-on", show);
  }

  private setMapTiles(type: BasemapType): void {
    setBasemapType(type);
    this.paintGoogleChrome();
  }

  private trackSelected(): void {
    if (this.selectedPin) this.trackPinNow(this.selectedPin);
  }

  applySettings(
    sensitivity: number,
    muted: boolean,
    quality: QualityId = "auto",
    extra?: {
      balanceProfile?: BalanceProfile;
      controlFeel?: FeelId;
      gamepad?: boolean;
      padConnected?: boolean;
    },
  ): void {
    const range = this.root.querySelector<HTMLInputElement>("#sens");
    const mute = this.root.querySelector<HTMLInputElement>("#mute");
    if (range) range.value = String(sensitivity);
    if (mute) mute.checked = muted;
    this.setText("#sens-val", sensitivity.toFixed(2));
    this.renderBinds(this.save?.settings.binds ?? DEFAULT_BINDS);
    this.root.querySelectorAll<HTMLElement>("[data-quality]").forEach((el) => {
      el.classList.toggle("selected", el.dataset.quality === quality);
    });
    const q = QUALITY[quality];
    this.setText("#quality-hint", q.blurb);
    const balance = extra?.balanceProfile ?? this.save?.settings.balanceProfile ?? "Legacy";
    this.root.querySelectorAll<HTMLElement>("[data-balance]").forEach((el) => {
      el.classList.toggle("selected", el.dataset.balance === balance);
    });
    this.setText("#balance-hint", balanceBlurb(balance));
    const feel = feelOf(extra?.controlFeel ?? this.save?.settings.controlFeel);
    this.root.querySelectorAll<HTMLElement>("[data-feel]").forEach((el) => {
      el.classList.toggle("selected", el.dataset.feel === feel.id);
    });
    this.setText("#feel-hint", feel.blurb);
    const pad = this.root.querySelector<HTMLInputElement>("#pad-on");
    if (pad) pad.checked = extra?.gamepad ?? this.save?.settings.gamepad ?? true;
    this.setPadStatus(extra?.padConnected ?? false, extra?.gamepad ?? this.save?.settings.gamepad ?? true);
  }

  setPadStatus(connected: boolean, enabled: boolean): void {
    const line = !enabled
      ? "Controller off. Keyboard_Only stays canonical â€” Arrows move, WASD look."
      : connected
        ? "Pad connected. Left stick move (arrows). Right stick look (WASD). Never WASD-classic move."
        : "No pad. Plug in optional â€” left stick move, right stick look.";
    this.setText("#pad-status", line);
  }

  setPhone(
    open: boolean,
    snap?: {
      formLabel: string;
      kind: string;
      powerName: string;
      banner: boolean;
      calmHold: number;
      ripHold: number;
    },
  ): void {
    const el = this.root.querySelector("#phone-hud");
    if (!(el instanceof HTMLElement)) return;
    el.hidden = !open;
    if (!open) return;
    if (snap) {
      this.setText("#phone-form", snap.formLabel);
      this.setText("#phone-power", snap.powerName || (snap.banner ? "Banner â€” borrowed powers sleep" : "No relic armed"));
      this.setText(
        "#phone-feel",
        `Shift tap grab Â· hold ${snap.ripHold.toFixed(1)}s rip Â· hold 0 ${snap.calmHold.toFixed(1)}s Calm`,
      );
    }
    el.querySelectorAll<HTMLElement>("[data-kind]").forEach((n) => {
      n.classList.toggle("selected", n.dataset.kind === snap?.kind);
    });
  }

  setLegendOpen(open: boolean): void {
    if (this.legendOpen === open) {
      const mapPanel = this.root.querySelector("#map-legend");
      if (mapPanel instanceof HTMLElement && mapPanel.hidden === !open) return;
    }
    this.legendOpen = open;
    const mapPanel = this.root.querySelector("#map-legend");
    const hudPanel = this.root.querySelector("#hud-legend");
    if (mapPanel instanceof HTMLElement) mapPanel.hidden = !open;
    if (hudPanel instanceof HTMLElement) hudPanel.hidden = !open;
    this.root.querySelectorAll<HTMLButtonElement>("[data-legend-toggle]").forEach((btn) => {
      btn.setAttribute("aria-pressed", open ? "true" : "false");
      btn.textContent = open ? "Hide legend" : "Legend";
    });
    this.root.querySelector(".minimap-wrap")?.classList.toggle("legend-on", open);
  }

  private fillLegend(): void {
    const rows = MAP_LEGEND.map(
      (row) => `<button type="button" class="legend-row" data-legend="${row.id}" ${row.filter ? `data-filter="${row.filter}"` : ""}>
        <span class="legend-swatch" style="--swatch:${row.swatch}">${row.mark}</span>
        <span class="legend-copy"><b>${row.title}</b><small>${row.meaning}</small></span>
      </button>`,
    ).join("");
    this.root.querySelectorAll("[data-legend-list]").forEach((el) => {
      el.innerHTML = rows;
    });
  }

  private showMapTip(pin: MapPin | null, player = false): void {
    const tip = this.root.querySelector("#map-tip");
    if (!(tip instanceof HTMLElement)) return;
    if (player) {
      tip.hidden = false;
      this.setText("#map-tip-type", "Player");
      this.setText("#map-tip-title", "You");
      this.setText("#map-tip-blurb", "Green arrow. Facing is yaw. Track a pin to draw a route from here.");
      return;
    }
    if (!pin) {
      tip.hidden = true;
      return;
    }
    tip.hidden = false;
    this.setText("#map-tip-type", `${pinKindTitle(pin.kind)} Â· ${pin.typeLabel}`);
    this.setText("#map-tip-title", pin.title);
    this.setText("#map-tip-blurb", pin.blurb);
  }

  renderBinds(binds: Record<string, string>): void {
    const box = this.root.querySelector("#bind-list");
    if (!box) return;
    const merged = { ...DEFAULT_BINDS, ...binds };
    box.innerHTML = Object.entries(merged)
      .map(
        ([action, key]) =>
          `<button type="button" class="bind-row" data-bind="${action}"><b>${action}</b><span>${key}</span></button>`,
      )
      .join("");
  }

  setRadial(open: boolean, index: number, gate: SaveData | number = 0): void {
    const el = this.root.querySelector("#form-radial");
    if (!(el instanceof HTMLElement)) return;
    el.style.display = open ? "flex" : "none";
    el.querySelectorAll<HTMLElement>("[data-kind]").forEach((n, i) => {
      const kind = (n.dataset.kind ?? "") as HulkKind;
      const locked = !formUnlocked(kind, gate);
      n.classList.toggle("selected", i === index && !locked);
      n.classList.toggle("locked", locked);
      const small = n.querySelector("small");
      if (small) {
        const need = formLockLine(kind, gate);
        small.textContent = need || (HULK_FORMS.find((f) => f.id === kind)?.name ?? "");
      }
    });
  }

  killSpareOpen(): boolean {
    const el = this.root.querySelector("#kill-spare");
    return el instanceof HTMLElement && !el.hidden;
  }

  showKillSpare(title: string, blurb: string, killed: number, spared: number): void {
    const box = this.root.querySelector("#kill-spare") as HTMLElement | null;
    if (!box) return;
    this.setText("#ks-title", title);
    this.setText("#ks-blurb", blurb);
    this.setText("#ks-counts", `Killed ${killed} Â· Spared ${spared}`);
    box.hidden = false;
  }

  hideKillSpare(): void {
    const box = this.root.querySelector("#kill-spare") as HTMLElement | null;
    if (box) box.hidden = true;
  }

  formSplashOpen(): boolean {
    const el = this.root.querySelector("#form-splash");
    return el instanceof HTMLElement && !el.hidden;
  }

  showFormSplash(title: string, blurb: string): void {
    const box = this.root.querySelector("#form-splash") as HTMLElement | null;
    if (!box) return;
    this.setText("#fs-title", title);
    this.setText("#fs-blurb", blurb);
    box.hidden = false;
  }

  hideFormSplash(): void {
    const box = this.root.querySelector("#form-splash") as HTMLElement | null;
    if (box) box.hidden = true;
  }

  setMapsBanner(msg: string | null): void {
    const el = this.root.querySelector("#maps-banner");
    if (!(el instanceof HTMLElement)) return;
    if (!msg) {
      el.hidden = true;
      el.textContent = "";
      return;
    }
    el.hidden = false;
    el.textContent = msg;
  }

  setStreetAction(id: StreetAction): void {
    this.root.querySelectorAll<HTMLElement>("[data-street]").forEach((el) => {
      el.classList.toggle("selected", el.dataset.street === id);
    });
  }

  renderBossRoster(): void {
    const box = this.root.querySelector("#boss-roster-list");
    if (!box) return;
    const rows = debugBossChain();
    box.innerHTML = rows
      .map((row) => {
        const rank = row.threatRank == null ? "NY stub" : `#${String(row.threatRank).padStart(2, "0")}`;
        const chain = row.debugSelect ? "debug-chain" : "";
        return `<article class="codex-card open ${chain}" data-boss-city="${row.cityId}">
          <p class="eyebrow">${rank} Â· ${row.cityName}</p>
          <h3>${remapBossName(row)}</h3>
          <p>${row.postBoss}${row.encounter.move !== "brawl" ? ` Â· ${row.encounter.move}` : ""} Â· HP ${row.encounter.hp}</p>
          <div class="actions">
            <button type="button" class="cta" data-boss-drop="${row.cityId}">Drop in</button>
            <button type="button" class="ghost" data-boss-fight="${row.cityId}">Fight</button>
          </div>
        </article>`;
      })
      .join("");
  }

  cycleCity(dir: number): void {
    if (!this.save) return;
    const i = TRAVEL_CITIES.findIndex((c) => c.id === this.selectedId);
    const next = TRAVEL_CITIES[(i + dir + TRAVEL_CITIES.length) % TRAVEL_CITIES.length]!;
    this.renderTravel(this.save, next.id);
  }

  confirmTravel(): void {
    this.onTravel?.(this.selectedId);
  }


  renderStreetRoster(rows: { name: string; kind: string; dist: number; hp?: string }[]): void {
    const box = this.root.querySelector("#street-roster-list");
    if (!box) return;
    if (!rows.length) {
      box.innerHTML = `<p class="lock">Nobody close enough — walk the block, then open this again.</p>`;
      return;
    }
    box.innerHTML = rows
      .map(
        (r) => `<div class="obj-row"><span class="obj-type">${r.kind}</span><b>${r.name}</b><small>${Math.round(r.dist)} m${r.hp ? " · " + r.hp : ""}</small></div>`,
      )
      .join("");
  }

  renderBestiary(save: SaveData, cityName: string): void {
    this.save = save;
    const city = getCity(save.cityId);
    const roster = rosterForCity(city.id, city.name);
    this.setText("#beast-count", `${save.bestiary.caught.length} caught Â· ${save.bestiary.seen.length} seen Â· ${roster.length} in ${city.name} (C-01â€“30 normal Â· 31â€“45 champ Â· 46â€“50 unique)`);
    const rosterBox = this.root.querySelector("#beast-roster");
    if (rosterBox) {
      rosterBox.innerHTML = roster
        .map((s) => {
          const caught = save.bestiary.caught.some((c) => c.speciesId === s.id);
          const seen = caught || save.bestiary.seen.includes(s.id);
          const label = seen ? s.name : "????";
          return `<div class="beast-card rank-${s.rank ?? "normal"} ${caught ? "in-party" : ""}">
            <b>${s.code ?? ""} Â· ${label}</b>
            <small>${s.rank ?? "normal"}${caught ? " Â· caught" : seen ? " Â· seen" : ""}</small>
          </div>`;
        })
        .join("");
    }
    const party = this.root.querySelector("#beast-party");
    const list = this.root.querySelector("#beast-list");
    if (party) {
      party.innerHTML =
        save.bestiary.party
          .map((uid) => {
            const b = save.bestiary.caught.find((c) => c.uid === uid);
            if (!b) return "";
            const s = speciesById(b.speciesId, city.id, cityName);
            return `<div class="beast-card in-party"><b>${s ? stageName(s, b.stage) : b.nickname}</b><small>${s?.code ?? ""} ${s?.rank ?? ""} Â· Lv ${b.level} Â· ${b.moves.map(moveName).join(" Â· ")}</small></div>`;
          })
          .join("") || "<p class='lock'>No party. Catch street originals, then tap them below.</p>";
    }
    if (list) {
      list.innerHTML = save.bestiary.caught
        .map((b) => {
          const s = speciesById(b.speciesId, city.id, cityName);
          const on = save.bestiary.party.includes(b.uid);
          return `<button type="button" class="beast-card ${on ? "in-party" : ""} rank-${s?.rank ?? "normal"}" data-beast="${b.uid}">
            <b>${s ? stageName(s, b.stage) : b.nickname}</b>
            <small>${s?.code ?? ""} Â· ${s?.rank ?? "normal"} Â· Lv ${b.level} Â· ${b.wins} wins Â· ${b.moves.map(moveName).join(" Â· ")}</small>
          </button>`;
        })
        .join("") || "<p class='lock'>No catches yet. Soften a street original and press H as Banner.</p>";
    }
  }

  private selectRoster(id: string): void {
    const entry = ROSTER.find((r) => r.id === id) ?? ROSTER[0]!;
    this.setText("#hero-blurb", entry.blurb);
    this.root.querySelectorAll<HTMLElement>("[data-hero]").forEach((el) => {
      el.classList.toggle("selected", el.dataset.hero === id);
    });
  }

  private fillDetail(city: CityDef, open: boolean, save: SaveData): void {
    const beaten = save.beatenBosses.includes(city.id);
    const cleared = save.crimesCleared[city.id] ?? 0;
    const reachable = reachableLocked(save);
    const cost = routeCost(save);
    const canBuyRoute = canUnlockRoute(save, city.id);
    this.setText("#detail-name", city.name);
    this.setText("#detail-country", city.country);
    const extra = isExtraCity(city.id);
    const act = actDef(city.actBand);
    this.setText(
      "#detail-blurb",
      extra
        ? `Extra downtown Â· not on the 1â†’50 chain. ${city.skyline}. Landmark: ${city.landmarkName}. Districts: ${city.districts.join(", ")}. Dungeon: ${city.dungeonName}. Bestiary: 50 street originals (${city.bestiaryPrefix}). ${city.storyLine}`
        : `${city.order}/50 Â· ${act.region}. ${city.skyline}. Landmark: ${city.landmarkName}. Districts: ${city.districts.join(", ")}. Dungeon: ${city.dungeonName}. Bestiary: 50 street originals (${city.bestiaryPrefix}). ${city.storyLine}`,
    );
    this.setText(
      "#detail-shell",
      `Bones: ${city.bones} Â· ${city.palette.night ? "Night" : "Day"} palette Â· Google Maps/Satellite/Street View/Terrain = reference only (no scraped tiles).`,
    );
    this.setText(
      "#detail-lock",
      extra
        ? "Sanctuary extra. Drop in anytime. Does not unlock the next largest-per-state city."
        : open
          ? beaten
            ? "Capital cleared. The next city is on the chain."
            : `Hub open. Clear ${city.boss.crimesToUnlock} street jobs, then H at the plaza door.`
          : reachable.has(city.id)
            ? "Preview only. Beat the previous capital dungeon to drop in."
            : "Locked. Largest-per-state cities play in order 1 â†’ 50.",
    );
    this.setText(
      "#detail-progress",
      extra
        ? "Selectable extra Â· Austin, Miami, DC, and the rest stay on this map"
        : open
          ? `Street jobs here: ${cleared} Â· ${city.act ? `Act ${city.act} boss Â· Codex page` : `Act ${city.actBand} dungeon`}`
          : `City ${city.order} of 50 Â· Act ${city.actBand} ${act.region}`,
    );
    const packHint = this.root.querySelector("#detail-progress");
    if (packHint && open) {
      packHint.textContent += city.id === "new-york" || city.id === "boston" || city.id === "philadelphia" || city.id === "washington-dc"
        ? " Â· OSM street pack loaded"
        : " Â· procedural grid until an OSM pack is cached";
    }
    const travel = this.root.querySelector<HTMLButtonElement>("#btn-travel")!;
    travel.disabled = !open;
    travel.textContent = city.id === save.cityId ? "Already here" : open ? `Drop in â€” ${city.name}` : "Locked";
    const unlock = this.root.querySelector<HTMLButtonElement>("#btn-unlock")!;
    unlock.hidden = true;
    void cost;
    void canBuyRoute;
  }

  private drawWorld(save: SaveData, selectedId: string): void {
    const c = this.worldMap;
    const ctx = c.getContext("2d")!;
    const dpr = Math.min(1, window.devicePixelRatio || 1);
    const w = c.clientWidth;
    const h = c.clientHeight;
    c.width = Math.floor(w * dpr);
    c.height = Math.floor(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, "#24160f");
    g.addColorStop(1, "#100c0a");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = "rgba(255, 196, 120, 0.07)";
    for (let x = 0; x < w; x += 32) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = 0; y < h; y += 32) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }
    const unlocked = new Set(save.unlockedCities);
    const next = reachableLocked(save);
    const project = (city: CityDef) => ({
      x: ((city.lon + 168) / 102) * w,
      y: ((72 - city.lat) / 54) * h,
    });
    ctx.strokeStyle = "rgba(255, 168, 90, 0.32)";
    ctx.lineWidth = 1;
    for (const city of CITIES) {
      if (!unlocked.has(city.id)) continue;
      const a = project(city);
      for (const id of city.unlocks) {
        const b = project(CITIES.find((x) => x.id === id)!);
        ctx.strokeStyle = unlocked.has(id) ? "rgba(255, 168, 90, 0.38)" : "rgba(231, 160, 90, 0.18)";
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }
    }
    for (const city of CITIES) {
      const p = project(city);
      const open = unlocked.has(city.id);
      const beaten = save.beatenBosses.includes(city.id);
      ctx.fillStyle =
        city.id === save.cityId ? "#7dff6a" : beaten ? "#f0c400" : open ? "#e7a05a" : next.has(city.id) ? "#c4844a" : "#3a342e";
      ctx.beginPath();
      ctx.arc(p.x, p.y, city.id === selectedId ? 6 : city.id === save.cityId ? 5 : open ? 3.4 : 2.4, 0, Math.PI * 2);
      ctx.fill();
      if (city.act) {
        ctx.strokeStyle = "#ff8a3d";
        ctx.lineWidth = 1.4;
        ctx.stroke();
      }
      if (city.id === selectedId || city.id === save.cityId) {
        ctx.fillStyle = "#f6efe6";
        ctx.font = "600 12px Outfit, sans-serif";
        ctx.fillText(city.id === save.cityId ? `YOU Â· ${city.name}` : city.name, p.x + 8, p.y - 6);
      }
    }
    for (const city of EXTRA_CITIES) {
      const p = project(city);
      ctx.fillStyle = city.id === selectedId ? "#7dff6a" : city.id === save.cityId ? "#9ad0ff" : "#5a6a78";
      ctx.beginPath();
      ctx.arc(p.x, p.y, city.id === selectedId ? 5 : 2.2, 0, Math.PI * 2);
      ctx.fill();
      if (city.id === selectedId || city.id === save.cityId) {
        ctx.fillStyle = "#d8e4ee";
        ctx.font = "600 11px Outfit, sans-serif";
        ctx.fillText(`EX Â· ${city.name}`, p.x + 8, p.y - 6);
      }
    }
  }

  private renderObjectives(save: SaveData, cityId: string): void {
    const box = this.root.querySelector("#obj-list");
    if (!box) return;
    const done = save.completedObjectives.length;
    this.setText("#obj-count", `${done} / ${OBJECTIVES.length}`);
    const rows = OBJECTIVES.filter((o) => o.cityId === cityId || o.cityId === null || save.activeObjectiveId === o.id)
      .slice(0, 28)
      .map((o) => {
        const st = objectiveStatus(save, o);
        return `<button type="button" class="obj-row ${st}" data-obj="${o.id}">
          <span class="obj-type">${o.type}</span>
          <b>${o.title}</b>
          <small>${st === "done" ? "Cleared" : st === "locked" ? "Locked" : `Click to go here Â· ${o.blurb}`}</small>
        </button>`;
      })
      .join("");
    box.innerHTML = rows || "<p class='lock'>No objectives on this pin.</p>";
  }

  renderSkills(save: SaveData): void {
    this.save = save;
    const prog = progressFromXp(save.xp);
    this.setText("#skill-points", `${save.skillPoints} Titan Point${save.skillPoints === 1 ? "" : "s"}`);
    this.setText("#skill-level", `Level ${prog.level} Â· ${Math.floor(prog.into)}/${prog.need} XP`);
    const forest = this.root.querySelector("#skill-forest");
    if (!forest) return;
    forest.innerHTML = SKILL_TREES.map((tree) => {
      const nodes = SKILL_NODES.filter((n) => n.tree === tree.id)
        .map((node) => {
          const rank = rankOf(save, node.id);
          const ready = canBuy(save, node.id);
          const locked = !ready && rank < 1;
          const cls = rank >= node.maxRank ? "owned" : ready ? "ready" : locked ? "locked" : "partial";
          return `<button type="button" class="skill-node ${cls}" data-skill="${node.id}" ${ready ? "" : "disabled"}>
            <b>${node.name}</b>
            <small>${rank}/${node.maxRank} Â· ${node.blurb}</small>
          </button>`;
        })
        .join("");
      return `<div class="skill-tree tone-${tree.tone}"><p class="eyebrow">${tree.tag}</p><h3>${tree.name}</h3>${nodes}</div>`;
    }).join("");
  }

  renderQuests(save: SaveData): void {
    this.save = save;
    const active = save.activeQuestId ? questById(save.activeQuestId) : undefined;
    this.setText(
      "#quest-active",
      active ? `On the job: ${active.name} (${save.questProgress}/${active.goal})` : "No active quest. Take a job.",
    );
    const board = this.root.querySelector("#quest-board");
    if (!board) return;
    board.innerHTML = QUESTS.map((q) => {
      const st = questStatus(save, q);
      const label =
        st === "active"
          ? "On the job"
          : st === "done"
            ? "Finished"
            : st === "locked"
              ? "Locked"
              : "Take job";
      const extra = st === "active" ? `${save.questProgress}/${q.goal}` : `$${q.rewardCash} Â· ${q.rewardXp} XP`;
      return `<article class="quest-card ${st}">
        <p class="eyebrow">${q.tag}</p>
        <h3>${q.name}</h3>
        <p>${q.blurb}</p>
        <p class="lock">${extra}</p>
        <div class="actions">
          <button type="button" class="cta" data-quest="${q.id}" ${st === "open" ? "" : "disabled"}>${label}</button>
        </div>
      </article>`;
    }).join("")) + "<!-- CRIME_WAVE_BOARD_HTML -->" + CRIME_WAVE_CONTACTS.map((q) => {
      const st = crimeWaveStatus(save, q);
      const label = st === "active" ? "On the job" : st === "done" ? "Finished" : "Take job";
      const extra = st === "active" ? `${save.questProgress}/${q.objectives.length}` : `${q.rewards.smashCash} · ${q.rewards.xp} XP`;
      return `<article class="quest-card crime-wave ${st}"><p class="eyebrow">${q.contact} · ${q.archetype}</p><h3>${q.title}</h3><p>${q.blurb}</p><p class="lock">${extra}</p><div class="actions"><button type="button" class="cta" data-quest="${q.id}" ${st === "open" ? "" : "disabled"}>${label}</button></div></article>`;
    }).join("");
    const drop = this.root.querySelector<HTMLButtonElement>("#btn-abandon");
    if (drop) drop.hidden = !active;
  }

  private setBar(sel: string, t: number): void {
    const el = this.root.querySelector<HTMLElement>(sel);
    if (el) el.style.width = `${(Math.max(0, Math.min(1, t)) * 100).toFixed(1)}%`;
  }

  private setText(sel: string, value: string): void {
    const el = this.root.querySelector(sel);
    if (el && el.textContent !== value) el.textContent = value;
  }

  private paintWanted(stars: number, tier: string): void {
    const row = this.root.querySelector("#wanted-row");
    if (row instanceof HTMLElement) {
      row.querySelectorAll<HTMLElement>("[data-star]").forEach((el) => {
        const n = Number(el.dataset.star);
        el.classList.toggle("on", n <= stars);
      });
      row.classList.toggle("hot", stars > 0);
    }
    this.setText("#wanted-tier", stars ? tier : "");
  }

  private tickDamage(value: number, keepHot: boolean): void {
    const rounded = Math.round(value);
    const el = this.root.querySelector("#cash");
    const wallet = this.root.querySelector("#wallet");
    if (el && rounded !== this.shownDamage) {
      const up = rounded > this.shownDamage && this.shownDamage >= 0;
      el.textContent = `$${rounded.toLocaleString()}`;
      this.shownDamage = rounded;
      if (up && wallet instanceof HTMLElement) {
        wallet.classList.add("tick");
        window.setTimeout(() => wallet.classList.remove("tick"), 280);
      }
    }
    if (wallet instanceof HTMLElement && keepHot) wallet.classList.add("hot");
  }

  private bind(): void {
    this.root.querySelector("#btn-new")?.addEventListener("click", () => this.onNewGame?.());
    this.root.querySelector("#btn-continue")?.addEventListener("click", () => this.onContinue?.());
    this.root.querySelector("#btn-help-title")?.addEventListener("click", () => this.onOpenHelp?.());
    this.root.querySelector("#btn-drop")?.addEventListener("click", () => this.onDropIn?.());
    this.root.querySelector("#btn-intro-next")?.addEventListener("click", () => this.onIntroNext?.());
    this.root.querySelector("#btn-intro-back")?.addEventListener("click", () => this.onBackToTitle?.());
    this.root.querySelector("#btn-codex")?.addEventListener("click", () => this.onOpenCodex?.());
    this.root.querySelector("#hud-codex")?.addEventListener("click", () => this.onOpenCodex?.());
    this.root.querySelector("#btn-resume")?.addEventListener("click", () => this.onResume?.());
    this.root.querySelector("#btn-save-now")?.addEventListener("click", () => this.onSaveNow?.());
    this.root.querySelector("#btn-street-roster")?.addEventListener("click", () => this.onOpenStreetRoster?.());
    this.root.querySelector("#btn-map")?.addEventListener("click", () => this.onOpenMap?.());
    this.root.querySelector("#hud-map")?.addEventListener("click", () => this.onOpenMap?.());
    this.root.querySelector("#btn-map-title")?.addEventListener("click", () => this.onOpenMap?.());
    this.root.querySelector("#btn-skills")?.addEventListener("click", () => this.onOpenSkills?.());
    this.root.querySelector("#hud-skills")?.addEventListener("click", () => this.onOpenSkills?.());
    this.root.querySelector("#btn-quests")?.addEventListener("click", () => this.onOpenQuests?.());
    this.root.querySelector("#hud-quests")?.addEventListener("click", () => this.onOpenQuests?.());
    this.root.querySelector("#btn-help")?.addEventListener("click", () => this.onOpenHelp?.());
    this.root.querySelector("#btn-bestiary")?.addEventListener("click", () => this.onOpenBestiary?.());
    this.root.querySelector("#hud-bestiary")?.addEventListener("click", () => this.onOpenBestiary?.());
    this.root.querySelector("#btn-settings")?.addEventListener("click", () => this.onOpenSettings?.());
    this.root.querySelector("#btn-quit-job")?.addEventListener("click", () => this.onQuitJob?.());
    this.root.querySelector("#form-radial")?.addEventListener("pointerdown", (e) => {
      const btn = (e.target as HTMLElement).closest<HTMLElement>("[data-kind]");
      if (!btn?.dataset.kind) return;
      e.preventDefault();
      e.stopPropagation();
      this.onFormPick?.(btn.dataset.kind);
    });
    this.root.querySelector("#sr-close")?.addEventListener("click", () => this.onSmashDismiss?.());
    this.root.querySelector("#ks-kill")?.addEventListener("click", () => this.onBossFate?.("kill"));
    this.root.querySelector("#ks-spare")?.addEventListener("click", () => this.onBossFate?.("spare"));
    this.root.querySelector("#fs-close")?.addEventListener("click", () => this.hideFormSplash());
    this.root.querySelector("#btn-boss-roster")?.addEventListener("click", () => this.onOpenBossRoster?.());
    this.root.querySelector("#btn-boss-roster-title")?.addEventListener("click", () => this.onOpenBossRoster?.());
    this.root.querySelector("#boss-roster-list")?.addEventListener("click", (e) => {
      const drop = (e.target as HTMLElement).closest<HTMLElement>("[data-boss-drop]");
      if (drop?.dataset.bossDrop) {
        this.onDebugBoss?.(drop.dataset.bossDrop, false);
        return;
      }
      const fight = (e.target as HTMLElement).closest<HTMLElement>("[data-boss-fight]");
      if (fight?.dataset.bossFight) this.onDebugBoss?.(fight.dataset.bossFight, true);
    });
    this.root.querySelector("#quality-presets")?.addEventListener("click", (e) => {
      const btn = (e.target as HTMLElement).closest<HTMLElement>("[data-quality]");
      if (btn?.dataset.quality) this.onQuality?.(btn.dataset.quality as QualityId);
    });
    this.root.querySelector("#balance-presets")?.addEventListener("click", (e) => {
      const btn = (e.target as HTMLElement).closest<HTMLElement>("[data-balance]");
      if (btn?.dataset.balance) this.onBalance?.(btn.dataset.balance as BalanceProfile);
    });
    this.root.querySelector("#feel-presets")?.addEventListener("click", (e) => {
      const btn = (e.target as HTMLElement).closest<HTMLElement>("[data-feel]");
      if (btn?.dataset.feel) this.onFeel?.(btn.dataset.feel as FeelId);
    });
    this.root.querySelector("#pad-on")?.addEventListener("change", (e) => {
      this.onGamepad?.((e.target as HTMLInputElement).checked);
    });
    this.root.querySelector("#phone-hud")?.addEventListener("pointerdown", (e) => {
      const form = (e.target as HTMLElement).closest<HTMLElement>("[data-kind]");
      if (form?.dataset.kind) {
        e.preventDefault();
        this.onFormPick?.(form.dataset.kind);
        return;
      }
      const pow = (e.target as HTMLElement).closest<HTMLElement>("[data-phone-power]");
      if (pow?.dataset.phonePower) {
        e.preventDefault();
        this.onPhonePower?.(pow.dataset.phonePower);
      }
    });
    this.root.querySelector("#beast-list")?.addEventListener("click", (e) => {
      const btn = (e.target as HTMLElement).closest<HTMLElement>("[data-beast]");
      if (btn?.dataset.beast) this.onParty?.(btn.dataset.beast);
    });
    this.root.querySelector("#bind-list")?.addEventListener("click", (e) => {
      const btn = (e.target as HTMLElement).closest<HTMLElement>("[data-bind]");
      if (!btn?.dataset.bind) return;
      btn.classList.add("listening");
      const action = btn.dataset.bind;
      const once = (ev: KeyboardEvent) => {
        ev.preventDefault();
        window.removeEventListener("keydown", once, true);
        btn.classList.remove("listening");
        this.onRebind?.(action, ev.code);
      };
      window.addEventListener("keydown", once, true);
    });
    this.root.querySelector("#btn-title")?.addEventListener("click", () => this.onBackToTitle?.());
    this.root.querySelectorAll("[data-back]").forEach((b) => {
      b.addEventListener("click", () => this.onResume?.());
    });
    this.root.querySelector("#btn-travel")?.addEventListener("click", () => this.onTravel?.(this.selectedId));
    this.root.querySelector("#btn-unlock")?.addEventListener("click", () => this.onUnlockRoute?.(this.selectedId));
    this.root.querySelector("#obj-list")?.addEventListener("click", (e) => {
      const btn = (e.target as HTMLElement).closest<HTMLElement>("[data-obj]");
      if (btn?.dataset.obj) this.onPinObjective?.(btn.dataset.obj);
    });
    this.root.querySelector("#go-list")?.addEventListener("click", (e) => {
      const btn = (e.target as HTMLElement).closest<HTMLElement>("[data-go]");
      if (!btn?.dataset.go || !this.lastSnap) return;
      const pin = this.lastSnap.pins.find((p) => p.id === btn.dataset.go);
      if (pin) this.trackPinNow(pin);
    });
    this.root.querySelector("#city-search")?.addEventListener("input", (e) => {
      this.cityQuery = (e.target as HTMLInputElement).value;
      if (this.save) this.renderTravel(this.save, this.selectedId);
    });
    this.root.querySelector("#skill-forest")?.addEventListener("click", (e) => {
      const btn = (e.target as HTMLElement).closest<HTMLElement>("[data-skill]");
      if (btn?.dataset.skill) this.onBuySkill?.(btn.dataset.skill);
    });
    this.root.querySelector("#quest-board")?.addEventListener("click", (e) => {
      const btn = (e.target as HTMLElement).closest<HTMLElement>("[data-quest]");
      if (btn?.dataset.quest) this.onAcceptQuest?.(btn.dataset.quest);
    });
    this.root.querySelector("#btn-abandon")?.addEventListener("click", () => this.onAbandonQuest?.());
    this.root.querySelector("#story-enter")?.addEventListener("click", () => this.onStoryEnter?.());
    this.root.querySelector("#story-stay")?.addEventListener("click", () => this.onStoryStay?.());
    this.root.querySelector("#comic-search")?.addEventListener("input", () => {
      if (this.save) this.renderCodex(this.save);
    });
    this.minimap.addEventListener("click", () => this.onOpenMap?.());
    this.root.querySelector("#map-filters")?.addEventListener("click", (e) => {
      const btn = (e.target as HTMLElement).closest<HTMLElement>("[data-filter]");
      const f = btn?.dataset.filter as MapFilter | undefined;
      if (!f || !(MAP_FILTERS as readonly string[]).includes(f)) return;
      this.mapFilter = f;
      this.paintFilters();
      if (this.lastSnap) this.drawLiveMap(this.lastSnap);
    });
    this.root.querySelectorAll("[data-map-type]").forEach((el) => {
      el.addEventListener("click", () => {
        const t = (el as HTMLElement).dataset.mapType;
        if (t === "roadmap" || t === "hybrid") this.setMapTiles(t);
      });
    });
    this.root.addEventListener("click", (e) => {
      const toggle = (e.target as HTMLElement).closest<HTMLElement>("[data-legend-toggle]");
      if (toggle) {
        this.onToggleLegend?.();
        return;
      }
      const row = (e.target as HTMLElement).closest<HTMLElement>("[data-legend]");
      if (!row || !row.closest("[data-legend-list]")) return;
      const f = row.dataset.filter as MapFilter | undefined;
      if (f && (MAP_FILTERS as readonly string[]).includes(f)) {
        this.mapFilter = f;
        this.paintFilters();
        if (this.lastSnap) this.drawLiveMap(this.lastSnap);
      }
    });
    this.root.querySelector("#btn-track-pin")?.addEventListener("click", () => this.trackSelected());
    this.root.querySelector("#btn-pin-track")?.addEventListener("click", () => this.trackSelected());
    this.root.querySelector("#btn-map-close")?.addEventListener("click", () => this.onCloseMap?.());
    this.root.querySelector("#btn-pin-travel")?.addEventListener("click", () => {
      const id = this.selectedPin?.travelCityId;
      if (id) this.onTravel?.(id);
    });
    this.cityMap.addEventListener("pointerdown", (e) => {
      this.dragging = true;
      this.dragMoved = false;
      this.dragX = e.clientX;
      this.dragY = e.clientY;
      this.cityMap.setPointerCapture(e.pointerId);
    });
    this.cityMap.addEventListener("pointermove", (e) => {
      if (!this.mapCam || !this.lastSnap) return;
      const loc = this.localMap(e);
      if (this.dragging) {
        const dx = e.clientX - this.dragX;
        const dy = e.clientY - this.dragY;
        if (Math.hypot(dx, dy) > 3) this.dragMoved = true;
        this.mapCam.cx -= dx / this.mapCam.ppm;
        this.mapCam.cz += dy / this.mapCam.ppm;
        this.dragX = e.clientX;
        this.dragY = e.clientY;
        this.scheduleMapDraw();
        return;
      }
      const pin = hitTestPin(this.mapCam, this.lastSnap.pins, loc.x, loc.y, loc.w, loc.h, this.mapFilter);
      const pp = worldToScreen(this.mapCam, this.lastSnap.player.x, this.lastSnap.player.z, loc.w, loc.h);
      const onYou = Math.hypot(pp.x - loc.x, pp.y - loc.y) < 14;
      const id = pin?.id ?? (onYou ? "you" : null);
      if (id !== (this.hoverPin?.id ?? (this.cityMap.dataset.hoverYou === "1" ? "you" : null))) {
        this.hoverPin = pin;
        this.cityMap.dataset.hoverYou = onYou && !pin ? "1" : "0";
        this.cityMap.style.cursor = pin || onYou ? "pointer" : "grab";
        this.showMapTip(pin, onYou && !pin);
        this.drawLiveMap(this.lastSnap);
      }
    });
    this.cityMap.addEventListener("pointerup", (e) => {
      if (!this.mapCam || !this.lastSnap) {
        this.dragging = false;
        return;
      }
      const loc = this.localMap(e);
      if (!this.dragMoved) {
        const pin = hitTestPin(this.mapCam, this.lastSnap.pins, loc.x, loc.y, loc.w, loc.h, this.mapFilter);
        if (pin) this.trackPinNow(pin);
        else this.selectPin(null);
        this.drawLiveMap(this.lastSnap);
      }
      this.dragging = false;
    });
    this.cityMap.addEventListener("pointerleave", () => {
      this.dragging = false;
      this.hoverPin = null;
      this.cityMap.dataset.hoverYou = "0";
      this.showMapTip(null);
    });
    this.cityMap.addEventListener(
      "wheel",
      (e) => {
        e.preventDefault();
        if (!this.mapCam || !this.lastSnap) return;
        const loc = this.localMap(e);
        const before = screenToWorld(this.mapCam, loc.x, loc.y, loc.w, loc.h);
        const next = this.mapCam.ppm * (e.deltaY > 0 ? 0.86 : 1.16);
        this.mapCam.ppm = Math.max(0.08, Math.min(2.4, next));
        const after = screenToWorld(this.mapCam, loc.x, loc.y, loc.w, loc.h);
        this.mapCam.cx += before.x - after.x;
        this.mapCam.cz += before.z - after.z;
        this.drawLiveMap(this.lastSnap);
      },
      { passive: false },
    );
    this.root.querySelector("#sens")?.addEventListener("input", (e) => {
      const v = Number((e.target as HTMLInputElement).value);
      this.setText("#sens-val", v.toFixed(2));
      this.onSensitivity?.(v);
    });
    this.root.querySelector("#mute")?.addEventListener("change", (e) => {
      this.onMute?.((e.target as HTMLInputElement).checked);
    });
    this.root.querySelectorAll<HTMLElement>("[data-hero]").forEach((el) => {
      el.addEventListener("click", () => {
        const id = el.dataset.hero ?? "hulk";
        this.selectRoster(id);
        if (id === "hulk") this.onStreetAction?.("hub");
        else if (id === "smash") this.onStreetAction?.("smack");
        else if (id === "super") this.onStreetAction?.("jump");
      });
    });
    this.root.querySelector("#street-rail")?.addEventListener("click", (e) => {
      const btn = (e.target as HTMLElement).closest<HTMLElement>("[data-street]");
      const act = btn?.dataset.street;
      if (act === "hub" || act === "smack" || act === "jump") {
        this.setStreetAction(act);
        this.onStreetAction?.(act);
      }
    });
    this.worldMap.addEventListener("click", (e) => {
      if (!this.save) return;
      const rect = this.worldMap.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      let best: CityDef | null = null;
      let bestD = 18;
      for (const city of TRAVEL_CITIES) {
        const px = ((city.lon + 168) / 102) * rect.width;
        const py = ((72 - city.lat) / 54) * rect.height;
        const d = Math.hypot(px - x, py - y);
        if (d < bestD) {
          bestD = d;
          best = city;
        }
      }
      if (best) this.renderTravel(this.save, best.id);
    });
  }

  private html(): string {
    const cards = ROSTER.map(
      (r) =>
        `<button type="button" class="hero-card tone-${r.tone}" data-hero="${r.id}"><span>${r.name}</span><small>${r.tag}</small></button>`,
    ).join("");
    return `
      <nav class="street-rail" id="street-rail" aria-label="Street actions">
        <p class="eyebrow">Titan Streets</p>
        <button type="button" class="roster-item selected" data-street="hub"><span class="roster-name">Hub</span><span class="roster-tag">NY drop-in</span></button>
        <button type="button" class="roster-item" data-street="smack"><span class="roster-name">Smack</span><span class="roster-tag">Enter</span></button>
        <button type="button" class="roster-item" data-street="jump"><span class="roster-name">Jump&amp;Pound</span><span class="roster-tag">Space</span></button>
      </nav>
      <div id="maps-banner" class="maps-banner" hidden></div>
      <div class="hud hud-hidden">
        <div class="city-chip glass">
          <h1 id="city-name">New York</h1>
          <p id="city-country">United States</p>
          <p id="pop-line" class="pop-line"></p>
          <p id="district-name" class="district-line"></p>
          <div class="mission" id="mission">Patrol the streets</div>
          <div class="progress" id="crime-hint"></div>
          <div class="quest-chip" id="quest-chip"></div>
          <div class="form-chip" id="form-chip">BANNER</div>
          <div class="stance-mark" id="stance-mark"></div>
          <div class="style-icon" id="style-icon" data-style="savage"><span class="style-letter">S</span><span class="style-name">BRAWL</span></div>
          <div class="clock-chip" id="clock-chip">Day 1 Â· 8:00 AM</div>
          <div class="fps-chip" id="fps-chip">60 fps</div>
          <div class="job-chip" id="job-chip">Unemployed</div>
          <div class="lock-chip" id="lock-chip"></div>
          <div class="party-chip" id="party-chip"></div>
        </div>
        <div class="wallet glass" id="wallet">
          <div class="wanted-row" id="wanted-row" aria-label="Wanted">
            <span data-star="1">â˜…</span><span data-star="2">â˜…</span><span data-star="3">â˜…</span><span data-star="4">â˜…</span><span data-star="5">â˜…</span>
          </div>
          <div class="damage-cash">
            <span class="damage-label">DAMAGE$</span>
            <b id="cash">$0</b>
          </div>
          <div id="wanted-tier"></div>
          <div id="rep">0 RAGE REP</div>
          <div id="tabs"></div>
          <div class="tp-row"><span id="lvl-label">LV 1</span><span id="tp-label">1 TP</span></div>
          <div id="rampage-chip" class="rampage-chip" hidden></div>
        </div>
        <div class="hud-actions">
          <button type="button" class="hud-btn" id="hud-map">Map</button>
          <button type="button" class="hud-btn" id="hud-skills">Skills<span id="skills-badge"></span></button>
          <button type="button" class="hud-btn" id="hud-quests">Quests</button>
          <button type="button" class="hud-btn" id="hud-bestiary">Bestiary</button>
          <button type="button" class="hud-btn" id="hud-codex">Codex</button>
        </div>
        <div class="minimap-wrap" title="Local crop of the city map â€” click to open">
          <canvas id="minimap"></canvas>
          <span class="map-north" aria-hidden="true">N</span>
          <span class="mini-maps-chip" data-google-chrome hidden>Google Â· M</span>
        </div>
        <button type="button" class="legend-fab" data-legend-toggle aria-pressed="false">Legend</button>
        <aside id="hud-legend" class="hud-legend glass" hidden>
          <p class="eyebrow">Map legend Â· L</p>
          <div data-legend-list></div>
        </aside>
        <div class="nav-hud" id="nav-hud" hidden>
          <div class="nav-ring">
            <span class="nav-n">N</span>
            <span class="nav-arrow" id="nav-arrow"></span>
          </div>
          <div class="nav-copy">
            <b id="nav-title">Objective</b>
            <small id="nav-dist">0 m</small>
          </div>
        </div>
        <div class="boss-bar glass" id="boss-wrap" style="display:none">
          <div id="boss-name">Boss</div>
          <div class="bar"><span></span></div>
        </div>
        <div class="rival-banner" id="rival-banner" style="display:none">RAZORBACK has found you</div>
        <div class="bar-wrap glass">
          <div class="bar-label" id="hp-label">Banner</div>
          <div class="bar hp"><span></span></div>
          <div class="bar-label">Rage <span id="rage-tier">0 Â· Calm</span></div>
          <div class="bar rage"><span></span></div>
          <div class="bar-label" id="gamma-label">Gamma Â· Bruce window</div>
          <div class="bar gamma"><span></span></div>
          <div class="bar-label">Titan XP</div>
          <div class="bar xp"><span></span></div>
          <div id="need-wrap">
            <div class="bar-label">Energy</div>
            <div class="bar energy"><span></span></div>
            <div class="bar-label">Hunger</div>
            <div class="bar hunger"><span></span></div>
            <div class="bar-label">Mood</div>
            <div class="bar mood"><span></span></div>
          </div>
          <div id="heat-wrap" style="display:none">
            <div class="bar-label">Heat</div>
            <div class="bar heat"><span></span></div>
          </div>
          <div id="power-wrap" style="display:none">
            <div class="bar-label" id="power-label">Borrowed</div>
            <div class="bar borrow"><span></span></div>
          </div>
          <div id="danger-wrap">
            <div class="bar-label">Danger</div>
            <div class="bar danger"><span></span></div>
          </div>
        </div>
        <div class="jump-charge" id="jump-charge"></div>
        <div class="calm-charge" id="calm-charge"></div>
        <div class="form-radial" id="form-radial" style="display:none">
          ${HULK_FORMS.map((f) => `<div class="radial-item" data-kind="${f.id}"><b>${f.short}</b><small>${f.name}</small></div>`).join("")}
        </div>
        <div id="phone-hud" class="phone-hud glass" hidden>
          <p class="eyebrow">Street phone Â· Tab</p>
          <p class="phone-now"><b id="phone-form">Banner</b><span id="phone-power">No relic armed</span></p>
          <p class="lock" id="phone-feel">Shift tap grab Â· hold 1.0s rip</p>
          <p class="eyebrow">Forms Â· 0</p>
          <div class="phone-forms">
            ${HULK_FORMS.map((f) => `<button type="button" class="radial-item" data-kind="${f.id}"><b>${f.short}</b><small>${f.name}</small></button>`).join("")}
          </div>
          <p class="eyebrow">Borrowed Â· relic keys</p>
          <div class="phone-powers">
            <button type="button" data-phone-power="omega"><b>X Sightfire</b><small>${BORROWED.omega.short}</small></button>
            <button type="button" data-phone-power="vengeance"><b>G Hellbrand</b><small>${BORROWED.vengeance.short}</small></button>
            <button type="button" data-phone-power="will"><b>N Willforge</b><small>${BORROWED.will.short}</small></button>
            <button type="button" data-phone-power="king"><b>T Hushvoice</b><small>${BORROWED.king.short}</small></button>
          </div>
          <p class="lock">Arrows move. WASD look only. S is never reverse. Tab closes.</p>
        </div>
        <div id="smash-report" class="smash-report glass" hidden>
          <p class="eyebrow">Smash Report</p>
          <h3 id="sr-title">Street job</h3>
          <p class="sr-medal" id="sr-medal">BRONZE</p>
          <ul id="sr-stats"></ul>
          <button type="button" class="cta" id="sr-close">Walk on</button>
        </div>
        <div id="kill-spare" class="story-gate glass kill-spare" hidden>
          <p class="eyebrow">Capital boss</p>
          <h3 id="ks-title">The boss is down</h3>
          <p id="ks-blurb">Kill or Spare. No walking away.</p>
          <p class="lock" id="ks-counts">Killed 0 Â· Spared 0</p>
          <div class="actions">
            <button type="button" class="cta ks-kill" id="ks-kill">Kill</button>
            <button type="button" class="ghost" id="ks-spare">Spare</button>
          </div>
        </div>
        <div id="form-splash" class="story-gate glass" hidden>
          <p class="eyebrow">Form unlocked</p>
          <h3 id="fs-title">Form</h3>
          <p id="fs-blurb"></p>
          <div class="actions"><button type="button" class="cta" id="fs-close">Take the street</button></div>
        </div>
        <div class="prompt" id="prompt"></div>
        <div id="story-gate" class="story-gate glass" hidden>
          <p class="eyebrow" id="story-era">Comic story</p>
          <h3 id="story-title">Issue</h3>
          <p id="story-blurb"></p>
          <div class="actions">
            <button type="button" class="cta" id="story-enter">Enter vignette</button>
            <button type="button" class="ghost" id="story-stay">Stay on streets</button>
          </div>
        </div>
        <div class="hint-strip">Arrows move Â· WASD look Â· Enter smash Â· Space leap Â· Shift tap grab / hold rip Â· Tab phone Â· Hold 0 forms</div>
        <div class="toast" id="toast"></div>
        <div class="combo" id="combo"></div>
      </div>

      <div class="screen show" data-screen="title">
        <div class="select-sheet">
          <p class="eyebrow">New York drop-in Â· World Breaker</p>
          <h2 class="title">Titan<br>Streets</h2>
          <p class="lead" id="hero-blurb"></p>
          <div class="hero-cards">${cards}</div>
          <div class="actions">
            <button class="cta" id="btn-new">Drop in</button>
            <button class="ghost" id="btn-continue">Continue</button>
            <button class="ghost" id="btn-map-title">Cities</button>
            <button class="ghost" id="btn-help-title">How to play</button>
            <button class="ghost" id="btn-boss-roster-title">Capital bosses (debug)</button>
          </div>
            <p class="control-legend">Arrows move Â· WASD look (W up / S down / A left / D right) Â· Enter smash Â· Space jump Â· Shift tap grab Â· Shift hold rip Â· Tab phone Â· C camera Â· H interact</p>
        </div>
      </div>

      <div class="screen" data-screen="intro">
        <div class="select-sheet">
          <p class="eyebrow" id="intro-eyebrow">Port Authority Â· 1:14 a.m.</p>
          <h2 class="title" id="intro-title">The night<br>bus in</h2>
          <p class="lead" id="intro-lead">A scientist steps off a Grey-line coach with one bag and a name the papers already ruined.</p>
          <p class="lock" id="intro-step">1 / 3</p>
          <div class="actions">
            <button class="cta" id="btn-intro-next">Next</button>
            <button class="cta" id="btn-drop" hidden>Drop in on New York</button>
            <button class="ghost" id="btn-intro-back">Back to select</button>
          </div>
        </div>
      </div>

      <div class="screen" data-screen="pause">
        <div class="stack">
          <p class="eyebrow">Paused</p>
          <h3>The city can wait.</h3>
          <div class="actions">
            <button class="cta" id="btn-resume">Resume</button>
            <button class="ghost" id="btn-save-now">Save progress</button>
            <button class="ghost" id="btn-street-roster">Street labels (nearby)</button>
            <button class="ghost" id="btn-map">Travel map</button>
            <button class="ghost" id="btn-skills">Skill trees</button>
            <button class="ghost" id="btn-quests">Quest board</button>
            <button class="ghost" id="btn-bestiary">Grand Bestiary</button>
            <button class="ghost" id="btn-codex">Codex</button>
            <button class="ghost" id="btn-help">How to play</button>
            <button class="ghost" id="btn-boss-roster">Capital bosses (debug)</button>
            <button class="ghost" id="btn-settings">Settings</button>
            <button class="ghost" id="btn-title">Title screen</button>
          </div>
        </div>
      </div>

      
      <div class="screen" data-screen="street-roster">
        <div class="stack">
          <p class="eyebrow">Nearby street</p>
          <h3>Little guys & crews</h3>
          <p class="lead">Labeled contacts around you. Smash / H interact on the street.</p>
          <div id="street-roster-list" class="obj-list"></div>
          <div class="actions"><button class="ghost" data-back>Back</button></div>
        </div>
      </div>

      <div class="screen" data-screen="help">
        <div class="stack">
          <p class="eyebrow">Open-city traversal</p>
          <h3>How to play</h3>
          <div class="help-grid">
            <b>Arrows</b><span>Move only. Hold 1.5s for a charging run that smashes through. Steers in air.</span>
            <b>W A S D</b><span>Camera only. W look up, S look down, A look left, D look right. Auto-centers when sprinting or locked on. S is never reverse.</span>
            <b>C</b><span>Cycle cameras: 3rd-person (default) â†’ close â†’ over-shoulder.</span>
            <b>Q / E</b><span>Zoom out / in.</span>
            <b>Space</b><span>Tap hop. Hold up to 3s, release to super-leap. In air: ground pound.</span>
            <b>Right Ctrl</b><span>Sprint / bull rush.</span>
            <b>Numpad Enter</b><span>Brace. Double-tap: dodge roll in arrow direction.</span>
            <b>Numpad .</b><span>Wall climb/run. Hold toward a wall while airborne. Maestro cannot climb.</span>
            <b>Enter</b><span>Stance smash. Brawl: combo / haymaker. Boxing: punches / haymaker. Karate: kicks / axe kick. Judo: throw / slam. Jiu-jitsu: mount / submission.</span>
            <b>Shift</b><span>Tap: grab / throw / club (stance flavored). Hold ~1.0s (Default feel): rip the street â€” layered on grab, does not steal the tap. Hold + arrows + Space is still the roof hop. G sets a wreck down.</span>
            <b>Tab</b><span>Phone / form HUD. Forms and borrowed relics (X Sightfire, G Hellbrand, N Willforge, T Hushvoice). Tab again closes. Does not pause the street.</span>
            <b>G</b><span>Banner: drop a held wreck. Hulk with empty hands: Hellbrand when the relic is unlocked. Hold G still stares if Hellbrand is already armed. Does not dual-fire drop and vengeance on the same tap.</span>
            <b>Numpad 0 / 7 / 9</b><span>Lock-on nearest / cycle.</span>
            <b>Numpad 5 / 8 / 2</b><span>Roar Â· Rage mode (Red vents Heat) Â· Gamma roar.</span>
            <b>1â€“9</b><span>Specials keep their identity (clap, stomp, chargeâ€¦) with stance flavor in the toast.</span>
            <b>0</b><span>Tap cycles World Breaker â†’ Fixit â†’ Red â†’ Immortal â†’ Maestro (then Feral / Hell / Cosmic when unlocked). Hold ~0.45s opens the form radial (arrows cycle, release or click). Hold 2s = Calm Down to Bruce (Gamma 0â€“19). 20â€“49 fails a breathe. 50+ greyed out. Locked and Overcharged cannot switch forms. R is Banner â†” last titan.</span>
            <b>H</b><span>Interact: jobs, diner, sleep, catch, dungeon door, Skyline Heroes, glowing comic issues.</span>
            <b>M / L / V / Esc</b><span>Map (M): same city graph as the minimap. Click a pin, Track, then follow the compass. With a Maps JS key, Google roadmap/satellite tiles sit under the pins (Road / Satellite on the toolbar). <b>L</b> toggles the legend. V hides markers. Esc or M closes and restores look.</span>
            <b>X / N / T</b><span>Sightfire (X), Willforge (N), Hushvoice (T). One borrowed power at a time. Bruce: X zooms only. N/T off.</span>
            <b>B / K / U / J</b><span>Boxing / Karate / Judo / Jiu-jitsu. Same key again = Savage brawl. 0.3s stance change + HUD icon. Mix three styles in one combo to fill Rage faster. Fixit boxes faster. Maestro cannot use Jiu-jitsu. Red Karate heavies burn.</span>
            <b>Bestiary</b><span>Pause or the HUD Bestiary button. Party of 3. Stage 2 at Lv16 or 10 wins. Stage 3 at 32 or a boss kill.</span>
            <b>Quality</b><span>Pause â†’ Settings. Default is Low. Dynamic resolution drops 10% after 30 frames over 18 ms (floor 70%). Load radius 300 â†’ 220 under load. Debris cap 300, sleep 2s, delete 6s. Dummy shaders prewarm at boot â€” the full NY scene is never compiled on the tick.</span>
            <b>Controller</b><span>Optional. Left stick = move (same as arrows). Right stick = look (same as WASD). Face: jump / smash / grab / interact. LB form, RB sprint, LT brace, RT Shift-hold rip, Select phone, Start pause. Off in Settings. WASD-classic move is rejected â€” never the default.</span>
            <b>Feel / Balance</b><span>Settings â†’ Control feel (Default = live Keyboard_Only holds, Relaxed shorter, Tight longer). Settings â†’ Balance: Legacy (default, live numbers) or Worldbreaker_v1 (Anger Loop overlay). Additive only. Does not rename the app.</span>
            <b>1â€“9 Bruce</b><span>Scanner, Tranq, EMP, Hack, Adrenaline, Shield, Decoy, Repair, Anger Trigger (instant Hulk, double damage 20s).</span>
            <b>X / G / N / T</b><span>Kept as relic keys. G is drop on Banner and when holding a wreck; Hellbrand only with empty Hulk hands. Test-spawn RAZORBACK with <b>P</b>.</span>
          </div>
          <p class="lead" style="margin-top:16px">Anger Loop v2: Rage fills on contact (âˆ’2/s after 5s quiet). Gamma charges from Rage while the fight is hot, spends on punches/leaps/powers, then âˆ’1/s after 8s. Hold 0 for 2s Calm Down only in the Bruce window (0â€“19). After a hot brawl, walk 60â€“90s before Bruce. Codex pages unlock after act capitals 10 / 20 / 30 / 40 / 50.</p>
          <p class="lock" style="margin-top:12px">Playable streets are OpenStreetMap highway geometry (cached offline). Â© OpenStreetMap contributors. Google Map tiles appear on the full map (M) only when VITE_GOOGLE_MAPS_API_KEY or GOOGLE_MAPS_API_KEY is set. No Google 3D scrape.</p>
          <div class="actions"><button class="ghost" data-back>Back</button></div>
        </div>
      </div>

      <div class="screen" data-screen="settings">
        <div class="stack">
          <p class="eyebrow">Options</p>
          <h3>Settings</h3>
          <div class="settings-row">
            <label for="sens">Mouse sensitivity</label>
            <div><input id="sens" type="range" min="0.08" max="0.5" step="0.01" /><span id="sens-val">0.22</span></div>
          </div>
          <div class="settings-row">
            <label for="mute">Mute audio</label>
            <input id="mute" type="checkbox" />
          </div>
          <p class="eyebrow" style="margin-top:18px">Quality</p>
          <div id="quality-presets" class="quality-presets">
            ${QUALITY_IDS.map((id) => `<button type="button" class="hud-btn" data-quality="${id}">${QUALITY[id].label}</button>`).join("")}
          </div>
          <p class="lock" id="quality-hint">Default Low. Dynamic scale if a frame runs long. Raise to Medium when fps stays near 60.</p>
          <p class="eyebrow" style="margin-top:18px">Balance</p>
          <div id="balance-presets" class="quality-presets">
            ${BALANCE_PROFILES.map((id) => `<button type="button" class="hud-btn" data-balance="${id}">${id === "Legacy" ? "Legacy" : "Worldbreaker v1"}</button>`).join("")}
          </div>
          <p class="lock" id="balance-hint">Legacy (default): keep the Anger Loop, smash, and form numbers already in this build.</p>
          <p class="eyebrow" style="margin-top:18px">Control feel</p>
          <div id="feel-presets" class="quality-presets">
            ${FEEL_IDS.map((id) => `<button type="button" class="hud-btn" data-feel="${id}">${FEEL[id].label}</button>`).join("")}
          </div>
          <p class="lock" id="feel-hint">Current street feel. Smash haymaker 0.38s, form radial 0.45s, Calm 2s, rip 1.0s.</p>
          <div class="settings-row">
            <label for="pad-on">Optional controller</label>
            <input id="pad-on" type="checkbox" checked />
          </div>
          <p class="lock" id="pad-status">No pad. Plug in optional â€” left stick move, right stick look.</p>
          <p class="eyebrow" style="margin-top:18px">Keybinds (click a row, then tap a key â€” stub, labels only)</p>
          <div id="bind-list" class="bind-list"></div>
          <div class="actions">
            <button class="ghost" id="btn-quit-job">Quit civilian job</button>
            <button class="ghost" data-back>Back</button>
          </div>
        </div>
      </div>

      <div class="screen" data-screen="map">
        <div class="select-sheet wide">
          <p class="eyebrow">71 Sanctuary downtowns Â· <span id="obj-count">0 / 0</span></p>
          <h2 class="title" style="font-size:clamp(48px,7vw,80px)">Seventy-One</h2>
          <p class="lead">All 71 previously scaffolded Sanctuary downtowns stay on this map â€” Austin, Miami, DC, Dallas, the Bay, and the rest are extras, not dropped. Primary unlock is the 50 largest-per-state cities (1 New York â†’ 50 Huntsville). Unique ids: Portland, OR / Portland, ME and Charleston, SC / Charleston, WV (legacy <code>portland</code> folder is Oregon). Google Map / Satellite = browser reference only, never shipped tiles.</p>
          <div class="featured-row" id="featured-cities"></div>
          <div class="map-layout">
            <div>
              <div class="city-map-stage">
                <div id="city-basemap" class="city-basemap" hidden></div>
                <canvas id="city-map"></canvas>
                <div id="map-tip" class="map-tip" hidden>
                  <p class="eyebrow" id="map-tip-type">Type</p>
                  <b id="map-tip-title">Pin</b>
                  <small id="map-tip-blurb"></small>
                </div>
                <aside id="map-legend" class="map-legend" hidden>
                  <p class="eyebrow">Legend Â· L</p>
                  <div data-legend-list></div>
                </aside>
              </div>
              <div class="map-toolbar">
                <div class="map-filters" id="map-filters">
                  ${MAP_FILTERS.map((f) => `<button type="button" class="hud-btn" data-filter="${f}">${f === "all" ? "All" : PIN_STYLE[f].label}</button>`).join("")}
                </div>
                <div class="map-toolbar-actions">
                  <div class="map-type" data-google-chrome hidden>
                    <button type="button" class="hud-btn" data-map-type="roadmap">Road</button>
                    <button type="button" class="hud-btn" data-map-type="hybrid">Satellite</button>
                  </div>
                  <button type="button" class="ghost" data-legend-toggle aria-pressed="false">Legend</button>
                  <button type="button" class="cta" id="btn-track-pin">Track</button>
                  <button type="button" class="ghost" id="btn-map-close">Close</button>
                </div>
              </div>
              <p class="map-legend-line">Hover a pin for name + type. L toggles the legend. Filters still apply.</p>
              <p class="map-credit" id="map-credit">Â© OpenStreetMap contributors</p>
              <canvas id="world-map"></canvas>
              <input id="city-search" type="search" placeholder="Find a city, extra, landmark, or district" autocomplete="off" />
              <div class="city-list" id="city-list"></div>
            </div>
            <div class="city-detail">
              <div id="pin-detail" class="pin-detail" hidden>
                <p class="eyebrow" id="pin-type">Story</p>
                <h3 id="pin-title">Pin</h3>
                <p id="pin-blurb"></p>
                <p class="lock" id="pin-city"></p>
                <div class="actions">
                  <button class="cta" id="btn-pin-track">Track this</button>
                  <button class="ghost" id="btn-pin-travel">Fast travel</button>
                </div>
              </div>
              <p class="eyebrow" id="detail-country">United States</p>
              <h3 id="detail-name">New York</h3>
              <p id="detail-blurb"></p>
              <p id="detail-shell" class="detail-shell"></p>
              <p class="lock" id="detail-lock"></p>
              <p id="detail-progress"></p>
              <canvas id="street-preview"></canvas>
              <p class="eyebrow" style="margin-top:16px">Go here</p>
              <div id="go-list" class="obj-list"></div>
              <p class="eyebrow" style="margin-top:16px">Objectives</p>
              <div id="obj-list" class="obj-list"></div>
              <div class="actions">
                <button class="cta" id="btn-travel">Drop in</button>
                <button class="ghost" id="btn-unlock">Open route</button>
                <button class="ghost" data-back>Back</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="screen" data-screen="skills">
        <div class="select-sheet wide">
          <p class="eyebrow" id="skill-level">Level 1</p>
          <h2 class="title" style="font-size:clamp(44px,6vw,72px)">Skill trees</h2>
          <p class="lead"><span id="skill-points">1 Titan Point</span> â€” smash crimes to level up. Three trees: Smash, Gamma, Mind.</p>
          <div id="skill-forest" class="skill-forest"></div>
          <div class="actions"><button class="ghost" data-back>Back</button></div>
        </div>
      </div>

      <div class="screen" data-screen="quests">
        <div class="select-sheet wide">
          <p class="eyebrow">Jobs</p>
          <h2 class="title" style="font-size:clamp(44px,6vw,72px)">Quest board</h2>
          <p class="lead" id="quest-active">Take a hunt, a street sweep, or a demolition job.</p>
          <div id="quest-board" class="quest-board"></div>
          <div class="actions">
            <button class="ghost" id="btn-abandon">Drop the job</button>
            <button class="ghost" data-back>Back</button>
          </div>
        </div>
      </div>

      <div class="screen" data-screen="bestiary">
        <div class="select-sheet wide">
          <p class="eyebrow" id="beast-count">0 caught</p>
          <h2 class="title" style="font-size:clamp(44px,6vw,72px)">Grand Bestiary</h2>
          <p class="lead">Original street creatures. C-01â€“30 normal, C-31â€“45 champ, C-46â€“50 unique. Four moves each. Catchable, three evolve stages. Party of three fights in capital dungeons. New Yorkâ€™s fifty are fully named. Other cities use seeded civic rosters.</p>
          <p class="eyebrow">City roster</p>
          <div id="beast-roster" class="quest-board"></div>
          <p class="eyebrow" style="margin-top:16px">Party</p>
          <div id="beast-party" class="quest-board"></div>
          <p class="eyebrow" style="margin-top:16px">Caught</p>
          <div id="beast-list" class="quest-board"></div>
          <div class="actions"><button class="ghost" data-back>Back</button></div>
        </div>
      </div>

      <div class="screen" data-screen="codex">
        <div class="select-sheet wide">
          <p class="eyebrow" id="codex-count">No pages yet</p>
          <h2 class="title" style="font-size:clamp(44px,6vw,72px)">Codex</h2>
          <p class="lead">Short lore, sealed until you beat each act city â€” Seattle, Baltimore, Honolulu, Bridgeport, Huntsville. Glowing street issues file comic stories here.</p>
          <label class="comic-search-row">Comics <input id="comic-search" type="search" placeholder="Origin, Planet Hulk, WWH, Immortal, Maestroâ€¦" autocomplete="off" /></label>
          <div id="codex-list" class="codex-list"></div>
          <div class="actions"><button class="ghost" data-back>Back</button></div>
        </div>
      </div>

      <div class="screen" data-screen="boss-roster">
        <div class="select-sheet wide">
          <p class="eyebrow">Debug Â· NY â†’ LA chain first</p>
          <h2 class="title" style="font-size:clamp(44px,6vw,72px)">Capital bosses</h2>
          <p class="lead">NY is TBD_NY_CapitalBoss. LA is Toad (#70). Chicago Stilt-Man, Houston Leap-Frog, then Trapster climbing to Beyonder. Kill/Spare after every capital. Original faces. Working Marvel names with remap hooks.</p>
          <div id="boss-roster-list" class="codex-list"></div>
          <div class="actions"><button class="ghost" data-back>Back</button></div>
        </div>
      </div>
    `;
  }
}

