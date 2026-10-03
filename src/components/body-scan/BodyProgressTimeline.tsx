import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Calendar,
  Columns2,
  Trash2,
  ChevronDown,
  Sparkles,
  ShieldCheck,
  AlertTriangle,
} from 'lucide-react';
import { BodyProgressScan } from '../../types.ts';

interface BodyProgressTimelineProps {
  scans: BodyProgressScan[];
  onViewComparison: (scan: BodyProgressScan) => void;
  onDeleteScan: (scanId: string) => void;
}

export const BodyProgressTimeline: React.FC<BodyProgressTimelineProps> = ({
  scans,
  onViewComparison,
  onDeleteScan,
}) => {
  const [scanToDelete, setScanToDelete] = useState<BodyProgressScan | null>(null);

  if (scans.length === 0) {
    return (
      <div className="p-8 rounded-2xl bg-[#080d1e] border border-cyan-950 text-center space-y-3">
        <p className="font-hud text-xs text-slate-400 tracking-wider uppercase">
          NO TIMELINE ENTRIES DETECTED
        </p>
        <p className="font-mono text-xs text-slate-500 max-w-xs mx-auto">
          Capture your baseline scan to begin tracking observable visual development.
        </p>
      </div>
    );
  }

  // Scans are ordered chronologically (baseline first, current last)
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
          <h3 className="font-hud text-xs font-bold text-cyan-300 tracking-widest uppercase">
            PROGRESS TIMELINE
          </h3>
        </div>
        <span className="font-mono text-[10px] text-slate-400">
          {scans.length} {scans.length === 1 ? 'RECORD' : 'RECORDS'} LOGGED
        </span>
      </div>

      {/* Timeline Node Chain */}
      <div className="relative space-y-4 pl-6 before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-gradient-to-b before:from-cyan-400 before:via-blue-500 before:to-purple-600">
        {scans.map((scan, idx) => {
          const isLatest = idx === scans.length - 1 && scans.length > 1;
          const isBaseline = scan.isBaseline || idx === 0;

          return (
            <div key={scan.id} className="relative group">
              {/* Timeline Connector Dot */}
              <div
                className={`absolute -left-6 top-5 -translate-x-1/2 w-4 h-4 rounded-full border-2 flex items-center justify-center transition-transform group-hover:scale-125 ${
                  isLatest
                    ? 'border-cyan-300 bg-cyan-500 shadow-[0_0_12px_#00f0ff]'
                    : isBaseline
                    ? 'border-blue-400 bg-blue-900 shadow-[0_0_8px_rgba(59,130,246,0.5)]'
                    : 'border-slate-600 bg-slate-900'
                }`}
              >
                <div className="w-1.5 h-1.5 rounded-full bg-white" />
              </div>

              {/* Scan Card */}
              <div className="p-3.5 rounded-xl bg-gradient-to-r from-[#080d1e] to-[#0a1128] border border-cyan-950 hover:border-cyan-500/40 transition-all duration-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-hud font-bold tracking-wider uppercase ${
                        isBaseline
                          ? 'bg-blue-950/80 border border-blue-500/50 text-blue-300'
                          : isLatest
                          ? 'bg-cyan-950/80 border border-cyan-400 text-cyan-200'
                          : 'bg-slate-900 border border-slate-700 text-slate-300'
                      }`}
                    >
                      {scan.label}
                    </span>
                    <span className="font-mono text-xs text-slate-400">
                      SCAN #{scan.scanNumber}
                    </span>
                  </div>

                  <div className="flex items-center gap-1 font-mono text-[10px] text-slate-400">
                    <Calendar className="w-3 h-3 text-cyan-400" />
                    <span>{new Date(scan.timestamp).toLocaleDateString()}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {/* Thumbnail */}
                  <div className="relative w-16 h-20 rounded-lg overflow-hidden bg-black border border-slate-800 shrink-0">
                    <img
                      src={scan.imageDataUrl}
                      alt={scan.label}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent pointer-events-none" />
                  </div>

                  {/* Info and Actions */}
                  <div className="flex-1 flex flex-col justify-between py-0.5 h-20">
                    <div>
                      <p className="font-hud text-xs font-bold text-white tracking-wide">
                        {isBaseline
                          ? 'INITIAL BASELINE PHOTO'
                          : `DEVELOPMENT SCAN // ${scan.label}`}
                      </p>
                      <p className="font-mono text-[10px] text-slate-400 mt-0.5">
                        {scan.comparisonWithPrevious?.overall === 'visible changes detected'
                          ? 'Changes detected vs previous'
                          : isBaseline
                          ? 'Reference standard'
                          : 'No clear visual changes vs previous'}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => onViewComparison(scan)}
                        className="py-1 px-3 rounded-lg bg-cyan-950/70 hover:bg-cyan-900/80 border border-cyan-500/40 text-cyan-300 font-hud text-[11px] font-bold tracking-wider uppercase transition-colors flex items-center gap-1.5 cursor-pointer"
                      >
                        <Columns2 className="w-3 h-3" />
                        VIEW COMPARISON
                      </button>

                      <button
                        type="button"
                        onClick={() => setScanToDelete(scan)}
                        className="p-1.5 rounded-lg bg-slate-900/60 hover:bg-red-950/50 border border-slate-800 hover:border-red-500/50 text-slate-500 hover:text-red-400 transition-colors cursor-pointer ml-auto"
                        title="Delete Scan"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Connecting arrow if not last */}
              {idx < scans.length - 1 && (
                <div className="flex justify-center -my-2 py-1 text-cyan-500/40">
                  <ChevronDown className="w-4 h-4" />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {scanToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm select-none">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-xs bg-[#080d1e] border border-red-500/50 rounded-2xl p-5 text-center shadow-[0_0_30px_rgba(239,68,68,0.3)] space-y-4"
            >
              <div className="w-12 h-12 rounded-full bg-red-950/60 border border-red-500/50 mx-auto flex items-center justify-center text-red-400">
                <AlertTriangle className="w-6 h-6" />
              </div>

              <div>
                <h4 className="font-hud text-sm font-bold text-white tracking-wider uppercase">
                  DELETE SCAN #{scanToDelete.scanNumber}?
                </h4>
                <p className="font-mono text-xs text-slate-400 mt-1">
                  This action will permanently delete this progress scan from your private storage.
                </p>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setScanToDelete(null)}
                  className="flex-1 py-2 px-3 rounded-xl bg-slate-900 border border-slate-700 text-slate-300 font-hud text-xs font-bold uppercase hover:bg-slate-800"
                >
                  CANCEL
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onDeleteScan(scanToDelete.id);
                    setScanToDelete(null);
                  }}
                  className="flex-1 py-2 px-3 rounded-xl bg-red-600 hover:bg-red-500 text-white font-hud text-xs font-bold uppercase shadow-[0_0_15px_rgba(239,68,68,0.4)]"
                >
                  CONFIRM
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
