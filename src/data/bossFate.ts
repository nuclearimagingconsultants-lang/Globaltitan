import { CITIES } from "./cities";
import type { CityId, SaveData } from "./types";

/** Kill-path and spare-path form pair. Both earnable — not exclusive. */
export const FATE_UNLOCK_AT = 37;

export type BossFate = "kill" | "spare";

export function postBossHookId(cityId: CityId): string {
  return `PostBossBeat_${cityId}`;
}

export function judgedCity(save: SaveData, cityId: CityId): boolean {
  return save.bossesKilled.includes(cityId) || save.bossesSpared.includes(cityId);
}

export function applyBossFate(save: SaveData, cityId: CityId, fate: BossFate): string[] {
  if (judgedCity(save, cityId)) return [];
  if (fate === "kill") save.bossesKilled.push(cityId);
  else save.bossesSpared.push(cityId);
  const unlocked: string[] = [];
  if (save.bossesKilled.length >= FATE_UNLOCK_AT) {
    if (!save.unlockedForms.includes("hell")) {
      save.unlockedForms.push("hell");
      unlocked.push("Hell Hulk");
    }
    if (!save.unlockedForms.includes("mephisto")) {
      save.unlockedForms.push("mephisto");
      unlocked.push("Mephisto Bruce");
    }
  }
  if (save.bossesSpared.length >= FATE_UNLOCK_AT) {
    if (!save.unlockedForms.includes("cosmic")) {
      save.unlockedForms.push("cosmic");
      unlocked.push("Cosmic Hulk");
    }
    if (!save.unlockedForms.includes("ironstrange")) {
      save.unlockedForms.push("ironstrange");
      unlocked.push("Dr. Iron Strange");
    }
  }
  return unlocked;
}

export function markPostBossBeat(save: SaveData, cityId: CityId): boolean {
  const hook = postBossHookId(cityId);
  if (save.postBossBeats.includes(hook)) return false;
  save.postBossBeats.push(hook);
  return true;
}

export const CAPITAL_BOSS_COUNT = CITIES.length;
