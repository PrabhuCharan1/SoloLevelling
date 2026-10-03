import React from 'react';

interface StatCardProps {
  label: string;
  value: string | number;
  subvalue?: string;
  icon?: React.ReactNode;
  color?: 'cyan' | 'purple' | 'amber' | 'blue';
  className?: string;
  highlight?: boolean;
}

export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  subvalue,
  icon,
  color = 'cyan',
  className = '',
  highlight = false,
}) => {
  const colorStyles = {
    cyan: {
      border: 'border-cyan-500/30 hover:border-cyan-400/50',
      iconBg: 'bg-cyan-950/50 border-cyan-500/40 text-cyan-400',
      glow: 'shadow-[0_0_15px_-4px_rgba(0,240,255,0.15)]',
      valColor: 'text-cyan-200',
    },
    purple: {
      border: 'border-purple-500/30 hover:border-purple-400/50',
      iconBg: 'bg-purple-950/50 border-purple-500/40 text-purple-400',
      glow: 'shadow-[0_0_15px_-4px_rgba(168,85,247,0.15)]',
      valColor: 'text-purple-200',
    },
    amber: {
      border: 'border-amber-500/30 hover:border-amber-400/50',
      iconBg: 'bg-amber-950/50 border-amber-500/40 text-amber-400',
      glow: 'shadow-[0_0_15px_-4px_rgba(245,158,11,0.15)]',
      valColor: 'text-amber-200',
    },
    blue: {
      border: 'border-blue-500/30 hover:border-blue-400/50',
      iconBg: 'bg-blue-950/50 border-blue-500/40 text-blue-400',
      glow: 'shadow-[0_0_15px_-4px_rgba(59,130,246,0.15)]',
      valColor: 'text-blue-200',
    },
  };

  const current = colorStyles[color];

  return (
    <div
      className={`relative rounded-xl p-4 bg-[#080d1e]/85 backdrop-blur-md border ${current.border} ${current.glow} flex flex-col justify-between transition-all duration-200 ${
        highlight ? 'ring-1 ring-cyan-400/40' : ''
      } ${className}`}
    >
      {/* Corner bracket */}
      <span className="absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2 border-cyan-400/50 rounded-tl-sm pointer-events-none" />

      <div className="flex items-center justify-between mb-2">
        <span className="font-hud text-[10px] sm:text-xs font-semibold tracking-widest text-slate-400 uppercase">
          {label}
        </span>
        {icon && (
          <div className={`w-7 h-7 rounded-lg border flex items-center justify-center ${current.iconBg}`}>
            {icon}
          </div>
        )}
      </div>

      <div className="flex items-baseline gap-1.5">
        <span className={`font-display text-2xl sm:text-3xl font-bold tracking-tight text-white ${current.valColor}`}>
          {value}
        </span>
        {subvalue && (
          <span className="font-hud text-xs font-medium text-slate-400 tracking-wider">
            {subvalue}
          </span>
        )}
      </div>
    </div>
  );
};
