// Sound system with Web Audio API synthesis and optional MP3 fallback

class SoundManager {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private hasInteracted: boolean = false;

  constructor() {
    if (typeof window !== "undefined") {
      const storedMute = localStorage.getItem("gavel_amongus_mute");
      this.isMuted = storedMute === "true";
    }
  }

  private initContext() {
    if (typeof window === "undefined") return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume();
    }
    this.hasInteracted = true;
    return this.ctx;
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    if (typeof window !== "undefined") {
      localStorage.setItem("gavel_amongus_mute", String(this.isMuted));
    }
    if (!this.isMuted) {
      this.playClick();
    }
    return this.isMuted;
  }

  // Play an MP3 file if present, otherwise call the synthesizer callback
  private playWithFallback(audioPath: string, synthFallback: () => void) {
    if (this.isMuted || typeof window === "undefined") return;
    this.initContext();

    const audio = new Audio(audioPath);
    audio.volume = 0.6;
    audio.play().catch(() => {
      // If external mp3 is missing or blocked, use native synthesized sound
      synthFallback();
    });
  }

  // 1. Button click / Terminal blip
  public playClick() {
    this.playWithFallback("/sounds/click.mp3", () => {
      const ctx = this.initContext();
      if (!ctx || this.isMuted) return;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(800, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 0.08);

      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.08);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.08);
    });
  }

  // 2. Emergency meeting / Red alarm siren
  public playEmergency() {
    this.playWithFallback("/sounds/emergency.mp3", () => {
      const ctx = this.initContext();
      if (!ctx || this.isMuted) return;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(520, ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(880, ctx.currentTime + 0.2);
      osc.frequency.linearRampToValueAtTime(520, ctx.currentTime + 0.4);
      osc.frequency.linearRampToValueAtTime(880, ctx.currentTime + 0.6);
      osc.frequency.linearRampToValueAtTime(520, ctx.currentTime + 0.8);

      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.85);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.85);
    });
  }

  // 3. Task completed chime (pleasant high pitch 2-tone)
  public playTaskComplete() {
    this.playWithFallback("/sounds/task.mp3", () => {
      const ctx = this.initContext();
      if (!ctx || this.isMuted) return;

      const now = ctx.currentTime;
      [
        { freq: 587.33, start: 0, dur: 0.15 }, // D5
        { freq: 880, start: 0.12, dur: 0.3 },   // A5
      ].forEach((n) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = "triangle";
        osc.frequency.setValueAtTime(n.freq, now + n.start);

        gain.gain.setValueAtTime(0.2, now + n.start);
        gain.gain.exponentialRampToValueAtTime(0.001, now + n.start + n.dur);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + n.start);
        osc.stop(now + n.start + n.dur);
      });
    });
  }

  // 4. Role reveal / Impostor sting (eerie dramatic chord)
  public playRoleReveal() {
    this.playWithFallback("/sounds/role_reveal.mp3", () => {
      const ctx = this.initContext();
      if (!ctx || this.isMuted) return;

      const now = ctx.currentTime;
      const notes = [220, 261.63, 311.13, 440]; // A minor with diminished hint
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(freq, now);

        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 1.2 + idx * 0.1);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + 1.5);
      });
    });
  }

  // 5. Game start / Navigation whoosh
  public playStart() {
    this.playWithFallback("/sounds/start.mp3", () => {
      const ctx = this.initContext();
      if (!ctx || this.isMuted) return;

      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(300, now);
      osc.frequency.exponentialRampToValueAtTime(900, now + 0.25);

      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.3);
    });
  }
}

export const sounds = new SoundManager();
