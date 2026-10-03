/**
 * SCAR AI Session & Consolidated Audio Playback Hook
 * 
 * Consolidates all audio playback paths into a single authoritative queue:
 * 1. Ensures every AI response goes through a single authoritative queue in CentralAudioController.
 * 2. Clears any existing audio buffers and cancels pending TTS calls before initializing a new response.
 * 3. Enforces strict 'en' vs 'te' mode in Gemini session instructions and client state to prevent multi-language outputs.
 * 4. Authoritative mutual exclusion between Gemini Live native PCM audio and Browser Fallback TTS.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { centralAudioController, CentralAudioDiagnostics, AudioProvider } from '../services/centralAudioController.ts';
import { voiceService, VoiceModeEngine, ScarState } from '../services/voiceService.ts';
import { geminiLiveAudioService, LiveSessionStatus } from '../services/geminiLiveAudioService.ts';
import { languageDetector, ResponseLanguage, LanguageCommandEvaluation } from '../services/languageDetector.ts';
import { speakingGate } from '../services/speakingGate.ts';
import { AiContextPayload, AiQuickPromptMode } from '../types.ts';
import { queryScar, ChatHistoryTurn, ScarQueryResult } from '../services/scarBrain.ts';

export interface UseAiSessionOptions {
  onTranscriptChange?: (interim: string) => void;
  onLiveUserTranscript?: (userText: string) => void;
  onModelTranscript?: (modelText: string) => void;
  onStateChange?: (state: ScarState) => void;
  onError?: (errorType: string, message: string) => void;
}

export function useAiSession(options: UseAiSessionOptions = {}) {
  const [responseLanguage, setResponseLanguageState] = useState<ResponseLanguage>(() =>
    languageDetector.getResponseLanguage()
  );
  const [scarState, setScarState] = useState<ScarState>('idle');
  const [activeEngine, setActiveEngine] = useState<VoiceModeEngine>('gemini_live');
  const [liveStatus, setLiveStatus] = useState<LiveSessionStatus>('disconnected');
  const [audioDiagnostics, setAudioDiagnostics] = useState<CentralAudioDiagnostics>(() =>
    centralAudioController.getDiagnostics()
  );
  const [currentResponseId, setCurrentResponseId] = useState<string>(() =>
    centralAudioController.getCurrentResponseId()
  );

  const optionsRef = useRef(options);
  optionsRef.current = options;

  // 1. Subscribe to central audio controller diagnostics & response lifecycle
  useEffect(() => {
    const unsubAudio = centralAudioController.subscribe((diag) => {
      setAudioDiagnostics(diag);
      setCurrentResponseId(diag.currentResponseId);
    });

    const unsubLang = languageDetector.subscribe((lang) => {
      setResponseLanguageState(lang);
    });

    return () => {
      unsubAudio();
      unsubLang();
    };
  }, []);

  // 2. Wire voiceService callbacks
  useEffect(() => {
    voiceService.registerCallbacks({
      onStateChange: (state) => {
        setScarState(state);
        optionsRef.current.onStateChange?.(state);
      },
      onEngineChange: (engine) => {
        setActiveEngine(engine);
      },
      onLiveStatusChange: (status) => {
        setLiveStatus(status);
      },
      onTranscriptChange: (interim) => {
        optionsRef.current.onTranscriptChange?.(interim);
      },
      onLiveUserTranscript: (userText) => {
        optionsRef.current.onLiveUserTranscript?.(userText);
      },
      onModelTranscript: (modelText) => {
        optionsRef.current.onModelTranscript?.(modelText);
      },
      onError: (errType, msg) => {
        optionsRef.current.onError?.(errType, msg);
      },
    });
  }, []);

  /**
   * Authoritative Response Initialization:
   * Clears all existing audio buffers, cancels pending SpeechSynthesis TTS,
   * generates a monotonic responseId, and sets active provider in the central queue.
   */
  const startNewResponse = useCallback(
    (preferredProvider: AudioProvider = 'gemini_live', userPromptText?: string): string => {
      const responseId = centralAudioController.startNewResponse(
        preferredProvider === 'none' ? 'gemini_live' : preferredProvider,
        userPromptText
      );
      setCurrentResponseId(responseId);
      return responseId;
    },
    []
  );

  /**
   * Instantly stop and purge all audio playback (Web Audio buffers and Browser TTS)
   */
  const cancelAllAudio = useCallback((reason: string = 'User requested cancellation') => {
    centralAudioController.cancelAllPlayback(reason);
    geminiLiveAudioService.clearBuffers();
  }, []);

  /**
   * Explicitly switch response language between 'en' and 'te'.
   * Enforces persistence and updates the live Gemini session directive.
   */
  const switchResponseLanguage = useCallback((newLang: ResponseLanguage) => {
    languageDetector.setResponseLanguage(newLang);
    setResponseLanguageState(newLang);
    geminiLiveAudioService.lockResponseLanguage(newLang);
    console.log(`[useAiSession] Response language switched to: ${newLang.toUpperCase()}`);
  }, []);

  /**
   * Evaluate a user transcript for explicit language commands
   */
  const evaluateLanguageCommand = useCallback((transcript: string): LanguageCommandEvaluation => {
    const result = languageDetector.processUserTranscript(transcript);
    if (result.isExplicitSwitch && result.targetLanguage) {
      geminiLiveAudioService.lockResponseLanguage(result.targetLanguage);
      setResponseLanguageState(result.targetLanguage);
    }
    return result;
  }, []);

  /**
   * Execute single-authoritative-voice AI query via backend with language enforcement
   */
  const executeQuery = useCallback(
    async (
      promptText: string,
      context: AiContextPayload,
      mode: AiQuickPromptMode = 'chat',
      historyTurns: ChatHistoryTurn[] = [],
      isVoice: boolean = false
    ): Promise<ScarQueryResult> => {
      // 1. Evaluate explicit language commands first
      const langEval = languageDetector.processUserTranscript(promptText);
      if (langEval.isExplicitSwitch && langEval.confirmationReply) {
        return {
          text: langEval.confirmationReply,
          source: 'local_telemetry',
          language: langEval.responseLanguage,
          intent: mode,
        };
      }

      // 2. Clear any active playback before starting new query
      cancelAllAudio('Starting new AI query');

      // 3. Inject explicitly locked response language into payload
      const enforcedContext: AiContextPayload = {
        ...context,
        responseLanguage: languageDetector.getResponseLanguage(),
      };

      // 4. Query SCAR backend with enforced language
      return await queryScar(promptText, enforcedContext, mode, historyTurns, isVoice);
    },
    [cancelAllAudio]
  );

  /**
   * Speak response via fallback TTS with strict male Indian voice and no overlapping audio
   */
  const speakFallbackTts = useCallback(
    async (text: string, languageHint?: ResponseLanguage, onEnd?: () => void): Promise<void> => {
      // If Gemini Live is playing audio natively, skip TTS to avoid dual-voice output
      if (
        centralAudioController.getActiveProvider() === 'gemini_live' &&
        centralAudioController.isPlaybackActive()
      ) {
        console.warn('[useAiSession] Skipped TTS speak: Gemini Live native audio is authoritative.');
        onEnd?.();
        return;
      }

      await voiceService.speak(text, languageHint || languageDetector.getResponseLanguage(), onEnd);
    },
    []
  );

  return {
    responseLanguage,
    scarState,
    activeEngine,
    liveStatus,
    currentResponseId,
    audioDiagnostics,
    isSpeaking: centralAudioController.isPlaybackActive() || speakingGate.isScarSpeaking,
    isListening: scarState === 'listening',
    isMicBlocked: geminiLiveAudioService.isMicBlocked(),
    startNewResponse,
    cancelAllAudio,
    switchResponseLanguage,
    evaluateLanguageCommand,
    executeQuery,
    speakFallbackTts,
    getLockedLanguage: () => languageDetector.getResponseLanguage(),
  };
}
