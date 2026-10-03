import React from 'react';
import { ChevronRight, Dumbbell } from 'lucide-react';

interface WorkoutCardProps {
  category: string;
  exerciseCount: number;
  onClick: () => void;
  color?: 'cyan' | 'purple';
  icon?: React.ReactNode;
  id?: string;
  badge?: string;
}

export const WorkoutCard: React.FC<WorkoutCardProps> = ({
  category,
  exerciseCount,
  onClick,
  color = 'cyan',
  icon,
  id,
  badge,
}) => {
  const isPurple = color === 'purple';

  return (
    <div
      id={id}
      onClick={onClick}
      className={`group relative overflow-hidden rounded-2xl p-5 border cursor-pointer select-none transition-all duration-300 active:scale-[0.98] ${
        isPurple
          ? 'bg-gradient-to-br from-[#120e28]/90 via-[#0a0d1e]/90 to-[#070a16] border-purple-500/35 hover:border-purple-400/60 shadow-[0_0_20px_-4px_rgba(168,85,247,0.2)] hover:shadow-[0_0_28px_rgba(168,85,247,0.4)]'
          : 'bg-gradient-to-br from-[#0c1830]/90 via-[#0a0d1e]/90 to-[#070a16] border-cyan-500/35 hover:border-cyan-400/60 shadow-[0_0_20px_-4px_rgba(0,240,255,0.2)] hover:shadow-[0_0_28px_rgba(0,240,255,0.4)]'
      }`}
    >
      {/* Background atmospheric energy glow */}
      <div
        className={`absolute -right-8 -top-8 w-32 h-32 rounded-full blur-2xl pointer-events-none transition-opacity duration-300 ${
          isPurple ? 'bg-purple-600/15 group-hover:bg-purple-600/25' : 'bg-cyan-500/15 group-hover:bg-cyan-500/25'
        }`}
      />

      {/* Futuristic corner brackets */}
      <span
        className={`absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 rounded-tl-sm pointer-events-none ${
          isPurple ? 'border-purple-400' : 'border-cyan-400'
        }`}
      />
      <span
        className={`absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 rounded-br-sm pointer-events-none ${
          isPurple ? 'border-purple-400' : 'border-cyan-400'
        }`}
      />

      <div className="relative z-10 flex items-center justify-between">
        <div className="flex items-center gap-3.5">
          <div
            className={`w-12 h-12 rounded-xl flex items-center justify-center border transition-all duration-300 ${
              isPurple
                ? 'bg-purple-950/60 border-purple-500/50 text-purple-300 group-hover:shadow-[0_0_15px_rgba(168,85,247,0.5)]'
                : 'bg-cyan-950/60 border-cyan-500/50 text-cyan-300 group-hover:shadow-[0_0_15px_rgba(0,240,255,0.5)]'
            }`}
          >
            {icon || <Dumbbell className="w-6 h-6 stroke-[2]" />}
          </div>

          <div>
            {badge && (
              <span
                className={`inline-block text-[9px] font-hud font-bold tracking-widest uppercase px-1.5 py-0.5 rounded mb-1 ${
                  isPurple ? 'bg-purple-500/20 text-purple-300' : 'bg-cyan-500/20 text-cyan-300'
                }`}
              >
                {badge}
              </span>
            )}
            <h3 className="font-display text-xl font-bold text-white tracking-wider group-hover:text-cyan-200 transition-colors">
              {category}
            </h3>
            <p className="font-hud text-xs font-medium text-slate-400 tracking-wider">
              {exerciseCount} EXERCISES
            </p>
          </div>
        </div>

        <div
          className={`w-9 h-9 rounded-lg flex items-center justify-center border transition-all duration-200 ${
            isPurple
              ? 'border-purple-500/30 bg-purple-950/40 text-purple-300 group-hover:border-purple-400 group-hover:translate-x-0.5'
              : 'border-cyan-500/30 bg-cyan-950/40 text-cyan-300 group-hover:border-cyan-400 group-hover:translate-x-0.5'
          }`}
        >
          <ChevronRight className="w-5 h-5 stroke-[2.5]" />
        </div>
      </div>
    </div>
  );
};
