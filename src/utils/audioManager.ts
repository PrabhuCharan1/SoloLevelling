/**
 * AudioManager Utility Class
 *
 * Centralized audio engine for playing pre-defined system sounds (e.g. quest-complete.mp3,
 * level-up.mp3, ui-click.mp3) from the assets folder. Supports polyphonic pooling,
 * preload caching, volume scaling, user preference integration, and graceful synthesis fallback.
 */

import { loadSettings } from './settingsStorage.ts';
import { soundService } from '../services/soundService.ts';

export type PredefinedSound =
  | 'quest-complete'
  | 'level-up'
  | 'ui-click'
  | 'quest-uncheck'
  | 'daily-complete'
  | 'reward-reveal'
  | 'reward-claim'
  | 'water-add'
  | 'tab-switch'
  | 'quest-complete.mp3'
  | 'level-up.mp3'
  | 'ui-click.mp3'
  | 'quest-uncheck.mp3'
  | 'daily-complete.mp3'
  | 'reward-reveal.mp3'
  | 'reward-claim.mp3'
  | 'water-add.mp3'
  | 'tab-switch.mp3';

export interface AudioPlayOptions {
  /**
   * Sound-specific volume multiplier (0.0 to 1.0). Defaults to 1.0.
   */
  volume?: number;
  /**
   * Playback rate multiplier (e.g. 1.0 for normal, 1.2 for faster).
   */
  rate?: number;
  /**
   * If true, bypasses user settings mute check (useful for audio test/preview buttons).
   */
  force?: boolean;
}

const SOUND_ASSET_MAP: Record<string, string> = {
  'quest-complete': '/assets/sounds/quest-complete.mp3',
  'quest-complete.mp3': '/assets/sounds/quest-complete.mp3',
  'level-up': '/assets/sounds/level-up.mp3',
  'level-up.mp3': '/assets/sounds/level-up.mp3',
  'ui-click': '/assets/sounds/ui-click.mp3',
  'ui-click.mp3': '/assets/sounds/ui-click.mp3',
  'quest-uncheck': '/assets/sounds/quest-uncheck.mp3',
  'quest-uncheck.mp3': '/assets/sounds/quest-uncheck.mp3',
  'daily-complete': '/assets/sounds/daily-complete.mp3',
  'daily-complete.mp3': '/assets/sounds/daily-complete.mp3',
  'reward-reveal': '/assets/sounds/reward-reveal.mp3',
  'reward-reveal.mp3': '/assets/sounds/reward-reveal.mp3',
  'reward-claim': '/assets/sounds/reward-claim.mp3',
  'reward-claim.mp3': '/assets/sounds/reward-claim.mp3',
  'water-add': '/assets/sounds/water-add.mp3',
  'water-add.mp3': '/assets/sounds/water-add.mp3',
  'tab-switch': '/assets/sounds/tab-switch.mp3',
  'tab-switch.mp3': '/assets/sounds/tab-switch.mp3',
};

export class AudioManager {
  private audioCache = new Map<string, HTMLAudioElement>();
  private masterVolume: number = 0.35; // Subtle, atmospheric baseline
  private isMuted: boolean = false;
  private userInteracted: boolean = false;

  constructor() {
    this.setupGestureUnlock();
  }

  /**
   * Listen for user gesture to unlock browser audio restrictions.
   */
  private setupGestureUnlock(): void {
    if (typeof window === 'undefined') return;

    const unlock = () => {
      this.userInteracted = true;
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
      window.removeEventListener('touchstart', unlock);
    };

    window.addEventListener('pointerdown', unlock, { passive: true, once: true });
    window.addEventListener('keydown', unlock, { passive: true, once: true });
    window.addEventListener('touchstart', unlock, { passive: true, once: true });
  }

  /**
   * Resolves a sound identifier to its asset path.
   */
  public resolveSoundPath(soundName: string): string {
    const cleanKey = soundName.trim();
    if (SOUND_ASSET_MAP[cleanKey]) {
      return SOUND_ASSET_MAP[cleanKey];
    }
    // If passed a path or filename directly
    if (cleanKey.startsWith('/') || cleanKey.startsWith('http')) {
      return cleanKey;
    }
    const withExt = cleanKey.endsWith('.mp3') ? cleanKey : `${cleanKey}.mp3`;
    return `/assets/sounds/${withExt}`;
  }

  /**
   * Preloads a sound or array of sounds into memory for instant zero-latency playback.
   */
  public preload(soundNames: (PredefinedSound | string)[]): void {
    if (typeof window === 'undefined') return;

    soundNames.forEach((name) => {
      const src = this.resolveSoundPath(name);
      if (!this.audioCache.has(src)) {
        try {
          const audio = new Audio(src);
          audio.preload = 'auto';
          this.audioCache.set(src, audio);
        } catch {
          // Ignore SSR / context errors
        }
      }
    });
  }

