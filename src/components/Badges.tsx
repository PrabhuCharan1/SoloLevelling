import React from 'react';
import { Flame, Zap, Shield } from 'lucide-react';

interface XPBadgeProps {
  amount: number | string;
  size?: 'sm' | 'md';
  className?: string;
}

export const XPBadge: React.FC<XPBadgeProps> = ({ amount, size = 'sm', className = '' }) => {
  const isSmall = size === 'sm';
  return (
    <span
      className={`inline-flex items-center gap-1 font-hud font-bold tracking-wider rounded-md border border-cyan-500/40 bg-cyan-950/40 text-cyan-300 shadow-[0_0_10px_rgba(0,240,255,0.2)] ${
        isSmall ? 'text-[11px] px-2 py-0.5' : 'text-xs px-2.5 py-1'
      } ${className}`}
    >
      <Zap className={isSmall ? 'w-3 h-3 text-cyan-400 fill-cyan-400' : 'w-3.5 h-3.5 text-cyan-400 fill-cyan-400'} />
      <span>+{amount} XP</span>
    </span>
  );
};

interface LevelBadgeProps {
  level: number | string;
  rankTitle?: string;
  className?: string;
  compact?: boolean;
}

export const LevelBadge: React.FC<LevelBadgeProps> = ({
  level,
  rankTitle = 'HUNTER',
  className = '',
  compact = false,
}) => {
  if (compact) {
    return (
      <div
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-purple-950/40 border border-purple-500/40 text-purple-200 font-hud shadow-[0_0_12px_rgba(168,85,247,0.25)] ${className}`}
      >
        <Shield className="w-3.5 h-3.5 text-purple-400" />
        <span className="text-[10px] tracking-wider text-purple-300/80">LV.</span>
        <span className="text-sm font-bold font-display text-white">{level}</span>
      </div>
    );
  }

  return (
    <div
      className={`relative flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gradient-to-r from-purple-950/60 to-[#0d1226] border border-purple-500/40 shadow-[0_0_15px_-2px_rgba(168,85,247,0.3)] ${className}`}
    >
      <div className="w-6 h-6 rounded flex items-center justify-center bg-purple-500/20 border border-purple-400/60">
        <span className="text-xs font-black font-display text-purple-300">L</span>
      </div>
      <div className="flex flex-col">
        <span className="text-[9px] tracking-widest font-hud font-semibold text-purple-300/70 leading-none">
          {rankTitle}
        </span>
        <span className="text-sm font-bold font-display text-white tracking-wide leading-tight">
          LEVEL {level}
        </span>
      </div>
    </div>
  );
};

interface StreakBadgeProps {
  days: number;
  className?: string;
  compact?: boolean;
}

export const StreakBadge: React.FC<StreakBadgeProps> = ({ days, className = '', compact = false }) => {
  if (compact) {
    return (
      <div
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-950/30 border border-amber-500/40 text-amber-200 font-hud shadow-[0_0_10px_rgba(245,158,11,0.2)] ${className}`}
      >
        <Flame className="w-3.5 h-3.5 text-amber-400 fill-amber-400 animate-pulse" />
        <span className="text-sm font-bold font-display text-amber-300">{days}</span>
        <span className="text-[10px] text-amber-200/70 font-semibold tracking-wider">D</span>
      </div>
    );
  }

  return (
    <div
      className={`relative flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gradient-to-r from-amber-950/40 to-[#0d1226] border border-amber-500/40 shadow-[0_0_15px_-3px_rgba(245,158,11,0.25)] ${className}`}
    >
      <div className="w-6 h-6 rounded flex items-center justify-center bg-amber-500/20 border border-amber-400/60">
        <Flame className="w-4 h-4 text-amber-400 fill-amber-400" />
      </div>
      <div className="flex flex-col">
        <span className="text-[9px] tracking-widest font-hud font-semibold text-amber-300/70 leading-none">
          STREAK
        </span>
        <span className="text-sm font-bold font-display text-white tracking-wide leading-tight">
          {days} DAYS
        </span>
      </div>
    </div>
  );
};
