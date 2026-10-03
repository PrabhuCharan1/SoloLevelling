/**
 * Sound Service - RPG / System Atmospheric Audio Synthesizer
 *
 * Provides subtle, high-tech, atmospheric sound effects using the Web Audio API.
 * 100% client-side, zero external assets, instant response, and fully volume-controlled.
 */

import { loadSettings } from '../utils/settingsStorage.ts';

export type SystemSoundType =
  | 'quest_complete'
  | 'quest_uncheck'
  | 'level_up'
  | 'daily_all_complete'
  | 'reward_reveal'
  | 'reward_claim'
  | 'ui_tap'
  | 'ui_toggle'
  | 'tab_switch'
  | 'water_add'
  | 'exercise_check'
  | 'system_ping';

class SoundService {
  private audioCtx: AudioContext | null = null;
  private isMuted: boolean = false;
  private masterVolume: number = 0.22; // Subtle, atmospheric baseline
  private hasInteracted: boolean = false;

  constructor() {
    this.setupUserGestureListener();
  }

  /**
   * Listen for the first user gesture to unlock AudioContext in strict browsers.
   */
  private setupUserGestureListener(): void {
    if (typeof window === 'undefined') return;

    const unlock = () => {
      this.hasInteracted = true;
      if (this.audioCtx && this.audioCtx.state === 'suspended') {
        this.audioCtx.resume().catch(() => {});
      }
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
      window.removeEventListener('touchstart', unlock);
    };

    window.addEventListener('pointerdown', unlock, { passive: true, once: true });
    window.addEventListener('keydown', unlock, { passive: true, once: true });
    window.addEventListener('touchstart', unlock, { passive: true, once: true });
  }

  /**
   * Initializes or returns the active AudioContext safely.
   */
  private getAudioContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;

