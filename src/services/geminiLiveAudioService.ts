/**
 * Gemini Live Real-time Audio Service for SCAR
 * 
 * High-performance, dedicated service module managing:
 * 1. Low-latency WebSocket session connecting to server-side Gemini Live API (gemini-3.8-live).
 * 2. Real-time microphone audio capture resampled to 16kHz 16-bit PCM little-endian streaming.
 * 3. High-fidelity 24kHz PCM audio playback of SCAR's response with gapless scheduling.
 * 4. User interruption / barge-in support (local energy detection + server-driven interruption).
 * 5. Automatic reconnection with exponential backoff and session state recovery.
 * 6. Full developer diagnostics telemetry (MIC, GEMINI LIVE, OUTPUT status & errors).
 */

import { QuestLifeContextPayload } from './questLifeToolHandler.ts';
import { wakeWordDetector } from './wakeWordDetector.ts';
import { speakingGate, POST_SPEECH_COOLDOWN_MS } from './speakingGate.ts';
import { centralAudioController } from './centralAudioController.ts';
import { languageDetector, ResponseLanguage } from './languageDetector.ts';

export { POST_SPEECH_COOLDOWN_MS };

export type LiveSessionStatus = 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'error';
export type ScarVoiceState = 'IDLE' | 'LISTENING' | 'PROCESSING' | 'SPEAKING' | 'COOLDOWN';

export interface AudioDiagnostics {
  mic: {
    permission: 'granted' | 'denied' | 'prompt' | 'unknown';
    streamActive: boolean;
    audioFramesReceived: number;
    sampleRate: number;
    db: number;
    error: string | null;
    gateState: 'ENABLED' | 'BLOCKED';
  };
  geminiLive: {
    sessionConnected: boolean;
    status: LiveSessionStatus;
    audioSent: number;
    responseReceived: boolean;
    responseChunksCount: number;
    lastResponseTime: number | null;
    error: string | null;
  };
  output: {
    audioReceived: number;
    audioDecoded: number;
    audioPlaybackStarted: boolean;
    audioContextState: string;
    isPlaying: boolean;
    playbackState: 'PLAYING' | 'FINISHED';
    error: string | null;
  };
  system: {
    scarState: ScarVoiceState;
    micInput: 'ENABLED' | 'BLOCKED';
    geminiSession: 'CONNECTED' | 'DISCONNECTED';
    audioOutput: 'PLAYING' | 'FINISHED';
    wakeWord: 'ENABLED' | 'DISABLED';
    isScarSpeaking: boolean;
    isScARSpeaking: boolean;
    isProcessingRequest: boolean;
    selectedLanguage: ResponseLanguage;
    activeAudioProvider: 'gemini_live' | 'browser_tts' | 'none';
    activeVoiceName: string;
    currentResponseId: string;
    activePlaybackSources: number;
    activeTtsUtterances: number;
    audioQueueStatus: string;
    duplicateSuppressedCount: number;
  };
}

export interface GeminiLiveAudioCallbacks {
  onStatusChange?: (status: LiveSessionStatus) => void;
  onAudioChunk?: (base64Pcm: string) => void;
  onTranscript?: (text: string, isUser: boolean) => void;
  onInterrupted?: () => void;
  onTurnComplete?: () => void;
  onStateChange?: (state: ScarVoiceState) => void;
  onSpeakingStart?: () => void;
  onSpeakingEnd?: () => void;
  onCooldownStart?: () => void;
  onCooldownEnd?: () => void;
  onListeningStart?: () => void;
  onListeningEnd?: () => void;
  onInputVolume?: (volume: number) => void;
  onOutputVolume?: (volume: number) => void;
  onError?: (error: string, isFatal?: boolean) => void;
  onDiagnosticsUpdate?: (diag: AudioDiagnostics) => void;
}

export class GeminiLiveAudioService {
  // Session & Connection State
  private ws: WebSocket | null = null;
  private status: LiveSessionStatus = 'disconnected';
  private callbacks: GeminiLiveAudioCallbacks = {};
  private cachedContext: QuestLifeContextPayload | null = null;
  private shouldMaintainConnection = false;

  // Auto-Reconnection & Heartbeat
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 8;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;
  private isReconnecting = false;

  // Authoritative Voice State Machine & SpeakingGate Middleware
  private voiceState: ScarVoiceState = 'IDLE';
  private isMicGateBlocked = false;
  private isScarSpeaking = false;
  public get isScARSpeaking(): boolean {
    return this.isScarSpeaking;
  }
  private isInCooldown = false;
  private isProcessingRequest = false;
  private cooldownTimer: ReturnType<typeof setTimeout> | null = null;

  // Audio Input (Microphone -> 16kHz PCM streaming)
  private inputAudioCtx: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private processorNode: ScriptProcessorNode | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private silentGainNode: GainNode | null = null;
  private inputAnalyser: AnalyserNode | null = null;
  private isCapturingAudio = false;

  // Audio Output (24kHz PCM playback from Gemini Live)
  private outputAudioCtx: AudioContext | null = null;
  private outputAnalyser: AnalyserNode | null = null;
  private nextPlayTime = 0;
  private activeSources: Set<AudioBufferSourceNode> = new Set();
  private isPlayingAudio = false;
  private playbackEndTimer: ReturnType<typeof setTimeout> | null = null;

