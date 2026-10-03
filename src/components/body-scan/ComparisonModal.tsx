import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Columns2,
  SlidersHorizontal,
  AlertCircle,
  CheckCircle2,
  MinusCircle,
  Eye,
  Shield,
  Calendar,
} from 'lucide-react';
import { BodyProgressScan, ScanComparisonResult } from '../../types.ts';

interface ComparisonModalProps {
  isOpen: boolean;
  onClose: () => void;
  previousScan: BodyProgressScan | null;
  currentScan: BodyProgressScan | null;
  comparisonResult?: ScanComparisonResult;
}

export const ComparisonModal: React.FC<ComparisonModalProps> = ({
  isOpen,
  onClose,
  previousScan,
  currentScan,
  comparisonResult,
}) => {
  const [viewMode, setViewMode] = useState<'side-by-side' | 'slider'>('side-by-side');
  const [sliderPos, setSliderPos] = useState<number>(50); // percentage for curtain slider

  if (!isOpen || !currentScan) return null;

  const prev = previousScan || currentScan;
  const result = comparisonResult || currentScan.comparisonWithPrevious;

  const renderStatusBadge = (status?: string) => {
    const isVisible = status === 'visible change';
    return (
      <div
        className={`px-2.5 py-1 rounded border flex items-center gap-1.5 font-hud text-xs font-bold uppercase tracking-wider ${
          isVisible
            ? 'bg-cyan-950/60 border-cyan-400 text-cyan-300 shadow-[0_0_10px_rgba(0,240,255,0.25)]'
            : 'bg-slate-900/60 border-slate-700 text-slate-400'
        }`}
      >
        {isVisible ? (
          <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />
        ) : (
          <MinusCircle className="w-3.5 h-3.5 text-slate-500" />
        )}
        <span>{isVisible ? 'Visible change detected' : 'No clear change detected'}</span>
      </div>
    );
  };

  const hasChanges = result?.overall === 'visible changes detected';
  const isUnreliable = result?.confidenceReliable === false;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/90 backdrop-blur-md select-none overflow-y-auto">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="relative w-full max-w-2xl bg-[#080d1e] border border-cyan-500/40 rounded-2xl overflow-hidden shadow-[0_0_40px_rgba(0,240,255,0.2)] my-auto"
      >
        {/* Futuristic Corner Brackets */}
        <span className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-cyan-400" />
        <span className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-cyan-400" />
        <span className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-cyan-400" />
        <span className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-cyan-400" />

        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-cyan-900/50 bg-[#050814]">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            <div>
              <p className="font-hud text-[10px] tracking-[0.25em] text-cyan-400 uppercase font-bold">
                SYSTEM // BIOMETRIC OBSERVATION
              </p>
              <h2 className="font-display text-lg sm:text-xl font-black text-white tracking-wider uppercase system-text-glow">
                BODY PROGRESS SCAN
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-900/80 border border-slate-700/60 text-slate-300 hover:text-white hover:border-cyan-500 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Main Content Area */}
        <div className="p-4 sm:p-6 space-y-6 max-h-[80vh] overflow-y-auto scrollbar-thin">
          {/* Photos Comparison Visualizer */}
          <div className="space-y-3">
            {/* View Mode Toggle Switcher */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-hud text-slate-400 uppercase">
                <Eye className="w-3.5 h-3.5 text-cyan-400" />
                <span>VISUAL COMPARISON (UNALTERED)</span>
              </div>

              <div className="flex items-center p-0.5 rounded-lg bg-[#050814] border border-cyan-950">
                <button
                  type="button"
                  onClick={() => setViewMode('side-by-side')}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-hud font-bold tracking-wider uppercase transition-all ${
                    viewMode === 'side-by-side'
                      ? 'bg-cyan-600 text-white shadow-[0_0_8px_rgba(0,240,255,0.4)]'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Columns2 className="w-3 h-3" />
                  SIDE BY SIDE
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('slider')}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-hud font-bold tracking-wider uppercase transition-all ${
                    viewMode === 'slider'
                      ? 'bg-cyan-600 text-white shadow-[0_0_8px_rgba(0,240,255,0.4)]'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <SlidersHorizontal className="w-3 h-3" />
                  SPLIT SLIDER
                </button>
              </div>
            </div>

            {/* Photo Comparison Display */}
            {viewMode === 'side-by-side' ? (
              <div className="grid grid-cols-2 gap-3">
                {/* Previous Photo Card */}
                <div className="flex flex-col rounded-xl overflow-hidden bg-[#050814] border border-slate-800">
                  <div className="p-2 border-b border-slate-800/80 bg-slate-950/60 flex items-center justify-between text-[10px] font-hud">
                    <span className="font-bold text-slate-400 uppercase tracking-wider">
                      PREVIOUS SCAN
                    </span>
                    <span className="text-cyan-400 font-mono">
                      {prev?.label || 'BASELINE'}
                    </span>
                  </div>
                  <div className="relative aspect-[3/4] bg-black flex items-center justify-center overflow-hidden">
                    <img
                      src={prev?.imageDataUrl}
                      alt="Previous progress scan"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute bottom-1.5 left-1.5 px-1.5 py-0.5 rounded bg-black/70 font-mono text-[9px] text-slate-300">
                      {new Date(prev?.timestamp || Date.now()).toLocaleDateString()}
                    </div>
                  </div>
                </div>

                {/* Current Photo Card */}
                <div className="flex flex-col rounded-xl overflow-hidden bg-[#050814] border border-cyan-500/40 shadow-[0_0_15px_rgba(0,240,255,0.15)]">
                  <div className="p-2 border-b border-cyan-950/80 bg-cyan-950/30 flex items-center justify-between text-[10px] font-hud">
                    <span className="font-bold text-cyan-300 uppercase tracking-wider">
                      CURRENT SCAN
                    </span>
                    <span className="text-cyan-400 font-mono">
                      {currentScan.label}
                    </span>
                  </div>
                  <div className="relative aspect-[3/4] bg-black flex items-center justify-center overflow-hidden">
                    <img
                      src={currentScan.imageDataUrl}
                      alt="Current progress scan"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute bottom-1.5 left-1.5 px-1.5 py-0.5 rounded bg-black/70 font-mono text-[9px] text-cyan-200">
                      {new Date(currentScan.timestamp).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* Interactive Split Slider Mode */
              <div className="space-y-2">
                <div className="relative aspect-[3/4] max-h-96 mx-auto rounded-xl overflow-hidden border border-cyan-500/40 bg-black select-none">
                  {/* Background: Current Scan */}
                  <img
                    src={currentScan.imageDataUrl}
                    alt="Current scan"
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                  <div className="absolute top-2 right-2 px-2 py-0.5 rounded bg-black/80 font-hud text-[10px] text-cyan-300 font-bold border border-cyan-500/40">
                    CURRENT ({currentScan.label})
                  </div>

                  {/* Foreground: Previous Scan (Clipped by slider position) */}
                  <div
                    className="absolute inset-0 overflow-hidden"
                    style={{ width: `${sliderPos}%` }}
                  >
                    <img
                      src={prev?.imageDataUrl}
                      alt="Previous scan"
                      className="absolute inset-0 w-full h-full object-cover max-w-none"
                      style={{ width: '100%', height: '100%' }}
                    />
                    <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-black/80 font-hud text-[10px] text-slate-300 font-bold border border-slate-700">
                      PREVIOUS ({prev?.label})
                    </div>
                  </div>

                  {/* Slider Divider Line */}
                  <div
                    className="absolute top-0 bottom-0 w-0.5 bg-cyan-400 shadow-[0_0_10px_#00f0ff] pointer-events-none"
                    style={{ left: `${sliderPos}%` }}
                  >
                    <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-cyan-500 text-black flex items-center justify-center font-bold text-xs shadow-md">
                      ↔
                    </div>
                  </div>
                </div>

                {/* Range Input for Slider */}
                <div className="flex items-center gap-3 px-2">
                  <span className="font-hud text-[10px] text-slate-400 uppercase">PREVIOUS</span>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={sliderPos}
                    onChange={(e) => setSliderPos(Number(e.target.value))}
                    className="flex-1 accent-cyan-400 cursor-pointer"
                  />
                  <span className="font-hud text-[10px] text-cyan-400 uppercase">CURRENT</span>
                </div>
              </div>
            )}
          </div>

          {/* SYSTEM OBSERVATION REPORT (Requirement Output) */}
          <div className="p-4 rounded-xl bg-[#050814] border border-cyan-500/30 space-y-4">
            <div className="flex items-center justify-between border-b border-cyan-900/40 pb-2">
              <span className="font-hud text-xs font-bold text-cyan-400 tracking-widest uppercase">
                SYSTEM // REGIONAL OBSERVATIONS
              </span>
              <span className="text-[10px] font-mono text-slate-400">
                STANDARDIZED NON-MEDICAL ANALYSIS
              </span>
            </div>

            {/* Unreliable notice if lighting or pose differed */}
            {isUnreliable ? (
              <div className="p-3 rounded-lg bg-amber-950/40 border border-amber-500/50 flex items-start gap-2.5 text-amber-200">
                <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-hud text-xs font-bold tracking-wider uppercase mb-1">
                    COMPARISON UNRELIABLE
                  </p>
                  <p className="text-xs font-mono text-amber-300/90 leading-relaxed">
                    {result?.unreliableReason ||
                      'System could not confidently determine visual changes because the photos differ in lighting/pose/position.'}
                  </p>
                </div>
              </div>
            ) : (
              /* Structured Regional Visual Status */
              <div className="space-y-3">
                <div className="flex items-center justify-between py-1.5 border-b border-slate-900">
                  <span className="font-hud text-xs font-bold text-slate-300 uppercase tracking-wider">
                    CHEST
                  </span>
                  {renderStatusBadge(result?.chest)}
                </div>

                <div className="flex items-center justify-between py-1.5 border-b border-slate-900">
                  <span className="font-hud text-xs font-bold text-slate-300 uppercase tracking-wider">
                    ARMS
                  </span>
                  {renderStatusBadge(result?.arms)}
                </div>

                <div className="flex items-center justify-between py-1.5 border-b border-slate-900">
                  <span className="font-hud text-xs font-bold text-slate-300 uppercase tracking-wider">
                    SHOULDERS
                  </span>
                  {renderStatusBadge(result?.shoulders)}
                </div>

                <div className="flex items-center justify-between py-1.5">
                  <span className="font-hud text-xs font-bold text-slate-300 uppercase tracking-wider">
                    ABDOMEN
                  </span>
                  {renderStatusBadge(result?.abdomen)}
                </div>
              </div>
            )}

            {/* Overall Progress Status Bar */}
            <div className="pt-3 border-t border-cyan-900/40">
              <div className="flex items-center justify-between">
                <span className="font-hud text-xs font-bold text-slate-400 uppercase tracking-widest">
                  PROGRESS STATUS
                </span>
                <span
                  className={`font-hud text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-lg ${
                    isUnreliable
                      ? 'bg-amber-950/60 border border-amber-500/50 text-amber-300'
                      : hasChanges
                      ? 'bg-cyan-950/60 border border-cyan-400 text-cyan-300 shadow-[0_0_12px_rgba(0,240,255,0.3)]'
                      : 'bg-slate-900 border border-slate-700 text-slate-400'
                  }`}
                >
                  {isUnreliable
                    ? 'INCONCLUSIVE'
                    : hasChanges
                    ? 'CHANGES DETECTED'
                    : 'NO CLEAR CHANGES DETECTED'}
                </span>
              </div>
            </div>
          </div>

          {/* Privacy & Scope Disclaimer */}
          <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800 text-[11px] font-mono text-slate-400 leading-relaxed flex items-start gap-2">
            <Shield className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
            <div>
              <span className="text-slate-300 font-bold">SYSTEM INTEGRITY:</span> Body Progress Scan is a personal visual timeline tool. It does not grade appearance, make medical assessments, or alter Hunter Rank or XP.
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-cyan-950 bg-[#050814] flex justify-end">
          <button
            onClick={onClose}
            className="w-full sm:w-auto py-2.5 px-6 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-hud text-xs font-bold tracking-widest uppercase transition-all shadow-[0_0_15px_rgba(0,240,255,0.3)] cursor-pointer"
          >
            DISMISS REPORT
          </button>
        </div>
      </motion.div>
    </div>
  );
};
