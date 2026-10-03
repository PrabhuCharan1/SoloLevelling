/**
 * SpeakingGate Utility & Middleware for SCAR Voice Pipeline
 * 
 * Crucial audio feedback loop and acoustic echo protection:
 * 1. Authoritative tracker of the global 'isScarSpeaking' boolean (in-memory + window.isScarSpeaking).
 * 2. Explicitly blocks microphone input streams and Web Audio API pipelines when AI is outputting audio.
 * 3. Explicitly pauses speech recognition during audio playback.
 * 4. Automatically resumes microphone stream capture and speech recognition after a 500ms post-playback cooldown.
 */

export const POST_SPEECH_COOLDOWN_MS = 500;

export interface SpeakingGateState {
  isScarSpeaking: boolean;
  isCooldown: boolean;
  isBlocked: boolean;
  cooldownRemainingMs: number;
}

export type SpeakingGateListener = (state: SpeakingGateState) => void;

export interface RecognitionController {
  pause: () => void;
  resume: () => void;
}

export interface StreamController {
  mute: () => void;
  unmute: () => void;
}

export class SpeakingGate {
  private _isScarSpeaking = false;
  private _isCooldown = false;
  private cooldownTimer: ReturnType<typeof setTimeout> | null = null;
  private cooldownEndTime: number | null = null;
  private listeners: Set<SpeakingGateListener> = new Set();
  private onCooldownEndCallbacks: Set<() => void> = new Set();
  private recognitionControllers: Set<RecognitionController> = new Set();
  private streamControllers: Set<StreamController> = new Set();

  constructor() {
    this.syncGlobalState();
  }

  /**
   * Authoritative global flag indicating whether SCAR's speech audio is playing
   */
  public get isScarSpeaking(): boolean {
    return this._isScarSpeaking;
  }

  public get isCooldown(): boolean {
    return this._isCooldown;
  }

  /**
   * Whether incoming microphone audio or speech recognition input must be blocked
   */
  public get isBlocked(): boolean {
    return this._isScarSpeaking || this._isCooldown || this.readGlobalFlag();
  }

  /**
   * Reads from window.isScarSpeaking if present to ensure strict multi-context synchronization
   */
  private readGlobalFlag(): boolean {
    if (typeof window !== 'undefined' && (window as any).isScarSpeaking === true) {
      return true;
    }
    return false;
  }

  /**
   * Syncs internal state to the window object for global inspectability & debug tools
   */
  private syncGlobalState(): void {
    if (typeof window !== 'undefined') {
      (window as any).isScarSpeaking = this._isScarSpeaking;
      (window as any).__speakingGate = this;
    }
  }

  private notifyListeners(): void {
    const state = this.getState();
    for (const listener of this.listeners) {
      try {
        listener(state);
      } catch (err) {
        console.error('[SpeakingGate] Listener error:', err);
      }
    }
  }

  public getState(): SpeakingGateState {
    const now = Date.now();
    const cooldownRemainingMs =
      this._isCooldown && this.cooldownEndTime && this.cooldownEndTime > now
        ? Math.max(0, this.cooldownEndTime - now)
        : 0;

    return {
      isScarSpeaking: this._isScarSpeaking,
      isCooldown: this._isCooldown,
      isBlocked: this.isBlocked,
      cooldownRemainingMs,
    };
  }

