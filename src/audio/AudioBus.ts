export class AudioBus {
  private ctx: AudioContext | null = null;
  muted = false;

  private ensure(): AudioContext | null {
    if (this.muted) return null;
    if (!this.ctx) {
      const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new Ctx();
    }
    if (this.ctx.state === "suspended") {
      void this.ctx.resume();
    }
    return this.ctx;
  }

  unlock(): void {
    this.ensure();
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    if (muted && this.ctx) {
      void this.ctx.suspend();
    } else if (!muted) {
      this.ensure();
    }
  }

  tone(freq: number, dur = 0.12, type: OscillatorType = "square", gain = 0.06, slide = 0): void {
    const ctx = this.ensure();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    if (slide !== 0) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, freq + slide), ctx.currentTime + dur);
    }
    g.gain.setValueAtTime(gain, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur);
    osc.connect(g);
    g.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + dur);
  }

  thud(): void {
    this.tone(90, 0.18, "sawtooth", 0.09, -40);
  }

  smash(): void {
    this.tone(70, 0.22, "sawtooth", 0.11, -30);
    this.tone(180, 0.08, "square", 0.04);
  }

  jump(): void {
    this.tone(220, 0.1, "triangle", 0.05, 80);
  }

  rage(): void {
    this.tone(140, 0.35, "sawtooth", 0.08, 120);
  }

  hit(): void {
    this.tone(320, 0.07, "square", 0.05, -80);
  }

  hurt(): void {
    this.tone(160, 0.16, "sawtooth", 0.07, -70);
  }

  success(): void {
    this.tone(440, 0.1, "triangle", 0.05, 40);
    window.setTimeout(() => this.tone(660, 0.14, "triangle", 0.05), 90);
  }

  boss(): void {
    this.tone(80, 0.4, "sawtooth", 0.1, -20);
  }

  ui(): void {
    this.tone(520, 0.05, "square", 0.03);
  }

  whoosh(): void {
    this.tone(400, 0.16, "triangle", 0.03, -200);
  }

  /** Original metallic scrape — not a licensed claw SFX. */
  snikt(): void {
    this.tone(2100, 0.045, "sawtooth", 0.07, -1400);
    this.tone(880, 0.09, "square", 0.045, -420);
    this.tone(140, 0.07, "triangle", 0.03, -40);
  }

  private humOsc: OscillatorNode | null = null;
  private humGain: GainNode | null = null;

  gammaHum(level: number): void {
    const ctx = this.ensure();
    if (!ctx) {
      this.humStop();
      return;
    }
    if (level < 0.08) {
      this.humStop();
      return;
    }
    if (!this.humOsc || !this.humGain) {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(70, ctx.currentTime);
      g.gain.setValueAtTime(0.0001, ctx.currentTime);
      osc.connect(g);
      g.connect(ctx.destination);
      osc.start();
      this.humOsc = osc;
      this.humGain = g;
    }
    this.humOsc.frequency.setTargetAtTime(62 + level * 90, ctx.currentTime, 0.12);
    this.humGain.gain.setTargetAtTime(0.008 + level * 0.028, ctx.currentTime, 0.18);
  }

  humStop(): void {
    const ctx = this.ctx;
    if (this.humGain && ctx) {
      try {
        this.humGain.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.2);
      } catch {
        /* stopped */
      }
    }
    const osc = this.humOsc;
    this.humOsc = null;
    this.humGain = null;
    if (osc) {
      window.setTimeout(() => {
        try {
          osc.stop();
        } catch {
          /* stopped */
        }
      }, 280);
    }
  }

  private rivalOsc: OscillatorNode | null = null;
  private rivalGain: GainNode | null = null;
  private rivalLfo: OscillatorNode | null = null;

  rivalStart(): void {
    this.rivalStop();
    const ctx = this.ensure();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const lfo = ctx.createOscillator();
    const g = ctx.createGain();
    const lfoGain = ctx.createGain();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(52, ctx.currentTime);
    lfo.type = "sine";
    lfo.frequency.setValueAtTime(1.7, ctx.currentTime);
    lfoGain.gain.setValueAtTime(9, ctx.currentTime);
    g.gain.setValueAtTime(0.0001, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.045, ctx.currentTime + 0.4);
    lfo.connect(lfoGain);
    lfoGain.connect(osc.frequency);
    osc.connect(g);
    g.connect(ctx.destination);
    osc.start();
    lfo.start();
    this.rivalOsc = osc;
    this.rivalGain = g;
    this.rivalLfo = lfo;
  }

  rivalStop(): void {
    const ctx = this.ctx;
    if (this.rivalGain && ctx) {
      try {
        this.rivalGain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.25);
      } catch {
        /* already stopped */
      }
    }
    const osc = this.rivalOsc;
    const lfo = this.rivalLfo;
    this.rivalOsc = null;
    this.rivalLfo = null;
    this.rivalGain = null;
    if (osc) {
      window.setTimeout(() => {
        try {
          osc.stop();
          lfo?.stop();
        } catch {
          /* already stopped */
        }
      }, 280);
    }
  }
}