  // Developer Diagnostics State
  private diagnostics: AudioDiagnostics = {
    mic: {
      permission: 'unknown',
      streamActive: false,
      audioFramesReceived: 0,
      sampleRate: 0,
      db: -60,
      error: null,
      gateState: 'ENABLED',
    },
    geminiLive: {
      sessionConnected: false,
      status: 'disconnected',
      audioSent: 0,
      responseReceived: false,
      responseChunksCount: 0,
      lastResponseTime: null,
      error: null,
    },
    output: {
      audioReceived: 0,
      audioDecoded: 0,
      audioPlaybackStarted: false,
      audioContextState: 'uninitialized',
      isPlaying: false,
      playbackState: 'FINISHED',
      error: null,
    },
    system: {
      scarState: 'IDLE',
      micInput: 'BLOCKED',
      geminiSession: 'DISCONNECTED',
      audioOutput: 'FINISHED',
      wakeWord: 'ENABLED',
      isScarSpeaking: false,
      isScARSpeaking: false,
      isProcessingRequest: false,
      selectedLanguage: 'en',
      activeAudioProvider: 'none',
      activeVoiceName: 'None',
      currentResponseId: 'none',
      activePlaybackSources: 0,
      activeTtsUtterances: 0,
      audioQueueStatus: 'IDLE',
      duplicateSuppressedCount: 0,
    },
  };

  constructor(callbacks: GeminiLiveAudioCallbacks = {}) {
    this.callbacks = callbacks;

    // Connect Web Audio API stream muting/unmuting to SpeakingGate utility
    speakingGate.registerStream({
      mute: () => {
        this.isMicGateBlocked = true;
        this.diagnostics.mic.gateState = 'BLOCKED';
        this.diagnostics.system.micInput = 'BLOCKED';
        this.notifyDiagnostics();
      },
      unmute: () => {
        this.isMicGateBlocked = false;
        this.diagnostics.mic.gateState = this.isCapturingAudio ? 'ENABLED' : 'BLOCKED';
        if (this.voiceState === 'LISTENING') {
          this.diagnostics.system.micInput = 'ENABLED';
        }
        this.notifyDiagnostics();
      },
    });

    // Register buffer purge handler with centralAudioController to clear raw audio queues
    centralAudioController.registerBufferPurge(() => {
      this.clearBuffers();
    });
  }

