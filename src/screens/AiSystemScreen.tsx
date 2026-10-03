import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Volume2,
  VolumeX,
  Settings,
  HelpCircle,
  MessageSquare,
  X,
  Send,
  Trash2,
  Activity,
  Mic,
  MicOff,
  Radio,
  Check,
  Globe,
  Sliders,
  Shield,
  Zap,
} from 'lucide-react';
import { AppRoute, AiMessage, AiQuickPromptMode, AiContextPayload } from '../types.ts';
import { useQuestSystem } from '../context/QuestContext.tsx';
import { useWorkoutSystem } from '../context/WorkoutContext.tsx';
import { useWaterSystem } from '../context/WaterContext.tsx';
import {
  loadAiChatMessages,
  appendAiChatMessage,
  clearAiChatHistory,
} from '../utils/aiStorage.ts';
import { AiAvatar } from '../components/ai/AiAvatar.tsx';
import { WaveformDisplayPanel } from '../components/WaveformDisplayPanel.tsx';
import { HolographicMicButton } from '../components/HolographicMicButton.tsx';
import {
  voiceService,
  VoiceLanguage,
  VoiceInfo,
  VoiceModeEngine,
  ScarState,
} from '../services/voiceService.ts';
import { AudioDiagnostics, geminiLiveAudioService } from '../services/geminiLiveAudioService.ts';
import { languageDetector, ResponseLanguage } from '../services/languageDetector.ts';
import { centralAudioController } from '../services/centralAudioController.ts';
import { speakingGate } from '../services/speakingGate.ts';
import { processLocalScarQuery } from '../services/scarDataService.ts';
import { queryScar, ChatHistoryTurn } from '../services/scarBrain.ts';

interface AiSystemScreenProps {
  onNavigate: (route: AppRoute) => void;
  onBack?: () => void;
}