  /**
   * Checks whether sounds are enabled globally according to user settings and mute state.
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
   * Toggle or set the mute state.
   */
  public setMuted(muted: boolean): void {
    this.isMuted = muted;
    soundService.setMuted(muted);
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  /**
   * Set master volume (0.0 to 1.0).
   */
  public setMasterVolume(volume: number): void {
    this.masterVolume = Math.max(0, Math.min(1, volume));
    soundService.setMasterVolume(this.masterVolume);
  }

  public getMasterVolume(): number {
    return this.masterVolume;
  }

  /**
   * Plays a pre-defined sound (e.g. 'quest-complete.mp3', 'level-up.mp3', 'ui-click.mp3').
   * Uses polyphonic cloning for instant overlapping playback, with synthesizer fallback.
   */
  public async play(sound: PredefinedSound | string, options?: AudioPlayOptions): Promise<void> {
    if (typeof window === 'undefined') return;

    if (!options?.force && !this.isSoundEnabled()) {
      return;
    }

    const soundPath = this.resolveSoundPath(sound);
    const volumeMultiplier = options?.volume ?? 1.0;
    const finalVolume = Math.max(0, Math.min(1, this.masterVolume * volumeMultiplier));
    const rate = options?.rate ?? 1.0;

    try {
      // Obtain cached instance or instantiate
      let template = this.audioCache.get(soundPath);
      if (!template) {
        template = new Audio(soundPath);
        template.preload = 'auto';
        this.audioCache.set(soundPath, template);
      }

      // Clone node to support rapid polyphonic overlapping audio without cutting off
      const instance = template.cloneNode() as HTMLAudioElement;
      instance.volume = finalVolume;
      instance.playbackRate = rate;

      const playPromise = instance.play();
      if (playPromise !== undefined) {
        await playPromise.catch((playErr) => {
          // In case of browser autoplay rejection or network issue, fallback to synthesizer
          this.playFallbackSynth(sound, volumeMultiplier);
          if (playErr.name !== 'NotAllowedError') {
            console.debug('[AudioManager] Asset play fallback:', sound, playErr.message);
          }
        });
      }
    } catch {
      // Seamless Web Audio synthesis fallback
      this.playFallbackSynth(sound, volumeMultiplier);
    }
  }

  /**
   * Fallback Web Audio synthesizer for pre-defined sounds if asset loading fails.
   */
  private playFallbackSynth(sound: string, volumeMultiplier: number): void {
    const key = sound.replace('.mp3', '');
    switch (key) {
      case 'quest-complete':
        soundService.play('quest_complete', { volumeMultiplier, force: true });
        break;
      case 'level-up':
        soundService.play('level_up', { volumeMultiplier, force: true });
        break;
      case 'ui-click':
        soundService.play('ui_tap', { volumeMultiplier, force: true });
        break;
      case 'quest-uncheck':
        soundService.play('quest_uncheck', { volumeMultiplier, force: true });
        break;
      case 'daily-complete':
        soundService.play('daily_all_complete', { volumeMultiplier, force: true });
        break;
      case 'reward-reveal':
        soundService.play('reward_reveal', { volumeMultiplier, force: true });
        break;
      case 'reward-claim':
        soundService.play('reward_claim', { volumeMultiplier, force: true });
        break;
      case 'water-add':
        soundService.play('water_add', { volumeMultiplier, force: true });
        break;
      case 'tab-switch':
        soundService.play('tab_switch', { volumeMultiplier, force: true });
        break;
    }
  }

  // =========================================================================
  // CONVENIENCE SHORTHAND METHODS
  // =========================================================================

  public playQuestComplete(options?: AudioPlayOptions): Promise<void> {
    return this.play('quest-complete.mp3', options);
  }

  public playLevelUp(options?: AudioPlayOptions): Promise<void> {
    return this.play('level-up.mp3', options);
  }

  public playUiClick(options?: AudioPlayOptions): Promise<void> {
    return this.play('ui-click.mp3', options);
  }

  public playQuestUncheck(options?: AudioPlayOptions): Promise<void> {
    return this.play('quest-uncheck.mp3', options);
  }

  public playDailyComplete(options?: AudioPlayOptions): Promise<void> {
    return this.play('daily-complete.mp3', options);
  }

  public playRewardReveal(options?: AudioPlayOptions): Promise<void> {
    return this.play('reward-reveal.mp3', options);
  }

  public playRewardClaim(options?: AudioPlayOptions): Promise<void> {
    return this.play('reward-claim.mp3', options);
  }

  public playWaterAdd(options?: AudioPlayOptions): Promise<void> {
    return this.play('water-add.mp3', options);
  }

  public playTabSwitch(options?: AudioPlayOptions): Promise<void> {
    return this.play('tab-switch.mp3', options);
  }
}

// Export singleton instance
export const audioManager = new AudioManager();

// Preload core sound assets immediately on client
if (typeof window !== 'undefined') {
  audioManager.preload([
    'quest-complete.mp3',
    'level-up.mp3',
    'ui-click.mp3',
    'tab-switch.mp3',
    'reward-reveal.mp3',
    'reward-claim.mp3',
    'water-add.mp3',
  ]);
}
