import React from 'react';

interface ProgressBarProps {
  progress: number; // 0 to 100
  size?: 'sm' | 'md' | 'lg';
  glowColor?: 'cyan' | 'purple' | 'blue';
  showLabel?: boolean;
  className?: string;
  sublabel?: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  progress,
  size = 'md',
  glowColor = 'cyan',
  showLabel = false,
  className = '',
  sublabel,
}) => {
  const clamped = Math.min(100, Math.max(0, progress));

  const heightClasses = {
    sm: 'h-2',
    md: 'h-3.5',
    lg: 'h-5',
  };

  const glowStyles = {
    cyan: 'from-blue-600 via-cyan-400 to-cyan-300 shadow-[0_0_15px_rgba(0,240,255,0.5)]',
    purple: 'from-indigo-600 via-purple-500 to-pink-400 shadow-[0_0_15px_rgba(168,85,247,0.5)]',
    blue: 'from-blue-700 via-blue-500 to-cyan-400 shadow-[0_0_15px_rgba(59,130,246,0.5)]',
  };

  return (
    <div className={`w-full ${className}`}>
      {(showLabel || sublabel) && (
        <div className="flex justify-between items-center mb-1.5 font-hud text-xs">
          {sublabel && <span className="text-slate-400 tracking-wider uppercase">{sublabel}</span>}
          {showLabel && <span className="text-cyan-300 font-bold ml-auto">{clamped}%</span>}
        </div>
      )}

      {/* Outer track with tech borders */}
      <div
        className={`relative w-full ${heightClasses[size]} rounded-full bg-[#070b16] border border-cyan-500/20 overflow-hidden p-[2px]`}
      >
        {/* Background grid marks inside bar */}
        <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent_24%,rgba(255,255,255,0.03)_25%)] bg-[length:12px_100%] pointer-events-none" />

        {/* Active Fill Bar */}
        <div
          className={`h-full rounded-full bg-gradient-to-r ${glowStyles[glowColor]} transition-all duration-500 relative`}
          style={{ width: `${clamped}%` }}
        >
          {/* Leading highlight flare */}
          {clamped > 3 && (
            <div className="absolute right-0 top-0 bottom-0 w-2 bg-white/90 rounded-full blur-[1px]" />
          )}
        </div>
      </div>
    </div>
  );
};
