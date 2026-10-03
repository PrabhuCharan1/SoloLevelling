/**
 * SCAR Voice Service
 * Comprehensive Voice Pipeline & State Machine for QuestLife.
 * 
 * Implements strict state machine:
 * IDLE -> WAKE_DETECTED -> CONNECTING -> LISTENING -> PROCESSING -> SPEAKING -> LISTENING
 * 
 * 1. MICROPHONE INPUT:
 *    - Validates browser mic permission & live stream tracks.
 *    - Captures PCM audio & feeds real-time diagnostics.
 *    - Never assumes visualization equals speech capture.
 * 
 * 2. SPEECH & GEMINI LIVE INPUT:
 *    - Connects to Gemini Live session before entering LISTENING.
 *    - Converts/resamples audio to 16kHz linear PCM little-endian.
 *    - Streams to Gemini Live.
 * 
 * 3. WAKE WORD:
 *    - "Scar" (plus "Hey Scar", "Ok Scar", "స్కార్", etc.).
 *    - Exactly responds: "Yes, Hunter Charan?".
 *    - Awakens the session: user does NOT need to repeat "Scar" for subsequent turns.
 * 
 * 4. AUDIO PLAYBACK:
 *    - Decodes 24kHz raw PCM chunks from Gemini Live.
 *    - Sequential, gapless queue with instant barge-in support.
 *    - Fallback to natural Indian male voice (en-IN) without pitch modification.
 * 
 * 5. LANGUAGE SUPPORT:
 *    - English, Telugu, Telugu + English (Tenglish).
 * 
 * 6. SILENCE TIMEOUT & RECOVERY:
 *    - After 10s of silence in LISTENING, transitions safely to IDLE/READY.
 *    - Never remains permanently stuck in LISTENING.
 */

import {
  geminiLiveAudioService,
  LiveSessionStatus,
  AudioDiagnostics,
} from './geminiLiveAudioService.ts';
import { wakeWordDetector } from './wakeWordDetector.ts';
import { androidServiceBridge } from './androidServiceBridge.ts';
import { QuestLifeContextPayload } from './questLifeToolHandler.ts';
import { speakingGate } from './speakingGate.ts';
import { centralAudioController } from './centralAudioController.ts';
import { languageDetector } from './languageDetector.ts';

export type ScarState =
  | 'idle'
  | 'wake_detected'
  | 'connecting'
  | 'listening'
  | 'processing'
  | 'speaking'
  | 'cooldown'
  | 'error';

export type VoiceModeEngine = 'gemini_live' | 'fallback_tts';

export interface VoicePermissionResult {
  granted: boolean;
  error?: 'not_supported' | 'permission_denied' | 'device_busy' | 'unknown';
  message?: string;
}

export interface VoiceInfo {
  name: string;
  lang: string;
  isIndianMale: boolean;
  isMale: boolean;
  isTelugu: boolean;
}

export type VoiceLanguage = 'auto' | 'en-IN' | 'te-IN' | 'en-US';

export interface VoiceServiceCallbacks {
  onStateChange?: (state: ScarState) => void;
  onListeningStart?: () => void;
  onListeningEnd?: () => void;
  onSpeakingStart?: () => void;
  onSpeakingEnd?: () => void;
  onCooldownStart?: () => void;
  onCooldownEnd?: () => void;
  onTranscriptChange?: (interimTranscript: string) => void;
  onFinalTranscript?: (finalTranscript: string) => void;
  onLiveUserTranscript?: (userTranscript: string) => void;
  onWakeWordDetected?: () => void;
  onLowConfidenceDetected?: (rawTranscript: string) => void;
  onAwaitingRequest?: () => void;
  onError?: (errorType: string, message: string) => void;
  onVoiceModeChange?: (active: boolean) => void;
  onEngineChange?: (engine: VoiceModeEngine) => void;
  onLiveStatusChange?: (status: LiveSessionStatus) => void;
  onInputVolume?: (vol: number) => void;
  onOutputVolume?: (vol: number) => void;
  onAudioChunk?: (base64Chunk: string) => void;
  onTurnComplete?: () => void;
  onModelTranscript?: (text: string) => void;
  onDiagnosticsUpdate?: (diag: AudioDiagnostics) => void;
}

