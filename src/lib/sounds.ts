// Sound system managing background theme music loop and MP3 sound effects

class SoundManager {
  private isMuted: boolean = true; // Always muted initially on page load
  private bgMusic: HTMLAudioElement | null = null;
  private listeners: Set<(isMuted: boolean) => void> = new Set();

  constructor() {
    // Always start muted on fresh load / session
    this.isMuted = true;
    if (typeof window !== "undefined") {
      try {
        localStorage.removeItem("gavel_amongus_mute");
      } catch {
        // Ignore storage restrictions
      }
    }
  }

  public subscribe(listener: (isMuted: boolean) => void) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    this.listeners.forEach((fn) => fn(this.isMuted));
  }

  private getBgMusic(): HTMLAudioElement | null {
    if (typeof window === "undefined") return null;
    if (!this.bgMusic) {
      this.bgMusic = new Audio("/sounds/main_theme.mp3");
      this.bgMusic.loop = true; // Loop continuously
      this.bgMusic.volume = 0.35; // Ambient background volume
    }
    return this.bgMusic;
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  /** Turns on sound effects without the looping theme music (used by the projector). */
  public enableEffectsOnly() {
    this.isMuted = false;
    this.bgMusic?.pause();
    this.notify();
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;

    const music = this.getBgMusic();
    if (music) {
      if (this.isMuted) {
        music.pause();
      } else {
        music.play().catch(() => {
          // Gracefully handles if main_theme.mp3 isn't added yet or browser restriction
        });
        this.playClick();
      }
    }

    this.notify();
    return this.isMuted;
  }

  public playSound(audioPath: string, volume: number = 0.6) {
    if (this.isMuted || typeof window === "undefined") return;
    try {
      const audio = new Audio(audioPath);
      audio.volume = volume;
      audio.play().catch(() => {
        // Handle browser autoplay policy restrictions gracefully
      });
    } catch {
      // Audio playback error handling
    }
  }

  // 1. Button click / Terminal blip
  public playClick() {
    this.playSound("/sounds/click.mp3", 0.6);
  }

  // 2. Emergency meeting / Red alarm siren
  public playEmergency() {
    this.playSound("/sounds/emergency.mp3", 0.7);
  }

  // 3. Task completed chime
  public playTaskComplete() {
    this.playSound("/sounds/task.mp3", 0.6);
  }

  // 4. Role reveal / Impostor sting
  public playRoleReveal() {
    this.playSound("/sounds/role_reveal.mp3", 0.7);
  }

  // 5. Game start / Navigation whoosh
  public playStart() {
    this.playSound("/sounds/start.mp3", 0.6);
  }
}

export const sounds = new SoundManager();