  public registerCallbacks(callbacks: GeminiLiveAudioCallbacks): void {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  public getStatus(): LiveSessionStatus {
    return this.status;
  }

  public getVoiceState(): ScarVoiceState {
    return this.voiceState;
  }

  public isListening(): boolean {
    return this.voiceState === 'LISTENING';
  }

  public isSpeaking(): boolean {
    return (
      speakingGate.isScarSpeaking ||
      this.isScarSpeaking ||
      this.isPlayingAudio ||
      this.voiceState === 'SPEAKING'
    );
  }

  public isCooldown(): boolean {
    return this.isInCooldown || this.voiceState === 'COOLDOWN';
  }

  public isMicBlocked(): boolean {
    return (
      speakingGate.shouldBlockInput() ||
      (typeof window !== 'undefined' && (window as any).isScarSpeaking === true) ||
      this.isMicGateBlocked ||
      this.isScarSpeaking ||
      this.isInCooldown ||
      this.isProcessingRequest ||
      this.voiceState !== 'LISTENING'
    );
  }

  public getDiagnostics(): AudioDiagnostics {
    return { ...this.diagnostics };
  }

  public getInputAnalyser(): AnalyserNode | null {
    return this.inputAnalyser;
  }

  public getOutputAnalyser(): AnalyserNode | null {
    return this.outputAnalyser;
  }

  public getActiveAnalyser(): AnalyserNode | null {
    if (this.isPlayingAudio && this.outputAnalyser) {
      return this.outputAnalyser;
    }
    if (this.isCapturingAudio && this.inputAnalyser && !this.isMicBlocked()) {
      return this.inputAnalyser;
    }
    return null;
  }

  private notifyDiagnostics(): void {
    const ctrlDiag = centralAudioController.getDiagnostics();
    this.diagnostics.system.geminiSession =
      this.status === 'connected' ? 'CONNECTED' : 'DISCONNECTED';
    this.diagnostics.system.selectedLanguage = ctrlDiag.selectedLanguage;
    this.diagnostics.system.activeAudioProvider = ctrlDiag.activeProvider;
    this.diagnostics.system.activeVoiceName = ctrlDiag.activeVoiceName;
    this.diagnostics.system.currentResponseId = ctrlDiag.currentResponseId;
    this.diagnostics.system.activePlaybackSources = ctrlDiag.activePlaybackSources;
    this.diagnostics.system.activeTtsUtterances = ctrlDiag.activeTtsUtterances;
    this.diagnostics.system.audioQueueStatus = ctrlDiag.audioQueueStatus;
    this.diagnostics.system.duplicateSuppressedCount = ctrlDiag.duplicateSuppressedCount;
    this.callbacks.onDiagnosticsUpdate?.({ ...this.diagnostics });
  }

  /**
   * Central authoritative voice state machine transition
   * Required states: IDLE -> LISTENING -> PROCESSING -> SPEAKING -> COOLDOWN -> LISTENING
   */
  public setVoiceState(newState: ScarVoiceState): void {
    if (this.voiceState === newState) return;
    console.log(`[GeminiLiveAudioService] State Transition: ${this.voiceState} -> ${newState}`);
    this.voiceState = newState;

    switch (newState) {
      case 'SPEAKING':
        this.isScarSpeaking = true;
        if (typeof window !== 'undefined') (window as any).isScarSpeaking = true;
        speakingGate.onGeminiAudioStart();
        this.isInCooldown = false;
        this.isMicGateBlocked = true;
        this.isPlayingAudio = true;
        if (this.cooldownTimer) {
          clearTimeout(this.cooldownTimer);
          this.cooldownTimer = null;
        }
        this.diagnostics.mic.gateState = 'BLOCKED';
        this.diagnostics.output.isPlaying = true;
        this.diagnostics.output.playbackState = 'PLAYING';
        this.diagnostics.system.scarState = 'SPEAKING';
        this.diagnostics.system.micInput = 'BLOCKED';
        this.diagnostics.system.wakeWord = 'DISABLED';
        this.diagnostics.system.audioOutput = 'PLAYING';
        this.diagnostics.system.isScarSpeaking = true;
        this.diagnostics.system.isScARSpeaking = true;
        wakeWordDetector.setBlocked(true);
        this.callbacks.onSpeakingStart?.();
        break;

      case 'COOLDOWN':
        // Crucial requirement: isScarSpeaking remains TRUE during both playback and subsequent 500ms cooldown!
        this.isScarSpeaking = true;
        if (typeof window !== 'undefined') (window as any).isScarSpeaking = true;
        this.isInCooldown = true;
        this.isMicGateBlocked = true; // MIC INPUT REMAINS STRICTLY BLOCKED DURING COOLDOWN
        this.isPlayingAudio = false;
        this.diagnostics.mic.gateState = 'BLOCKED';
        this.diagnostics.output.isPlaying = false;
        this.diagnostics.output.playbackState = 'FINISHED';
        this.diagnostics.system.scarState = 'COOLDOWN';
        this.diagnostics.system.micInput = 'BLOCKED';
        this.diagnostics.system.wakeWord = 'DISABLED';
        this.diagnostics.system.audioOutput = 'FINISHED';
        this.diagnostics.system.isScarSpeaking = true;
        this.diagnostics.system.isScARSpeaking = true;
        wakeWordDetector.setBlocked(true);
        this.callbacks.onCooldownStart?.();
        break;

      case 'PROCESSING':
        this.isScarSpeaking = false;
        if (typeof window !== 'undefined') (window as any).isScarSpeaking = false;
        this.isProcessingRequest = true;
        this.isMicGateBlocked = true; // MIC INPUT BLOCKED WHILE PROCESSING
        this.isPlayingAudio = false;
        this.diagnostics.mic.gateState = 'BLOCKED';
        this.diagnostics.output.isPlaying = false;
        this.diagnostics.output.playbackState = 'FINISHED';
        this.diagnostics.system.scarState = 'PROCESSING';
        this.diagnostics.system.micInput = 'BLOCKED';
        this.diagnostics.system.wakeWord = 'DISABLED';
        this.diagnostics.system.audioOutput = 'FINISHED';
        this.diagnostics.system.isScarSpeaking = false;
        this.diagnostics.system.isScARSpeaking = false;
        this.diagnostics.system.isProcessingRequest = true;
        wakeWordDetector.setBlocked(true);
        break;

      case 'LISTENING':
        this.isScarSpeaking = false;
        if (typeof window !== 'undefined') (window as any).isScarSpeaking = false;
        this.isInCooldown = false;
        this.isProcessingRequest = false;
        this.isMicGateBlocked = false; // MIC INPUT ENABLED
        this.isPlayingAudio = false;
        this.diagnostics.mic.gateState = 'ENABLED';
        this.diagnostics.output.isPlaying = false;
        this.diagnostics.output.playbackState = 'FINISHED';
        this.diagnostics.system.scarState = 'LISTENING';
        this.diagnostics.system.micInput = 'ENABLED';
        this.diagnostics.system.wakeWord = 'ENABLED';
        this.diagnostics.system.audioOutput = 'FINISHED';
        this.diagnostics.system.isScarSpeaking = false;
        this.diagnostics.system.isScARSpeaking = false;
        this.diagnostics.system.isProcessingRequest = false;
        wakeWordDetector.setBlocked(false);
        this.callbacks.onListeningStart?.();
        break;

      case 'IDLE':
      default:
        this.isScarSpeaking = false;
        if (typeof window !== 'undefined') (window as any).isScarSpeaking = false;
        this.isInCooldown = false;
        this.isProcessingRequest = false;
        this.isMicGateBlocked = !this.isCapturingAudio;
        this.isPlayingAudio = false;
        this.diagnostics.mic.gateState = this.isCapturingAudio ? 'ENABLED' : 'BLOCKED';
        this.diagnostics.output.isPlaying = false;
        this.diagnostics.output.playbackState = 'FINISHED';
        this.diagnostics.system.scarState = 'IDLE';
        this.diagnostics.system.micInput = this.isCapturingAudio ? 'ENABLED' : 'BLOCKED';
        this.diagnostics.system.wakeWord = 'ENABLED';
        this.diagnostics.system.audioOutput = 'FINISHED';
        this.diagnostics.system.isScarSpeaking = false;
        this.diagnostics.system.isScARSpeaking = false;
        this.diagnostics.system.isProcessingRequest = false;
        wakeWordDetector.setBlocked(false);
        break;
    }

    this.notifyDiagnostics();
    this.callbacks.onStateChange?.(newState);
  }

  public setProcessing(processing: boolean): void {
    if (processing) {
      this.setVoiceState('PROCESSING');
    } else if (this.voiceState === 'PROCESSING') {
      this.setVoiceState('LISTENING');
    }
  }

  public startExternalSpeaking(): void {
    if (this.cooldownTimer) {
      clearTimeout(this.cooldownTimer);
      this.cooldownTimer = null;
    }
    this.setVoiceState('SPEAKING');
  }

  public endExternalSpeaking(): void {
    this.onAudioPlaybackFinished();
  }

  private setStatus(newStatus: LiveSessionStatus): void {
    if (this.status === newStatus) return;
    this.status = newStatus;
    this.diagnostics.geminiLive.status = newStatus;
    this.diagnostics.geminiLive.sessionConnected = newStatus === 'connected';
    this.notifyDiagnostics();

    try {
      this.callbacks.onStatusChange?.(newStatus);
    } catch (err) {
      console.error('[GeminiLiveAudioService] Error in onStatusChange callback:', err);
    }
  }

  /**
   * Connect WebSocket session to Gemini Live server
   */
  public async connect(context?: QuestLifeContextPayload): Promise<boolean> {
    if (context) {
      this.cachedContext = context;
    }
    this.shouldMaintainConnection = true;

    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return true;
    }

    if (!this.isReconnecting) {
      this.setStatus('connecting');
    }

    return new Promise((resolve) => {
      try {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const host = window.location.host;
        const wsUrl = `${protocol}//${host}/api/scar/live`;

        this.ws = new WebSocket(wsUrl);

        const connectionTimeout = setTimeout(() => {
          if (this.status === 'connecting' || this.status === 'reconnecting') {
            console.warn('[GeminiLiveAudioService] WebSocket connection timed out');
            this.handleConnectionFailure('Connection timeout to Gemini Live gateway.');
            resolve(false);
          }
        }, 8000);

        this.ws.onopen = () => {
          clearTimeout(connectionTimeout);
          this.reconnectAttempts = 0;
          this.isReconnecting = false;
          this.diagnostics.geminiLive.error = null;
          this.setStatus('connected');
          this.startHeartbeat();

          // Send initial session setup with real QuestLife context
          this.sendPayload({
            type: 'setup',
            context: this.cachedContext || {},
          });

          resolve(true);
        };

        this.ws.onmessage = (event) => {
          this.handleServerMessage(event.data);
        };

        this.ws.onerror = (event) => {
          console.error('[GeminiLiveAudioService] WebSocket error:', event);
          clearTimeout(connectionTimeout);
          this.diagnostics.geminiLive.error = 'WebSocket error connecting to server';
          this.notifyDiagnostics();
          if (this.status !== 'reconnecting') {
            this.callbacks.onError?.('Gemini Live WebSocket connection error.', false);
          }
        };

        this.ws.onclose = (event) => {
          clearTimeout(connectionTimeout);
          this.stopHeartbeat();
          console.log('[GeminiLiveAudioService] WebSocket closed:', event.code, event.reason);

          if (this.shouldMaintainConnection) {
            this.scheduleAutoReconnect();
          } else {
            this.setStatus('disconnected');
          }
        };
      } catch (err: any) {
        console.error('[GeminiLiveAudioService] Connection initialization failed:', err);
        this.handleConnectionFailure(err?.message || 'Failed to initialize WebSocket');
        resolve(false);
      }
    });
  }

