import React from 'react';

interface GlowButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'purple' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  className?: string;
  disabled?: boolean;
  icon?: React.ReactNode;
  id?: string;
}

export const GlowButton: React.FC<GlowButtonProps> = ({
  children,
  onClick,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  className = '',
  disabled = false,
  icon,
  id,
}) => {
  const sizeClasses = {
    sm: 'py-2 px-4 text-xs tracking-wider',
    md: 'py-3.5 px-6 text-sm tracking-widest',
    lg: 'py-4 px-8 text-base tracking-[0.18em]',
  };

  const variantClasses = {
    primary:
      'bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 text-white font-display font-bold shadow-[0_0_20px_rgba(0,240,255,0.4)] hover:shadow-[0_0_28px_rgba(0,240,255,0.65)] hover:from-cyan-400 hover:via-blue-500 hover:to-indigo-500 border border-cyan-300/50',
    secondary:
      'bg-[#0b1022]/90 hover:bg-[#121936] text-cyan-300 font-display font-semibold border border-cyan-500/40 shadow-[0_0_15px_rgba(0,240,255,0.15)] hover:border-cyan-400',
    purple:
      'bg-gradient-to-r from-purple-600 via-violet-600 to-indigo-700 text-white font-display font-bold shadow-[0_0_20px_rgba(168,85,247,0.4)] hover:shadow-[0_0_28px_rgba(168,85,247,0.65)] border border-purple-400/50',
    danger:
      'bg-gradient-to-r from-rose-600 to-red-700 text-white font-display font-bold shadow-[0_0_20px_rgba(244,63,94,0.3)] border border-rose-400/40',
  };

  return (
    <button
      id={id}
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`relative inline-flex items-center justify-center gap-2.5 rounded-xl uppercase transition-all duration-200 active:scale-[0.97] cursor-pointer disabled:opacity-50 disabled:pointer-events-none ${
        sizeClasses[size]
      } ${variantClasses[variant]} ${fullWidth ? 'w-full' : ''} ${className}`}
    >
      {/* Corner cut accent lines */}
      <span className="absolute top-1 left-1.5 w-1.5 h-1.5 border-t border-l border-white/60 pointer-events-none" />
      <span className="absolute bottom-1 right-1.5 w-1.5 h-1.5 border-b border-r border-white/60 pointer-events-none" />

      {icon && <span className="shrink-0">{icon}</span>}
      <span className="relative z-10">{children}</span>
    </button>
  );
};