export class VoiceService {
  private currentState: ScarState = 'idle';
  private isVoiceModeActive = false;
  private isSessionAwakened = false;
  private isSpeakingState = false;
  private isProcessingRequest = false;
  private activeEngine: VoiceModeEngine = 'gemini_live';
  private callbacks: VoiceServiceCallbacks = {};
  private currentLanguage: VoiceLanguage = 'en-IN';
  private cachedContext: QuestLifeContextPayload | null = null;
  private recognitionInstance: any = null;
  private isRecognitionRunning = false;
  private silenceTimer: ReturnType<typeof setTimeout> | null = null;
  private isAcknowledgingWakeWord = false;
  private wakeWordCleanup: (() => void) | null = null;

  constructor() {
    this.setupAudioListeners();
  }

  public getState(): ScarState {
    return this.currentState;
  }

  public setState(newState: ScarState): void {
    if (this.currentState === newState) return;
    console.log(`[VoiceService State] ${this.currentState} -> ${newState}`);
    const prevState = this.currentState;
    this.currentState = newState;

    if (newState === 'listening') {
      this.isSpeakingState = false;
      this.isProcessingRequest = false;
      wakeWordDetector.setBlocked(false);
      geminiLiveAudioService.setVoiceState('LISTENING');
      this.resetSilenceTimeout();
      this.callbacks.onListeningStart?.();
      if (this.isVoiceModeActive) {
        this.startContinuousRecognition();
      }
    } else {
      this.clearSilenceTimeout();
      if (prevState === 'listening') {
        this.callbacks.onListeningEnd?.();
      }
    }

    if (newState === 'speaking') {
      this.isSpeakingState = true;
      wakeWordDetector.setBlocked(true);
      if (this.recognitionInstance) {
        try {
          this.recognitionInstance.abort();
        } catch (_) {}
        this.isRecognitionRunning = false;
      }
      this.callbacks.onSpeakingStart?.();
    } else if (this.isSpeakingState && newState !== 'cooldown') {
      this.isSpeakingState = false;
      this.callbacks.onSpeakingEnd?.();
    }

    if (newState === 'cooldown') {
      // Retain speaking state during 500ms cooldown to prevent mic re-triggering during silence
      this.isSpeakingState = true;
      wakeWordDetector.setBlocked(true);
      if (this.recognitionInstance) {
        try {
          this.recognitionInstance.abort();
        } catch (_) {}
        this.isRecognitionRunning = false;
      }
      this.callbacks.onCooldownStart?.();
    }

    if (newState === 'processing') {
      this.isProcessingRequest = true;
      wakeWordDetector.setBlocked(true);
      geminiLiveAudioService.setProcessing(true);
      if (this.recognitionInstance) {
        try {
          this.recognitionInstance.abort();
        } catch (_) {}
        this.isRecognitionRunning = false;
      }
    }

    this.callbacks.onStateChange?.(newState);
  }

