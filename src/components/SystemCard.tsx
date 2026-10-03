import React from 'react';

interface SystemCardProps {
  children: React.ReactNode;
  className?: string;
  glow?: 'blue' | 'purple' | 'subtle' | 'none';
  onClick?: () => void;
  clickable?: boolean;
  cornerAccents?: boolean;
  id?: string;
}

export const SystemCard: React.FC<SystemCardProps> = ({
  children,
  className = '',
  glow = 'subtle',
  onClick,
  clickable = false,
  cornerAccents = true,
  id,
}) => {
  const glowClasses = {
    blue: 'border-cyan-500/40 shadow-[0_0_20px_-3px_rgba(0,240,255,0.25)]',
    purple: 'border-purple-500/40 shadow-[0_0_20px_-3px_rgba(168,85,247,0.25)]',
    subtle: 'border-cyan-500/20 hover:border-cyan-500/35 shadow-[0_0_15px_-4px_rgba(0,240,255,0.12)]',
    none: 'border-slate-800/80',
  };

  return (
    <div
      id={id}
      onClick={onClick}
      className={`relative rounded-xl bg-[#090d1a]/85 backdrop-blur-md border ${glowClasses[glow]} p-4 transition-all duration-200 ${
        clickable || onClick ? 'cursor-pointer active:scale-[0.985] hover:bg-[#0e1428]/90' : ''
      } ${className}`}
    >
      {/* Futuristic Angular Corner Accent Brackets */}
      {cornerAccents && (
        <>
          <span className="absolute top-0 left-0 w-2.5 h-2.5 border-t-2 border-l-2 border-cyan-400/80 rounded-tl-sm pointer-events-none" />
          <span className="absolute bottom-0 right-0 w-2.5 h-2.5 border-b-2 border-r-2 border-purple-400/80 rounded-br-sm pointer-events-none" />
        </>
      )}

      {/* Top subtle HUD scanning indicator line */}
      <div className="absolute top-0 left-6 right-6 h-[1px] bg-gradient-to-r from-transparent via-cyan-500/20 to-transparent pointer-events-none" />

      {children}
    </div>
  );
};
