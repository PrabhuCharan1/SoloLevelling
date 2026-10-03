import React, { useState } from 'react';
import { Droplets, RotateCcw, Plus, CheckCircle2, AlertCircle, Sparkles, Trash2 } from 'lucide-react';
import { SystemHeader } from '../components/SystemHeader.tsx';
import { SystemCard } from '../components/SystemCard.tsx';
import { ProgressBar } from '../components/ProgressBar.tsx';
import { AppRoute } from '../types.ts';
import { useWaterSystem } from '../context/WaterContext.tsx';
import { useAudio } from '../hooks/useAudio.ts';

interface WaterScreenProps {
  onNavigate: (route: AppRoute) => void;
}

export const WaterScreen: React.FC<WaterScreenProps> = ({ onNavigate }) => {
  const {
    totalMl,
    targetMl,
    litersConsumed,
    litersTarget,
    progressPercent,
    actualPercent,
    isTargetReached,
    entries,
    lastEntry,
    addWater,
    undoLastEntry,
    removeEntry,
  } = useWaterSystem();

  const [customAmount, setCustomAmount] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const { playWaterAdd, playUiClick } = useAudio();

  // Handle Quick Add
  const handleQuickAdd = (ml: number) => {
    setErrorMessage(null);
    playWaterAdd();
    addWater(ml);
  };

  // Handle Custom Amount Submit
  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customAmount.trim()) {
      setErrorMessage('Please enter an amount in ML');
      return;
    }

    const parsed = Number(customAmount);
    if (isNaN(parsed) || parsed <= 0) {
      setErrorMessage('Please enter a valid positive number');
      return;
    }

    const result = addWater(parsed);
    if (result.success) {
      playWaterAdd();
      setCustomAmount('');
      setErrorMessage(null);
    } else {
      setErrorMessage(result.error || 'Invalid amount');
    }
  };

  return (
    <div className="relative min-h-screen pb-28 select-none">
      {/* Ambient background glow */}
      <div
        className={`absolute top-10 left-1/2 -translate-x-1/2 w-80 h-72 rounded-full blur-[100px] pointer-events-none transition-all duration-700 ${
          isTargetReached ? 'bg-cyan-500/25' : progressPercent > 0 ? 'bg-cyan-600/15' : 'bg-cyan-950/10'
        }`}
      />

      {/* Screen Header with Back Navigation to /home */}
      <SystemHeader
        variant="subscreen"
        title="WATER TRACKER"
        subtitle="DAILY HYDRATION QUEST"
        onNavigate={onNavigate}
        onBack={() => onNavigate('/home')}
      />

      <div className="p-4 space-y-4">
        {/* Main Hydration HUD Display */}
        <SystemCard
          id="water-main-display"
          glow={isTargetReached ? 'cyan' : progressPercent > 0 ? 'subtle' : 'none'}
          className={`p-5 transition-all duration-300 relative overflow-hidden ${
            isTargetReached
              ? 'bg-gradient-to-b from-[#091d33]/90 to-[#07111e]/90 border-cyan-400/70 shadow-[0_0_25px_rgba(0,240,255,0.25)]'
              : 'bg-[#080d1e]/90 border-cyan-500/30'
          }`}
        >
          {/* Target Complete Banner */}
          {isTargetReached && (
            <div
              id="water-quest-complete-banner"
              className="mb-4 py-2 px-3 rounded-lg bg-cyan-950/80 border border-cyan-400/60 flex items-center justify-between shadow-[0_0_15px_rgba(0,240,255,0.3)] animate-pulse"
            >
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-cyan-300" />
                <span className="font-hud text-xs font-extrabold text-cyan-200 tracking-widest uppercase">
                  ✓ DAILY WATER QUEST COMPLETE
                </span>
              </div>
              <span className="font-hud text-[11px] font-bold text-cyan-300 border border-cyan-400/40 px-2 py-0.5 rounded bg-cyan-900/60">
                +50 XP
              </span>
            </div>
          )}

          {/* Vitals Display */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div
                className={`w-9 h-9 rounded-lg border flex items-center justify-center transition-all ${
                  isTargetReached
                    ? 'bg-cyan-950/80 border-cyan-300 text-cyan-300 shadow-[0_0_12px_rgba(0,240,255,0.6)]'
                    : 'bg-cyan-950/50 border-cyan-500/40 text-cyan-400'
                }`}
              >
                <Droplets className="w-5 h-5" />
              </div>
              <div>
                <span className="font-hud text-[10px] font-bold tracking-widest text-slate-400 uppercase block">
                  DAILY HYDRATION
                </span>
                <div className="flex items-baseline gap-1.5">
                  <span
                    id="water-current-liters"
                    className="font-display text-3xl font-extrabold text-white tracking-tight system-text-glow"
                  >
                    {litersConsumed} L
                  </span>
                  <span className="font-display text-base font-semibold text-slate-400">
                    / {litersTarget} L
                  </span>
                </div>
              </div>
            </div>

            {/* Percentage Display */}
            <div className="text-right">
              <span
                id="water-percent-display"
                className={`font-display text-2xl font-black tracking-tight ${
                  isTargetReached ? 'text-cyan-300 system-text-glow' : 'text-slate-200'
                }`}
              >
                {actualPercent}%
              </span>
              <span className="font-hud text-[10px] font-semibold text-slate-400 block tracking-wider uppercase">
                {isTargetReached ? 'TARGET MET' : `${targetMl - totalMl} ML REMAINING`}
              </span>
            </div>
          </div>

          {/* Futuristic Glowing Progress Bar (capped at 100% for visualization) */}
          <div className="mt-4 pt-1">
            <ProgressBar
              progress={progressPercent}
              size="md"
              glowColor="cyan"
            />
          </div>
        </SystemCard>

        {/* Quick Add Buttons Grid (Requirement 2) */}
        <div>
          <div className="flex items-center justify-between mb-2 px-1">
            <span className="font-hud text-[11px] font-bold text-slate-300 tracking-wider uppercase">
              QUICK ADD
            </span>
            <span className="font-hud text-[10px] text-slate-500 tracking-wider">
              ONE-TOUCH HYDRATION
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            {/* +250 ML */}
            <button
              type="button"
              id="quick-add-250"
              onClick={() => handleQuickAdd(250)}
              className="py-3.5 px-4 rounded-xl bg-[#080d1e]/90 hover:bg-[#0c132a] border border-cyan-500/30 hover:border-cyan-400 text-left transition-all active:scale-[0.98] cursor-pointer group shadow-[0_2px_8px_rgba(0,0,0,0.4)]"
            >
              <div className="flex items-center justify-between">
                <span className="font-display text-base font-bold text-white group-hover:text-cyan-300 tracking-wide">
                  +250 ML
                </span>
                <div className="w-6 h-6 rounded-md bg-cyan-950/60 border border-cyan-500/30 flex items-center justify-center text-cyan-400 group-hover:border-cyan-400">
                  <Plus className="w-3.5 h-3.5" />
                </div>
              </div>
              <span className="font-hud text-[10px] text-slate-400 block mt-0.5">
                Glass of water
              </span>
            </button>

            {/* +500 ML */}
            <button
              type="button"
              id="quick-add-500"
              onClick={() => handleQuickAdd(500)}
              className="py-3.5 px-4 rounded-xl bg-[#080d1e]/90 hover:bg-[#0c132a] border border-cyan-500/30 hover:border-cyan-400 text-left transition-all active:scale-[0.98] cursor-pointer group shadow-[0_2px_8px_rgba(0,0,0,0.4)]"
            >
              <div className="flex items-center justify-between">
                <span className="font-display text-base font-bold text-white group-hover:text-cyan-300 tracking-wide">
                  +500 ML
                </span>
                <div className="w-6 h-6 rounded-md bg-cyan-950/60 border border-cyan-500/30 flex items-center justify-center text-cyan-400 group-hover:border-cyan-400">
                  <Plus className="w-3.5 h-3.5" />
                </div>
              </div>
              <span className="font-hud text-[10px] text-slate-400 block mt-0.5">
                Standard bottle
              </span>
            </button>

            {/* +750 ML */}
            <button
              type="button"
              id="quick-add-750"
              onClick={() => handleQuickAdd(750)}
              className="py-3.5 px-4 rounded-xl bg-[#080d1e]/90 hover:bg-[#0c132a] border border-cyan-500/30 hover:border-cyan-400 text-left transition-all active:scale-[0.98] cursor-pointer group shadow-[0_2px_8px_rgba(0,0,0,0.4)]"
            >
              <div className="flex items-center justify-between">
                <span className="font-display text-base font-bold text-white group-hover:text-cyan-300 tracking-wide">
                  +750 ML
                </span>
                <div className="w-6 h-6 rounded-md bg-cyan-950/60 border border-cyan-500/30 flex items-center justify-center text-cyan-400 group-hover:border-cyan-400">
                  <Plus className="w-3.5 h-3.5" />
                </div>
              </div>
              <span className="font-hud text-[10px] text-slate-400 block mt-0.5">
                Sport tumbler
              </span>
            </button>

            {/* +1 L */}
            <button
              type="button"
              id="quick-add-1000"
              onClick={() => handleQuickAdd(1000)}
              className="py-3.5 px-4 rounded-xl bg-[#080d1e]/90 hover:bg-[#0c132a] border border-cyan-500/30 hover:border-cyan-400 text-left transition-all active:scale-[0.98] cursor-pointer group shadow-[0_2px_8px_rgba(0,0,0,0.4)]"
            >
              <div className="flex items-center justify-between">
                <span className="font-display text-base font-bold text-white group-hover:text-cyan-300 tracking-wide">
                  +1 L
                </span>
                <div className="w-6 h-6 rounded-md bg-cyan-950/60 border border-cyan-500/30 flex items-center justify-center text-cyan-400 group-hover:border-cyan-400">
                  <Plus className="w-3.5 h-3.5" />
                </div>
              </div>
              <span className="font-hud text-[10px] text-slate-400 block mt-0.5">
                Large canister
              </span>
            </button>
          </div>
        </div>

        {/* Custom Amount Form (Requirement 3 & 12) */}
        <div className="p-4 rounded-xl bg-[#080d1e]/90 border border-cyan-500/30 space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-hud text-[11px] font-bold text-slate-300 tracking-wider uppercase">
              CUSTOM AMOUNT
            </span>
            <span className="font-hud text-[10px] text-slate-400 tracking-wider">
              ENTER IN MILLILITERS
            </span>
          </div>

          <form onSubmit={handleCustomSubmit} className="space-y-2">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type="number"
                  id="custom-water-input"
                  value={customAmount}
                  onChange={(e) => {
                    setCustomAmount(e.target.value);
                    if (errorMessage) setErrorMessage(null);
                  }}
                  placeholder="350"
                  min="1"
                  step="10"
                  className="w-full bg-[#05070e] border border-slate-700 focus:border-cyan-400 rounded-lg px-3.5 py-2.5 font-hud text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-cyan-400/50"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 font-hud text-xs font-bold text-slate-500 pointer-events-none">
                  ML
                </span>
              </div>

              <button
                type="submit"
                id="custom-water-submit-btn"
                className="px-4 py-2.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 active:bg-cyan-700 text-white font-hud text-xs font-bold tracking-wider uppercase transition-all shadow-[0_0_12px_rgba(0,240,255,0.3)] cursor-pointer shrink-0 active:scale-95"
              >
                ADD WATER
              </button>
            </div>

            {/* Validation Message */}
            {errorMessage && (
              <div
                id="custom-water-error"
                className="flex items-center gap-1.5 text-rose-400 font-hud text-[11px] pt-1"
              >
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}
          </form>
        </div>

        {/* Undo Latest Entry (Requirement 5) */}
        {lastEntry && (
          <div
            id="undo-section"
            className="p-3.5 rounded-xl bg-[#090e21]/90 border border-slate-700/60 flex items-center justify-between"
          >
            <div>
              <span className="font-hud text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                LAST ENTRY
              </span>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="font-display text-base font-bold text-cyan-300">
                  +{lastEntry.amountMl} ML
                </span>
                <span className="font-hud text-[10px] text-slate-500">
                  at {lastEntry.timeFormatted}
                </span>
              </div>
            </div>

            <button
              type="button"
              id="undo-last-entry-btn"
              onClick={() => {
                playUiClick();
                undoLastEntry();
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900/90 border border-slate-700 hover:border-cyan-400 text-slate-300 hover:text-cyan-300 font-hud text-xs font-bold transition-all cursor-pointer active:scale-95"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>UNDO</span>
            </button>
          </div>
        )}

        {/* Today's Water Log (Requirement 6) */}
        <div className="p-4 rounded-xl bg-[#080d1e]/90 border border-cyan-500/30 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="font-hud text-xs font-bold text-slate-300 tracking-wider uppercase">
              TODAY'S LOG
            </span>
            <span className="font-hud text-[10px] text-slate-400 tracking-wider">
              {entries.length} {entries.length === 1 ? 'RECORD' : 'RECORDS'}
            </span>
          </div>

          {entries.length === 0 ? (
            <div className="py-6 text-center space-y-1">
              <Droplets className="w-6 h-6 text-slate-600 mx-auto" />
              <p className="font-hud text-xs text-slate-500 tracking-wider uppercase">
                NO HYDRATION LOGGED TODAY
              </p>
              <p className="font-sans text-[11px] text-slate-600">
                Drink water and tap any quick-add button above to initiate tracking.
              </p>
            </div>
          ) : (
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {entries.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center justify-between py-2 px-3 rounded-lg bg-[#05070e] border border-slate-800/80 hover:border-cyan-500/40 transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_6px_rgba(0,240,255,0.8)]" />
                    <span className="font-hud text-xs font-semibold text-slate-400 tracking-wider">
                      {entry.timeFormatted}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="font-display text-sm font-bold text-cyan-300 tracking-wide">
                      +{entry.amountMl} ML
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        playUiClick();
                        removeEntry(entry.id);
                      }}
                      title="Remove entry"
                      className="text-slate-600 hover:text-rose-400 p-1 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
