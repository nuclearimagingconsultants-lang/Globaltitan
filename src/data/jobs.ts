import type { JobType } from "./types";

export type JobDef = {
  type: JobType;
  name: string;
  site: string;
  pay: number;
  blurb: string;
  energy: number;
  hunger: number;
  mood: number;
};

export const JOBS: JobDef[] = [
  {
    type: "lab",
    name: "Gamma lab tech",
    site: "Municipal Lab",
    pay: 220,
    blurb: "Night slides and a Geiger that never quite sits still.",
    energy: -28,
    hunger: -14,
    mood: 6,
  },
  {
    type: "cafe",
    name: "Corner cafe",
    site: "Steam & Stoop",
    pay: 110,
    blurb: "Pour, wipe, nod. Tips if the mood holds.",
    energy: -16,
    hunger: -8,
    mood: 14,
  },
  {
    type: "warehouse",
    name: "Night warehouse",
    site: "Pier Freight",
    pay: 180,
    blurb: "Crates, forklifts, a radio that only plays static hymns.",
    energy: -32,
    hunger: -18,
    mood: -4,
  },
  {
    type: "office",
    name: "City clerk",
    site: "Records Annex",
    pay: 150,
    blurb: "Stamps, fluorescent hum, forms that outlive the people.",
    energy: -20,
    hunger: -10,
    mood: -8,
  },
];

export function jobByType(type: JobType): JobDef {
  return JOBS.find((j) => j.type === type) ?? JOBS[0]!;
}