  private setupAudioListeners(): void {
    // Listen to dedicated Gemini Live Audio Service callbacks
    geminiLiveAudioService.registerCallbacks({
      onStatusChange: (status: LiveSessionStatus) => {
        this.callbacks.onLiveStatusChange?.(status);

        if (status === 'connected') {
          this.setEngine('gemini_live');
        } else if (status === 'error') {
          // Gracefully fallback to speech recognition + TTS
          console.warn('[VoiceService] Gemini Live in error state, falling back to TTS engine');
          this.setEngine('fallback_tts');
        }
      },
      onStateChange: (state) => {
        const mapped = state.toLowerCase() as ScarState;
        if (this.currentState !== mapped) {
          this.setState(mapped);
        }
      },
      onInputVolume: (vol: number) => {
        this.callbacks.onInputVolume?.(vol);
        if (vol > 0.05 && this.currentState === 'listening') {
          this.resetSilenceTimeout();
        }
      },
      onOutputVolume: (vol: number) => {
        this.callbacks.onOutputVolume?.(vol);
      },
      onSpeakingStart: () => {
        this.setState('speaking');
      },
      onSpeakingEnd: () => {
        // Lifecycle handles transition to cooldown
      },
      onCooldownStart: () => {
        this.setState('cooldown');
      },
      onCooldownEnd: () => {
        if (this.isVoiceModeActive) {
          this.setState('listening');
        } else {
          this.setState('idle');
        }
      },
      onTranscript: (text: string, isUser: boolean) => {
        if (isUser) {
          if (
            speakingGate.shouldBlockInput() ||
            (typeof window !== 'undefined' && (window as any).isScarSpeaking === true) ||
            this.isSpeakingState ||
            this.currentState === 'speaking' ||
            this.currentState === 'cooldown' ||
            this.currentState === 'processing' ||
            this.isProcessingRequest ||
            geminiLiveAudioService.isMicBlocked()
          ) {
            return;
          }
          this.resetSilenceTimeout();

          // Evaluate for explicit language switch command
          const langEval = languageDetector.processUserTranscript(text);
          if (langEval.isExplicitSwitch) {
            console.log(`[VoiceService] User explicitly commanded language switch to: ${langEval.responseLanguage}`);
            geminiLiveAudioService.lockResponseLanguage(langEval.responseLanguage);
          }

          // In Gemini Live mode, Gemini Live handles audio stream and replies natively!
          // We MUST NOT call handleSpeechInput(text) which would trigger a duplicate AI query and duplicate browser TTS!
          this.callbacks.onTranscriptChange?.(text);
          this.callbacks.onLiveUserTranscript?.(text);
        } else {
          // Model response transcript from Gemini Live
          this.callbacks.onTranscriptChange?.('');
          if (text) {
            this.callbacks.onModelTranscript?.(text);
          }
        }
      },
      onAudioChunk: (base64Chunk: string) => {
        this.callbacks.onAudioChunk?.(base64Chunk);
      },
      onTurnComplete: () => {
        this.callbacks.onTurnComplete?.();
      },
      onError: (errMsg: string, isFatal?: boolean) => {
        console.warn('[VoiceService] Gemini Live error:', errMsg);
        if (isFatal && this.activeEngine === 'gemini_live') {
          this.setEngine('fallback_tts');
        }
        if (this.currentState !== 'speaking' && this.currentState !== 'cooldown') {
          this.callbacks.onError?.('live_error', errMsg);
        }
      },
      onDiagnosticsUpdate: (diag: AudioDiagnostics) => {
        this.callbacks.onDiagnosticsUpdate?.(diag);
      },
    });

    // Global wake word listener
    this.wakeWordCleanup = wakeWordDetector.onWakeWord(() => {
      this.handleWakeWordDetection();
    });

    // Connect speech recognition pause/resume to SpeakingGate utility
    speakingGate.registerRecognition({
      pause: () => {
        if (this.recognitionInstance) {
          try {
            this.recognitionInstance.abort();
          } catch (_) {}
          this.isRecognitionRunning = false;
        }
      },
      resume: () => {
        if (this.isVoiceModeActive && this.currentState === 'listening' && !this.isRecognitionRunning) {
          this.startContinuousRecognition();
        }
      },
    });
  }

  /**
   * Silence recovery: after 10s without speech in LISTENING, safely transition to IDLE
   */
  private resetSilenceTimeout(): void {
    this.clearSilenceTimeout();
    this.silenceTimer = setTimeout(() => {
      if (this.currentState === 'listening' && !this.isSpeakingState) {
        console.log('[VoiceService] Silence timeout (10s): transitioning from LISTENING to IDLE');
        this.setState('idle');
        this.callbacks.onAwaitingRequest?.();
      }
    }, 10000);
  }

