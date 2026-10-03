import React from 'react';

interface SystemLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'hero';
  showTagline?: boolean;
  className?: string;
  glow?: boolean;
}

export const SystemLogo: React.FC<SystemLogoProps> = ({
  size = 'md',
  showTagline = true,
  className = '',
  glow = true,
}) => {
  const symbolSizes = {
    sm: 'w-7 h-7',
    md: 'w-10 h-10',
    lg: 'w-16 h-16',
    hero: 'w-24 h-24',
  };

  const titleSizes = {
    sm: 'text-base tracking-wider',
    md: 'text-xl tracking-widest',
    lg: 'text-3xl tracking-[0.2em]',
    hero: 'text-4xl sm:text-5xl tracking-[0.25em]',
  };

  const taglineSizes = {
    sm: 'text-[9px] tracking-[0.25em]',
    md: 'text-[11px] tracking-[0.3em]',
    lg: 'text-xs tracking-[0.35em]',
    hero: 'text-xs sm:text-sm tracking-[0.4em]',
  };

  return (
    <div className={`flex flex-col items-center justify-center select-none ${className}`}>
      {/* Original Geometric System Crest */}
      <div className={`relative ${symbolSizes[size]} flex items-center justify-center mb-2`}>
        {/* Ambient Glow Aura */}
        {glow && (
          <div className="absolute inset-0 bg-gradient-to-tr from-cyan-500/25 via-blue-600/30 to-purple-600/30 blur-xl rounded-full scale-125" />
        )}

        {/* SVG System Symbol */}
        <svg
          viewBox="0 0 100 100"
          className="w-full h-full relative z-10 drop-shadow-[0_0_12px_rgba(0,240,255,0.7)]"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="qPulse" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#00f0ff" />
              <stop offset="50%" stopColor="#3b82f6" />
              <stop offset="100%" stopColor="#a855f7" />
            </linearGradient>
            <linearGradient id="coreGlow" x1="50%" y1="0%" x2="50%" y2="100%">
              <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.7" />
            </linearGradient>
          </defs>

          {/* Outer Rotating/System Bracket Polygon */}
          <polygon
            points="50,4 96,28 96,72 50,96 4,72 4,28"
            stroke="url(#qPulse)"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="opacity-90"
          />

          {/* Inner Inverted Diamond Frame */}
          <polygon
            points="50,16 84,50 50,84 16,50"
            stroke="#00f0ff"
            strokeWidth="1.75"
            strokeDasharray="4 3"
            className="opacity-75"
          />

          {/* Angular "Q" & System Blade Monogram */}
          <path
            d="M50 24L72 50L50 76L28 50L50 24Z"
            fill="rgba(5, 7, 14, 0.7)"
            stroke="url(#qPulse)"
            strokeWidth="2"
          />

          {/* Central Quest Core Spark */}
          <circle cx="50" cy="50" r="5" fill="#00f0ff" className="animate-pulse" />
          <line x1="50" y1="36" x2="50" y2="64" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" />
          <line x1="36" y1="50" x2="64" y2="50" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" />

          {/* Q Accent Strike tail */}
          <path
            d="M60 60L82 82"
            stroke="#00f0ff"
            strokeWidth="3.5"
            strokeLinecap="round"
          />
          <circle cx="82" cy="82" r="2.5" fill="#a855f7" />

          {/* Corner System Bracket Accents */}
          <path d="M46 6L54 6" stroke="#22d3ee" strokeWidth="2" />
          <path d="M46 94L54 94" stroke="#a855f7" strokeWidth="2" />
        </svg>
      </div>

      {/* Brand Name */}
      <div className="flex items-center gap-1 font-display font-bold text-white uppercase tracking-wider">
        <span className={`text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.4)] ${titleSizes[size]}`}>
          QUEST<span className="text-cyan-400 system-text-glow">LIFE</span>
        </span>
      </div>

      {/* System Subtitle / Tagline */}
      {showTagline && (
        <div className="flex items-center gap-2 mt-1">
          <div className="w-2.5 h-[1px] bg-gradient-to-r from-transparent to-cyan-400" />
          <span className={`font-hud font-semibold uppercase text-cyan-300/80 ${taglineSizes[size]}`}>
            DAILY LIFE = GAME
          </span>
          <div className="w-2.5 h-[1px] bg-gradient-to-l from-transparent to-purple-400" />
        </div>
      )}
    </div>
  );
};