export const AiSystemScreen: React.FC<AiSystemScreenProps> = ({ onNavigate, onBack }) => {
  const {
    userName,
    quests,
    routineItems,
    progressPercent,
    completedCount,
    totalCount,
    xp,
    levelInfo,
    streak,
    todayKey,
  } = useQuestSystem();

  const {
    todayPlan,
    completedTodayExercises,
    totalTodayExercises,
    isTodayWorkoutComplete,
    exerciseStates,
  } = useWorkoutSystem();

  const { targetMl, totalConsumedMl } = useWaterSystem();

  // Primary SCAR States: idle | wake_detected | connecting | listening | processing | speaking | error
  const [scarState, setScarState] = useState<ScarState>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Chat & input states
  const [messages, setMessages] = useState<AiMessage[]>(() => loadAiChatMessages());
  const [inputValue, setInputValue] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [lastUserSpeech, setLastUserSpeech] = useState<string>('');
  const [lastScarSpeech, setLastScarSpeech] = useState<string>('');
  const [isVoiceModeActive, setIsVoiceModeActive] = useState<boolean>(false);
  const [isAwaitingFollowUp, setIsAwaitingFollowUp] = useState<boolean>(false);
  const [audioMuted, setAudioMuted] = useState<boolean>(false);
  const [micPermissionDenied, setMicPermissionDenied] = useState<boolean>(false);

  // Modals & Drawers
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState<boolean>(false);
  const [isHelpModalOpen, setIsHelpModalOpen] = useState<boolean>(false);
  const [isTextDrawerOpen, setIsTextDrawerOpen] = useState<boolean>(false);
  const [isDiagnosticsModalOpen, setIsDiagnosticsModalOpen] = useState<boolean>(false);
  const [isClearModalOpen, setIsClearModalOpen] = useState<boolean>(false);

  // Wake Phrase & Live Engine states
  const [wakePhrase, setWakePhrase] = useState<string>(() => voiceService.getWakePhrase());
  const [wakePhraseInput, setWakePhraseInput] = useState<string>(() => voiceService.getWakePhrase());
  const [activeEngine, setActiveEngine] = useState<VoiceModeEngine>(() => voiceService.getActiveEngine());
  const [liveStatus, setLiveStatus] = useState<string>('disconnected');
  const [activeVoiceInfo, setActiveVoiceInfo] = useState<VoiceInfo | null>(null);
  const [audioDiagnostics, setAudioDiagnostics] = useState<AudioDiagnostics>(() =>
    voiceService.getDiagnostics()
  );

  // Persistent Language: 'en' or 'te'
  const [currentResponseLang, setCurrentResponseLang] = useState<ResponseLanguage>(() =>
    languageDetector.getResponseLanguage()
  );

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const audioMutedRef = useRef(audioMuted);
  audioMutedRef.current = audioMuted;

  // Initialize audio diagnostics and voice info
  useEffect(() => {
    const updateVoice = () => {
      setActiveVoiceInfo(voiceService.getActiveVoiceInfo());
    };
    updateVoice();
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.onvoiceschanged = updateVoice;
    }

    const unsubLang = languageDetector.subscribe((lang) => {
      setCurrentResponseLang(lang);
    });

    // Seed last dialogues from chat history if available
    const lastUser = [...messages].reverse().find((m) => m.sender === 'user');
    const lastScar = [...messages].reverse().find((m) => m.sender === 'system');
    if (lastUser) setLastUserSpeech(lastUser.text);
    if (lastScar) setLastScarSpeech(lastScar.text);

    return () => {
      unsubLang();
    };
  }, []);

  // Auto-scroll messages in drawer
  useEffect(() => {
    if (isTextDrawerOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, interimTranscript, isTextDrawerOpen]);

  // Real-time context builder with real QuestLife telemetry
  const buildContextPayload = useCallback(
    (topicOverride?: string): AiContextPayload => {
      const now = new Date();
      const hours = now.getHours().toString().padStart(2, '0');
      const minutes = now.getMinutes().toString().padStart(2, '0');
      const currentTime = `${hours}:${minutes}`;

      const completedTitles = quests.filter((q) => q.completed).map((q) => q.title);
      const pendingQuestsList = quests
        .filter((q) => !q.completed)
        .map((q) => ({
          title: q.title,
          timeSpan: q.timeSpan,
          xp: q.xp,
          category: q.category,
        }));

      const completedTasksDetails = quests
        .filter((q) => q.completed)
        .map((q) => ({
          id: q.id,
          title: q.title,
          category: q.category,
          timeSpan: q.timeSpan,
          xp: q.xp,
          verificationMethod: q.verificationMethod,
          verified: q.completed,
        }));

      return {
        date: todayKey,
        currentTime,
        userName,
        level: levelInfo.level,
        totalXP: xp,
        currentStreak: streak,
        todayProgress: progressPercent,
        completedQuests: completedTitles,
        pendingQuests: pendingQuestsList,
        completedTasksDetails,
        routine: routineItems.map((r) => ({
          title: r.title,
          timeSpan: r.timeSpan,
          category: r.category,
          enabled: r.enabled,
        })),
        workoutTitle: todayPlan.title,
        workoutProgress: {
          completedCount: completedTodayExercises,
          totalCount: totalTodayExercises,
          isCompleted: isTodayWorkoutComplete,
        },
        workoutDetails: {
          splitTitle: todayPlan.title,
          isRestDay: todayPlan.isRestDay,
          isCompleted: isTodayWorkoutComplete,
          completedCount: completedTodayExercises,
          totalCount: totalTodayExercises,
          progressPercent:
            totalTodayExercises > 0
              ? Math.round((completedTodayExercises / totalTodayExercises) * 100)
              : 0,
          exercises: (todayPlan.groups || []).flatMap((g) =>
            g.exercises.map((e) => {
              const st = exerciseStates[e.id];
              return {
                id: e.id,
                name: e.name,
                muscleGroup: g.name,
                targetSets: 3,
                targetReps: e.setsReps || `${e.defaultReps || 10} reps`,
                completed: st?.completed || false,
                loggedWeight: st?.weight,
                loggedReps: st?.reps,
              };
            })
          ),
        },
        waterTargetMl: targetMl,
        waterConsumedMl: totalConsumedMl,
        sessionTopic: topicOverride,
        responseLanguage: languageDetector.getResponseLanguage(),
      };
    },
    [
      todayKey,
      userName,
      levelInfo,
      xp,
      streak,
      progressPercent,
      quests,
      routineItems,
      todayPlan,
      completedTodayExercises,
      totalTodayExercises,
      isTodayWorkoutComplete,
      exerciseStates,
      targetMl,
      totalConsumedMl,
    ]
  );

  // Send message implementation with single-audio-pipeline enforcement
  const handleSendMessage = useCallback(
    async (textToSend?: string, mode: AiQuickPromptMode = 'chat', wasSpoken: boolean = false) => {
      const rawText = textToSend !== undefined ? textToSend : inputValue;
      const cleanText = rawText.trim();
      if (!cleanText || scarState === 'thinking') return;

      // 1. Immediately cancel all pending audio buffers & speech synthesis
      centralAudioController.cancelAllPlayback('Starting new response');
      voiceService.stopSpeaking();
      setInputValue('');
      setInterimTranscript('');
      setErrorMessage(null);
      setIsAwaitingFollowUp(false);
      setScarState('thinking');
      setLastUserSpeech(cleanText);

      // Append Hunter Charan message to chat log
      const userMsg: AiMessage = {
        id: `usr-${Date.now()}`,
        sender: 'user',
        text: cleanText,
        timestamp: new Date().toISOString(),
        mode,
      };
      appendAiChatMessage(userMsg);
      setMessages((prev) => [...prev, userMsg]);

      try {
        const context = buildContextPayload();

        // 2. Check for explicit wake word: "Scar" -> "Yes, Hunter Charan?"
        if (voiceService.isWakeWord(cleanText)) {
          const scarReply = 'Yes, Hunter Charan?';
          const sysMsg: AiMessage = {
            id: `scar-${Date.now()}`,
            sender: 'system',
            text: scarReply,
            timestamp: new Date().toISOString(),
            mode: 'chat',
          };
          appendAiChatMessage(sysMsg);
          setMessages((prev) => [...prev, sysMsg]);
          setLastScarSpeech(scarReply);

          setScarState('speaking');
          if (!audioMutedRef.current) {
            voiceService.handleWakeWordAcknowledgment(() => {
              setIsAwaitingFollowUp(true);
              setScarState('listening');
            });
          } else {
            setIsAwaitingFollowUp(true);
            setScarState('listening');
            voiceService.startListening();
          }
          return;
        }

        // 3. Prepare conversation history for contextual follow-up understanding
        const historyTurns: ChatHistoryTurn[] = messages.slice(-6).map((m) => ({
          role: m.sender === 'system' ? ('model' as const) : ('user' as const),
          text: m.text,
        }));

        // 4. Query SCAR Brain with real QuestLife context & history
        const scarResponse = await queryScar(cleanText, context, mode, historyTurns, true);

        const sysMsg: AiMessage = {
          id: `scar-${Date.now()}`,
          sender: 'system',
          text: scarResponse.text,
          timestamp: new Date().toISOString(),
          mode,
          isOfflineFallback: scarResponse.source === 'local_telemetry',
        };

        appendAiChatMessage(sysMsg);
        setMessages((prev) => [...prev, sysMsg]);
        setLastScarSpeech(scarResponse.text);
        setIsAwaitingFollowUp(false);

        // 5. Voice response delivery
        if (!audioMutedRef.current) {
          if (
            voiceService.getActiveEngine() === 'gemini_live' ||
            centralAudioController.getActiveProvider() === 'gemini_live'
          ) {
            console.log('[AiSystemScreen] Skipped TTS speak: Gemini Live is authoritative voice provider.');
            setScarState('ready');
            return;
          }
          setScarState('speaking');
          voiceService.speak(scarResponse.text, scarResponse.language, () => {
            setScarState('ready');
            if (voiceService.isVoiceMode()) {
              setTimeout(() => {
                if (voiceService.isVoiceMode()) {
                  voiceService.startListening();
                }
              }, 250);
            }
          });
        } else {
          setScarState('ready');
          if (voiceService.isVoiceMode()) {
            setTimeout(() => {
              if (voiceService.isVoiceMode()) {
                voiceService.startListening();
              }
            }, 250);
          }
        }
      } catch (err: any) {
        console.error('[SCAR Error]:', err);
        setScarState('error');
        setErrorMessage('SCAR telemetry encountered an issue.');

        const context = buildContextPayload();
        const fallback = processLocalScarQuery(cleanText, context);
        const errorMsg: AiMessage = {
          id: `scar-err-${Date.now()}`,
          sender: 'system',
          text: fallback.text,
          timestamp: new Date().toISOString(),
          isOfflineFallback: true,
        };
        appendAiChatMessage(errorMsg);
        setMessages((prev) => [...prev, errorMsg]);
        setLastScarSpeech(fallback.text);
      }
    },
    [inputValue, scarState, messages, buildContextPayload]
  );

  const handleSendMessageRef = useRef(handleSendMessage);
  handleSendMessageRef.current = handleSendMessage;

  // Register voice callbacks
  useEffect(() => {
    voiceService.registerCallbacks({
      onStateChange: (state) => {
        setScarState(state);
      },
      onEngineChange: (engine) => {
        setActiveEngine(engine);
      },
      onLiveStatusChange: (status) => {
        setLiveStatus(status);
      },
      onDiagnosticsUpdate: (diag) => {
        setAudioDiagnostics(diag);
      },
      onListeningStart: () => {
        setScarState('listening');
        setErrorMessage(null);
        setMicPermissionDenied(false);
      },
      onListeningEnd: () => {
        setInterimTranscript('');
        setScarState((prev) => (prev === 'listening' ? 'ready' : prev));
      },
      onTranscriptChange: (interim) => {
        setInterimTranscript(interim);
      },
      onFinalTranscript: (finalText) => {
        setInterimTranscript('');
        setIsAwaitingFollowUp(false);
        const lower = finalText.trim().toLowerCase();
        if (
          lower === 'stop' ||
          lower === 'stop voice' ||
          lower === 'stop listening' ||
          lower === 'exit voice' ||
          lower === 'shut down' ||
          lower === 'ఆపు'
        ) {
          voiceService.deactivateVoiceMode();
          setIsVoiceModeActive(false);
          setIsAwaitingFollowUp(false);
          setScarState('ready');
          return;
        }
        if (voiceService.getActiveEngine() === 'fallback_tts') {
          handleSendMessageRef.current(finalText, 'chat', true);
        }
      },
      onLiveUserTranscript: (userText) => {
        setInterimTranscript('');
        setIsAwaitingFollowUp(false);
        const clean = userText.trim();
        if (!clean) return;

        const lower = clean.toLowerCase();
        if (
          lower === 'stop' ||
          lower === 'stop voice' ||
          lower === 'stop listening' ||
          lower === 'exit voice' ||
          lower === 'shut down' ||
          lower === 'ఆపు'
        ) {
          voiceService.deactivateVoiceMode();
          setIsVoiceModeActive(false);
          setIsAwaitingFollowUp(false);
          setScarState('ready');
          return;
        }

        const userMsg: AiMessage = {
          id: `usr-${Date.now()}`,
          sender: 'user',
          text: clean,
          timestamp: new Date().toISOString(),
          mode: 'chat',
        };
        appendAiChatMessage(userMsg);
        setMessages((prev) => [...prev, userMsg]);
        setLastUserSpeech(clean);
      },
      onModelTranscript: (modelText) => {
        setInterimTranscript('');
        const clean = modelText.trim();
        if (!clean) return;
        setLastScarSpeech(clean);

        const sysMsg: AiMessage = {
          id: `scar-${Date.now()}`,
          sender: 'system',
          text: clean,
          timestamp: new Date().toISOString(),
          mode: 'chat',
        };
        appendAiChatMessage(sysMsg);
        setMessages((prev) => [...prev, sysMsg]);
      },
      onLowConfidenceDetected: () => {
        setInterimTranscript('');
        if (!audioMutedRef.current) {
          setScarState('speaking');
          voiceService.handleUnclearSpeech(() => {
            if (voiceService.isVoiceMode()) {
              setIsAwaitingFollowUp(true);
              setScarState('listening');
            } else {
              setScarState('ready');
            }
          });
        } else {
          setIsAwaitingFollowUp(true);
          setScarState('listening');
        }
      },
      onWakeWordDetected: () => {
        setInterimTranscript('');
        if (voiceService.getActiveEngine() === 'gemini_live') {
          return;
        }

        const scarReply = 'Yes, Hunter Charan?';
        const userMsg: AiMessage = {
          id: `usr-${Date.now()}`,
          sender: 'user',
          text: 'Scar',
          timestamp: new Date().toISOString(),
          mode: 'chat',
        };
        const sysMsg: AiMessage = {
          id: `scar-${Date.now()}`,
          sender: 'system',
          text: scarReply,
          timestamp: new Date().toISOString(),
          mode: 'chat',
        };
        appendAiChatMessage(userMsg);
        appendAiChatMessage(sysMsg);
        setMessages((prev) => [...prev, userMsg, sysMsg]);
        setLastUserSpeech('Scar');
        setLastScarSpeech(scarReply);
        setScarState('speaking');

        if (!audioMutedRef.current) {
          voiceService.handleWakeWordAcknowledgment(() => {
            setIsAwaitingFollowUp(true);
            setScarState('listening');
          });
        } else {
          setIsAwaitingFollowUp(true);
          setScarState('listening');
          voiceService.startListening();
        }
      },
      onAwaitingRequest: () => {
        setIsAwaitingFollowUp(true);
        setScarState('listening');
      },
      onSpeakingStart: () => {
        setScarState('speaking');
      },
      onSpeakingEnd: () => {
        setScarState('ready');
      },
      onError: (err, friendlyMessage) => {
        setScarState('error');
        setErrorMessage(friendlyMessage);
        setIsAwaitingFollowUp(false);
        if (err === 'not-allowed' || err === 'permission-denied') {
          setMicPermissionDenied(true);
        }
      },
    });

    return () => {
      voiceService.stopListening();
      voiceService.stopSpeaking();
    };
  }, []);

  // Language update with persistent storage & session synchronization
  const handleLanguageChange = (lang: ResponseLanguage) => {
    languageDetector.setResponseLanguage(lang);
    geminiLiveAudioService.lockResponseLanguage(lang);
    setCurrentResponseLang(lang);
    console.log(`[AiSystemScreen] Language set to: ${lang.toUpperCase()}`);
  };

  // Immediate Stop Voice Mode control
  const handleStopVoiceMode = () => {
    voiceService.deactivateVoiceMode();
    voiceService.stopListening();
    voiceService.stopSpeaking();
    centralAudioController.cancelAllPlayback('Stop voice mode requested');
    setIsVoiceModeActive(false);
    setIsAwaitingFollowUp(false);
    setInterimTranscript('');
    setScarState('ready');
  };

  // Toggle Voice Mode
  const handleToggleVoiceMode = async () => {
    if (isVoiceModeActive) {
      handleStopVoiceMode();
    } else {
      if (scarState === 'speaking') {
        voiceService.stopSpeaking();
        centralAudioController.cancelAllPlayback('Voice mode activated');
      }
      setErrorMessage(null);
      const started = await voiceService.activateVoiceMode();
      if (started) {
        setIsVoiceModeActive(true);
        setMicPermissionDenied(false);
      } else {
        setIsVoiceModeActive(false);
        setScarState('error');
      }
    }
  };

  // Tap on Ghost avatar to interrupt or start listening
  const handleGhostTap = async () => {
    if (scarState === 'speaking') {
      await voiceService.interrupt();
      centralAudioController.cancelAllPlayback('Ghost tapped - interrupt');
      setScarState('listening');
      return;
    }

    if (scarState === 'listening') {
      voiceService.stopListening();
      setIsAwaitingFollowUp(false);
      setScarState('ready');
      return;
    }

    setErrorMessage(null);
    const started = await voiceService.startListening();
    if (!started) {
      setScarState('error');
    } else {
      setScarState('listening');
    }
  };

  // Clear chat history
  const handleClearHistory = () => {
    voiceService.stopSpeaking();
    centralAudioController.cancelAllPlayback('Clear history requested');
    const cleared = clearAiChatHistory();
    setMessages(cleared);
    setLastUserSpeech('');
    setLastScarSpeech('');
    setIsClearModalOpen(false);
    setScarState('ready');
    setErrorMessage(null);
  };

  return (
    <div className="flex-1 flex flex-col h-screen max-h-screen bg-[#02040a] text-slate-100 overflow-hidden relative font-sans select-none justify-between">
      {/* 1. Deep Obsidian / Midnight Navy Radial Glow Background */}
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_50%_40%,rgba(0,140,255,0.18)_0%,rgba(16,10,48,0.14)_42%,rgba(2,4,10,0.98)_80%)]" />
      <div className="absolute inset-0 pointer-events-none opacity-10 bg-[linear-gradient(to_right,#00d4ff_1px,transparent_1px),linear-gradient(to_bottom,#00d4ff_1px,transparent_1px)] bg-[size:36px_36px]" />

      {/* 2. Angular Futuristic HUD Corner Borders (Framing the Entire Screen) */}
      <div className="absolute inset-2 sm:inset-4 pointer-events-none z-10 border border-cyan-500/15 rounded-3xl">
        {/* Top-Left Corner Bracket */}
        <span className="absolute -top-[1px] -left-[1px] w-8 h-8 border-t-2 border-l-2 border-cyan-400/80 shadow-[0_0_10px_#00e5ff]" />
        <span className="absolute top-2 left-2 w-2 h-2 border-t border-l border-cyan-300/40" />

        {/* Top-Right Corner Bracket */}
        <span className="absolute -top-[1px] -right-[1px] w-8 h-8 border-t-2 border-r-2 border-cyan-400/80 shadow-[0_0_10px_#00e5ff]" />
        <span className="absolute top-2 right-2 w-2 h-2 border-t border-r border-cyan-300/40" />

        {/* Bottom-Left Corner Bracket */}
        <span className="absolute -bottom-[1px] -left-[1px] w-8 h-8 border-b-2 border-l-2 border-cyan-400/80 shadow-[0_0_10px_#00e5ff]" />
        <span className="absolute bottom-2 left-2 w-2 h-2 border-b border-l border-cyan-300/40" />

        {/* Bottom-Right Corner Bracket */}
        <span className="absolute -bottom-[1px] -right-[1px] w-8 h-8 border-b-2 border-r-2 border-cyan-400/80 shadow-[0_0_10px_#00e5ff]" />
        <span className="absolute bottom-2 right-2 w-2 h-2 border-b border-r border-cyan-300/40" />
      </div>

      {/* 3. Top Minimal Header Bar (Matching Reference Image) */}
      <header className="relative z-30 pt-4 sm:pt-6 px-4 sm:px-8 flex items-center justify-between">
        {/* Top-Left: Stylized Hunter Apex "A" Emblem with Back Navigation */}
        <button
          type="button"
          onClick={onBack ? onBack : () => onNavigate('/home')}
          className="group relative p-2.5 rounded-2xl bg-[#03091e]/80 border border-cyan-500/40 hover:border-cyan-300 hover:shadow-[0_0_20px_rgba(0,229,255,0.4)] transition-all cursor-pointer flex items-center justify-center"
          title="Return to QuestLife Hub"
          aria-label="Back to Hub"
        >
          {/* Stylized Hunter Apex Chevron / "A" Glyph matching the Reference Image */}
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            className="text-cyan-300 group-hover:scale-105 transition-transform duration-200 drop-shadow-[0_0_8px_#00e5ff]"
          >
            <path
              d="M12 3L21 20H16L12 11L8 20H3L12 3Z"
              fill="currentColor"
              stroke="#00e5ff"
              strokeWidth="0.5"
            />
            <path d="M7 16H17" stroke="#00e5ff" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>

        {/* Center Minimal Status Beacon */}
        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-[#02081c]/70 border border-cyan-500/30 backdrop-blur-md">
          <span
            className={`w-2 h-2 rounded-full ${
              scarState === 'listening'
                ? 'bg-emerald-400 animate-ping'
                : scarState === 'speaking'
                ? 'bg-cyan-300 animate-pulse'
                : scarState === 'error'
                ? 'bg-rose-400'
                : 'bg-cyan-400 shadow-[0_0_8px_#00e5ff]'
            }`}
          />
          <span className="font-hud font-bold text-xs tracking-wider text-cyan-300 uppercase">
            SCAR
          </span>
          <span className="text-[10px] font-mono text-cyan-400/80 font-bold px-1.5 py-0.5 rounded bg-cyan-950/80 border border-cyan-500/40">
            {currentResponseLang.toUpperCase()}
          </span>
        </div>

        {/* Top-Right: Three Glowing Circular HUD Buttons (Matching Reference Image) */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* 1. Speaker Mute Toggle */}
          <button
            type="button"
            onClick={() => {
              const next = !audioMuted;
              setAudioMuted(next);
              if (next) {
                voiceService.stopSpeaking();
                centralAudioController.cancelAllPlayback('User muted audio');
              }
            }}
            className={`w-10 h-10 rounded-full border flex items-center justify-center transition-all cursor-pointer ${
              !audioMuted
                ? 'bg-[#03091e]/90 border-cyan-400/60 text-cyan-300 shadow-[0_0_15px_rgba(0,229,255,0.35)] hover:border-cyan-300 hover:shadow-[0_0_20px_#00e5ff]'
                : 'bg-[#180509]/80 border-rose-500/50 text-rose-400'
            }`}
            title={!audioMuted ? 'Mute SCAR Voice' : 'Unmute SCAR Voice'}
            aria-label="Toggle Audio Output"
          >
            {!audioMuted ? (
              <Volume2 className="w-4 h-4 text-cyan-300" />
            ) : (
              <VolumeX className="w-4 h-4 text-rose-400" />
            )}
          </button>

          {/* 2. Settings Cog */}
          <button
            type="button"
            onClick={() => setIsSettingsModalOpen(true)}
            className="w-10 h-10 rounded-full bg-[#03091e]/90 border border-cyan-500/40 hover:border-cyan-300 hover:shadow-[0_0_20px_rgba(0,229,255,0.4)] text-cyan-300 flex items-center justify-center transition-all cursor-pointer"
            title="SCAR Settings & Language Control"
            aria-label="Settings"
          >
            <Settings className="w-4 h-4" />
          </button>

          {/* 3. Help Question Mark */}
          <button
            type="button"
            onClick={() => setIsHelpModalOpen(true)}
            className="w-10 h-10 rounded-full bg-[#03091e]/90 border border-cyan-500/40 hover:border-cyan-300 hover:shadow-[0_0_20px_rgba(0,229,255,0.4)] text-cyan-300 flex items-center justify-center transition-all cursor-pointer"
            title="SCAR Voice Guide & Commands"
            aria-label="Voice Guide"
          >
            <HelpCircle className="w-4 h-4" />
          </button>

          {/* 4. Text Drawer Toggle (Compact Icon for Typing Fallback) */}
          <button
            type="button"
            onClick={() => setIsTextDrawerOpen(true)}
            className="w-10 h-10 rounded-full bg-[#03091e]/90 border border-cyan-500/40 hover:border-cyan-300 text-cyan-300 flex items-center justify-center transition-all cursor-pointer"
            title="Open Text Dialogue & Chat Log"
            aria-label="Text Chat"
          >
            <MessageSquare className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* 4. Center Spectral AI Ghost Entity & Floating Concentric Rings */}
      <main className="relative z-20 flex-1 flex flex-col items-center justify-center px-4 -mt-2">
        <div
          onClick={handleGhostTap}
          className="cursor-pointer group flex items-center justify-center focus:outline-none"
          title={
            scarState === 'speaking'
              ? 'Tap to Interrupt SCAR'
              : scarState === 'listening'
              ? 'Tap to Pause Listening'
              : 'Tap to Activate Listening'
          }
        >
          <AiAvatar
            state={scarState}
            isVoiceActive={isVoiceModeActive}
            audioVolume={audioDiagnostics.output.volume}
          />
        </div>
      </main>

      {/* 5. Bottom Section: Waveform HUD Capsule + Holographic Microphone Pedestal */}
      <footer className="relative z-30 pb-6 sm:pb-8 px-4 flex flex-col items-center gap-5">
        {/* Minimal Audio Waveform & Dynamic Subtitle Panel (Matching Reference) */}
        <WaveformDisplayPanel
          state={scarState}
          subtitleText={lastScarSpeech}
          interimTranscript={interimTranscript}
          lastUserSpeech={lastUserSpeech}
          isVoiceActive={isVoiceModeActive}
        />

        {/* Large Glowing Circular Holographic Microphone Button */}
        <HolographicMicButton
          state={scarState}
          isVoiceActive={isVoiceModeActive}
          micPermissionDenied={micPermissionDenied}
          onClick={handleToggleVoiceMode}
        />
      </footer>

      {/* ========================================================================= */}
      {/* 6. SETTINGS MODAL (Language Switch, Engine Status, Diagnostics Toggle)     */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {isSettingsModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
            onClick={() => setIsSettingsModalOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-md p-6 rounded-2xl bg-[#03081e] border border-cyan-500/40 shadow-[0_0_40px_rgba(0,229,255,0.25)] text-slate-100"
            >
              {/* Close Button */}
              <button
                onClick={() => setIsSettingsModalOpen(false)}
                className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-cyan-300 hover:bg-cyan-950/40 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-2.5 mb-5 pb-3 border-b border-cyan-500/20">
                <Settings className="w-5 h-5 text-cyan-300" />
                <h3 className="font-hud font-bold text-lg text-cyan-200 tracking-wide">
                  SCAR SYSTEM SETTINGS
                </h3>
              </div>

              {/* Language Selection: English Default vs Telugu Explicit */}
              <div className="mb-6">
                <label className="block text-xs font-mono font-bold text-cyan-300 mb-2 tracking-wider flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5" />
                  <span>RESPONSE LANGUAGE (STRICT SINGLE-LANGUAGE)</span>
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => handleLanguageChange('en')}
                    className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                      currentResponseLang === 'en'
                        ? 'bg-cyan-950/80 border-cyan-400 text-cyan-200 shadow-[0_0_15px_rgba(0,229,255,0.4)] font-bold'
                        : 'bg-[#020514] border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <span className="text-sm font-semibold">English (Default)</span>
                    <span className="text-[10px] font-mono text-cyan-400/80">Indian Male Voice</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleLanguageChange('te')}
                    className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                      currentResponseLang === 'te'
                        ? 'bg-cyan-950/80 border-cyan-400 text-cyan-200 shadow-[0_0_15px_rgba(0,229,255,0.4)] font-bold'
                        : 'bg-[#020514] border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <span className="text-sm font-semibold">తెలుగు (Telugu)</span>
                    <span className="text-[10px] font-mono text-cyan-400/80">Explicit Command</span>
                  </button>
                </div>
              </div>

              {/* Active Voice Provider Info */}
              <div className="mb-6 p-3 rounded-xl bg-[#020514] border border-cyan-500/20 text-xs font-mono">
                <div className="flex justify-between items-center mb-1.5">
                  <span className="text-slate-400">VOICE ENGINE:</span>
                  <span className="font-bold text-cyan-300">
                    {activeEngine === 'gemini_live' ? 'GEMINI 3.8-LIVE' : 'FALLBACK TTS'}
                  </span>
                </div>
                <div className="flex justify-between items-center mb-1.5">
                  <span className="text-slate-400">PERSONA VOICE:</span>
                  <span className="font-bold text-cyan-200">
                    {activeEngine === 'gemini_live' ? 'Charon (Male Indian Persona)' : 'Natural Indian Male TTS'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">WAKE PHRASE:</span>
                  <span className="font-bold text-emerald-400">“{wakePhrase}”</span>
                </div>
              </div>

              {/* Utility Action Buttons */}
              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsSettingsModalOpen(false);
                    setIsDiagnosticsModalOpen(true);
                  }}
                  className="w-full py-2.5 px-4 rounded-xl bg-cyan-950/60 border border-cyan-500/30 hover:border-cyan-400 text-cyan-300 font-mono text-xs flex items-center justify-center gap-2 cursor-pointer transition-colors"
                >
                  <Activity className="w-4 h-4" />
                  <span>VIEW TECHNICAL AUDIO DIAGNOSTICS</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsSettingsModalOpen(false);
                    setIsClearModalOpen(true);
                  }}
                  className="w-full py-2.5 px-4 rounded-xl bg-rose-950/40 border border-rose-500/30 hover:border-rose-400 text-rose-300 font-mono text-xs flex items-center justify-center gap-2 cursor-pointer transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>CLEAR SCAR DIALOGUE HISTORY</span>
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* 7. HELP MODAL (Voice Commands, Wake Word, Tips)                          */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {isHelpModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
            onClick={() => setIsHelpModalOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-md p-6 rounded-2xl bg-[#03081e] border border-cyan-500/40 shadow-[0_0_40px_rgba(0,229,255,0.25)] text-slate-100"
            >
              <button
                onClick={() => setIsHelpModalOpen(false)}
                className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-cyan-300 hover:bg-cyan-950/40 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-2.5 mb-4 pb-3 border-b border-cyan-500/20">
                <HelpCircle className="w-5 h-5 text-cyan-300" />
                <h3 className="font-hud font-bold text-lg text-cyan-200 tracking-wide">
                  SCAR VOICE COMPANION GUIDE
                </h3>
              </div>

              <div className="space-y-4 text-xs font-mono text-slate-300">
                <div className="p-3 rounded-xl bg-[#020514] border border-cyan-500/20">
                  <p className="font-bold text-cyan-300 mb-1">1. WAKE PHRASE</p>
                  <p className="text-slate-400">
                    Say <span className="text-cyan-200 font-bold">"Scar"</span> anytime. SCAR will respond:
                    <span className="text-emerald-300 font-bold"> "Yes, Hunter Charan?"</span> and keep listening for follow-ups!
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-[#020514] border border-cyan-500/20">
                  <p className="font-bold text-cyan-300 mb-1">2. LANGUAGE SWITCHING</p>
                  <p className="text-slate-400">
                    • <span className="text-cyan-200">"Speak in Telugu"</span> / <span className="text-cyan-200">"Telugu lo matladu"</span>: Switches permanently to Telugu.
                  </p>
                  <p className="text-slate-400 mt-1">
                    • <span className="text-cyan-200">"Switch back to English"</span> / <span className="text-cyan-200">"Speak in English"</span>: Restores permanent English.
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-[#020514] border border-cyan-500/20">
                  <p className="font-bold text-cyan-300 mb-1">3. BARGE-IN & INTERRUPTION</p>
                  <p className="text-slate-400">
                    Tap the floating Ghost or the bottom Microphone button at any time while SCAR is speaking to immediately interrupt playback.
                  </p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* 8. TECHNICAL DIAGNOSTICS MODAL (Preserving full developer HUD)             */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {isDiagnosticsModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md"
            onClick={() => setIsDiagnosticsModalOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-2xl max-h-[85vh] overflow-y-auto p-6 rounded-2xl bg-[#020617] border border-cyan-500/40 shadow-[0_0_50px_rgba(0,229,255,0.3)] text-slate-100 font-mono text-[11px]"
            >
              <button
                onClick={() => setIsDiagnosticsModalOpen(false)}
                className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-cyan-300 hover:bg-cyan-950/40 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-2 mb-4 pb-2 border-b border-cyan-500/30 text-cyan-300 font-bold text-sm">
                <Activity className="w-4 h-4" />
                <span>AUTHORITATIVE AUDIO PIPELINE DIAGNOSTICS</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
                <div className="p-2 rounded bg-cyan-950/40 border border-cyan-500/30">
                  <div className="text-slate-400 text-[9px]">RESPONSE ID</div>
                  <div className="font-bold text-cyan-200 truncate">{centralAudioController.getCurrentResponseId()}</div>
                </div>
                <div className="p-2 rounded bg-cyan-950/40 border border-cyan-500/30">
                  <div className="text-slate-400 text-[9px]">ACTIVE PROVIDER</div>
                  <div className="font-bold text-cyan-200">{centralAudioController.getActiveProvider().toUpperCase()}</div>
                </div>
                <div className="p-2 rounded bg-cyan-950/40 border border-cyan-500/30">
                  <div className="text-slate-400 text-[9px]">LOCKED LANGUAGE</div>
                  <div className="font-bold text-emerald-300">{currentResponseLang.toUpperCase()}</div>
                </div>
                <div className="p-2 rounded bg-cyan-950/40 border border-cyan-500/30">
                  <div className="text-slate-400 text-[9px]">SUPPRESSED DUPES</div>
                  <div className="font-bold text-cyan-300">{centralAudioController.getDiagnostics().duplicateSuppressedCount}</div>
                </div>
              </div>

              <div className="p-3 rounded bg-cyan-950/30 border border-cyan-500/30 mb-4 space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-400">SPEAKING GATE:</span>
                  <span className="font-bold text-cyan-300">
                    {speakingGate.isScarSpeaking ? 'GATE CLOSED (MUTED)' : 'GATE OPEN (CAPTURE ACTIVE)'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">AUDIO CONTEXT:</span>
                  <span className="font-bold text-cyan-300">{audioDiagnostics.output.audioContextState.toUpperCase()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">GEMINI LIVE STATUS:</span>
                  <span className="font-bold text-emerald-300">{liveStatus.toUpperCase()}</span>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* 9. TEXT CHAT & DIALOGUE SLIDE-OVER DRAWER (For Typing Messages Manually)  */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {isTextDrawerOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex justify-end bg-black/70 backdrop-blur-sm"
            onClick={() => setIsTextDrawerOpen(false)}
          >
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-md h-full bg-[#030718] border-l border-cyan-500/30 flex flex-col justify-between shadow-[-10px_0_40px_rgba(0,0,0,0.8)]"
            >
              {/* Drawer Header */}
              <div className="p-4 border-b border-cyan-500/20 flex items-center justify-between bg-[#04081c]">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-cyan-400" />
                  <h4 className="font-hud font-bold text-sm text-cyan-200">SCAR DIALOGUE LOG</h4>
                </div>
                <button
                  onClick={() => setIsTextDrawerOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-cyan-300"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Messages Feed */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 font-sans text-xs">
                {messages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center text-slate-500 font-mono">
                    <p>NO RECORDED TELEMETRY LOGS</p>
                    <p className="text-[10px] mt-1">Speak aloud or type below to converse with SCAR.</p>
                  </div>
                ) : (
                  messages.map((m) => (
                    <div
                      key={m.id}
                      className={`flex flex-col ${
                        m.sender === 'user' ? 'items-end' : 'items-start'
                      }`}
                    >
                      <div
                        className={`max-w-[85%] px-3.5 py-2.5 rounded-2xl font-mono text-xs ${
                          m.sender === 'user'
                            ? 'bg-cyan-950/80 border border-cyan-500/40 text-cyan-100 rounded-br-none shadow-[0_0_15px_rgba(0,229,255,0.15)]'
                            : 'bg-[#060c26] border border-cyan-500/20 text-slate-200 rounded-bl-none shadow-[0_0_10px_rgba(0,0,0,0.4)]'
                        }`}
                      >
                        <p className="leading-relaxed whitespace-pre-wrap">{m.text}</p>
                      </div>
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Bottom Input Field */}
              <div className="p-3 border-t border-cyan-500/20 bg-[#020514]">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSendMessage();
                  }}
                  className="flex items-center gap-2"
                >
                  <input
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    placeholder="Type directive to SCAR..."
                    className="flex-1 px-3 py-2 rounded-xl bg-[#03081e] border border-cyan-500/30 text-xs font-mono text-cyan-200 placeholder-slate-500 focus:outline-none focus:border-cyan-400"
                  />
                  <button
                    type="submit"
                    disabled={!inputValue.trim()}
                    className="p-2 rounded-xl bg-cyan-950/80 border border-cyan-400/50 text-cyan-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-cyan-900 cursor-pointer"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* 10. CLEAR HISTORY CONFIRMATION MODAL                                      */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {isClearModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
            onClick={() => setIsClearModalOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-sm p-6 rounded-2xl bg-[#03081e] border border-rose-500/40 shadow-[0_0_40px_rgba(244,63,94,0.3)] text-slate-100 text-center font-mono text-xs"
            >
              <h4 className="font-hud font-bold text-rose-300 text-sm mb-2">
                PURGE SCAR DIALOGUE MEMORY?
              </h4>
              <p className="text-slate-400 mb-5 leading-relaxed">
                This will reset conversation history for Hunter Charan. Telemetry, XP, quests, and workouts remain untouched.
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsClearModalOpen(false)}
                  className="flex-1 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-300 hover:text-white"
                >
                  CANCEL
                </button>
                <button
                  type="button"
                  onClick={handleClearHistory}
                  className="flex-1 py-2 rounded-xl bg-rose-950 border border-rose-500 text-rose-200 font-bold hover:bg-rose-900"
                >
                  CONFIRM PURGE
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
