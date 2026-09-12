import type { AudioBus } from "../audio/AudioBus";
import { jobByType, type JobDef } from "../data/jobs";
import type { BannerLifeSave, JobType, SaveData } from "../data/types";
import type { LifeSite } from "../world/CityWorld";

export class BannerLife {
  shifting = false;
  private shiftLeft = 0;
  private job: JobDef | null = null;

  clockLabel(life: BannerLifeSave): string {
    const h = Math.floor(life.hour) % 24;
    const m = Math.floor((life.hour % 1) * 60);
    const ap = h >= 12 ? "PM" : "AM";
    const hr = h % 12 || 12;
    return `Day ${life.day} · ${hr}:${m.toString().padStart(2, "0")} ${ap}`;
  }

  tick(dt: number, save: SaveData, isBanner: boolean, moving: boolean): void {
    const life = save.life;
    const rate = this.shifting ? 2.6 : 0.085;
    life.hour += dt * rate;
    if (life.hour >= 24) {
      life.hour -= 24;
      life.day += 1;
    }
    if (this.shifting) {
      this.shiftLeft -= dt;
      if (this.shiftLeft <= 0) this.finishShift(save);
    }
    if (!isBanner) return;
    const drain = moving ? 1 : 0.45;
    life.energy = clamp(life.energy - dt * 0.55 * drain);
    life.hunger = clamp(life.hunger - dt * 0.7 * drain);
    life.mood = clamp(life.mood - dt * 0.28 + (life.hunger > 40 && life.energy > 40 ? dt * 0.08 : 0));
    if (life.hunger < 8) life.mood = clamp(life.mood - dt * 0.8);
    if (life.energy < 8) life.mood = clamp(life.mood - dt * 0.5);
  }

  applyAtmosphereMix(hour: number): number {
    if (hour < 5.5 || hour >= 21) return 1;
    if (hour < 7) return (7 - hour) / 1.5;
    if (hour >= 19) return (hour - 19) / 2;
    return 0;
  }

  trySite(site: LifeSite | null, save: SaveData, audio: AudioBus): string | null {
    if (!site || this.shifting) return null;
    const life = save.life;
    if (site.kind === "apartment") {
      life.energy = clamp(life.energy + 55, 100);
      life.mood = clamp(life.mood + 8);
      life.hour = (life.hour + 7.5) % 24;
      if (life.hour < 7.5) life.day += 1;
      audio.ui();
      return "Slept. Energy back. The city kept moving.";
    }
    if (site.kind === "diner") {
      if (save.cash < 12) return "Need $12 for a plate.";
      save.cash -= 12;
      life.hunger = clamp(life.hunger + 48, 100);
      life.mood = clamp(life.mood + 10);
      audio.ui();
      return "Ate. Hunger eases. Banner stays a civilian a little longer.";
    }
    if (site.kind === "job" && site.jobType) {
      if (!life.jobType) {
        life.jobType = site.jobType;
        audio.success();
        return `Hired: ${jobByType(site.jobType).name} at ${site.label}. H again to work a shift.`;
      }
      if (life.jobType !== site.jobType) {
        return `You work at ${jobByType(life.jobType).site}. Walk there, or quit from pause later.`;
      }
      if (life.lastShiftDay === life.day) return "Shift already pulled today. Sleep it off.";
      if (life.energy < 22) return "Too tired to clock in. Sleep first.";
      this.job = jobByType(site.jobType);
      this.shifting = true;
      this.shiftLeft = 6.4;
      audio.ui();
      return `Shift started — ${this.job.name}. Time compresses.`;
    }
    return null;
  }

  quitJob(save: SaveData): string {
    if (!save.life.jobType) return "No job on the books.";
    const name = jobByType(save.life.jobType).name;
    save.life.jobType = null;
    return `Quit ${name}. The city does not mind.`;
  }

  jobName(save: SaveData): string {
    return save.life.jobType ? jobByType(save.life.jobType).name : "Unemployed";
  }

  speedMul(life: BannerLifeSave): number {
    const tired = life.energy < 20 ? 0.72 : 1;
    const hungry = life.hunger < 15 ? 0.82 : 1;
    const blue = life.mood < 18 ? 0.88 : 1;
    return tired * hungry * blue;
  }

  private finishShift(save: SaveData): void {
    this.shifting = false;
    const job = this.job;
    this.job = null;
    if (!job) return;
    const life = save.life;
    life.lastShiftDay = life.day;
    life.energy = clamp(life.energy + job.energy);
    life.hunger = clamp(life.hunger + job.hunger);
    life.mood = clamp(life.mood + job.mood);
    save.cash += job.pay;
  }
}

function clamp(n: number, max = 100): number {
  return Math.max(0, Math.min(max, n));
}

export const JOB_TYPES: JobType[] = ["lab", "cafe", "warehouse", "office"];
