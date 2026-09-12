import type { SaveData } from "./types";

export const QuestKind = {
  Hunt: "hunt",
  Crimes: "crimes",
  Wreck: "wreck",
} as const;

export type QuestKind = (typeof QuestKind)[keyof typeof QuestKind];

export type MonsterSpecies = "hound" | "brute" | "wyrm" | "golem";

export type QuestDef = {
  id: string;
  name: string;
  tag: string;
  kind: QuestKind;
  blurb: string;
  goal: number;
  rewardCash: number;
  rewardXp: number;
  repeatable: boolean;
  species?: MonsterSpecies;
  named?: string;
  requires?: string[];
};

export const QUESTS: QuestDef[] = [
  {
    id: "street-sweep",
    name: "Street Sweep",
    tag: "Patrol",
    kind: "crimes",
    blurb: "Smash three active street jobs. Crews, not monsters — the city still needs a titan on patrol.",
    goal: 3,
    rewardCash: 220,
    rewardXp: 70,
    repeatable: true,
  },
  {
    id: "brick-rain",
    name: "Brick Rain",
    tag: "Demolition",
    kind: "wreck",
    blurb: "Fold three buildings. Super smash (A) puts a hole in the block and counts the rubble.",
    goal: 3,
    rewardCash: 260,
    rewardXp: 80,
    repeatable: true,
  },
  {
    id: "hound-pack",
    name: "Iron Pack",
    tag: "Hunt",
    kind: "hunt",
    blurb: "Three Iron Hounds are running the east avenue. Hunt them. They bite. You smash.",
    goal: 3,
    rewardCash: 300,
    rewardXp: 90,
    repeatable: true,
    species: "hound",
  },
  {
    id: "sewer-king",
    name: "Sewer King",
    tag: "Monster",
    kind: "hunt",
    blurb: "A sewer brute crawled up by the north plaza. Fight it like a rival titan — not a street crew.",
    goal: 1,
    rewardCash: 480,
    rewardXp: 140,
    repeatable: false,
    species: "brute",
    named: "Sewer King",
  },
  {
    id: "roof-wyrm",
    name: "Skyline Wyrm",
    tag: "Monster",
    kind: "hunt",
    blurb: "A long-backed wyrm is coiled on the east blocks, spitting slag. Climb or leap in, then smash it down.",
    goal: 1,
    rewardCash: 520,
    rewardXp: 150,
    repeatable: false,
    species: "wyrm",
    named: "Skyline Wyrm",
  },
  {
    id: "plaza-golem",
    name: "Plaza Golem",
    tag: "Monster",
    kind: "hunt",
    blurb: "A stone golem woke in the plaza. It hits like a truck. Put it back to gravel.",
    goal: 1,
    rewardCash: 640,
    rewardXp: 180,
    repeatable: false,
    species: "golem",
    named: "Plaza Golem",
    requires: ["sewer-king"],
  },
];

export function questById(id: string): QuestDef | undefined {
  return QUESTS.find((q) => q.id === id);
}

export function questUnlocked(save: SaveData, quest: QuestDef): boolean {
  if (!quest.requires?.length) return true;
  const done = new Set(save.completedQuests);
  return quest.requires.every((id) => done.has(id));
}

export function questStatus(save: SaveData, quest: QuestDef): "active" | "done" | "locked" | "open" {
  if (save.activeQuestId === quest.id) return "active";
  if (!quest.repeatable && save.completedQuests.includes(quest.id)) return "done";
  if (!questUnlocked(save, quest)) return "locked";
  return "open";
}
