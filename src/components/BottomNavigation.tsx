import React from 'react';
import { Home, CheckSquare, Dumbbell, BarChart3 } from 'lucide-react';
import { AppRoute } from '../types.ts';
import { audioManager } from '../utils/audioManager.ts';

interface BottomNavigationProps {
  currentRoute: AppRoute;
  onNavigate: (route: AppRoute) => void;
}

export const BottomNavigation: React.FC<BottomNavigationProps> = ({
  currentRoute,
  onNavigate,
}) => {
  const navItems: Array<{
    label: string;
    route: AppRoute;
    icon: React.ComponentType<{ className?: string }>;
  }> = [
    { label: 'HOME', route: '/home', icon: Home },
    { label: 'QUESTS', route: '/quests', icon: CheckSquare },
    { label: 'WORKOUT', route: '/workout', icon: Dumbbell },
    { label: 'STATS', route: '/stats', icon: BarChart3 },
  ];

  return (
    <nav
      id="main-bottom-navigation"
      aria-label="Main Navigation"
      className="fixed bottom-0 left-0 right-0 z-40 max-w-md mx-auto px-3 py-2 pb-safe bg-[#060914]/92 backdrop-blur-xl border-t border-cyan-500/25 shadow-[0_-8px_25px_rgba(0,0,0,0.8)]"
    >
      <div className="grid grid-cols-4 gap-1 items-center justify-between">
        {navItems.map((item) => {
          const isActive =
            currentRoute === item.route ||
            (item.route === '/workout' && currentRoute.startsWith('/workout')) ||
            (item.route === '/stats' && currentRoute === '/history');
          const Icon = item.icon;

          return (
            <button
              key={item.route}
              type="button"
              onClick={() => {
                if (currentRoute !== item.route) {
                  audioManager.playTabSwitch();
                } else {
                  audioManager.playUiClick();
                }
                onNavigate(item.route);
              }}
              className={`group relative flex flex-col items-center justify-center py-1.5 px-2 rounded-xl transition-all duration-200 cursor-pointer select-none ${
                isActive
                  ? 'text-cyan-300'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/30'
              }`}
            >
              {/* Active top glow indicator pill */}
              {isActive && (
                <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-8 h-[2.5px] bg-cyan-400 rounded-full shadow-[0_0_10px_#00f0ff]" />
              )}

              {/* Icon with glowing background on active */}
              <div
                className={`relative w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200 ${
                  isActive
                    ? 'bg-cyan-950/60 border border-cyan-400/50 shadow-[0_0_12px_rgba(0,240,255,0.4)] scale-105'
                    : 'group-hover:scale-105'
                }`}
              >
                <Icon className={`w-4 h-4 stroke-[2.2] ${isActive ? 'text-cyan-300' : 'text-slate-400'}`} />
              </div>

              <span
                className={`text-[10px] font-hud font-bold tracking-widest mt-1 transition-colors uppercase ${
                  isActive ? 'text-cyan-300 system-text-glow' : 'text-slate-400 group-hover:text-slate-200'
                }`}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
