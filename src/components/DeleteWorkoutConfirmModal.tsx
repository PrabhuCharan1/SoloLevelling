import React from 'react';
import { AlertTriangle, X, Trash2 } from 'lucide-react';
import { CustomWorkout } from '../types.ts';

interface DeleteWorkoutConfirmModalProps {
  isOpen: boolean;
  workout: CustomWorkout | null;
  onConfirm: () => void;
  onCancel: () => void;
}

export const DeleteWorkoutConfirmModal: React.FC<DeleteWorkoutConfirmModalProps> = ({
  isOpen,
  workout,
  onConfirm,
  onCancel,
}) => {
  if (!isOpen || !workout) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-workout-title"
        className="relative w-full max-w-md rounded-2xl bg-[#080d1e] border-2 border-red-500/40 p-5 sm:p-6 shadow-[0_0_30px_rgba(239,68,68,0.25)] text-white space-y-4 animate-in fade-in zoom-in-95 duration-200"
      >
        {/* Corner Brackets */}
        <span className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-red-400 pointer-events-none" />
        <span className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-red-400 pointer-events-none" />
        <span className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-red-400 pointer-events-none" />
        <span className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-red-400 pointer-events-none" />

        <div className="flex items-center justify-between">
          <div className="w-10 h-10 rounded-xl bg-red-950/60 border border-red-500/50 flex items-center justify-center text-red-400">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="p-1 rounded text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div>
          <span className="font-hud text-[10px] font-extrabold tracking-widest text-red-400 uppercase">
            PROTOCOL TERMINATION
          </span>
          <h3 id="delete-workout-title" className="font-display text-lg font-black uppercase text-white mt-0.5">
            DELETE CUSTOM WORKOUT?
          </h3>
          <p className="font-hud text-xs text-slate-300 mt-2 leading-relaxed">
            Are you sure you want to permanently delete{' '}
            <strong className="text-white font-bold">"{workout.name}"</strong>?
          </p>
          <div className="mt-2 p-2.5 rounded-lg bg-red-950/30 border border-red-900/40 text-[11px] font-hud text-slate-400">
            ✓ Predefined QuestLife workout schedules and history remain unaffected.
          </div>
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-2">
          <button
            type="button"
            onClick={onCancel}
            className="py-2 px-4 rounded-xl border border-slate-700 bg-slate-900/60 text-slate-300 hover:text-white font-hud text-xs font-bold tracking-wider transition-colors cursor-pointer"
          >
            CANCEL
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="py-2 px-4 rounded-xl bg-gradient-to-r from-red-600 to-rose-700 text-white font-hud text-xs font-black tracking-widest uppercase shadow-[0_0_15px_rgba(239,68,68,0.4)] hover:shadow-[0_0_20px_rgba(239,68,68,0.6)] flex items-center gap-1.5 active:scale-[0.98] transition-all cursor-pointer"
          >
            <Trash2 className="w-4 h-4" />
            <span>DELETE WORKOUT</span>
          </button>
        </div>
      </div>
    </div>
  );
};