  private clearSilenceTimeout(): void {
    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer);
      this.silenceTimer = null;
    }
  }

  public registerCallbacks(callbacks: VoiceServiceCallbacks): void {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  public setEngine(engine: VoiceModeEngine): void {
    if (this.activeEngine === engine) return;
    this.activeEngine = engine;
    this.callbacks.onEngineChange?.(engine);
  }

  public getActiveEngine(): VoiceModeEngine {
    return this.activeEngine;
  }

  public getDiagnostics(): AudioDiagnostics {
    return geminiLiveAudioService.getDiagnostics();
  }

  public getWakePhrase(): string {
    return wakeWordDetector.getWakePhrase();
  }

  public setWakePhrase(phrase: string): void {
    wakeWordDetector.setWakePhrase(phrase);
  }

  public setLanguage(lang: VoiceLanguage): void {
    this.currentLanguage = lang;
    if (this.recognitionInstance && this.isRecognitionRunning) {
      this.recognitionInstance.lang = lang === 'te-IN' ? 'te-IN' : 'en-IN';
    }
  }

  public getLanguage(): VoiceLanguage {
    return this.currentLanguage;
  }

  public isSpeechRecognitionSupported(): boolean {
    return (
      typeof window !== 'undefined' &&
      !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition)
    );
  }

  public isSpeechSynthesisSupported(): boolean {
    return typeof window !== 'undefined' && 'speechSynthesis' in window;
  }

  /**
   * Unlock AudioContext proactively inside user click/tap handler
   */
  public async unlockAudioContext(): Promise<boolean> {
    return geminiLiveAudioService.unlockAudioContext();
  }

  /**
   * Selects natural male Indian English voice (en-IN) without modifying pitch
   */
  public getActiveVoiceInfo(): VoiceInfo | null {
    if (this.activeEngine === 'gemini_live' && geminiLiveAudioService.getStatus() === 'connected') {
      return {
        name: 'Gemini Live (Charon - Indian Male Persona)',
        lang: 'en-IN / te-IN (Dynamic Multi-Lingual)',
        isIndianMale: true,
        isMale: true,
        isTelugu: true,
      };
    }

    if (typeof window !== 'undefined' && window.speechSynthesis) {
      const voices = window.speechSynthesis.getVoices();
      // Explicitly reject female voices
      const maleVoice = voices.find(
        (v) =>
          (v.lang.includes('IN') || v.lang.includes('en-GB') || v.lang.includes('en-US')) &&
          !/female|zira|samantha|victoria|karen|veena|lekha|susan|hazel|cathy/i.test(v.name) &&
          /male|ravi|prabhat|george|david|rishi|neel|guy/i.test(v.name)
      );

      if (maleVoice) {
        return {
          name: maleVoice.name,
          lang: maleVoice.lang,
          isIndianMale: maleVoice.lang.includes('IN'),
          isMale: true,
          isTelugu: maleVoice.lang.startsWith('te'),
        };
      }
    }

    return {
      name: 'System Male Companion (en-IN)',
      lang: 'en-IN',
      isIndianMale: true,
      isMale: true,
      isTelugu: true,
    };
  }

  public updateContext(context: QuestLifeContextPayload): void {
    this.cachedContext = context;
    geminiLiveAudioService.updateContext(context);
  }

  public isWakeWord(text: string): boolean {
    return wakeWordDetector.matchesWakePhrase(text);
  }

  public extractCommandAfterWakeWord(text: string): string | null {
    const wake = this.getWakePhrase().toLowerCase();
    const regex = new RegExp(`^(?:hey\\s+|hi\\s+|ok\\s+|okay\\s+)?(?:${wake}|scar|స్కార్)[,:\\s]+(.+)$`, 'i');
    const match = text.trim().match(regex);
    if (match && match[1]) {
      return match[1].trim();
    }
    return null;
  }

  public async requestMicrophonePermission(): Promise<VoicePermissionResult> {
    try {
      const ok = await geminiLiveAudioService.initMicrophone();
      return { granted: ok };
    } catch (err: any) {
      return {
        granted: false,
        error: 'permission_denied',
        message: err?.message || 'Microphone access denied.',
      };
    }
  }

  /**
   * Continuous Speech Recognition Pipeline
   */
  private startContinuousRecognition(): boolean {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      console.warn('[VoiceService] Web SpeechRecognition not supported in this browser.');
      return false;
    }

    try {
      if (this.recognitionInstance) {
        try {
          this.recognitionInstance.abort();
        } catch (_) {}
        this.recognitionInstance = null;
      }

      const rec = new SpeechRecognition();
      rec.continuous = true;
      rec.interimResults = true;
      rec.maxAlternatives = 1;
      rec.lang = this.currentLanguage === 'te-IN' ? 'te-IN' : 'en-IN';

      rec.onstart = () => {
        this.isRecognitionRunning = true;
        console.log('[VoiceService Recognition] Speech recognition started');
      };

      rec.onresult = (event: any) => {
        // SPEAKING GATE MIDDLEWARE & HARD AUDIO GATE:
        // Discard any incoming speech recognition result if SCAR is speaking, cooling down, or processing
        if (
          speakingGate.shouldBlockInput() ||
          (typeof window !== 'undefined' && (window as any).isScarSpeaking === true) ||
          this.isSpeakingState ||
          this.currentState === 'speaking' ||
          this.currentState === 'cooldown' ||
          this.currentState === 'processing' ||
          this.isProcessingRequest ||
          geminiLiveAudioService.isMicBlocked()
        ) {
          console.log('[VoiceService] SpeakingGate blocked recognition event during speaking/cooldown/processing');
          return;
        }

        let interim = '';
        let finalChunk = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const item = event.results[i];
          const text = item[0].transcript;
          if (item.isFinal) {
            finalChunk += text;
          } else {
            interim += text;
          }
        }

        if (interim) {
          this.resetSilenceTimeout();
          this.callbacks.onTranscriptChange?.(interim);
        }

        const cleanFinal = finalChunk.trim();
        if (cleanFinal) {
          this.resetSilenceTimeout();
          console.log('[VoiceService Recognition] Final:', cleanFinal);

          // Evaluate for explicit language switch command in fallback mode
          const langEval = languageDetector.processUserTranscript(cleanFinal);
          if (langEval.isExplicitSwitch && langEval.confirmationReply) {
            console.log(`[VoiceService Fallback] Language switch confirmed: ${langEval.responseLanguage}`);
            this.callbacks.onTranscriptChange?.('');
            this.speak(langEval.confirmationReply, langEval.responseLanguage);
            return;
          }

          this.handleSpeechInput(cleanFinal);
        }
      };

      rec.onerror = (e: any) => {
        console.log('[VoiceService Recognition] Event:', e.error);
        if (e.error === 'not-allowed') {
          this.setState('error');
          this.callbacks.onError?.('permission_denied', 'Microphone permission denied.');
        } else if (e.error === 'no-speech') {
          // Normal background silence, continue recognition
        }
      };

      rec.onend = () => {
        this.isRecognitionRunning = false;
        // Auto-restart continuous recognition ONLY if Voice Mode is active and strictly in LISTENING
        if (
          this.isVoiceModeActive &&
          !this.isSpeakingState &&
          this.currentState === 'listening' &&
          !geminiLiveAudioService.isMicBlocked()
        ) {
          setTimeout(() => {
            if (
              this.isVoiceModeActive &&
              !this.isSpeakingState &&
              this.currentState === 'listening' &&
              !this.isRecognitionRunning &&
              !geminiLiveAudioService.isMicBlocked()
            ) {
              try {
                rec.start();
              } catch (_) {}
            }
          }, 200);
        }
      };

      rec.start();
      this.recognitionInstance = rec;
      this.isRecognitionRunning = true;
      return true;
    } catch (err) {
      console.warn('[VoiceService Recognition] Start error:', err);
      return false;
    }
  }

  public resumeSpeechRecognition(): void {
    if (
      this.isVoiceModeActive &&
      !this.isSpeakingState &&
      this.currentState === 'listening' &&
      !geminiLiveAudioService.isMicBlocked()
    ) {
      this.startContinuousRecognition();
    }
  }

  /**
   * Central processor for speech input text
   */
  private handleSpeechInput(text: string): void {
    // HARD AUDIO GATE & DUPLICATE PROTECTION (Requirements 1, 2, 7, 8):
    if (
      this.isSpeakingState ||
      this.currentState === 'speaking' ||
      this.currentState === 'cooldown' ||
      this.currentState === 'processing' ||
      this.isProcessingRequest ||
      geminiLiveAudioService.isMicBlocked()
    ) {
      console.log('[VoiceService] Blocked speech input while SCAR is not listening:', text);
      return;
    }

    const clean = text.trim();
    if (!clean) return;

    // Check for stop commands
    const lower = clean.toLowerCase();
    if (
      lower === 'stop' ||
      lower === 'stop voice' ||
      lower === 'stop listening' ||
      lower === 'exit voice' ||
      lower === 'shut down' ||
      lower === 'ఆపు'
    ) {
      this.deactivateVoiceMode();
      this.setState('idle');
      return;
    }

    // Check for wake word
    if (this.isWakeWord(clean)) {
      this.handleWakeWordDetection();
      return;
    }

    // Check for "Scar, <question>" in a single sentence
    const commandAfterWake = this.extractCommandAfterWakeWord(clean);
    const targetQuery = commandAfterWake || clean;

    // Enter PROCESSING state: lock mic and block duplicate triggers
    this.isSessionAwakened = true;
    this.isProcessingRequest = true;
    this.setState('processing');
    this.callbacks.onFinalTranscript?.(targetQuery);
  }

  /**
   * Attention Response:
   * When user says "Scar", SCAR responds EXACTLY: "Yes, Hunter Charan?"
   */
  public async handleWakeWordDetection(): Promise<void> {
    if (this.isAcknowledgingWakeWord || this.isSpeakingState) return;
    this.isAcknowledgingWakeWord = true;
    this.isSessionAwakened = true;
    this.setState('wake_detected');
    this.callbacks.onWakeWordDetected?.();

    try {
      const acknowledgment = 'Yes, Hunter Charan?';
      await this.speak(acknowledgment, 'en', () => {
        // Automatically enter LISTENING state for the user's question
        this.setState('listening');
      });
    } finally {
      this.isAcknowledgingWakeWord = false;
    }
  }

  /**
   * Attention Response called by UI or wake word handler
   */
  public async handleWakeWordAcknowledgment(onEndCallback?: () => void): Promise<void> {
    if (this.isAcknowledgingWakeWord) {
      onEndCallback?.();
      return;
    }
    this.isAcknowledgingWakeWord = true;
    this.isSessionAwakened = true;
    this.setState('wake_detected');

    try {
      const acknowledgment = 'Yes, Hunter Charan?';
      await this.speak(acknowledgment, 'en', () => {
        this.isAcknowledgingWakeWord = false;
        onEndCallback?.();
      });
    } catch (e) {
      console.warn('[VoiceService] Wake word acknowledgment error:', e);
      this.isAcknowledgingWakeWord = false;
      onEndCallback?.();
    }
  }

  /**
   * Handles unclear speech prompt
   */
  public async handleUnclearSpeech(onEndCallback?: () => void): Promise<void> {
    const prompt =
      this.currentLanguage === 'te-IN'
        ? 'నమస్కారం చరణ్, స్పష్టంగా వినపడలేదు. మళ్ళీ చెప్పగలరా?'
        : 'I did not catch that clearly, Hunter Charan. Could you please repeat?';
    await this.speak(prompt, this.currentLanguage === 'te-IN' ? 'te' : 'en', onEndCallback);
  }

  /**
   * Starts listening state
   */
  public async startListening(): Promise<boolean> {
    if (this.isSpeakingState) {
      return false;
    }

    await this.unlockAudioContext();

    const perm = await this.requestMicrophonePermission();
    if (!perm.granted) {
      this.setState('error');
      this.callbacks.onError?.('permission_denied', 'Microphone permission is required.');
      return false;
    }

    // Connect to Gemini Live if not already connected
    if (this.activeEngine === 'gemini_live') {
      if (geminiLiveAudioService.getStatus() !== 'connected') {
        this.setState('connecting');
        const connected = await geminiLiveAudioService.connect(this.cachedContext || undefined);
        if (!connected) {
          console.warn('[VoiceService] Gemini Live connect failed, operating in speech fallback mode');
          this.setEngine('fallback_tts');
        }
      }
    }

    // Authoritative Single Engine Management:
    if (this.activeEngine === 'gemini_live') {
      // Primary Engine: Start PCM audio streaming to Gemini Live
      await geminiLiveAudioService.startAudioCapture();
      // Ensure browser speech recognition is NOT running simultaneously
      if (this.recognitionInstance) {
        try {
          this.recognitionInstance.abort();
        } catch (_) {}
        this.recognitionInstance = null;
        this.isRecognitionRunning = false;
      }
    } else {
      // Fallback Engine: Web Speech API recognition + Browser TTS
      geminiLiveAudioService.stopAudioCapture();
      this.startContinuousRecognition();
    }

    this.setState('listening');
    return true;
  }

  /**
   * Stops listening
   */
  public stopListening(): void {
    this.clearSilenceTimeout();
    geminiLiveAudioService.stopAudioCapture();
    if (this.recognitionInstance) {
      try {
        this.recognitionInstance.abort();
      } catch (_) {}
      this.recognitionInstance = null;
    }
    this.isRecognitionRunning = false;
    if (this.currentState === 'listening') {
      this.setState('idle');
    }
  }

  /**
   * Speak response:
   * Fallback text-to-speech mechanism using natural male Indian English voice (en-IN) / Telugu voice (te-IN).
   * Enforces ONE VOICE OUTPUT ONLY: Rejected if Gemini Live native audio is active.
   */
  public async speak(
    text: string,
    languageHint?: 'te' | 'en' | 'mixed',
    onEndCallback?: () => void
  ): Promise<void> {
    // 1. Mutual exclusion: If Gemini Live is already outputting audio, PROHIBIT duplicate TTS speech
    if (centralAudioController.getActiveProvider() === 'gemini_live' && centralAudioController.isPlaybackActive()) {
      console.warn('[VoiceService] Skipped TTS speak: Gemini Live native audio is active for this response.');
      onEndCallback?.();
      return;
    }

    // 2. Start new response session in central audio controller
    const responseId = centralAudioController.startNewResponse('browser_tts', text);

    this.stopSpeaking();
    this.setState('speaking');
    speakingGate.onGeminiAudioStart();
    geminiLiveAudioService.startExternalSpeaking();

    if (typeof window === 'undefined' || !window.speechSynthesis) {
      this.isSpeakingState = false;
      centralAudioController.finishPlayback(responseId);
      geminiLiveAudioService.endExternalSpeaking();
      onEndCallback?.();
      return;
    }

    const clean = text.replace(/[*_#`[\]]/g, '').trim();
    if (!clean) {
      this.isSpeakingState = false;
      centralAudioController.finishPlayback(responseId);
      geminiLiveAudioService.endExternalSpeaking();
      onEndCallback?.();
      return;
    }

    // 3. Language & Voice selection (Requirement 6: Strict Male Indian Voice; NEVER female)
    const effectiveLang = languageHint === 'te' ? 'te' : languageHint === 'en' ? 'en' : languageDetector.getResponseLanguage();

    const utterance = new SpeechSynthesisUtterance(clean);
    utterance.rate = 1.0;
    utterance.pitch = 1.0; // Authentic natural pitch

    const voices = window.speechSynthesis.getVoices();
    let selectedVoice: SpeechSynthesisVoice | null = null;

    // Strict female voice detector: excludes all known female voices and indicators (Requirement 4 & 6)
    const isFemaleVoice = (v: SpeechSynthesisVoice): boolean => {
      const name = (v.name || '').toLowerCase();
      return (
        /female|woman|girl|shruti|lekha|veena|samantha|zira|victoria|karen|susan|hazel|cathy|geeta|kalpana|ananya|heera|priya|swara|chitra|vani|kavya|stephanie|sarah|linda|heather|fiona/i.test(name) ||
        (v as any).gender === 'female'
      );
    };

    if (effectiveLang === 'te') {
      utterance.lang = 'te-IN';
      // Find Telugu male voice only!
      selectedVoice = voices.find(
        (v) => (v.lang.startsWith('te') || v.lang.includes('te-IN')) && !isFemaleVoice(v)
      ) || null;

      // Safe fallback if browser lacks male Telugu voice:
      // STRICT REQUIREMENT: Do NOT select a female voice as an accidental fallback!
      // Use configured Male Indian English voice
      if (!selectedVoice) {
        console.log('[VoiceService] Browser lacks male Telugu voice; using Male Indian English voice without female fallback');
        utterance.lang = 'en-IN';
        selectedVoice = voices.find(
          (v) => v.lang.includes('IN') && !isFemaleVoice(v) && /male|ravi|prabhat|george|david|rishi|neel|guy/i.test(v.name)
        ) || voices.find(
          (v) => v.lang.includes('IN') && !isFemaleVoice(v)
        ) || voices.find(
          (v) => !isFemaleVoice(v) && /male|david|guy|george/i.test(v.name)
        ) || null;
      }
    } else {
      // English: Select authentic male Indian English voice
      utterance.lang = 'en-IN';
      selectedVoice = voices.find(
        (v) =>
          (v.lang.includes('IN') || v.lang.includes('en-GB') || v.lang.includes('en-US')) &&
          !isFemaleVoice(v) &&
          /male|ravi|prabhat|george|david|rishi|neel|guy/i.test(v.name)
      ) || voices.find(
        (v) => v.lang.includes('IN') && !isFemaleVoice(v)
      ) || voices.find(
        (v) => !isFemaleVoice(v) && /male|david|guy|george/i.test(v.name)
      ) || null;
    }

    if (selectedVoice) {
      utterance.voice = selectedVoice;
    }

    const voiceDisplayName = selectedVoice ? `${selectedVoice.name} (${selectedVoice.lang})` : 'Default System Voice';
    const authorized = centralAudioController.registerTtsUtterance(responseId, voiceDisplayName);
    if (!authorized) {
      console.warn('[VoiceService] TTS utterance rejected by centralAudioController');
      onEndCallback?.();
      return;
    }

    this.isSpeakingState = true;

    let hasCompleted = false;
    const finishSpeaking = () => {
      if (hasCompleted) return;
      hasCompleted = true;
      this.isSpeakingState = false;
      this.callbacks.onSpeakingEnd?.();
      onEndCallback?.();
      // Enforce 500ms cooldown gate through CentralAudioController and SpeakingGate
      centralAudioController.finishPlayback(responseId, () => {
        geminiLiveAudioService.endExternalSpeaking();
      });
    };

    utterance.onstart = () => {
      this.isSpeakingState = true;
      this.setState('speaking');
      this.callbacks.onSpeakingStart?.();
    };

    utterance.onend = () => {
      finishSpeaking();
    };

    utterance.onerror = (e) => {
      console.warn('[VoiceService TTS] SpeechSynthesis error:', e);
      finishSpeaking();
    };

    window.speechSynthesis.speak(utterance);
  }

  /**
   * Stop speaking immediately
   */
  public stopSpeaking(): void {
    centralAudioController.cancelAllPlayback('VoiceService stopSpeaking');
    geminiLiveAudioService.stopPlayback();
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      try {
        window.speechSynthesis.cancel();
      } catch (_) {}
    }
    this.isSpeakingState = false;
  }

  /**
   * Instant barge-in / interruption
   */
  public async interrupt(): Promise<void> {
    console.log('[VoiceService] Instant interruption triggered');
    this.stopSpeaking();
    geminiLiveAudioService.interrupt();

    if (this.isVoiceModeActive) {
      this.setState('listening');
    } else {
      this.setState('idle');
    }
  }

  /**
   * Activate Voice Mode session
   */
  public async activateVoiceMode(): Promise<boolean> {
    this.isVoiceModeActive = true;
    this.isSessionAwakened = true;
    androidServiceBridge.setVoiceSessionActive(true);
    this.callbacks.onVoiceModeChange?.(true);

    return this.startListening();
  }

  /**
   * Deactivate Voice Mode session
   */
  public deactivateVoiceMode(): void {
    this.clearSilenceTimeout();
    this.isVoiceModeActive = false;
    this.isSessionAwakened = false;
    androidServiceBridge.setVoiceSessionActive(false);

    this.stopListening();
    this.stopSpeaking();
    geminiLiveAudioService.disconnect();

    this.setState('idle');
    this.callbacks.onVoiceModeChange?.(false);
  }

  public isVoiceMode(): boolean {
    return this.isVoiceModeActive;
  }

  public isAwakened(): boolean {
    return this.isSessionAwakened;
  }

  public destroy(): void {
    this.deactivateVoiceMode();
    if (this.wakeWordCleanup) {
      this.wakeWordCleanup();
      this.wakeWordCleanup = null;
    }
    geminiLiveAudioService.destroy();
  }
}

export const voiceService = new VoiceService();