  /**
   * Handle incoming messages from Gemini Live server
   */
  private handleServerMessage(raw: any): void {
    try {
      const msg = JSON.parse(raw);

      switch (msg.type) {
        case 'ready':
          console.log('[GeminiLiveAudioService] SCAR Gemini Live ready signal received');
          this.diagnostics.geminiLive.sessionConnected = true;
          this.diagnostics.geminiLive.error = null;
          this.notifyDiagnostics();
          break;

        case 'audio':
          if (msg.data) {
            this.diagnostics.geminiLive.responseReceived = true;
            this.diagnostics.geminiLive.responseChunksCount++;
            this.diagnostics.geminiLive.lastResponseTime = Date.now();
            this.notifyDiagnostics();

            this.callbacks.onAudioChunk?.(msg.data);
            this.playPcmChunk(msg.data);
          }
          break;

        case 'transcript':
          if (msg.text) {
            this.diagnostics.geminiLive.responseReceived = true;
            this.diagnostics.geminiLive.lastResponseTime = Date.now();
            this.notifyDiagnostics();
            this.callbacks.onTranscript?.(msg.text, !!msg.isUser);
          }
          break;

        case 'interrupted':
          console.log('[GeminiLiveAudioService] Interrupted by model / server');
          this.stopPlayback();
          this.callbacks.onInterrupted?.();
          break;

        case 'turn_complete':
          this.callbacks.onTurnComplete?.();
          break;

        case 'pong':
          // Heartbeat acknowledged
          break;

        case 'error':
          console.warn('[GeminiLiveAudioService] Server reported error:', msg.message);
          this.diagnostics.geminiLive.error = msg.message || 'Live session error';
          this.notifyDiagnostics();
          this.callbacks.onError?.(msg.message || 'Live session error', false);
          break;

        default:
          break;
      }
    } catch (parseErr) {
      console.error('[GeminiLiveAudioService] Failed to parse message:', parseErr);
    }
  }

