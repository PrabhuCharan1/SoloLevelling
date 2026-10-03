/**
 * Web Audio and Audio Assets synthesizer for futuristic Hunter System sound effects.
 * Bridges AudioManager and SoundService.
 */

import { soundService, SystemSoundType } from '../services/soundService.ts';
import { audioManager, PredefinedSound, AudioPlayOptions } from './audioManager.ts';

export class SoundSystem {
  public play(type: SystemSoundType | PredefinedSound, options?: { volumeMultiplier?: number; force?: boolean }): void {
    if (type === 'quest_complete' || type === 'quest-complete' || type === 'quest-complete.mp3') {
      audioManager.playQuestComplete({ volume: options?.volumeMultiplier, force: options?.force });
    } else if (type === 'level_up' || type === 'level-up' || type === 'level-up.mp3') {
      audioManager.playLevelUp({ volume: options?.volumeMultiplier, force: options?.force });
    } else if (type === 'ui_tap' || type === 'ui-click' || type === 'ui-click.mp3') {
      audioManager.playUiClick({ volume: options?.volumeMultiplier, force: options?.force });
    } else if (type === 'tab_switch' || type === 'tab-switch' || type === 'tab-switch.mp3') {
      audioManager.playTabSwitch({ volume: options?.volumeMultiplier, force: options?.force });
    } else if (type === 'quest_uncheck' || type === 'quest-uncheck' || type === 'quest-uncheck.mp3') {
      audioManager.playQuestUncheck({ volume: options?.volumeMultiplier, force: options?.force });
    } else if (type === 'daily_all_complete' || type === 'daily-complete' || type === 'daily-complete.mp3') {
      audioManager.playDailyComplete({ volume: options?.volumeMultiplier, force: options?.force });
    } else if (type === 'reward_reveal' || type === 'reward-reveal' || type === 'reward-reveal.mp3') {
      audioManager.playRewardReveal({ volume: options?.volumeMultiplier, force: options?.force });
    } else if (type === 'reward_claim' || type === 'reward-claim' || type === 'reward-claim.mp3') {
      audioManager.playRewardClaim({ volume: options?.volumeMultiplier, force: options?.force });
    } else if (type === 'water_add' || type === 'water-add' || type === 'water-add.mp3') {
      audioManager.playWaterAdd({ volume: options?.volumeMultiplier, force: options?.force });
    } else {
      soundService.play(type as SystemSoundType, options);
    }
  }

  public playQuestComplete(options?: AudioPlayOptions): void {
    audioManager.playQuestComplete(options);
  }

  public playQuestUncheck(options?: AudioPlayOptions): void {
    audioManager.playQuestUncheck(options);
  }

  public playLevelUp(options?: AudioPlayOptions): void {
    audioManager.playLevelUp(options);
  }

  public playDailyAllComplete(options?: AudioPlayOptions): void {
    audioManager.playDailyComplete(options);
  }

  public playMysteryUnlock(options?: AudioPlayOptions): void {
    audioManager.playRewardReveal(options);
  }

  public playRewardReveal(options?: AudioPlayOptions): void {
    audioManager.playRewardReveal(options);
  }

  public playRewardClaim(options?: AudioPlayOptions): void {
    audioManager.playRewardClaim(options);
  }

  public playUiTap(options?: AudioPlayOptions): void {
    audioManager.playUiClick(options);
  }

  public playUiClick(options?: AudioPlayOptions): void {
    audioManager.playUiClick(options);
  }

  public playUiToggle(): void {
    soundService.play('ui_toggle');
  }

  public playTabSwitch(options?: AudioPlayOptions): void {
    audioManager.playTabSwitch(options);
  }

  public playWaterAdd(options?: AudioPlayOptions): void {
    audioManager.playWaterAdd(options);
  }

  public playExerciseCheck(): void {
    soundService.play('exercise_check');
  }

  public playSystemPing(): void {
    soundService.play('system_ping');
  }

  public isEnabled(): boolean {
    return audioManager.isSoundEnabled();
  }

  public setMuted(muted: boolean): void {
    audioManager.setMuted(muted);
  }
}

export const systemSound = new SoundSystem();
export { soundService, audioManager };
export type { SystemSoundType, PredefinedSound, AudioPlayOptions };