    if (!this.audioCtx) {
      const AudioCtxClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtxClass) {
        this.audioCtx = new AudioCtxClass();
      }
    }

    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume().catch(() => {});
    }

    return this.audioCtx;
  }

  /**
   * Checks whether sound effects are globally enabled in user settings.
   */
  public isSoundEnabled(): boolean {
    if (this.isMuted) return false;
    try {
      const settings = loadSettings();
      return settings?.gamification?.soundEffects !== false;
    } catch {
      return true;
    }
  }

  /**
   * Manually mute or unmute sound effects.
   */
  public setMuted(muted: boolean): void {
    this.isMuted = muted;
  }

  /**
   * Adjust master volume (0.0 to 1.0).
   */
  public setMasterVolume(vol: number): void {
    this.masterVolume = Math.max(0, Math.min(1, vol));
  }

  public getMasterVolume(): number {
    return this.masterVolume;
  }

  /**
   * Synthesize and play a specific atmospheric system sound effect.
   */
  public play(type: SystemSoundType, options?: { volumeMultiplier?: number; force?: boolean }): void {
    if (!options?.force && !this.isSoundEnabled()) return;

    const ctx = this.getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const volMult = options?.volumeMultiplier ?? 1.0;
    const baseGain = this.masterVolume * volMult;

    try {
      switch (type) {
        case 'quest_complete':
          this.playQuestComplete(ctx, now, baseGain);
          break;
        case 'quest_uncheck':
          this.playQuestUncheck(ctx, now, baseGain);
          break;
        case 'level_up':
          this.playLevelUp(ctx, now, baseGain);
          break;
        case 'daily_all_complete':
          this.playDailyAllComplete(ctx, now, baseGain);
          break;
        case 'reward_reveal':
          this.playRewardReveal(ctx, now, baseGain);
          break;
        case 'reward_claim':
          this.playRewardClaim(ctx, now, baseGain);
          break;
        case 'ui_tap':
          this.playUiTap(ctx, now, baseGain * 0.7);
          break;
        case 'ui_toggle':
          this.playUiToggle(ctx, now, baseGain * 0.85);
          break;
        case 'tab_switch':
          this.playTabSwitch(ctx, now, baseGain * 0.55);
          break;
        case 'water_add':
          this.playWaterAdd(ctx, now, baseGain);
          break;
        case 'exercise_check':
          this.playExerciseCheck(ctx, now, baseGain);
          break;
        case 'system_ping':
          this.playSystemPing(ctx, now, baseGain);
          break;
      }
    } catch (e) {
      console.warn('[SoundService] Audio synthesis error:', e);
    }
  }

  // =========================================================================
  // SYNTHESIZERS FOR INDIVIDUAL RPG SYSTEM SOUNDS
  // =========================================================================

  /**
   * Quest Complete: Crystal clear, dual-tone harmonic chime with resonance.
   * D5 (587.3Hz) -> A5 (880Hz) + shimmer overtone D6 (1174Hz).
   */
  private playQuestComplete(ctx: AudioContext, t0: number, gainLevel: number): void {
    const master = ctx.createGain();
    master.gain.setValueAtTime(gainLevel * 1.1, t0);
    master.connect(ctx.destination);

    // Lowpass filter for smooth warmth
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(3200, t0);
    filter.connect(master);

    // Note 1: D5 (587.3 Hz)
    const osc1 = ctx.createOscillator();
    const g1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(587.33, t0);
    g1.gain.setValueAtTime(0, t0);
    g1.gain.linearRampToValueAtTime(0.5, t0 + 0.015);
    g1.gain.exponentialRampToValueAtTime(0.001, t0 + 0.38);
    osc1.connect(g1);
    g1.connect(filter);
    osc1.start(t0);
    osc1.stop(t0 + 0.4);

    // Note 2: A5 (880 Hz) - slightly delayed
    const t1 = t0 + 0.085;
    const osc2 = ctx.createOscillator();
    const g2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(880.0, t1);
    g2.gain.setValueAtTime(0, t1);
    g2.gain.linearRampToValueAtTime(0.65, t1 + 0.018);
    g2.gain.exponentialRampToValueAtTime(0.001, t1 + 0.5);
    osc2.connect(g2);
    g2.connect(filter);
    osc2.start(t1);
    osc2.stop(t1 + 0.52);

    // Shimmer harmonic: D6 (1174.6 Hz)
    const t2 = t0 + 0.12;
    const osc3 = ctx.createOscillator();
    const g3 = ctx.createGain();
    osc3.type = 'triangle';
    osc3.frequency.setValueAtTime(1174.66, t2);
    g3.gain.setValueAtTime(0, t2);
    g3.gain.linearRampToValueAtTime(0.2, t2 + 0.015);
    g3.gain.exponentialRampToValueAtTime(0.001, t2 + 0.45);
    osc3.connect(g3);
    g3.connect(filter);
    osc3.start(t2);
    osc3.stop(t2 + 0.48);
  }

  /**
   * Quest Uncheck: Soft mechanical/digital descending decrescendo.
   */
  private playQuestUncheck(ctx: AudioContext, t0: number, gainLevel: number): void {
    const master = ctx.createGain();
    master.gain.setValueAtTime(gainLevel * 0.7, t0);
    master.connect(ctx.destination);

    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(440, t0);
    osc.frequency.exponentialRampToValueAtTime(310, t0 + 0.08);

    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(0.3, t0 + 0.01);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + 0.09);

    osc.connect(g);
    g.connect(master);
    osc.start(t0);
    osc.stop(t0 + 0.1);
  }

  /**
   * Level Up: Ascending holographic RPG fanfare with sub-bass pulse & crystalline chords.
   */
  private playLevelUp(ctx: AudioContext, t0: number, gainLevel: number): void {
    const master = ctx.createGain();
    master.gain.setValueAtTime(gainLevel * 1.3, t0);
    master.connect(ctx.destination);

    // Sub-bass resonance pulse (110Hz -> 130Hz)
    const subOsc = ctx.createOscillator();
    const subGain = ctx.createGain();
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(110, t0);
    subOsc.frequency.linearRampToValueAtTime(130, t0 + 0.5);
    subGain.gain.setValueAtTime(0, t0);
    subGain.gain.linearRampToValueAtTime(0.4, t0 + 0.04);
    subGain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.8);
    subOsc.connect(subGain);
    subGain.connect(master);
    subOsc.start(t0);
    subOsc.stop(t0 + 0.85);

    // Ascending arpeggio notes: C4 (261.63), E4 (329.63), G4 (392.00), C5 (523.25), E5 (659.25), G5 (783.99), C6 (1046.50)
    const notes = [
      { freq: 261.63, delay: 0.0, dur: 0.35, vol: 0.4 },
      { freq: 329.63, delay: 0.08, dur: 0.35, vol: 0.45 },
      { freq: 392.0, delay: 0.16, dur: 0.35, vol: 0.5 },
      { freq: 523.25, delay: 0.24, dur: 0.45, vol: 0.6 },
      { freq: 659.25, delay: 0.32, dur: 0.45, vol: 0.65 },
      { freq: 783.99, delay: 0.4, dur: 0.55, vol: 0.7 },
      { freq: 1046.5, delay: 0.48, dur: 0.85, vol: 0.85 },
      { freq: 2093.0, delay: 0.52, dur: 0.95, vol: 0.35 }, // Celestial overtone C7
    ];

    notes.forEach((n) => {
      const noteTime = t0 + n.delay;
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = n.freq > 1000 ? 'triangle' : 'sine';
      osc.frequency.setValueAtTime(n.freq, noteTime);

      g.gain.setValueAtTime(0, noteTime);
      g.gain.linearRampToValueAtTime(n.vol, noteTime + 0.015);
      g.gain.exponentialRampToValueAtTime(0.001, noteTime + n.dur);

      osc.connect(g);
      g.connect(master);
      osc.start(noteTime);
      osc.stop(noteTime + n.dur + 0.05);
    });
  }

  /**
   * Daily All Complete: 100% daily quest completion triumphant fanfare.
   */
  private playDailyAllComplete(ctx: AudioContext, t0: number, gainLevel: number): void {
    const master = ctx.createGain();
    master.gain.setValueAtTime(gainLevel * 1.15, t0);
    master.connect(ctx.destination);

    // Warm chord: F5 (698.46) + A5 (880.00) + C6 (1046.50)
    const chord = [698.46, 880.0, 1046.5, 1396.91];
    chord.forEach((freq, idx) => {
      const noteTime = t0 + idx * 0.06;
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, noteTime);

      g.gain.setValueAtTime(0, noteTime);
      g.gain.linearRampToValueAtTime(0.4, noteTime + 0.02);
      g.gain.exponentialRampToValueAtTime(0.001, noteTime + 0.65);

      osc.connect(g);
      g.connect(master);
      osc.start(noteTime);
      osc.stop(noteTime + 0.7);
    });
  }

  /**
   * Reward Reveal: Mystical crystalline sparkle cascade.
   */
  private playRewardReveal(ctx: AudioContext, t0: number, gainLevel: number): void {
    const master = ctx.createGain();
    master.gain.setValueAtTime(gainLevel, t0);
    master.connect(ctx.destination);

    // Sparkle chime sequence
    const sparkles = [784, 988, 1175, 1568, 1976];
    sparkles.forEach((freq, idx) => {
      const noteTime = t0 + idx * 0.05;
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, noteTime);

      g.gain.setValueAtTime(0, noteTime);
      g.gain.linearRampToValueAtTime(0.35, noteTime + 0.012);
      g.gain.exponentialRampToValueAtTime(0.001, noteTime + 0.35);

      osc.connect(g);
      g.connect(master);
      osc.start(noteTime);
      osc.stop(noteTime + 0.38);
    });
  }

  /**
   * Reward Claim: Energetic gold claim chime with bass bloom.
   */
  private playRewardClaim(ctx: AudioContext, t0: number, gainLevel: number): void {
    const master = ctx.createGain();
    master.gain.setValueAtTime(gainLevel * 1.2, t0);
    master.connect(ctx.destination);

    // Low thump
    const sub = ctx.createOscillator();
    const subG = ctx.createGain();
    sub.frequency.setValueAtTime(140, t0);
    sub.frequency.exponentialRampToValueAtTime(80, t0 + 0.2);
    subG.gain.setValueAtTime(0.5, t0);
    subG.gain.exponentialRampToValueAtTime(0.001, t0 + 0.25);
    sub.connect(subG);
    subG.connect(master);
    sub.start(t0);
    sub.stop(t0 + 0.28);

    // Ascending dual chime (880Hz -> 1320Hz -> 1760Hz)
    const tones = [880, 1320, 1760];
    tones.forEach((freq, i) => {
      const time = t0 + 0.05 + i * 0.08;
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, time);
      g.gain.setValueAtTime(0, time);
      g.gain.linearRampToValueAtTime(0.5, time + 0.015);
      g.gain.exponentialRampToValueAtTime(0.001, time + 0.45);
      osc.connect(g);
      g.connect(master);
      osc.start(time);
      osc.stop(time + 0.48);
    });
  }

  /**
   * UI Tap: Subtle, crisp holographic click (glass terminal feel).
   */
  private playUiTap(ctx: AudioContext, t0: number, gainLevel: number): void {
    const master = ctx.createGain();
    master.gain.setValueAtTime(gainLevel * 0.8, t0);
    master.connect(ctx.destination);

    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1200, t0);
    osc.frequency.exponentialRampToValueAtTime(600, t0 + 0.025);

    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(0.3, t0 + 0.004);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + 0.028);

    osc.connect(g);
    g.connect(master);
    osc.start(t0);
    osc.stop(t0 + 0.035);
  }

  /**
   * UI Toggle: Dual soft tick (low to high or switch sound).
   */
  private playUiToggle(ctx: AudioContext, t0: number, gainLevel: number): void {
    const master = ctx.createGain();
    master.gain.setValueAtTime(gainLevel * 0.9, t0);
    master.connect(ctx.destination);

    const osc1 = ctx.createOscillator();
    const g1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(650, t0);
    g1.gain.setValueAtTime(0.25, t0);
    g1.gain.exponentialRampToValueAtTime(0.001, t0 + 0.035);
    osc1.connect(g1);
    g1.connect(master);
    osc1.start(t0);
    osc1.stop(t0 + 0.04);

    const t1 = t0 + 0.04;
    const osc2 = ctx.createOscillator();
    const g2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(950, t1);
    g2.gain.setValueAtTime(0.3, t1);
    g2.gain.exponentialRampToValueAtTime(0.001, t1 + 0.04);
    osc2.connect(g2);
    g2.connect(master);
    osc2.start(t1);
    osc2.stop(t1 + 0.05);
  }

  /**
   * Tab Switch: Ultra-subtle navigational pulse / high-tech sweep.
   */
  private playTabSwitch(ctx: AudioContext, t0: number, gainLevel: number): void {
    const master = ctx.createGain();
    master.gain.setValueAtTime(gainLevel * 0.6, t0);
    master.connect(ctx.destination);

    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(750, t0);
    osc.frequency.exponentialRampToValueAtTime(1100, t0 + 0.04);

    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(0.2, t0 + 0.005);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + 0.045);

    osc.connect(g);
    g.connect(master);
    osc.start(t0);
    osc.stop(t0 + 0.05);
  }

  /**
   * Water Add: Gentle aquatic bubble resonance sweep.
   */
  private playWaterAdd(ctx: AudioContext, t0: number, gainLevel: number): void {
    const master = ctx.createGain();
    master.gain.setValueAtTime(gainLevel * 0.9, t0);
    master.connect(ctx.destination);

    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sine';
    // Frequency sweep imitating droplet pitch rise
    osc.frequency.setValueAtTime(420, t0);
    osc.frequency.exponentialRampToValueAtTime(840, t0 + 0.075);

    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(0.4, t0 + 0.015);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + 0.09);

    osc.connect(g);
    g.connect(master);
    osc.start(t0);
    osc.stop(t0 + 0.1);
  }

  /**
   * Exercise Check: High-energy workout check ping.
   */
  private playExerciseCheck(ctx: AudioContext, t0: number, gainLevel: number): void {
    const master = ctx.createGain();
    master.gain.setValueAtTime(gainLevel * 1.0, t0);
    master.connect(ctx.destination);

    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(780, t0);
    osc.frequency.exponentialRampToValueAtTime(1250, t0 + 0.06);

    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(0.45, t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + 0.16);

    osc.connect(g);
    g.connect(master);
    osc.start(t0);
    osc.stop(t0 + 0.18);
  }

  /**
   * System Ping: Futuristic holographic AI system blip.
   */
  private playSystemPing(ctx: AudioContext, t0: number, gainLevel: number): void {
    const master = ctx.createGain();
    master.gain.setValueAtTime(gainLevel * 0.85, t0);
    master.connect(ctx.destination);

    // Two rapid micro-beeps
    [0, 0.07].forEach((delay, idx) => {
      const time = t0 + delay;
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(idx === 0 ? 1046 : 1318, time);

      g.gain.setValueAtTime(0, time);
      g.gain.linearRampToValueAtTime(0.3, time + 0.006);
      g.gain.exponentialRampToValueAtTime(0.001, time + 0.045);

      osc.connect(g);
      g.connect(master);
      osc.start(time);
      osc.stop(time + 0.05);
    });
  }
}

export const soundService = new SoundService();
