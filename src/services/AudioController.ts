/**
 * SCAR Centralized AudioController Utility
 * 
 * The single source of truth for all audio playback in QuestLife:
 * 1. Maintains an authoritative queue of incoming audio buffers (PCM chunks & TTS utterances).
 * 2. Immediately clears any previous playback upon receipt of a new response.
 * 3. Acts as the unique gatekeeper for playing either Gemini native audio OR fallback browser TTS.
 * 4. Explicitly rejects any overlapping execution request.
 */

import { speakingGate } from './speakingGate.ts';
import { languageDetector, ResponseLanguage } from './languageDetector.ts';

export type AudioProvider = 'gemini_live' | 'browser_tts' | 'none';
export type QueueStatus = 'IDLE' | 'BUFFERING' | 'PLAYING' | 'COOLDOWN';

export interface QueuedAudioBuffer {
  id: string;
  responseId: string;
  provider: AudioProvider;
  data?: string | ArrayBuffer | Uint8Array;
  timestamp: number;
  durationEstimateMs?: number;
}

export interface CentralAudioDiagnostics {
  selectedLanguage: ResponseLanguage;
  activeProvider: AudioProvider;
  activeVoiceName: string;
  currentResponseId: string;
  activePlaybackSources: number;
  activeTtsUtterances: number;
  audioQueueStatus: QueueStatus;
  voiceState: 'LISTENING' | 'SPEAKING' | 'COOLDOWN';
  duplicateSuppressedCount: number;
  queuedBuffersCount: number;
}

export type CentralAudioListener = (diagnostics: CentralAudioDiagnostics) => void;

export class AudioController {
  private static instance: AudioController | null = null;

  // Single authoritative state
  private activeProvider: AudioProvider = 'none';
  private activeVoiceName: string = 'None';
  private currentResponseId: string = 'resp_init';
  private activePlaybackSources: number = 0;
  private activeTtsUtterances: number = 0;
  private audioQueueStatus: QueueStatus = 'IDLE';
  private duplicateSuppressedCount: number = 0;

  // Authoritative queue of incoming audio buffers
  private bufferQueue: QueuedAudioBuffer[] = [];

  // Active audio elements & contexts
  private activeWebAudioSources: Set<AudioBufferSourceNode> = new Set();
  private outputAudioContext: AudioContext | null = null;
  private listeners: Set<CentralAudioListener> = new Set();
  private bufferPurgeCallback: (() => void) | null = null;

  private constructor() {
    this.syncGlobalState();
  }

  public static getInstance(): AudioController {
    if (!AudioController.instance) {
      AudioController.instance = new AudioController();
    }
    return AudioController.instance;
  }

  /**
   * Registers a buffer cleaner callback (from GeminiLiveAudioService) to purge raw PCM queues
   */
  public registerBufferPurge(callback: () => void): void {
    this.bufferPurgeCallback = callback;
  }

  private syncGlobalState(): void {
    if (typeof window !== 'undefined') {
      (window as any).__audioController = this;
      (window as any).__centralAudioController = this;
      (window as any).__activeAudioProvider = this.activeProvider;
      (window as any).__currentResponseId = this.currentResponseId;
    }
  }

  private notifyListeners(): void {
    this.syncGlobalState();
    const diag = this.getDiagnostics();
    for (const listener of this.listeners) {
      try {
        listener(diag);
      } catch (err) {
        console.error('[AudioController] Listener notification error:', err);
      }
    }
  }

  public subscribe(listener: CentralAudioListener): () => void {
    this.listeners.add(listener);
    listener(this.getDiagnostics());
    return () => {
      this.listeners.delete(listener);
    };
  }

  public getDiagnostics(): CentralAudioDiagnostics {
    return {
      selectedLanguage: languageDetector.getLockedLanguage(),
      activeProvider: this.activeProvider,
      activeVoiceName: this.activeVoiceName,
      currentResponseId: this.currentResponseId,
      activePlaybackSources: this.activePlaybackSources,
      activeTtsUtterances: this.activeTtsUtterances,
      audioQueueStatus: this.audioQueueStatus,
      voiceState: speakingGate.isScarSpeaking ? 'SPEAKING' : speakingGate.isCooldown ? 'COOLDOWN' : 'LISTENING',
      duplicateSuppressedCount: this.duplicateSuppressedCount,
      queuedBuffersCount: this.bufferQueue.length,
    };
  }

  public getCurrentResponseId(): string {
    return this.currentResponseId;
  }

  public getActiveProvider(): AudioProvider {
    return this.activeProvider;
  }

