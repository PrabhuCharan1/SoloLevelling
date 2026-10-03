import React, { useEffect, useState } from 'react';
import { SystemLogo } from '../components/SystemLogo.tsx';
import { AppRoute } from '../types.ts';
import { loadUserProfile, getTodayDateKey } from '../utils/questStorage.ts';

interface SplashScreenProps {
  onNavigate: (route: AppRoute) => void;
}

const SESSION_INIT_KEY = 'questlife_session_initialized';

export const SplashScreen: React.FC<SplashScreenProps> = ({ onNavigate }) => {
  // Check if user has already seen splash in this browser session
  const isAlreadyInit = typeof window !== 'undefined' && sessionStorage.getItem(SESSION_INIT_KEY) === 'true';

  const [loadProgress, setLoadProgress] = useState(isAlreadyInit ? 90 : 20);

  useEffect(() => {
    // Determine target route (return to /home if existing hunter, else /onboarding)
    const profile = loadUserProfile(getTodayDateKey());
    const hasExistingData = profile.totalXP > 0 || profile.streak > 0 || (profile.userName && profile.userName !== 'Player');
    const targetRoute: AppRoute = hasExistingData ? '/home' : '/onboarding';

    if (isAlreadyInit) {
      // Short system glitch/skip if already initialized
      const fastTimer = setTimeout(() => {
        onNavigate(targetRoute);
      }, 350);
      return () => clearTimeout(fastTimer);
    }

    sessionStorage.setItem(SESSION_INIT_KEY, 'true');

    const interval = setInterval(() => {
      setLoadProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + Math.floor(Math.random() * 25) + 20;
      });
    }, 180);

    const timer = setTimeout(() => {
      onNavigate(targetRoute);
    }, 1200);

    return () => {
      clearInterval(interval);
      clearTimeout(timer);
    };
  }, [isAlreadyInit, onNavigate]);

  const handleSkip = () => {
    const profile = loadUserProfile(getTodayDateKey());
    const hasExistingData = profile.totalXP > 0 || profile.streak > 0 || (profile.userName && profile.userName !== 'Player');
    onNavigate(hasExistingData ? '/home' : '/onboarding');
  };

  return (
    <div className="relative min-h-[85vh] flex flex-col items-center justify-between py-12 px-6 overflow-hidden select-none">
      {/* Dark atmospheric background layers */}
      <div className="absolute inset-0 bg-[#05070e] bg-grid-system pointer-events-none" />
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 rounded-full bg-cyan-600/15 blur-[90px] pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/2 -translate-x-1/2 w-72 h-72 rounded-full bg-purple-600/20 blur-[80px] pointer-events-none" />

      {/* Decorative futuristic HUD corner guides */}
      <div className="absolute top-4 left-4 w-6 h-6 border-t-2 border-l-2 border-cyan-400/50" />
      <div className="absolute top-4 right-4 w-6 h-6 border-t-2 border-r-2 border-cyan-400/50" />
      <div className="absolute bottom-4 left-4 w-6 h-6 border-b-2 border-l-2 border-purple-400/50" />
      <div className="absolute bottom-4 right-4 w-6 h-6 border-b-2 border-r-2 border-purple-400/50" />

      {/* Top System Status bar */}
      <div className="relative z-10 w-full flex items-center justify-between text-[10px] font-mono tracking-[0.25em] text-cyan-400/70">
        <span>SYS_INIT // PROTOCOL_V1.1</span>
        <span className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
          SYSTEM STANDBY
        </span>
      </div>

      {/* Center Hero Logo & Tagline */}
      <div className="relative z-10 flex flex-col items-center justify-center my-auto">
        <SystemLogo size="hero" showTagline={false} />

        <h1 className="mt-4 text-2xl md:text-3xl font-mono font-bold tracking-[0.2em] text-white uppercase text-center">
          QUESTLIFE
        </h1>

        <div className="mt-2 text-xs font-mono tracking-[0.25em] text-cyan-300 uppercase">
          DAILY LIFE = GAME
        </div>

        <div className="mt-6 px-4 py-1.5 rounded-full bg-cyan-950/40 border border-cyan-500/30 text-cyan-300 font-mono text-xs tracking-widest uppercase shadow-[0_0_15px_rgba(0,240,255,0.25)]">
          &lt; REAL LIFE HAS BECOME A QUEST &gt;
        </div>
      </div>

      {/* Bottom Loading Indicator */}
      <div className="relative z-10 w-full max-w-xs flex flex-col items-center">
        <div className="flex items-center justify-between w-full text-[11px] font-mono tracking-wider text-slate-400 mb-2">
          <span className="flex items-center gap-1.5 text-cyan-300">
            <span className="w-2 h-2 rounded-sm bg-cyan-400 animate-spin" />
            SYSTEM INITIALIZING...
          </span>
          <span className="font-bold text-white font-mono">{Math.min(100, loadProgress)}%</span>
        </div>

        {/* Futuristic glowing progress track */}
        <div className="w-full h-2 rounded-full bg-[#090d1c] border border-cyan-500/40 overflow-hidden p-[1px] shadow-[0_0_12px_rgba(0,240,255,0.25)]">
          <div
            className="h-full rounded-full bg-gradient-to-r from-blue-600 via-cyan-400 to-purple-400 shadow-[0_0_12px_rgba(0,240,255,0.7)] transition-all duration-300"
            style={{ width: `${Math.min(100, loadProgress)}%` }}
          />
        </div>

        {/* Quick skip trigger */}
        <button
          type="button"
          onClick={handleSkip}
          className="mt-4 text-[10px] font-mono tracking-widest text-slate-500 hover:text-cyan-300 transition-colors uppercase cursor-pointer"
        >
          [ Tap to enter ]
        </button>
      </div>
    </div>
  );
};
