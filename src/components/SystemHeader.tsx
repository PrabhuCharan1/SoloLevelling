import React from 'react';
import { Settings, ArrowLeft, Shield, User } from 'lucide-react';
import { LevelBadge, StreakBadge, XPBadge } from './Badges.tsx';
import { AppRoute } from '../types.ts';

interface SystemHeaderProps {
  variant?: 'home' | 'subscreen';
  title?: string;
  subtitle?: string;
  onNavigate: (route: AppRoute) => void;
  onBack?: () => void;
  greeting?: string;
  rank?: string;
  hunterName?: string;
  currentDate?: string;
  level?: number;
  streak?: number;
  xp?: number;
}

export const SystemHeader: React.FC<SystemHeaderProps> = ({
  variant = 'home',
  title = 'SYSTEM',
  subtitle,
  onNavigate,
  onBack,
  greeting,
  rank,
  hunterName,
  currentDate = 'TODAY',
  level = 0,
  streak = 0,
  xp = 0,
}) => {
  const displayGreeting = React.useMemo(() => {
    if (greeting) {
      if (rank && !greeting.includes('•')) {
        return `${greeting} • ${rank}`;
      }
      return greeting;
    }
    const name = hunterName || 'HUNTER CHARAN';
    return rank ? `WELCOME, ${name} • ${rank}` : `WELCOME, ${name}`;
  }, [greeting, rank, hunterName]);
  if (variant === 'subscreen') {
    return (
      <header className="sticky top-0 z-30 w-full px-4 py-3 bg-[#05070e]/90 backdrop-blur-lg border-b border-cyan-500/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {onBack && (
              <button
                type="button"
                onClick={onBack}
                aria-label="Back"
                className="w-9 h-9 rounded-lg flex items-center justify-center bg-[#0d1326] border border-cyan-500/30 text-cyan-300 hover:text-white hover:border-cyan-400 transition-all cursor-pointer active:scale-95 shadow-[0_0_10px_rgba(0,240,255,0.15)]"
              >
                <ArrowLeft className="w-4 h-4 stroke-[2.5]" />
              </button>
            )}

            <div>
              <h1 className="font-display text-lg font-bold text-white tracking-widest uppercase flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_#00f0ff] animate-pulse" />
                {title}
              </h1>
              {subtitle && (
                <p className="font-hud text-[11px] font-semibold text-cyan-300/70 tracking-wider">
                  {subtitle}
                </p>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={() => onNavigate('/settings')}
            aria-label="Settings"
            className="w-9 h-9 rounded-lg flex items-center justify-center bg-[#0d1326] border border-cyan-500/30 text-slate-300 hover:text-cyan-300 hover:border-cyan-400 transition-all cursor-pointer active:scale-95 shadow-[0_0_10px_rgba(0,240,255,0.1)]"
          >
            <Settings className="w-4 h-4 stroke-[2]" />
          </button>
        </div>
      </header>
    );
  }

  return (
    <header className="w-full pt-4 pb-2 px-4">
      {/* Top row: Avatar + Greeting + Date + Settings */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          {/* Avatar with anime RPG system frame */}
          <div className="relative">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-cyan-950 via-[#0e1630] to-purple-950 border border-cyan-400/60 p-0.5 flex items-center justify-center shadow-[0_0_15px_rgba(0,240,255,0.25)]">
              <div className="w-full h-full rounded-[10px] bg-[#070b18] flex items-center justify-center text-cyan-300">
                <User className="w-5 h-5 stroke-[2]" />
              </div>
            </div>
            {/* Online/Awakened hunter pulse badge */}
            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-cyan-400 border-2 border-[#05070e] shadow-[0_0_8px_#00f0ff]" />
          </div>

          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-hud tracking-[0.2em] font-semibold text-cyan-400 uppercase">
                SYSTEM ONLINE
              </span>
            </div>
            <h2 className="font-display text-sm font-bold text-white tracking-wide uppercase flex items-center flex-wrap gap-1">
              {displayGreeting.includes(' • ') ? (
                <>
                  <span>{displayGreeting.split(' • ')[0]}</span>
                  <span className="text-cyan-400 font-normal mx-0.5 select-none">•</span>
                  <span className="text-cyan-300 font-extrabold tracking-wider drop-shadow-[0_0_8px_rgba(0,240,255,0.45)]">
                    {displayGreeting.split(' • ')[1]}
                  </span>
                </>
              ) : (
                displayGreeting
              )}
            </h2>
            <p className="font-hud text-[11px] font-medium text-slate-400 tracking-wider uppercase">
              {currentDate}
            </p>
          </div>
        </div>

        {/* Settings gear icon */}
        <button
          type="button"
          onClick={() => onNavigate('/settings')}
          aria-label="Settings"
          className="w-10 h-10 rounded-xl flex items-center justify-center bg-[#090e20] border border-cyan-500/30 text-slate-300 hover:text-cyan-300 hover:border-cyan-400 transition-all cursor-pointer active:scale-95 shadow-[0_0_12px_rgba(0,240,255,0.15)]"
        >
          <Settings className="w-5 h-5 stroke-[2]" />
        </button>
      </div>

      {/* Badges Row: Level card + XP card + Streak card */}
      <div className="grid grid-cols-3 gap-2 pt-1">
        <LevelBadge level={level} compact />
        <div className="flex items-center justify-center px-2 py-1 rounded-lg bg-cyan-950/40 border border-cyan-500/40 text-cyan-200 font-hud shadow-[0_0_12px_rgba(0,240,255,0.15)]">
          <span className="text-[10px] text-cyan-400/80 mr-1 font-semibold">XP</span>
          <span className="text-xs sm:text-sm font-bold font-display text-cyan-100">{xp}</span>
        </div>
        <StreakBadge days={streak} compact />
      </div>
    </header>
  );
};
