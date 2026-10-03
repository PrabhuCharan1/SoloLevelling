/**
 * useAudio React Hook
 *
 * Provides a declarative, easy-to-use interface for playing pre-defined system sounds
 * (e.g. 'quest-complete.mp3', 'level-up.mp3', 'ui-click.mp3') from the assets folder.
 */

import { useState, useCallback, useEffect } from 'react';
import { audioManager, PredefinedSound, AudioPlayOptions } from '../utils/audioManager.ts';
import { useSettings } from '../context/SettingsContext.tsx';

export interface UseAudioReturn {
  /**
   * Play any pre-defined sound by name or filename (e.g. 'quest-complete', 'ui-click.mp3').
   */
  play: (sound: PredefinedSound | string, options?: AudioPlayOptions) => Promise<void>;

  /**
   * Shortcut to play quest-complete.mp3
   */
  playQuestComplete: (options?: AudioPlayOptions) => Promise<void>;

  /**
   * Shortcut to play level-up.mp3
   */
  playLevelUp: (options?: AudioPlayOptions) => Promise<void>;

  /**
   * Shortcut to play ui-click.mp3
   */
  playUiClick: (options?: AudioPlayOptions) => Promise<void>;

  /**
   * Shortcut to play tab-switch.mp3
   */
  playTabSwitch: (options?: AudioPlayOptions) => Promise<void>;

  /**
   * Shortcut to play reward-reveal.mp3
   */
  playRewardReveal: (options?: AudioPlayOptions) => Promise<void>;

  /**
   * Shortcut to play reward-claim.mp3
   */
  playRewardClaim: (options?: AudioPlayOptions) => Promise<void>;

  /**
   * Shortcut to play water-add.mp3
   */
  playWaterAdd: (options?: AudioPlayOptions) => Promise<void>;

  /**
   * Shortcut to play quest-uncheck.mp3
   */
  playQuestUncheck: (options?: AudioPlayOptions) => Promise<void>;

  /**
   * Shortcut to play daily-complete.mp3
   */
  playDailyComplete: (options?: AudioPlayOptions) => Promise<void>;

  /**
   * Whether sound effects are currently active (respecting settings and mute state).
   */
  isEnabled: boolean;

  /**
   * Current mute status of the audio manager.
   */
  isMuted: boolean;

  /**
   * Set or toggle mute status.
   */
  setMuted: (muted: boolean) => void;

  /**
   * Current master volume (0.0 to 1.0).
   */
  volume: number;

  /**
   * Adjust master volume.
   */
  setVolume: (volume: number) => void;
}

export function useAudio(): UseAudioReturn {
  const { settings } = useSettings();
  const [isMuted, setIsMutedState] = useState<boolean>(() => audioManager.getMuted());
  const [volume, setVolumeState] = useState<number>(() => audioManager.getMasterVolume());

  const isEnabled = (settings?.gamification?.soundEffects !== false) && !isMuted;

  const setMuted = useCallback((muted: boolean) => {
    audioManager.setMuted(muted);
    setIsMutedState(muted);
  }, []);

  const setVolume = useCallback((vol: number) => {
    audioManager.setMasterVolume(vol);
    setVolumeState(vol);
  }, []);

  const play = useCallback((sound: PredefinedSound | string, options?: AudioPlayOptions) => {
    return audioManager.play(sound, options);
  }, []);

  const playQuestComplete = useCallback((options?: AudioPlayOptions) => {
    return audioManager.playQuestComplete(options);
  }, []);

  const playLevelUp = useCallback((options?: AudioPlayOptions) => {
    return audioManager.playLevelUp(options);
  }, []);

  const playUiClick = useCallback((options?: AudioPlayOptions) => {
    return audioManager.playUiClick(options);
  }, []);

  const playTabSwitch = useCallback((options?: AudioPlayOptions) => {
    return audioManager.playTabSwitch(options);
  }, []);

  const playRewardReveal = useCallback((options?: AudioPlayOptions) => {
    return audioManager.playRewardReveal(options);
  }, []);

  const playRewardClaim = useCallback((options?: AudioPlayOptions) => {
    return audioManager.playRewardClaim(options);
  }, []);

  const playWaterAdd = useCallback((options?: AudioPlayOptions) => {
    return audioManager.playWaterAdd(options);
  }, []);

  const playQuestUncheck = useCallback((options?: AudioPlayOptions) => {
    return audioManager.playQuestUncheck(options);
  }, []);

  const playDailyComplete = useCallback((options?: AudioPlayOptions) => {
    return audioManager.playDailyComplete(options);
  }, []);

  return {
    play,
    playQuestComplete,
    playLevelUp,
    playUiClick,
    playTabSwitch,
    playRewardReveal,
    playRewardClaim,
    playWaterAdd,
    playQuestUncheck,
    playDailyComplete,
    isEnabled,
    isMuted,
    setMuted,
    volume,
    setVolume,
  };
}

export default useAudio;
