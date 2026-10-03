import React, { useEffect, useRef, useState } from 'react';
import { ScarState } from '../services/voiceService.ts';
import { geminiLiveAudioService } from '../services/geminiLiveAudioService.ts';

interface WaveformDisplayPanelProps {
  state: ScarState;
  subtitleText?: string;
  interimTranscript?: string;
  lastUserSpeech?: string;
  isVoiceActive: boolean;
  className?: string;
}

export const WaveformDisplayPanel: React.FC<WaveformDisplayPanelProps> = ({
  state,
  subtitleText,
  interimTranscript,
  lastUserSpeech,
  isVoiceActive,
  className = '',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const [eqLevels, setEqLevels] = useState<number[]>([0.3, 0.5, 0.8, 0.4, 0.6]);

  const isListening = state === 'listening';
  const isSpeaking = state === 'speaking';
  const isProcessing = state === 'processing' || state === 'thinking';
  const isError = state === 'error';

  // Live audio waveform rendering from Web Audio analyser
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = (canvas.width = canvas.offsetWidth || 180);
    let height = (canvas.height = canvas.offsetHeight || 36);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = canvas.offsetWidth || 180;
      height = canvas.height = canvas.offsetHeight || 36;
    };
    window.addEventListener('resize', handleResize);

    const dataArray = new Uint8Array(64);
    let phase = 0;

    const render = () => {
      ctx.clearRect(0, 0, width, height);
      phase += 0.08;

      const analyser = geminiLiveAudioService.getActiveAnalyser();
      let hasRealAudio = false;

      if (analyser && (isListening || isSpeaking)) {
        try {
          analyser.getByteFrequencyData(dataArray);
          const avg = dataArray.reduce((acc, v) => acc + v, 0) / dataArray.length;
          if (avg > 3) hasRealAudio = true;
        } catch (_) {}
      }

      // Update 5-bar equalizer levels on the left
      if (hasRealAudio) {
        setEqLevels([
          Math.min(1, Math.max(0.15, (dataArray[2] || 20) / 200)),
          Math.min(1, Math.max(0.2, (dataArray[6] || 40) / 200)),
          Math.min(1, Math.max(0.3, (dataArray[12] || 60) / 200)),
          Math.min(1, Math.max(0.2, (dataArray[18] || 35) / 200)),
          Math.min(1, Math.max(0.15, (dataArray[24] || 25) / 200)),
        ]);
      } else if (isSpeaking) {
        setEqLevels([
          0.3 + Math.sin(phase * 1.5) * 0.25,
          0.5 + Math.sin(phase * 2.1) * 0.35,
          0.7 + Math.cos(phase * 1.8) * 0.25,
          0.4 + Math.sin(phase * 2.5) * 0.3,
          0.6 + Math.cos(phase * 1.2) * 0.3,
        ]);
      } else if (isListening) {
        setEqLevels([
          0.2 + Math.sin(phase * 1.1) * 0.15,
          0.4 + Math.cos(phase * 1.4) * 0.2,
          0.5 + Math.sin(phase * 1.8) * 0.25,
          0.3 + Math.cos(phase * 1.3) * 0.15,
          0.25 + Math.sin(phase * 1.6) * 0.15,
        ]);
      } else {
        setEqLevels([0.2, 0.35, 0.4, 0.25, 0.2]);
      }

      // Draw horizontal waveform curve
      ctx.beginPath();
      ctx.lineWidth = 2;
      ctx.strokeStyle = isError
        ? '#f43f5e'
        : isSpeaking
        ? '#00f0ff'
        : isListening
        ? '#38bdf8'
        : '#0284c7';
      ctx.shadowBlur = 8;
      ctx.shadowColor = ctx.strokeStyle as string;

      const centerY = height / 2;
      ctx.moveTo(0, centerY);

      const segments = 32;
      const step = width / segments;

      for (let i = 0; i <= segments; i++) {
        const x = i * step;
        let amp = 0;

        if (hasRealAudio) {
          const byteIdx = Math.floor((i / segments) * 24);
          amp = ((dataArray[byteIdx] || 0) / 255) * (height * 0.42);
        } else if (isSpeaking) {
          amp = Math.sin(i * 0.4 + phase * 2) * (height * 0.32);
        } else if (isListening) {
          amp = Math.sin(i * 0.3 + phase) * (height * 0.2);
        } else {
          amp = Math.sin(i * 0.25 + phase * 0.4) * 2.5;
        }

        const y = centerY + Math.sin(i * 0.35 + phase) * amp;
        ctx.lineTo(x, y);
      }

      ctx.stroke();
      animFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isListening, isSpeaking, isProcessing, isError]);

  // Determine current active status text
  const getDisplayText = () => {
    if (isError) {
      return 'SYSTEM TELEMETRY DISRUPTED // STANDBY';
    }
    if (isListening) {
      if (interimTranscript) return `“${interimTranscript}”`;
      return 'LISTENING TO HUNTER CHARAN...';
    }
    if (isProcessing) {
      return 'ANALYZING REAL TELEMETRY...';
    }
    if (isSpeaking && subtitleText) {
      return subtitleText;
    }
    if (lastUserSpeech && !isSpeaking) {
      return `LAST DIRECTIVE: “${lastUserSpeech}”`;
    }
    if (isVoiceActive) {
      return 'SCAR SYSTEM ONLINE // SAY "SCAR"';
    }
    return 'STANDBY // READY FOR HUNTER CHARAN';
  };

  return (
    <div
      className={`relative w-full max-w-[560px] mx-auto px-4 py-3 rounded-2xl bg-[#030718]/80 backdrop-blur-md border border-cyan-500/40 shadow-[0_0_30px_rgba(0,180,255,0.18)] transition-all duration-300 ${
        isSpeaking
          ? 'border-cyan-400 shadow-[0_0_35px_rgba(0,229,255,0.35)]'
          : isListening
          ? 'border-cyan-400/80 shadow-[0_0_30px_rgba(0,210,255,0.3)]'
          : 'border-cyan-500/35'
      } ${className}`}
    >
      {/* Outer Angular Corner Tabs (Matching Reference Image) */}
      <span className="absolute -top-[1px] left-3 w-8 h-[2px] bg-cyan-400 shadow-[0_0_8px_#00e5ff]" />
      <span className="absolute -top-[1px] right-3 w-8 h-[2px] bg-cyan-400 shadow-[0_0_8px_#00e5ff]" />
      <span className="absolute -bottom-[1px] left-3 w-8 h-[2px] bg-cyan-400 shadow-[0_0_8px_#00e5ff]" />
      <span className="absolute -bottom-[1px] right-3 w-8 h-[2px] bg-cyan-400 shadow-[0_0_8px_#00e5ff]" />

      <div className="flex items-center gap-3 w-full">
        {/* Left Vertical Equalizer Bars Icon */}
        <div className="flex items-center gap-1 h-6 px-1 shrink-0">
          {eqLevels.map((lvl, idx) => (
            <span
              key={idx}
              className={`w-[2.5px] rounded-full transition-all duration-150 ${
                isError
                  ? 'bg-rose-400 shadow-[0_0_6px_#f43f5e]'
                  : isSpeaking
                  ? 'bg-cyan-300 shadow-[0_0_8px_#00e5ff]'
                  : isListening
                  ? 'bg-cyan-400 shadow-[0_0_6px_#38bdf8]'
                  : 'bg-cyan-600/70'
              }`}
              style={{
                height: `${Math.max(4, lvl * 22)}px`,
              }}
            />
          ))}
        </div>

        {/* Center / Right Content: Canvas Waveform + Clean Dynamic Text */}
        <div className="relative flex-1 min-w-0 flex items-center justify-between gap-3 overflow-hidden">
          {/* Subtitle / Status Text */}
          <div className="flex-1 min-w-0">
            <p
              className={`font-mono text-xs md:text-sm tracking-wide truncate ${
                isError
                  ? 'text-rose-400 font-semibold'
                  : isSpeaking
                  ? 'text-cyan-200 font-medium'
                  : isListening
                  ? 'text-cyan-300 font-medium animate-pulse'
                  : 'text-slate-400'
              }`}
              title={getDisplayText()}
            >
              {getDisplayText()}
            </p>
          </div>

          {/* Minimal Live Neon Waveform on the Right */}
          <div className="w-24 sm:w-32 h-6 shrink-0 opacity-80">
            <canvas ref={canvasRef} className="w-full h-full" />
          </div>
        </div>
      </div>
    </div>
  );
};