  /**
   * Subscribe to state changes in the speaking gate utility
   */
  public subscribe(listener: SpeakingGateListener): () => void {
    this.listeners.add(listener);
    listener(this.getState());
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Register a speech recognition controller to automatically pause during speech
   * and resume after the 500ms post-playback cooldown.
   */
  public registerRecognition(controller: RecognitionController): () => void {
    this.recognitionControllers.add(controller);
    if (this.isBlocked) {
      try {
        controller.pause();
      } catch (err) {
        console.warn('[SpeakingGate] Initial recognition pause error:', err);
      }
    }
    return () => {
      this.recognitionControllers.delete(controller);
    };
  }

  /**
   * Register a microphone stream controller to automatically mute input during speech
   * and unmute after the 500ms post-playback cooldown.
   */
  public registerStream(controller: StreamController): () => void {
    this.streamControllers.add(controller);
    if (this.isBlocked) {
      try {
        controller.mute();
      } catch (err) {
        console.warn('[SpeakingGate] Initial stream mute error:', err);
      }
    }
    return () => {
      this.streamControllers.delete(controller);
    };
  }

  private pauseAllRecognition(): void {
    for (const ctrl of this.recognitionControllers) {
      try {
        ctrl.pause();
      } catch (err) {
        console.error('[SpeakingGate] Failed to pause recognition:', err);
      }
    }
  }

  private resumeAllRecognition(): void {
    for (const ctrl of this.recognitionControllers) {
      try {
        ctrl.resume();
      } catch (err) {
        console.error('[SpeakingGate] Failed to resume recognition:', err);
      }
    }
  }

  private muteAllStreams(): void {
    for (const ctrl of this.streamControllers) {
      try {
        ctrl.mute();
      } catch (err) {
        console.error('[SpeakingGate] Failed to mute stream:', err);
      }
    }
  }

  private unmuteAllStreams(): void {
    for (const ctrl of this.streamControllers) {
      try {
        ctrl.unmute();
      } catch (err) {
        console.error('[SpeakingGate] Failed to unmute stream:', err);
      }
    }
  }

  /**
   * Explicitly set global 'isScarSpeaking' boolean state
   */
  public setScarSpeaking(speaking: boolean): void {
    if (speaking) {
      this.onGeminiAudioStart();
    } else if (this._isScarSpeaking) {
      this.onPlaybackFinished();
    }
  }

  /**
   * Called explicitly when Gemini Live or TTS audio output starts playing
   * Sets isScarSpeaking = true, closes the input gate, blocks microphone streams,
   * and pauses speech recognition.
   */
  public onSpeechStart(): void {
    this.onGeminiAudioStart();
  }

  public onGeminiAudioStart(): void {
    if (this.cooldownTimer) {
      clearTimeout(this.cooldownTimer);
      this.cooldownTimer = null;
    }
    this.cooldownEndTime = null;

    this._isScarSpeaking = true;
    this._isCooldown = false;
    this.syncGlobalState();
    console.log('[SpeakingGate] Audio output started -> GATE CLOSED (isScarSpeaking = true)');

    // Immediately pause speech recognition and mute microphone stream
    this.pauseAllRecognition();
    this.muteAllStreams();

    this.notifyListeners();
  }

  /**
   * Called when all queued audio output chunks have finished playing
   * Maintains isScarSpeaking = true throughout both playback and the subsequent 500ms cooldown,
   * keeping mic input blocked and speech recognition paused for exactly POST_SPEECH_COOLDOWN_MS (500ms).
   * Automatically resumes microphone capture and speech recognition when cooldown expires.
   */
  public onPlaybackFinished(onComplete?: () => void): void {
    if (onComplete) {
      this.onCooldownEndCallbacks.add(onComplete);
    }

    if (this.cooldownTimer) {
      clearTimeout(this.cooldownTimer);
      this.cooldownTimer = null;
    }

    // Crucial requirement: 'isScarSpeaking' remains TRUE during both the playback of queued audio chunks
    // and the subsequent 500ms cooldown, preventing the microphone from re-triggering during the silence immediately after AI response.
    this._isScarSpeaking = true;
    this._isCooldown = true;
    this.cooldownEndTime = Date.now() + POST_SPEECH_COOLDOWN_MS;
    this.syncGlobalState();
    console.log(`[SpeakingGate] Audio playback finished -> Starting ${POST_SPEECH_COOLDOWN_MS}ms cooldown (isScarSpeaking REMAINS TRUE)`);

    // Ensure streams and speech recognition remain blocked/paused throughout cooldown
    this.pauseAllRecognition();
    this.muteAllStreams();
    this.notifyListeners();

    this.cooldownTimer = setTimeout(() => {
      this._isScarSpeaking = false;
      this._isCooldown = false;
      this.cooldownTimer = null;
      this.cooldownEndTime = null;
      this.syncGlobalState();
      console.log('[SpeakingGate] 500ms cooldown finished -> isScarSpeaking = false -> GATE OPEN (Resuming microphone & speech recognition)');

      // Automatically unblock microphone input streams and resume speech recognition
      this.unmuteAllStreams();
      this.resumeAllRecognition();

      const callbacks = Array.from(this.onCooldownEndCallbacks);
      this.onCooldownEndCallbacks.clear();
      for (const cb of callbacks) {
        try {
          cb();
        } catch (err) {
          console.error('[SpeakingGate] onPlaybackFinished callback error:', err);
        }
      }

      this.notifyListeners();
    }, POST_SPEECH_COOLDOWN_MS);
  }

  /**
   * Core middleware guard: checks if microphone input, Web Audio processor,
   * or speech recognition event should be rejected.
   */
  public shouldBlockInput(): boolean {
    return this.isBlocked;
  }

  /**
   * Emergency reset or session disconnect cleanup
   */
  public reset(): void {
    if (this.cooldownTimer) {
      clearTimeout(this.cooldownTimer);
      this.cooldownTimer = null;
    }
    this._isScarSpeaking = false;
    this._isCooldown = false;
    this.cooldownEndTime = null;
    this.onCooldownEndCallbacks.clear();
    this.syncGlobalState();
    this.unmuteAllStreams();
    this.resumeAllRecognition();
    this.notifyListeners();
  }
}

// Global singleton instance of the SpeakingGate utility
export const speakingGate = new SpeakingGate();

// Standalone convenience exports for quick pipeline consumption
export const isScarSpeaking = (): boolean => speakingGate.isScarSpeaking;
export const setScarSpeaking = (speaking: boolean): void => speakingGate.setScarSpeaking(speaking);
export const shouldBlockInput = (): boolean => speakingGate.shouldBlockInput();
export const onGeminiAudioStart = (): void => speakingGate.onGeminiAudioStart();
export const onPlaybackFinished = (cb?: () => void): void => speakingGate.onPlaybackFinished(cb);

// Ensure global window reference is immediately initialized for browser tools & debug HUDs
if (typeof window !== 'undefined') {
  (window as any).isScarSpeaking = false;
  (window as any).speakingGate = speakingGate;
}
