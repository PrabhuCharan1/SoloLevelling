import React from 'react';
import { CheckSquare, HeartPulse, Dumbbell, Sparkles, Award, ArrowRight } from 'lucide-react';
import { SystemLogo } from '../components/SystemLogo.tsx';
import { GlowButton } from '../components/GlowButton.tsx';
import { AppRoute } from '../types.ts';

interface OnboardingScreenProps {
  onNavigate: (route: AppRoute) => void;
}

export const OnboardingScreen: React.FC<OnboardingScreenProps> = ({ onNavigate }) => {
  const features = [
    {
      title: 'Track your daily quests',
      desc: 'Turn routines into quantifiable daily objectives',
      icon: CheckSquare,
      color: 'cyan',
    },
    {
      title: 'Build healthy routines',
      desc: 'Lock in sleep, hydration, and academic focus',
      icon: HeartPulse,
      color: 'purple',
    },
    {
      title: 'Complete workouts',
      desc: 'Targeted muscle splits with sets and reps',
      icon: Dumbbell,
      color: 'blue',
    },
    {
      title: 'Learn and grow',
      desc: 'Level up your real-world skills and freelance projects',
      icon: Sparkles,
      color: 'purple',
    },
    {
      title: 'Earn XP and rewards',
      desc: 'Watch your hunter stats and streak climb',
      icon: Award,
      color: 'cyan',
    },
  ];

  return (
    <div className="relative min-h-screen flex flex-col justify-between py-6 px-4 select-none">
      {/* Background gradients */}
      <div className="absolute top-12 left-1/2 -translate-x-1/2 w-72 h-72 rounded-full bg-cyan-600/15 blur-[90px] pointer-events-none" />
      <div className="absolute bottom-16 right-0 w-64 h-64 rounded-full bg-purple-600/15 blur-[80px] pointer-events-none" />

      {/* Top Brand & Header */}
      <div className="relative z-10 pt-2 pb-4 text-center">
        <SystemLogo size="md" showTagline={false} className="mb-3" />

        <div className="inline-block px-3 py-1 mb-2 rounded border border-cyan-500/30 bg-cyan-950/40 text-[10px] font-hud tracking-[0.2em] text-cyan-300 uppercase">
          SYSTEM AWAKENING PROTOCOL
        </div>

        <h1 className="font-display text-2xl sm:text-3xl font-black text-white tracking-widest uppercase system-text-glow">
          WELCOME TO QUESTLIFE
        </h1>
        <p className="font-hud text-sm font-medium text-cyan-200/80 mt-1 tracking-wider">
          Turn your daily routine into a game.
        </p>
      </div>

      {/* Feature Cards Stack */}
      <div className="relative z-10 flex flex-col gap-2.5 my-3">
        {features.map((feat, idx) => {
          const Icon = feat.icon;
          const isPurple = feat.color === 'purple';
          return (
            <div
              key={feat.title}
              className={`relative flex items-center gap-3.5 p-3.5 rounded-xl border backdrop-blur-md transition-all duration-200 ${
                isPurple
                  ? 'bg-[#0d0f22]/85 border-purple-500/30 shadow-[0_0_15px_-4px_rgba(168,85,247,0.18)]'
                  : 'bg-[#080d1e]/85 border-cyan-500/30 shadow-[0_0_15px_-4px_rgba(0,240,255,0.18)]'
              }`}
            >
              {/* Corner tick */}
              <span
                className={`absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2 rounded-tl-sm ${
                  isPurple ? 'border-purple-400/70' : 'border-cyan-400/70'
                }`}
              />

              {/* Icon */}
              <div
                className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 border ${
                  isPurple
                    ? 'bg-purple-950/60 border-purple-500/50 text-purple-300'
                    : 'bg-cyan-950/60 border-cyan-500/50 text-cyan-300'
                }`}
              >
                <Icon className="w-5 h-5 stroke-[2.2]" />
              </div>

              {/* Info */}
              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-hud font-bold text-slate-400">
                    0{idx + 1}
                  </span>
                  <h2 className="font-display text-sm font-bold text-white tracking-wide truncate">
                    {feat.title}
                  </h2>
                </div>
                <p className="font-hud text-xs text-slate-400 tracking-wider">
                  {feat.desc}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Bottom CTA */}
      <div className="relative z-10 pt-4 pb-2 flex flex-col gap-3">
        <GlowButton
          id="btn-get-started"
          fullWidth
          size="lg"
          variant="primary"
          onClick={() => onNavigate('/signup')}
          icon={<ArrowRight className="w-5 h-5 stroke-[2.5]" />}
        >
          GET STARTED
        </GlowButton>

        <div className="flex items-center justify-center gap-1.5 text-xs font-mono">
          <span className="text-slate-400">Already a Hunter?</span>
          <button
            type="button"
            id="onboarding-login-btn"
            onClick={() => onNavigate('/login')}
            className="text-cyan-400 hover:text-cyan-300 font-bold uppercase tracking-wider underline cursor-pointer"
          >
            LOG IN
          </button>
        </div>
      </div>
    </div>
  );
};