  public isPlaybackActive(): boolean {
    return this.activePlaybackSources > 0 || this.activeTtsUtterances > 0 || this.audioQueueStatus === 'PLAYING';
  }

  /**
   * Maintains a queue of incoming audio buffers:
   * Enqueues an audio buffer if and only if it belongs to the active responseId
   * and matches the designated authoritative provider.
   */
  public enqueueAudioBuffer(item: QueuedAudioBuffer): boolean {
    if (!this.isChunkAuthorized(item.responseId, item.provider)) {
      return false;
    }

    this.bufferQueue.push(item);
    this.audioQueueStatus = 'PLAYING';
    this.notifyListeners();
    return true;
  }

  /**
   * Clears the internal buffer queue
   */
  public clearBufferQueue(): void {
    const droppedCount = this.bufferQueue.length;
    this.bufferQueue = [];
    if (droppedCount > 0) {
      console.log(`[AudioController] Cleared ${droppedCount} queued audio buffers`);
    }
  }

  /**
   * Begins a new response cycle with a unique response ID.
   * IMMEDIATELY CLEARS any previous playback upon receipt of a new response:
   * 1. Cancels any pending or speaking SpeechSynthesis TTS.
   * 2. Stops and disconnects all active Web Audio sources.
   * 3. Purges all incoming buffer queues.
   * 4. Cleans external PCM scheduling buffers via registered purge callback.
   * 5. Locks the chosen provider and response language.
   */
  public startNewResponse(
    preferredProvider: 'gemini_live' | 'browser_tts',
    userTextPrompt?: string
  ): string {
    // 1. Invalidate previous response by generating a new monotonic ID
    const newId = `resp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    this.currentResponseId = newId;

    // 2. Lock response language if user prompt text is available
    if (userTextPrompt) {
      languageDetector.lockLanguageForTurn(userTextPrompt);
    }

    console.log(`[AudioController] Starting new response turn: ${newId} (Provider: ${preferredProvider})`);

    // 3. Immediately clear any previous playback across Web Audio, TTS, and queues
    this.cancelAllPlayback('Starting new response turn');

    // 4. Set provider and initial status
    this.activeProvider = preferredProvider;
    this.activeVoiceName = preferredProvider === 'gemini_live' ? 'Charon (Male Indian Persona)' : 'Configuring TTS...';
    this.audioQueueStatus = 'BUFFERING';

    this.notifyListeners();
    return newId;
  }

  /**
   * Explicitly rejects an overlapping execution request and records telemetry.
   */
  public rejectOverlappingExecution(reason: string): void {
    console.warn(`[AudioController] EXPLICITLY REJECTED overlapping execution request: ${reason}`);
    this.duplicateSuppressedCount++;
    this.notifyListeners();
  }

  /**
   * Validates whether an incoming audio chunk or TTS request is allowed to play.
   * Enforces:
   * 1. Response ID must match current active response ID (rejects stale/late-arriving chunks).
   * 2. Provider must match authorized active provider (rejects TTS when Gemini Live is active).
   * 3. Rejects overlapping execution requests across divergent providers.
   */
  public isChunkAuthorized(responseId: string, provider: AudioProvider): boolean {
    // Check 1: Stale response check
    if (responseId !== this.currentResponseId) {
      this.rejectOverlappingExecution(
        `Response ID mismatch (chunk: ${responseId}, active: ${this.currentResponseId})`
      );
      return false;
    }

    // Check 2: Mutual exclusion check
    // If Gemini Live is the active provider, reject any browser TTS attempt
    if (provider === 'browser_tts' && this.activeProvider === 'gemini_live') {
      this.rejectOverlappingExecution(
        'Browser TTS blocked: Gemini Live native audio is the authoritative voice for this response'
      );
      return false;
    }

    // If browser TTS was explicitly authorized, reject late Gemini Live chunks
    if (provider === 'gemini_live' && this.activeProvider === 'browser_tts') {
      this.rejectOverlappingExecution(
        'Gemini Live chunk blocked: Browser TTS fallback is currently active for this response'
      );
      return false;
    }

    return true;
  }

  /**
   * Unique Gatekeeper: Registers that Gemini Live audio playback has begun for a buffer source node
   */
  public registerWebAudioSource(
    source: AudioBufferSourceNode,
    responseId: string,
    ctx: AudioContext
  ): boolean {
    if (!this.isChunkAuthorized(responseId, 'gemini_live')) {
      try {
        source.stop();
        source.disconnect();
      } catch (_) {}
      return false;
    }

    // Explicitly reject and cancel any rogue speech synthesis that might have begun
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      if (window.speechSynthesis.speaking || window.speechSynthesis.pending) {
        this.rejectOverlappingExecution('Halting rogue SpeechSynthesis to enforce single voice output');
        window.speechSynthesis.cancel();
        this.activeTtsUtterances = 0;
      }
    }

    this.activeProvider = 'gemini_live';
    this.activeVoiceName = 'Charon (Male Indian Persona)';
    this.outputAudioContext = ctx;
    this.activeWebAudioSources.add(source);
    this.activePlaybackSources = 1;
    this.audioQueueStatus = 'PLAYING';

    // Notify speaking gate: microphone is gated, isScarSpeaking is set
    speakingGate.onGeminiAudioStart();

    source.onended = () => {
      this.activeWebAudioSources.delete(source);
      if (this.activeWebAudioSources.size === 0) {
        this.activePlaybackSources = 0;
        this.notifyListeners();
      }
    };

    this.notifyListeners();
    return true;
  }

  /**
   * Unique Gatekeeper: Registers a Browser TTS utterance.
   * Explicitly rejects TTS if Gemini Live is active or already outputting audio.
   */
  public registerTtsUtterance(responseId: string, voiceName: string): boolean {
    // Overlapping execution guard: Reject TTS if Gemini Live is active
    if (this.activeProvider === 'gemini_live' && this.isPlaybackActive()) {
      this.rejectOverlappingExecution('Rejected Browser TTS because Gemini Live native audio is active');
      return false;
    }

    if (!this.isChunkAuthorized(responseId, 'browser_tts')) {
      this.rejectOverlappingExecution('Unauthorized TTS utterance responseId or provider mismatch');
      return false;
    }

    this.activeProvider = 'browser_tts';
    this.activeVoiceName = voiceName;
    this.activeTtsUtterances = 1;
    this.audioQueueStatus = 'PLAYING';

    // Notify speaking gate
    speakingGate.onSpeechStart();

    this.notifyListeners();
    return true;
  }

  /**
   * Called when all audio for the current response has finished playing
   */
  public finishPlayback(responseId: string, onComplete?: () => void): void {
    if (responseId !== this.currentResponseId) {
      console.warn(`[AudioController] Ignored finishPlayback for stale response ID: ${responseId}`);
      return;
    }

    this.activePlaybackSources = 0;
    this.activeTtsUtterances = 0;
    this.audioQueueStatus = 'COOLDOWN';
    this.clearBufferQueue();
    this.notifyListeners();

    // Delegate to SpeakingGate to hold the 500ms post-playback cooldown
    speakingGate.onPlaybackFinished(() => {
      this.audioQueueStatus = 'IDLE';
      this.activeProvider = 'none';
      this.activeVoiceName = 'None';
      this.notifyListeners();
      onComplete?.();
    });
  }

  /**
   * Instantly stops all audio playback and clears buffers:
   * (Barge-in, cancel, stop command, or new response initialization)
   */
  public cancelAllPlayback(reason: string): void {
    console.log(`[AudioController] Cancelling all audio playback (${reason})`);

    // 1. Cancel browser speech synthesis
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch (err) {
        console.warn('[AudioController] SpeechSynthesis cancel error:', err);
      }
    }
    this.activeTtsUtterances = 0;

    // 2. Stop all Web Audio buffer sources
    for (const src of this.activeWebAudioSources) {
      try {
        src.stop();
        src.disconnect();
      } catch (_) {}
    }
    this.activeWebAudioSources.clear();
    this.activePlaybackSources = 0;

    // 3. Clear internal buffer queue
    this.clearBufferQueue();

    // 4. Purge all pending audio buffers in active audio engine
    try {
      this.bufferPurgeCallback?.();
    } catch (purgeErr) {
      console.warn('[AudioController] Buffer purge error:', purgeErr);
    }

    this.audioQueueStatus = 'IDLE';
    this.notifyListeners();
  }

  /**
   * Transitions provider to browser_tts fallback when Gemini Live fails or is unavailable
   */
  public activateFallbackTts(reason: string): string {
    console.warn(`[AudioController] Activating single Fallback TTS provider (${reason})`);
    this.cancelAllPlayback(`Activating Fallback TTS: ${reason}`);
    this.activeProvider = 'browser_tts';
    this.currentResponseId = `resp_fallback_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    this.notifyListeners();
    return this.currentResponseId;
  }
}

// Global Singleton Instance
export const audioController = AudioController.getInstance();
export const centralAudioController = audioController;