  /**
   * Send payload safely over WebSocket
   */
  public sendPayload(payload: any): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(JSON.stringify(payload));
      } catch (err) {
        console.error('[GeminiLiveAudioService] Send payload error:', err);
      }
    }
  }

  /**
   * Lock response language on active Gemini Live session
   */
  public lockResponseLanguage(language: string): void {
    this.sendPayload({ type: 'lock_language', language });
  }

  /**
   * Schedule automatic reconnection with exponential backoff & jitter
   */
  private scheduleAutoReconnect(): void {
    if (!this.shouldMaintainConnection) return;

    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.warn('[GeminiLiveAudioService] Maximum reconnection attempts reached.');
      this.setStatus('error');
      this.diagnostics.geminiLive.error = 'Reconnection failed after maximum retries';
      this.notifyDiagnostics();
      this.callbacks.onError?.('Unable to reconnect to Gemini Live. Voice session ended.', true);
      this.stopLiveSession();
      return;
    }

    this.reconnectAttempts++;
    this.isReconnecting = true;
    this.setStatus('reconnecting');

    // Exponential backoff: base 1.5s, factor 1.6, max 10s + random jitter
    const delay = Math.min(10000, 1500 * Math.pow(1.6, this.reconnectAttempts - 1)) + Math.floor(Math.random() * 500);
    console.log(`[GeminiLiveAudioService] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }

    this.reconnectTimer = setTimeout(async () => {
      if (this.shouldMaintainConnection) {
        const success = await this.connect();
        if (success && this.isCapturingAudio) {
          console.log('[GeminiLiveAudioService] Reconnection succeeded, stream active.');
        }
      }
    }, delay);
  }

  private handleConnectionFailure(reason: string): void {
    this.diagnostics.geminiLive.error = reason;
    this.notifyDiagnostics();
    if (this.shouldMaintainConnection && this.reconnectAttempts < this.maxReconnectAttempts) {
      this.scheduleAutoReconnect();
    } else {
      this.setStatus('error');
      this.callbacks.onError?.(reason, true);
    }
  }

  /**
   * Heartbeat to prevent Cloud Run / preview socket timeouts
   */
  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.heartbeatInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.sendPayload({ type: 'ping' });
      }
    }, 20000);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  // =========================================================================
  // AUDIO INPUT: MICROPHONE -> 16kHz PCM BASE64 STREAMING
  // =========================================================================

  /**
   * Initialize microphone media stream
   */
  public async initMicrophone(): Promise<boolean> {
    try {
      if (this.mediaStream && this.mediaStream.active) {
        const activeTracks = this.mediaStream.getAudioTracks().filter((t) => t.readyState === 'live' && t.enabled);
        if (activeTracks.length > 0) {
          this.diagnostics.mic.permission = 'granted';
          this.diagnostics.mic.streamActive = true;
          this.diagnostics.mic.error = null;
          this.notifyDiagnostics();
          return true;
        }
      }

      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      this.diagnostics.mic.permission = 'granted';
      this.diagnostics.mic.streamActive = true;
      this.diagnostics.mic.error = null;
      this.notifyDiagnostics();
      return true;
    } catch (err: any) {
      console.error('[GeminiLiveAudioService] Microphone access error:', err);
      const isDenied = err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError';
      this.diagnostics.mic.permission = isDenied ? 'denied' : 'unknown';
      this.diagnostics.mic.streamActive = false;
      this.diagnostics.mic.error = err.message || 'Microphone access denied';
      this.notifyDiagnostics();

      this.callbacks.onError?.(
        isDenied
          ? 'Microphone permission denied. Please allow microphone access in your browser.'
          : 'Microphone device is busy or unavailable.',
        true
      );
      return false;
    }
  }

  /**
   * Resamples input sample rate (e.g. 44.1k/48k) to 16kHz 16-bit linear PCM little-endian
   */
  private downsampleTo16k(input: Float32Array, inputSampleRate: number): Int16Array {
    if (inputSampleRate === 16000) {
      const output = new Int16Array(input.length);
      for (let i = 0; i < input.length; i++) {
        const s = Math.max(-1, Math.min(1, input[i]));
        output[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
      }
      return output;
    }

    const ratio = inputSampleRate / 16000;
    const newLength = Math.round(input.length / ratio);
    const output = new Int16Array(newLength);

    for (let i = 0; i < newLength; i++) {
      const pos = i * ratio;
      const index = Math.floor(pos);
      const fraction = pos - index;
      const s0 = input[index] || 0;
      const s1 = input[index + 1] !== undefined ? input[index + 1] : s0;
      const sample = s0 + fraction * (s1 - s0);
      const clamped = Math.max(-1, Math.min(1, sample));
      output[i] = clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff;
    }
    return output;
  }

  /**
   * Start capturing microphone audio and streaming 16kHz PCM chunks
   */
  public async startAudioCapture(): Promise<boolean> {
    if (this.isCapturingAudio && this.processorNode) {
      return true;
    }

    const micReady = await this.initMicrophone();
    if (!micReady || !this.mediaStream) {
      return false;
    }

    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.inputAudioCtx = new AudioCtx();

      if (this.inputAudioCtx.state === 'suspended') {
        await this.inputAudioCtx.resume();
      }

      const inputSampleRate = this.inputAudioCtx.sampleRate || 48000;
      this.diagnostics.mic.sampleRate = inputSampleRate;
      this.diagnostics.mic.streamActive = true;

      // Real input analyser for HUD visualizer
      this.inputAnalyser = this.inputAudioCtx.createAnalyser();
      this.inputAnalyser.fftSize = 256;
      this.inputAnalyser.smoothingTimeConstant = 0.8;

      this.sourceNode = this.inputAudioCtx.createMediaStreamSource(this.mediaStream);
      this.sourceNode.connect(this.inputAnalyser);

      // Low-latency buffer size (2048 samples = ~43ms @ 48kHz)
      const bufferSize = 2048;
      this.processorNode = this.inputAudioCtx.createScriptProcessor(bufferSize, 1, 1);

      this.processorNode.onaudioprocess = (e) => {
        if (!this.isCapturingAudio) return;

        // SPEAKING GATE MIDDLEWARE & HARD AUDIO GATE:
        // While isScarSpeaking is true or during 500ms cooldown or when gate is blocked:
        // Disable microphone capture and block all incoming speech events from the Web Audio API stream!
        // Ensuring ZERO input is sent to the AI until after onPlaybackFinished triggers plus a 500ms cooldown.
        if (
          speakingGate.shouldBlockInput() ||
          this.isScarSpeaking ||
          (typeof window !== 'undefined' && (window as any).isScarSpeaking === true) ||
          this.isMicBlocked() ||
          this.isMicGateBlocked ||
          this.isInCooldown ||
          this.isProcessingRequest ||
          this.voiceState !== 'LISTENING'
        ) {
          this.callbacks.onInputVolume?.(0);
          return;
        }

        const inputChannelData = e.inputBuffer.getChannelData(0);

        // Calculate RMS input volume & dB
        let sum = 0;
        for (let i = 0; i < inputChannelData.length; i++) {
          sum += inputChannelData[i] * inputChannelData[i];
        }
        const rms = Math.sqrt(sum / inputChannelData.length);
        const volume = Math.min(1, rms * 4.5);
        this.callbacks.onInputVolume?.(volume);

        // Update mic diagnostics
        this.diagnostics.mic.audioFramesReceived++;
        this.diagnostics.mic.db = rms > 0.0001 ? Math.round(20 * Math.log10(rms)) : -60;

        // Convert Float32Array to 16kHz 16-bit linear PCM (Int16Array)
        const pcm16 = this.downsampleTo16k(inputChannelData, inputSampleRate);

        // Safe byte buffer conversion
        const buffer = new Uint8Array(pcm16.buffer, pcm16.byteOffset, pcm16.byteLength);
        let binary = '';
        const len = buffer.byteLength;
        for (let i = 0; i < len; i++) {
          binary += String.fromCharCode(buffer[i]);
        }
        const base64 = btoa(binary);

        // Stream real-time input to Gemini Live ONLY when connected and state is strictly LISTENING
        if (this.status === 'connected' && this.voiceState === 'LISTENING') {
          this.sendPayload({
            type: 'realtime_input',
            audio: base64,
          });
          this.diagnostics.geminiLive.audioSent++;
        }

        // Periodically notify diagnostics (every ~15 frames, ~0.6s)
        if (this.diagnostics.mic.audioFramesReceived % 15 === 0) {
          this.notifyDiagnostics();
        }
      };

      // Connect source to processor
      this.sourceNode.connect(this.processorNode);

      // Connect processor to silent gain to keep pipeline active without echo feedback
      this.silentGainNode = this.inputAudioCtx.createGain();
      this.silentGainNode.gain.value = 0.0;
      this.processorNode.connect(this.silentGainNode);
      this.silentGainNode.connect(this.inputAudioCtx.destination);

      this.isCapturingAudio = true;
      this.notifyDiagnostics();
      this.callbacks.onListeningStart?.();
      return true;
    } catch (err: any) {
      console.error('[GeminiLiveAudioService] Failed to start audio capture:', err);
      this.diagnostics.mic.error = err.message || 'Failed to start audio processor';
      this.notifyDiagnostics();
      return false;
    }
  }

  /**
   * Stop capturing microphone audio
   */
  public stopAudioCapture(): void {
    if (!this.isCapturingAudio) return;
    this.isCapturingAudio = false;

    // Send audio stream end signal so Gemini model knows turn has concluded
    if (this.status === 'connected') {
      this.sendPayload({ type: 'audio_stream_end' });
    }

    if (this.processorNode) {
      try {
        this.processorNode.disconnect();
      } catch (_) {}
      this.processorNode = null;
    }

    if (this.silentGainNode) {
      try {
        this.silentGainNode.disconnect();
      } catch (_) {}
      this.silentGainNode = null;
    }

    if (this.sourceNode) {
      try {
        this.sourceNode.disconnect();
      } catch (_) {}
      this.sourceNode = null;
    }

    if (this.inputAnalyser) {
      try {
        this.inputAnalyser.disconnect();
      } catch (_) {}
      this.inputAnalyser = null;
    }

    if (this.inputAudioCtx) {
      try {
        this.inputAudioCtx.close();
      } catch (_) {}
      this.inputAudioCtx = null;
    }

    this.diagnostics.mic.streamActive = false;
    this.notifyDiagnostics();
    this.callbacks.onInputVolume?.(0);
    this.callbacks.onListeningEnd?.();
  }

  // =========================================================================
  // AUDIO OUTPUT: 24kHz PCM PLAYBACK & GAPLESS SCHEDULING
  // =========================================================================

  /**
   * Proactively unlocks browser AudioContext on user interaction/click
   */
  public async unlockAudioContext(): Promise<boolean> {
    try {
      const ctx = this.getOutputContext();
      if (ctx.state === 'suspended') {
        await ctx.resume();
      }
      this.diagnostics.output.audioContextState = ctx.state;
      if (ctx.state === 'running') {
        this.diagnostics.output.error = null;
      }
      this.notifyDiagnostics();
      return ctx.state === 'running';
    } catch (err: any) {
      console.warn('[GeminiLiveAudioService] AudioContext unlock error:', err);
      this.diagnostics.output.audioContextState = this.outputAudioCtx?.state || 'suspended';
      this.diagnostics.output.error = `AudioContext suspended: ${err?.message || 'interaction required'}`;
      this.notifyDiagnostics();
      return false;
    }
  }

  private getOutputContext(): AudioContext {
    if (!this.outputAudioCtx || this.outputAudioCtx.state === 'closed') {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.outputAudioCtx = new AudioCtx();
      this.nextPlayTime = 0;

      // Real output analyser for voice visualizer
      this.outputAnalyser = this.outputAudioCtx.createAnalyser();
      this.outputAnalyser.fftSize = 256;
      this.outputAnalyser.smoothingTimeConstant = 0.8;
      this.outputAnalyser.connect(this.outputAudioCtx.destination);
    }

    this.diagnostics.output.audioContextState = this.outputAudioCtx.state;

    if (this.outputAudioCtx.state === 'suspended') {
      this.outputAudioCtx.resume().catch((err) => {
        console.warn('[GeminiLiveAudioService] AudioContext resume failed:', err);
        this.diagnostics.output.error = 'AudioContext suspended; user interaction required';
        this.notifyDiagnostics();
      });
    }

    return this.outputAudioCtx;
  }

  /**
   * Play incoming 24kHz raw PCM chunk from Gemini Live
   */
  public playPcmChunk(base64Data: string): void {
    if (!base64Data) return;

    this.diagnostics.output.audioReceived++;

    // Cancel cooldown timer if new chunk arrives while cooling down
    if (this.cooldownTimer) {
      clearTimeout(this.cooldownTimer);
      this.cooldownTimer = null;
    }

    // Ensure active response in CentralAudioPlaybackController is registered for Gemini Live
    let responseId = centralAudioController.getCurrentResponseId();
    if (centralAudioController.getActiveProvider() !== 'gemini_live' || !centralAudioController.isPlaybackActive()) {
      responseId = centralAudioController.startNewResponse('gemini_live');
    }

    // Explicitly notify SpeakingGate middleware: Gemini audio has started playing
    speakingGate.onGeminiAudioStart();
    this.isScarSpeaking = true;
    if (typeof window !== 'undefined') {
      (window as any).isScarSpeaking = true;
    }

    // Immediately enforce SPEAKING state and block microphone
    if (this.voiceState !== 'SPEAKING') {
      this.setVoiceState('SPEAKING');
    }

    try {
      const ctx = this.getOutputContext();

      // Decode base64 to binary
      const binaryString = atob(base64Data);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      // Safe 16-bit PCM little-endian decoding via DataView
      const numSamples = Math.floor(bytes.byteLength / 2);
      if (numSamples === 0) return;

      const audioBuffer = ctx.createBuffer(1, numSamples, 24000);
      const channelData = audioBuffer.getChannelData(0);
      const dataView = new DataView(bytes.buffer, bytes.byteOffset, numSamples * 2);

      let sum = 0;
      for (let i = 0; i < numSamples; i++) {
        const int16 = dataView.getInt16(i * 2, true); // Little-endian
        const floatVal = int16 / 32768.0;
        channelData[i] = floatVal;
        sum += floatVal * floatVal;
      }

      this.diagnostics.output.audioDecoded++;

      const rms = Math.sqrt(sum / numSamples);
      this.callbacks.onOutputVolume?.(Math.min(1, rms * 4));

      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;

      // Register with central audio controller (enforces single source & cancels any rogue TTS)
      const authorized = centralAudioController.registerWebAudioSource(source, responseId, ctx);
      if (!authorized) {
        console.warn('[GeminiLiveAudioService] Discarding un-authorized or stale PCM chunk');
        return;
      }

      // Connect to output analyser and destination
      if (this.outputAnalyser) {
        source.connect(this.outputAnalyser);
      } else {
        source.connect(ctx.destination);
      }

      const currentTime = ctx.currentTime;
      // Seamlessly queue right after previous chunk or play immediately
      const startTime = Math.max(currentTime, this.nextPlayTime);
      source.start(startTime);

      this.nextPlayTime = startTime + audioBuffer.duration;
      this.activeSources.add(source);

      if (this.playbackEndTimer) {
        clearTimeout(this.playbackEndTimer);
      }
      const timeUntilEnd = Math.max(0, (this.nextPlayTime - currentTime) * 1000) + 40;
      this.playbackEndTimer = setTimeout(() => {
        this.onAudioPlaybackFinished();
      }, timeUntilEnd);

      source.onended = () => {
        this.activeSources.delete(source);
      };
    } catch (err: any) {
      console.error('[GeminiLiveAudioService] Error decoding/playing PCM chunk:', err);
      this.diagnostics.output.error = err.message || 'PCM decoding error';
      this.notifyDiagnostics();
    }
  }

  /**
   * Called when all queued audio chunks have finished playing
   * Enforces: SPEAKING -> COOLDOWN -> (after POST_SPEECH_COOLDOWN_MS) -> LISTENING
   */
  private onAudioPlaybackFinished(): void {
    if (this.playbackEndTimer) {
      clearTimeout(this.playbackEndTimer);
      this.playbackEndTimer = null;
    }
    this.isPlayingAudio = false;
    this.activeSources.clear();
    this.nextPlayTime = 0;
    this.diagnostics.output.isPlaying = false;
    this.callbacks.onSpeakingEnd?.();
    this.callbacks.onOutputVolume?.(0);

    // Keep isScarSpeaking = true during both playback and the subsequent 500ms cooldown
    this.isScarSpeaking = true;
    if (typeof window !== 'undefined') {
      (window as any).isScarSpeaking = true;
    }

    // Transition to COOLDOWN: mic input remains hard-blocked for POST_SPEECH_COOLDOWN_MS (500ms)
    this.setVoiceState('COOLDOWN');

    if (this.cooldownTimer) {
      clearTimeout(this.cooldownTimer);
      this.cooldownTimer = null;
    }

    // CentralAudioController coordinates with SpeakingGate to hold 500ms cooldown
    centralAudioController.finishPlayback(centralAudioController.getCurrentResponseId(), () => {
      this.isScarSpeaking = false;
      if (typeof window !== 'undefined') {
        (window as any).isScarSpeaking = false;
      }
      this.cooldownTimer = null;
      this.callbacks.onCooldownEnd?.();

      // Transition to LISTENING (or IDLE if session is disconnected)
      if (this.shouldMaintainConnection && this.isCapturingAudio) {
        this.setVoiceState('LISTENING');
      } else {
        this.setVoiceState('IDLE');
      }
    });
  }

  /**
   * Purges all pending audio buffers, stops active sources, and resets scheduling cursor
   */
  public clearBuffers(): void {
    if (this.playbackEndTimer) {
      clearTimeout(this.playbackEndTimer);
      this.playbackEndTimer = null;
    }

    for (const src of this.activeSources) {
      try {
        src.stop();
        src.disconnect();
      } catch (_) {}
    }
    this.activeSources.clear();

    if (this.outputAudioCtx) {
      this.nextPlayTime = this.outputAudioCtx.currentTime;
    } else {
      this.nextPlayTime = 0;
    }

    this.isPlayingAudio = false;
    this.diagnostics.output.isPlaying = false;
  }

  /**
   * Stop / Interrupt SCAR playback immediately (Barge-in / User Interruption)
   */
  public stopPlayback(): void {
    if (this.playbackEndTimer) {
      clearTimeout(this.playbackEndTimer);
      this.playbackEndTimer = null;
    }

    centralAudioController.cancelAllPlayback('Stop playback requested');

    for (const src of this.activeSources) {
      try {
        src.stop();
        src.disconnect();
      } catch (_) {}
    }
    this.activeSources.clear();

    if (this.outputAudioCtx) {
      this.nextPlayTime = this.outputAudioCtx.currentTime;
    } else {
      this.nextPlayTime = 0;
    }

    if (this.voiceState === 'SPEAKING' || this.isPlayingAudio) {
      this.onAudioPlaybackFinished();
    }
  }

  /**
   * Trigger user interruption:
   * 1. Stop local audio playback immediately.
   * 2. Send interrupt signal to server-side Gemini Live session.
   * 3. Notify callbacks.
   */
  public interrupt(): void {
    console.log('[GeminiLiveAudioService] Manual / local interruption triggered');
    this.stopPlayback();
    this.sendPayload({ type: 'interrupt' });
    this.callbacks.onInterrupted?.();
  }

  /**
   * Send a text message turn to Gemini Live
   */
  public sendTextMessage(text: string): void {
    if (!text || this.status !== 'connected') return;
    this.sendPayload({
      type: 'text_turn',
      text,
    });
  }

  /**
   * Update real QuestLife state for tool evaluations
   */
  public updateContext(context: QuestLifeContextPayload): void {
    this.cachedContext = context;
    if (this.status === 'connected') {
      this.sendPayload({
        type: 'update_context',
        context,
      });
    }
  }

  // =========================================================================
  // UNIFIED LIFECYCLE MANAGEMENT
  // =========================================================================

  /**
   * Start full live voice session (Connects WS + Starts microphone capture)
   */
  public async startLiveSession(context?: QuestLifeContextPayload): Promise<boolean> {
    const connected = await this.connect(context);
    if (!connected) {
      return false;
    }

    const captureStarted = await this.startAudioCapture();
    return captureStarted;
  }

  /**
   * Stop full live voice session
   */
  public stopLiveSession(): void {
    this.stopAudioCapture();
    this.stopPlayback();
  }

  /**
   * Disconnect WebSocket and end active session
   */
  public disconnect(): void {
    this.shouldMaintainConnection = false;
    this.isReconnecting = false;

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    this.stopHeartbeat();
    this.stopLiveSession();

    if (this.ws) {
      try {
        this.ws.close();
      } catch (_) {}
      this.ws = null;
    }

    this.setStatus('disconnected');
  }

  /**
   * Complete cleanup
   */
  public destroy(): void {
    this.disconnect();

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
      this.mediaStream = null;
    }

    if (this.outputAudioCtx) {
      try {
        this.outputAudioCtx.close();
      } catch (_) {}
      this.outputAudioCtx = null;
    }
  }
}

export const geminiLiveAudioService = new GeminiLiveAudioService();
