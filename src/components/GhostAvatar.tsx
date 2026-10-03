import React, { useEffect, useRef } from 'react';
import { ScarState } from '../services/voiceService.ts';
import { geminiLiveAudioService } from '../services/geminiLiveAudioService.ts';
import ghostArtworkUrl from '../assets/images/scar_ghost.jpg';

interface GhostAvatarProps {
  state: ScarState;
  isVoiceActive: boolean;
  audioVolume?: number;
  className?: string;
}

interface Particle {
  x: number;
  y: number;
  size: number;
  vx: number;
  vy: number;
  alpha: number;
  maxAlpha: number;
  life: number;
  maxLife: number;
  color: string;
}

export const GhostAvatar: React.FC<GhostAvatarProps> = ({
  state,
  isVoiceActive,
  audioVolume = 0,
  className = '',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const particlesRef = useRef<Particle[]>([]);
  const stateRef = useRef(state);
  stateRef.current = state;

  const isSpeaking = state === 'speaking';
  const isListening = state === 'listening';
  const isProcessing = state === 'processing' || state === 'thinking';
  const isError = state === 'error';

  // Dynamic particle canvas rendering
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = (canvas.width = canvas.offsetWidth || 380);
    let height = (canvas.height = canvas.offsetHeight || 380);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = canvas.offsetWidth || 380;
      height = canvas.height = canvas.offsetHeight || 380;
    };
    window.addEventListener('resize', handleResize);

    // Particle color palettes
    const cyanColors = ['#00f0ff', '#00b4d8', '#0077b6', '#48cae4', '#7209b7', '#3a0ca3'];
    const errorColors = ['#f72585', '#b5179e', '#7209b7', '#ffb703'];

    const spawnParticle = () => {
      const currentState = stateRef.current;
      const palette = currentState === 'error' ? errorColors : cyanColors;
      const centerX = width / 2;
      const centerY = height * 0.52;

      // Spawn in lower ghostly robe torso area
      const angle = Math.random() * Math.PI * 2;
      const radius = 20 + Math.random() * 65;
      const px = centerX + Math.cos(angle) * (radius * 0.85);
      const py = centerY + 15 + Math.random() * 70;

      const speedFactor = currentState === 'speaking' ? 2.2 : currentState === 'listening' ? 1.6 : 1.0;

      const p: Particle = {
        x: px,
        y: py,
        size: 1.2 + Math.random() * 2.8,
        vx: (Math.random() - 0.5) * 0.8 * speedFactor,
        vy: -(0.6 + Math.random() * 1.4) * speedFactor, // Drift upwards like spectral vapor
        alpha: 0.1,
        maxAlpha: 0.35 + Math.random() * 0.45,
        life: 0,
        maxLife: 50 + Math.random() * 60,
        color: palette[Math.floor(Math.random() * palette.length)],
      };
      particlesRef.current.push(p);
    };

    let tick = 0;
    const render = () => {
      ctx.clearRect(0, 0, width, height);
      tick++;

      const currentState = stateRef.current;
      const spawnRate = currentState === 'speaking' ? 4 : currentState === 'listening' ? 3 : 1;

      if (tick % (currentState === 'speaking' ? 2 : 4) === 0) {
        for (let i = 0; i < spawnRate; i++) {
          if (particlesRef.current.length < 90) {
            spawnParticle();
          }
        }
      }

      // Update & render particles
      for (let i = particlesRef.current.length - 1; i >= 0; i--) {
        const p = particlesRef.current[i];
        p.life++;
        p.x += p.vx;
        p.y += p.vy;

        // Subtle gentle horizontal wave
        p.x += Math.sin(p.life * 0.08) * 0.4;

        const progress = p.life / p.maxLife;
        if (progress < 0.25) {
          p.alpha = (progress / 0.25) * p.maxAlpha;
        } else {
          p.alpha = (1 - progress) * p.maxAlpha;
        }

        if (p.life >= p.maxLife || p.y < 20 || p.x < 10 || p.x > width - 10) {
          particlesRef.current.splice(i, 1);
          continue;
        }

        // Draw soft glowing particle
        ctx.save();
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = Math.max(0, Math.min(1, p.alpha));
        ctx.shadowBlur = 10;
        ctx.shadowColor = p.color;
        ctx.fill();
        ctx.restore();
      }

      animFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, []);

  // Glow aura classes depending on voice state
  const getGlowStyles = () => {
    if (isError) {
      return 'shadow-[0_0_80px_rgba(239,68,68,0.35)] drop-shadow-[0_0_35px_rgba(239,68,68,0.5)]';
    }
    if (isSpeaking) {
      return 'shadow-[0_0_120px_rgba(0,229,255,0.7)] drop-shadow-[0_0_50px_rgba(0,229,255,0.8)] scale-[1.03]';
    }
    if (isListening) {
      return 'shadow-[0_0_90px_rgba(0,210,255,0.55)] drop-shadow-[0_0_40px_rgba(0,210,255,0.65)] scale-[1.01]';
    }
    if (isProcessing) {
      return 'shadow-[0_0_90px_rgba(147,51,234,0.55)] drop-shadow-[0_0_35px_rgba(59,130,246,0.6)]';
    }
    return 'shadow-[0_0_60px_rgba(0,180,255,0.25)] drop-shadow-[0_0_25px_rgba(0,180,255,0.35)]';
  };

  return (
    <div
      className={`relative flex items-center justify-center select-none ${className}`}
      style={{ width: 'min(380px, 86vw)', height: 'min(380px, 86vw)' }}
    >
      {/* 1. Atmospheric Radial Glow Base */}
      <div
        className={`absolute inset-0 rounded-full transition-all duration-700 pointer-events-none ${
          isError
            ? 'bg-[radial-gradient(circle,rgba(239,68,68,0.2)_0%,rgba(147,51,234,0.1)_45%,transparent_70%)]'
            : isSpeaking
            ? 'bg-[radial-gradient(circle,rgba(0,229,255,0.32)_0%,rgba(37,99,235,0.2)_45%,transparent_72%)]'
            : isListening
            ? 'bg-[radial-gradient(circle,rgba(0,210,255,0.25)_0%,rgba(59,130,246,0.15)_45%,transparent_70%)]'
            : isProcessing
            ? 'bg-[radial-gradient(circle,rgba(168,85,247,0.25)_0%,rgba(59,130,246,0.18)_45%,transparent_70%)]'
            : 'bg-[radial-gradient(circle,rgba(0,180,255,0.16)_0%,rgba(30,58,138,0.1)_45%,transparent_70%)]'
        }`}
      />

      {/* 2. Concentric Holographic HUD Energy Rings */}
      <div className="absolute inset-2 flex items-center justify-center pointer-events-none">
        {/* Outermost Thin HUD Ring with Angular Ticks */}
        <div
          className={`absolute inset-0 rounded-full border border-cyan-500/20 transition-all duration-1000 ${
            isProcessing ? 'animate-[spin_6s_linear_infinite]' : isSpeaking ? 'animate-[spin_18s_linear_infinite]' : 'animate-[spin_35s_linear_infinite]'
          }`}
          style={{
            borderStyle: 'solid',
            boxShadow: isSpeaking ? '0 0 25px rgba(0,229,255,0.35)' : 'none',
          }}
        >
          {/* Orbital Tick Notches */}
          <span className="absolute top-0 left-1/2 -translate-x-1/2 w-1.5 h-1 bg-cyan-400/80 shadow-[0_0_8px_#00e5ff]" />
          <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1.5 h-1 bg-cyan-400/80 shadow-[0_0_8px_#00e5ff]" />
          <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-1.5 bg-cyan-400/80 shadow-[0_0_8px_#00e5ff]" />
          <span className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-1.5 bg-cyan-400/80 shadow-[0_0_8px_#00e5ff]" />
        </div>

        {/* Middle Luminous Tech Ring with Top & Bottom Diamond Glyphs (Exact Match to Reference) */}
        <div
          className={`absolute inset-5 rounded-full border border-cyan-400/40 transition-all duration-700 ${
            isSpeaking
              ? 'scale-[1.02] border-cyan-300 shadow-[0_0_30px_rgba(0,229,255,0.5)]'
              : isListening
              ? 'animate-pulse border-cyan-400/70 shadow-[0_0_20px_rgba(0,229,255,0.35)]'
              : 'border-cyan-500/35'
          }`}
        >
          {/* Top Diamond Sigil */}
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 flex items-center justify-center">
            <div className="w-2.5 h-2.5 rotate-45 border border-cyan-300 bg-[#020718] shadow-[0_0_10px_#00e5ff] flex items-center justify-center">
              <div className="w-1 h-1 bg-cyan-300" />
            </div>
          </div>

          {/* Bottom Diamond Sigil */}
          <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 flex items-center justify-center">
            <div className="w-2.5 h-2.5 rotate-45 border border-cyan-300 bg-[#020718] shadow-[0_0_10px_#00e5ff] flex items-center justify-center">
              <div className="w-1 h-1 bg-cyan-300" />
            </div>
          </div>
        </div>

        {/* Inner Counter-Rotating Dotted Ring */}
        <div
          className={`absolute inset-10 rounded-full border border-dashed border-cyan-400/25 ${
            isProcessing
              ? 'animate-[spin_4s_linear_infinite_reverse]'
              : 'animate-[spin_45s_linear_infinite_reverse]'
          }`}
        />

        {/* Framing HUD Corner Brackets */}
        <div className="absolute inset-4 pointer-events-none">
          <span className="absolute top-1 left-1 w-3 h-3 border-t-2 border-l-2 border-cyan-400/50" />
          <span className="absolute top-1 right-1 w-3 h-3 border-t-2 border-r-2 border-cyan-400/50" />
          <span className="absolute bottom-1 left-1 w-3 h-3 border-b-2 border-l-2 border-cyan-400/50" />
          <span className="absolute bottom-1 right-1 w-3 h-3 border-b-2 border-r-2 border-cyan-400/50" />
        </div>
      </div>

      {/* 3. Ghost Canvas for Spectral Smoke & Floating Embers */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none z-10"
      />

      {/* 4. Center Spectral Hooded Ghost Artwork */}
      <div
        className={`relative z-20 w-[78%] h-[78%] flex items-center justify-center transition-all duration-700 ease-out transform ${
          isSpeaking
            ? 'animate-[ghostFloat_3.5s_ease-in-out_infinite]'
            : 'animate-[ghostFloat_6s_ease-in-out_infinite]'
        }`}
      >
        {/* Ghost Image with mix-blend-screen for seamless black drop-out & vibrant blue plasma luminescence */}
        <img
          src={ghostArtworkUrl}
          alt="SCAR Spectral AI Ghost"
          className={`w-full h-full object-contain pointer-events-none select-none mix-blend-screen transition-all duration-500 ${getGlowStyles()}`}
          style={{
            filter: isError
              ? 'hue-rotate(280deg) saturate(1.8) contrast(1.2)'
              : isSpeaking
              ? 'brightness(1.25) contrast(1.15) saturate(1.3)'
              : isListening
              ? 'brightness(1.15) contrast(1.1) saturate(1.2)'
              : 'brightness(1.0) contrast(1.05) saturate(1.1)',
          }}
        />

        {/* Piercing Glowing Eyes Overlay for dynamic reactivity */}
        <div className="absolute top-[34%] left-1/2 -translate-x-1/2 flex items-center justify-center gap-3.5 pointer-events-none">
          <div
            className={`w-1.5 h-1.5 rounded-full bg-cyan-200 transition-all duration-300 ${
              isError
                ? 'bg-rose-400 shadow-[0_0_12px_#f43f5e]'
                : isSpeaking
                ? 'scale-125 bg-white shadow-[0_0_14px_#00e5ff]'
                : isListening
                ? 'scale-110 bg-cyan-200 shadow-[0_0_10px_#00e5ff]'
                : 'bg-cyan-300 shadow-[0_0_7px_#00e5ff]'
            }`}
          />
          <div
            className={`w-1.5 h-1.5 rounded-full bg-cyan-200 transition-all duration-300 ${
              isError
                ? 'bg-rose-400 shadow-[0_0_12px_#f43f5e]'
                : isSpeaking
                ? 'scale-125 bg-white shadow-[0_0_14px_#00e5ff]'
                : isListening
                ? 'scale-110 bg-cyan-200 shadow-[0_0_10px_#00e5ff]'
                : 'bg-cyan-300 shadow-[0_0_7px_#00e5ff]'
            }`}
          />
        </div>
      </div>
    </div>
  );
};
