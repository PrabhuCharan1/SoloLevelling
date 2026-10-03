import React from 'react';

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  actionText?: string;
  onAction?: () => void;
  className?: string;
  color?: 'cyan' | 'purple';
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({
  title,
  subtitle,
  actionText,
  onAction,
  className = '',
  color = 'cyan',
}) => {
  const isPurple = color === 'purple';

  return (
    <div className={`flex items-center justify-between gap-2 mb-3.5 ${className}`}>
      <div className="flex items-center gap-2.5">
        {/* Futuristic HUD Icon Indicator */}
        <div className="flex flex-col gap-0.5">
          <div className={`w-1.5 h-3 rounded-sm ${isPurple ? 'bg-purple-400' : 'bg-cyan-400'}`} />
          <div className={`w-1.5 h-1.5 rounded-sm ${isPurple ? 'bg-purple-600' : 'bg-blue-600'}`} />
        </div>

        <div>
          <h2 className="font-display text-sm sm:text-base font-bold text-white tracking-widest uppercase flex items-center gap-2">
            {title}
            <span className="inline-block w-8 sm:w-16 h-[1px] bg-gradient-to-r from-cyan-400/60 to-transparent" />
          </h2>
          {subtitle && (
            <p className="font-hud text-[11px] font-medium text-slate-400 tracking-wider">
              {subtitle}
            </p>
          )}
        </div>
      </div>

      {actionText && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="font-hud text-xs font-semibold text-cyan-300 hover:text-cyan-200 tracking-wider uppercase transition-colors"
        >
          {actionText}
        </button>
      )}
    </div>
  );
};
