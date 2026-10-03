import React from 'react';
import { Sunrise, Moon, GraduationCap, Droplets, Calendar, ArrowRight, ShieldCheck } from 'lucide-react';
import { GlowButton } from '../components/GlowButton.tsx';
import { SystemHeader } from '../components/SystemHeader.tsx';
import { AppRoute } from '../types.ts';

interface RoutineSetupScreenProps {
  onNavigate: (route: AppRoute) => void;
}

export const RoutineSetupScreen: React.FC<RoutineSetupScreenProps> = ({ onNavigate }) => {
  const routineConfigs = [
    {
      title: 'Wake-up time',
      value: '5:00 AM',
      tag: 'DAWN QUEST',
      icon: Sunrise,
      color: 'cyan',
    },
    {
      title: 'Sleep time',
      value: '10:30 PM',
      tag: 'SYSTEM RECOVERY',
      icon: Moon,
      color: 'purple',
    },
    {
      title: 'College time',
      value: '9:00 AM – 4:00 PM',
      tag: 'INTELLECT GRIND',
      icon: GraduationCap,
      color: 'blue',
    },
    {
      title: 'Water target',
      value: '3.0 L',
      tag: 'HYDRATION STAT',
      icon: Droplets,
      color: 'cyan',
    },
    {
      title: 'Workout days',
      value: 'Monday – Saturday',
      tag: 'PHYSICAL CONDITIONING',
      icon: Calendar,
      color: 'purple',
    },
  ];

  return (
    <div className="relative min-h-screen flex flex-col justify-between pb-6 select-none">
      {/* Background glow elements */}
      <div className="absolute top-20 right-0 w-64 h-64 rounded-full bg-cyan-600/10 blur-[80px] pointer-events-none" />
      <div className="absolute bottom-20 left-0 w-64 h-64 rounded-full bg-purple-600/10 blur-[80px] pointer-events-none" />

      <div>
        {/* System Subscreen Header */}
        <SystemHeader
          variant="subscreen"
          title="SETUP YOUR ROUTINE"
          subtitle="INITIAL CONFIGURATION // PHASE 1"
          onNavigate={onNavigate}
          onBack={() => onNavigate('/onboarding')}
        />

        <div className="p-4">
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-cyan-950/30 border border-cyan-500/20 text-cyan-300 font-hud text-xs tracking-wider mb-4">
            <ShieldCheck className="w-4 h-4 text-cyan-400 shrink-0" />
            <span>Configure your core schedule parameters to calibrate system rewards.</span>
          </div>

          {/* Routine Setting Cards */}
          <div className="flex flex-col gap-3">
            {routineConfigs.map((cfg) => {
              const Icon = cfg.icon;
              const isPurple = cfg.color === 'purple';
              return (
                <div
                  key={cfg.title}
                  className={`group relative p-4 rounded-xl border backdrop-blur-md transition-all duration-200 ${
                    isPurple
                      ? 'bg-[#0c0e22]/85 border-purple-500/30 hover:border-purple-400/50 shadow-[0_0_15px_-4px_rgba(168,85,247,0.15)]'
                      : 'bg-[#080d1e]/85 border-cyan-500/30 hover:border-cyan-400/50 shadow-[0_0_15px_-4px_rgba(0,240,255,0.15)]'
                  }`}
                >
                  {/* Futuristic corner accent */}
                  <span
                    className={`absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2 rounded-tl-sm ${
                      isPurple ? 'border-purple-400' : 'border-cyan-400'
                    }`}
                  />

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-10 h-10 rounded-lg flex items-center justify-center border ${
                          isPurple
                            ? 'bg-purple-950/60 border-purple-500/50 text-purple-300'
                            : 'bg-cyan-950/60 border-cyan-500/50 text-cyan-300'
                        }`}
                      >
                        <Icon className="w-5 h-5 stroke-[2]" />
                      </div>

                      <div>
                        <span className="text-[10px] font-hud font-bold tracking-widest text-slate-400 uppercase">
                          {cfg.tag}
                        </span>
                        <h2 className="font-display text-xs sm:text-sm font-semibold text-slate-200">
                          {cfg.title}
                        </h2>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="font-hud font-bold text-base sm:text-lg text-white tracking-wider system-text-glow">
                        {cfg.value}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Bottom Save & Continue */}
      <div className="p-4 pt-2">
        <GlowButton
          id="btn-save-continue"
          fullWidth
          size="lg"
          variant="primary"
          onClick={() => onNavigate('/home')}
          icon={<ArrowRight className="w-5 h-5 stroke-[2.5]" />}
        >
          SAVE & CONTINUE
        </GlowButton>
      </div>
    </div>
  );
};
