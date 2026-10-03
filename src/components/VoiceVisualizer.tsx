import React, { useEffect, useRef, useState } from 'react';
import {
  Mic,
  Activity,
  Layers,
  BarChart3,
  Waves,
  Zap,
} from 'lucide-react';
import { ScarState } from '../services/voiceService.ts';
import { geminiLiveAudioService } from '../services/geminiLiveAudioService.ts';

export type VisualizerDisplayMode = 'dual' | 'wave' | 'bars';

export interface VoiceVisualizerProps {
  state: ScarState;
  isVoiceModeActive?: boolean;
  className?: string;
  height?: number;
  showControls?: boolean;
  showTelemetry?: boolean;
  onMicClick?: () => void;
}

export const VoiceVisualizer: React.FC<VoiceVisualizerProps> = ({
  state,
  isVoiceModeActive = false,
  className = '',
  height = 110,
  showControls = true,
  showTelemetry = true,
  onMicClick,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const animationFrameIdRef = useRef<number | null>(null);

  // Visualizer display mode
  const [displayMode, setDisplayMode] = useState<VisualizerDisplayMode>('dual');

  // Real-time telemetry indicators
  const [telemetry, setTelemetry] = useState<{
    db: number;
    hz: number;
    status: string;
    isMicConnected: boolean;
  }>({
    db: -60,
    hz: 0,
    status: 'STANDBY',
    isMicConnected: false,
  });

  const peakLevelsRef = useRef<number[]>(new Array(32).fill(0));

  // Canvas resize observer
  useEffect(() => {
    const handleResize = () => {
      const container = containerRef.current;
      const canvas = canvasRef.current;
      if (!container || !canvas) return;
      const rect = container.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = height * dpr;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.scale(dpr, dpr);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [height]);

  // Main Canvas Render Loop (60fps requestAnimationFrame)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let isRunning = true;
    let telemetryThrottle = 0;

    const render = (timestamp: number) => {
      if (!isRunning) return;

      const dpr = window.devicePixelRatio || 1;
      const width = canvas.width / dpr;
      const canvasHeight = canvas.height / dpr;
      ctx.clearRect(0, 0, width, canvasHeight);

      // Get real analyser from Gemini Live Audio Service
      const analyser = geminiLiveAudioService.getActiveAnalyser();
      const isMicActive = geminiLiveAudioService.isListening();
      const bufferLength = analyser ? analyser.frequencyBinCount : 128;
      const freqData = new Uint8Array(bufferLength);
      const timeData = new Uint8Array(bufferLength);

      let hasRealAudio = false;

      if (analyser) {
        analyser.getByteFrequencyData(freqData);
        analyser.getByteTimeDomainData(timeData);
        // Check if there is genuine signal above noise floor
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += Math.abs(timeData[i] - 128);
        }
        hasRealAudio = sum > 10;
      }

      // If no active audio, generate a calm subtle cybernetic ambient scan
      if (!hasRealAudio) {
        for (let i = 0; i < bufferLength; i++) {
          const t = timestamp * 0.002;
          const factor = state === 'thinking' ? 0.35 : 0.12;
          freqData[i] = Math.max(0, Math.sin(t + i * 0.12) * 20 * factor + 5);
          timeData[i] = 128 + Math.sin(t + i * 0.08) * 8 * factor;
        }
      }

      // Calculate RMS and Peak for Audio Metrics
      let sumSquares = 0;
      let maxVal = 0;
      let weightedFreqSum = 0;
      let totalFreqMag = 0;

      for (let i = 0; i < bufferLength; i++) {
        const normalized = (timeData[i] - 128) / 128;
        sumSquares += normalized * normalized;
        if (Math.abs(normalized) > maxVal) maxVal = Math.abs(normalized);

        const freqMag = freqData[i];
        weightedFreqSum += freqMag * (i * 120);
        totalFreqMag += freqMag;
      }

      const rms = Math.sqrt(sumSquares / bufferLength);
      const db = rms > 0.0001 ? Math.round(20 * Math.log10(rms)) : -60;
      const dominantHz = totalFreqMag > 10 ? Math.round(weightedFreqSum / totalFreqMag) : 0;

      // Throttle telemetry update to ~8 times per second for smooth React rendering
      telemetryThrottle++;
      if (telemetryThrottle % 8 === 0) {
        setTelemetry({
          db: Math.max(-60, db),
          hz: dominantHz,
          status:
            state === 'listening'
              ? 'MIC CAPTURE (16kHz PCM)'
              : state === 'speaking'
              ? 'GEMINI LIVE (24kHz)'
              : state === 'processing'
              ? 'PROCESSING INTENT'
              : state === 'wake_detected'
              ? 'WAKE DETECTED'
              : state === 'connecting'
              ? 'CONNECTING...'
              : 'STANDBY',
          isMicConnected: isMicActive,
        });
      }

      // Palette selection based on state
      const colors: Record<string, any> = {
        listening: {
          primary: '#10b981', // emerald-500
          secondary: '#34d399', // emerald-400
          glow: 'rgba(16, 185, 129, 0.45)',
          bar: '#059669',
          ambient: 'rgba(6, 78, 59, 0.25)',
        },
        speaking: {
          primary: '#06b6d4', // cyan-500
          secondary: '#38bdf8', // sky-400
          glow: 'rgba(6, 182, 212, 0.45)',
          bar: '#0891b2',
          ambient: 'rgba(8, 51, 68, 0.25)',
        },
        processing: {
          primary: '#818cf8', // indigo-400
          secondary: '#c084fc', // purple-400
          glow: 'rgba(129, 140, 248, 0.45)',
          bar: '#6366f1',
          ambient: 'rgba(30, 27, 75, 0.25)',
        },
        wake_detected: {
          primary: '#c084fc', // purple-400
          secondary: '#e879f9', // fuchsia-400
          glow: 'rgba(192, 132, 252, 0.5)',
          bar: '#a855f7',
          ambient: 'rgba(88, 28, 135, 0.3)',
        },
        connecting: {
          primary: '#f59e0b', // amber-500
          secondary: '#fbbf24', // amber-400
          glow: 'rgba(245, 158, 11, 0.4)',
          bar: '#d97706',
          ambient: 'rgba(69, 26, 3, 0.25)',
        },
        idle: {
          primary: '#0ea5e9', // sky-500
          secondary: '#38bdf8', // sky-400
          glow: 'rgba(14, 165, 233, 0.25)',
          bar: '#0284c7',
          ambient: 'rgba(12, 74, 110, 0.15)',
        },
        error: {
          primary: '#f43f5e', // rose-500
          secondary: '#fb7185', // rose-400
          glow: 'rgba(244, 63, 94, 0.45)',
          bar: '#e11d48',
          ambient: 'rgba(76, 5, 25, 0.25)',
        },
      };

      const currentColor = colors[state] || colors.idle;

      // DRAW HORIZONTAL CENTER GUIDELINES
      const centerY = canvasHeight / 2;
      ctx.strokeStyle = 'rgba(22, 36, 59, 0.4)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, centerY);
      ctx.lineTo(width, centerY);
      ctx.stroke();

      // DRAW FREQUENCY BARS (Bottom half or Dual)
      if (displayMode === 'bars' || displayMode === 'dual') {
        const barCount = 32;
        const barSpacing = 3;
        const totalSpacing = (barCount - 1) * barSpacing;
        const barWidth = Math.max(2, (width - totalSpacing - 24) / barCount);
        const startX = 12;

        for (let i = 0; i < barCount; i++) {
          const dataIndex = Math.floor((i / barCount) * (bufferLength * 0.75));
          const value = freqData[dataIndex] || 0;
          const normalized = value / 255;
          const maxBarHeight = canvasHeight * 0.42;
          const barHeight = Math.max(3, normalized * maxBarHeight);

          // Peak falloff physics
          if (barHeight > peakLevelsRef.current[i]) {
            peakLevelsRef.current[i] = barHeight;
          } else {
            peakLevelsRef.current[i] = Math.max(0, peakLevelsRef.current[i] - 0.75);
          }

          const x = startX + i * (barWidth + barSpacing);
          const y = centerY - barHeight / 2;

          // Gradient bar fill
          const grad = ctx.createLinearGradient(0, y, 0, y + barHeight);
          grad.addColorStop(0, currentColor.secondary);
          grad.addColorStop(1, currentColor.bar);

          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.roundRect(x, y, barWidth, barHeight, 2);
          ctx.fill();

          // Peak cap indicator dot
          const peakY = centerY - peakLevelsRef.current[i] / 2 - 2;
          ctx.fillStyle = currentColor.primary;
          ctx.fillRect(x, Math.max(2, peakY), barWidth, 1.5);
        }
      }

      // DRAW OSCILLOSCOPE TIME-DOMAIN WAVE
      if (displayMode === 'wave' || displayMode === 'dual') {
        ctx.beginPath();
        const sliceWidth = width / (bufferLength - 1);
        let x = 0;

        for (let i = 0; i < bufferLength; i++) {
          const v = timeData[i] / 128.0;
          const waveHeight = (canvasHeight * 0.35);
          const y = centerY + (v - 1.0) * waveHeight;

          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
          x += sliceWidth;
        }

        ctx.strokeStyle = currentColor.secondary;
        ctx.lineWidth = 1.75;
        ctx.shadowColor = currentColor.glow;
        ctx.shadowBlur = 8;
        ctx.stroke();
        ctx.shadowBlur = 0; // Reset shadow
      }

      animationFrameIdRef.current = requestAnimationFrame(render);
    };

    animationFrameIdRef.current = requestAnimationFrame(render);

    return () => {
      isRunning = false;
      if (animationFrameIdRef.current) {
        cancelAnimationFrame(animationFrameIdRef.current);
      }
    };
  }, [state, displayMode]);

  return (
    <div
      ref={containerRef}
      className={`relative w-full rounded-2xl bg-[#030614]/95 border border-cyan-500/25 overflow-hidden backdrop-blur-md shadow-[0_4px_25px_rgba(0,0,0,0.5)] ${className}`}
    >
      {/* Top HUD Visualizer Header & Mode Switcher */}
      {showControls && (
        <div className="relative z-10 flex items-center justify-between px-3 py-1.5 border-b border-cyan-500/20 bg-[#04081c]/80 text-[10px] font-mono text-slate-400">
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 text-cyan-300 font-bold uppercase tracking-wider">
              <Activity className="w-3 h-3 text-cyan-400" />
              <span>SPECTRAL TELEMETRY</span>
            </span>
            <span className="text-[9px] px-1.5 py-0.2 rounded bg-cyan-950/80 border border-cyan-500/30 text-cyan-400">
              {displayMode.toUpperCase()}
            </span>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setDisplayMode('dual')}
              title="Dual Waveform & FFT Spectrum"
              className={`p-1 rounded cursor-pointer transition-colors ${
                displayMode === 'dual'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Layers className="w-3 h-3" />
            </button>
            <button
              onClick={() => setDisplayMode('wave')}
              title="Time-Domain Waveform"
              className={`p-1 rounded cursor-pointer transition-colors ${
                displayMode === 'wave'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Waves className="w-3 h-3" />
            </button>
            <button
              onClick={() => setDisplayMode('bars')}
              title="Frequency Bar Spectrum"
              className={`p-1 rounded cursor-pointer transition-colors ${
                displayMode === 'bars'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <BarChart3 className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}

      {/* Main 60FPS Canvas */}
      <div className="relative w-full" style={{ height: `${height}px` }}>
        <canvas
          ref={canvasRef}
          onClick={onMicClick}
          className="w-full h-full block cursor-pointer"
          style={{ width: '100%', height: `${height}px` }}
        />

        {/* Tactical State Overlay Prompts */}
        {state === 'idle' && !isVoiceModeActive && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-950/70 border border-cyan-400/30 text-cyan-300 text-[10px] font-mono backdrop-blur-sm">
              <Mic className="w-3 h-3 text-cyan-400 animate-pulse" />
              <span>Tap to speak or say "Scar"</span>
            </div>
          </div>
        )}

        {state === 'processing' && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-950/70 border border-indigo-400/40 text-indigo-300 text-[10px] font-mono animate-pulse">
              <Zap className="w-3 h-3 text-indigo-400 animate-spin" />
              <span>Calculating Quest telemetry...</span>
            </div>
          </div>
        )}

        {state === 'wake_detected' && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-950/80 border border-purple-400/50 text-purple-200 text-[10px] font-mono animate-pulse">
              <Zap className="w-3 h-3 text-purple-400" />
              <span>Yes, Hunter Charan?</span>
            </div>
          </div>
        )}
      </div>

      {/* Real-time Telemetry Status Bar */}
      {showTelemetry && (
        <div className="relative z-10 flex items-center justify-between px-3 py-1 border-t border-cyan-500/20 bg-[#04081c]/90 text-[9px] font-mono text-slate-400">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1 text-cyan-300">
              <Activity className="w-2.5 h-2.5 text-cyan-400" />
              <span>{telemetry.status}</span>
            </span>
            <span>
              PEAK: <strong className="text-slate-300">{telemetry.db} dB</strong>
            </span>
            <span>
              DOMINANT: <strong className="text-slate-300">{telemetry.hz} Hz</strong>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1 px-1.5 py-0.2 rounded ${
                telemetry.isMicConnected
                  ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-500/40'
                  : 'text-slate-400'
              }`}
            >
              {telemetry.isMicConnected ? (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  <span>MIC LIVE</span>
                </>
              ) : (
                <span>REAL ANALYSER</span>
              )}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
