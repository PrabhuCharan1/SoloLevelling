import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowLeft,
  Clock,
  Zap,
  Plus,
  Trash2,
  Edit2,
  RotateCcw,
  Sparkles,
  Shield,
  Layers,
} from 'lucide-react';
import { AppRoute, QuestCategory, RoutineItemConfig, TaskVerificationMethod } from '../types.ts';
import { useQuestSystem } from '../context/QuestContext.tsx';
import { TaskCreateModal } from '../components/TaskCreateModal.tsx';

interface RoutineEditorScreenProps {
  onNavigate: (route: AppRoute) => void;
  onBack: () => void;
}

const CATEGORY_COLORS: Record<QuestCategory, { badge: string; border: string; glow: string }> = {
  Morning: {
    badge: 'text-amber-300 bg-amber-950/40 border-amber-500/30',
    border: 'border-amber-500/20',
    glow: 'rgba(245, 158, 11, 0.1)',
  },
  College: {
    badge: 'text-blue-300 bg-blue-950/40 border-blue-500/30',
    border: 'border-blue-500/20',
    glow: 'rgba(59, 130, 246, 0.1)',
  },
  Evening: {
    badge: 'text-purple-300 bg-purple-950/40 border-purple-500/30',
    border: 'border-purple-500/20',
    glow: 'rgba(168, 85, 247, 0.1)',
  },
  Night: {
    badge: 'text-indigo-300 bg-indigo-950/40 border-indigo-500/30',
    border: 'border-indigo-500/20',
    glow: 'rgba(99, 102, 241, 0.1)',
  },
};

export const RoutineEditorScreen: React.FC<RoutineEditorScreenProps> = ({ onNavigate, onBack }) => {
  const {
    routineItems,
    updateRoutineItem,
    toggleRoutineItemEnabled,
    addCustomRoutineItem,
    deleteCustomRoutineItem,
    resetRoutineToDefaults,
  } = useQuestSystem();

  // Modals & form state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<RoutineItemConfig | null>(null);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setFeedbackMessage(msg);
    setTimeout(() => setFeedbackMessage(null), 2500);
  };

  const handleOpenAddModal = () => {
    setEditingItem(null);
    setIsModalOpen(true);
  };

  const handleStartEdit = (item: RoutineItemConfig) => {
    setEditingItem(item);
    setIsModalOpen(true);
  };

  const handleTaskSubmit = (taskData: {
    title: string;
    category?: QuestCategory;
    startTime: string;
    endTime?: string;
    xp: number;
    verificationMethod: TaskVerificationMethod;
    recurring?: boolean;
    daysOfWeek?: number[];
  }) => {
    if (editingItem) {
      updateRoutineItem(editingItem.id, taskData);
      showToast('Routine Protocol Updated');
      setEditingItem(null);
    } else {
      addCustomRoutineItem(taskData);
      showToast('New Protocol Registered in Daily Routine');
    }
    setIsModalOpen(false);
  };

  const handleConfirmRestoreDefault = () => {
    resetRoutineToDefaults();
    setIsResetConfirmOpen(false);
    showToast('Default System Routine Restored');
  };

  return (
    <div className="flex-1 flex flex-col pb-24 relative bg-[#05070e] text-slate-100">
      {/* Toast notification */}
      <AnimatePresence>
        {feedbackMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2 bg-cyan-950/90 border border-cyan-500/50 text-cyan-200 text-xs font-mono rounded shadow-[0_0_20px_rgba(6,182,212,0.4)] flex items-center gap-2"
          >
            <Sparkles className="w-3.5 h-3.5 text-cyan-400 animate-spin" />
            <span>{feedbackMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Screen Header */}
      <header className="sticky top-0 z-30 bg-[#05070e]/95 backdrop-blur-md border-b border-cyan-950/40 px-4 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            id="routine-back-btn"
            onClick={onBack}
            className="p-2 rounded-lg bg-slate-900/80 border border-slate-800 text-slate-400 hover:text-cyan-400 hover:border-cyan-500/40 transition-colors"
            title="Back to Settings"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
              <h1 className="text-sm font-black tracking-widest text-cyan-300 uppercase font-mono">
                ROUTINE PROTOCOLS
              </h1>
            </div>
            <p className="text-[10px] text-slate-500 font-mono tracking-wider">
              CONFIGURE DAILY MISSION SCHEDULE
            </p>
          </div>
        </div>

        <button
          id="add-protocol-btn"
          onClick={handleOpenAddModal}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-cyan-500/20 border border-cyan-500/50 hover:bg-cyan-500/30 text-cyan-300 text-xs font-mono font-bold tracking-wider transition-colors shadow-[0_0_12px_rgba(6,182,212,0.2)]"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>ADD</span>
        </button>
      </header>

      {/* Routine list content */}
      <div className="px-4 py-4 flex flex-col gap-3">
        <div className="p-3 rounded-lg bg-cyan-950/20 border border-cyan-900/30 text-xs text-slate-400 flex items-start gap-2.5">
          <Shield className="w-4 h-4 text-cyan-400 flex-shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            Customize your daily schedule. Disabled tasks are hidden from your active daily quests and do not affect completion percentages. Historical records are preserved.
          </p>
        </div>

        {/* List of routine items */}
        <div className="flex flex-col gap-2.5">
          {routineItems.map((item, idx) => {
            const catStyle = CATEGORY_COLORS[item.category] || CATEGORY_COLORS.Morning;
            const isEnabled = item.enabled !== false;

            return (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.15, delay: idx * 0.02 }}
                className={`relative rounded-xl border p-3.5 transition-all ${
                  isEnabled
                    ? 'bg-slate-900/70 border-slate-800/80 hover:border-slate-700 shadow-sm'
                    : 'bg-slate-950/40 border-slate-900 opacity-60'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className={`text-[9px] font-mono px-2 py-0.5 rounded border uppercase tracking-wider font-semibold ${catStyle.badge}`}
                      >
                        {item.category}
                      </span>
                      {item.isCustom && (
                        <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-purple-950/50 text-purple-300 border border-purple-500/30">
                          CUSTOM
                        </span>
                      )}
                    </div>

                    <h3
                      className={`text-sm font-semibold tracking-wide truncate ${
                        isEnabled ? 'text-slate-100' : 'text-slate-500 line-through'
                      }`}
                    >
                      {item.title}
                    </h3>

                    <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-400 font-mono">
                      <span className="flex items-center gap-1 text-cyan-400/80">
                        <Clock className="w-3 h-3 text-cyan-400" />
                        <span>{item.timeSpan || item.startTime}</span>
                      </span>
                      <span className="flex items-center gap-1 text-amber-400/80">
                        <Zap className="w-3 h-3 text-amber-400" />
                        <span>+{item.xp} XP</span>
                      </span>
                    </div>
                  </div>

                  {/* Actions right */}
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {/* Enable / Disable toggle */}
                    <button
                      id={`toggle-task-${item.id}`}
                      onClick={() => toggleRoutineItemEnabled(item.id)}
                      className={`w-10 h-6 rounded-full transition-colors relative flex items-center px-0.5 ${
                        isEnabled ? 'bg-cyan-500/30 border border-cyan-500/60' : 'bg-slate-800 border border-slate-700'
                      }`}
                      title={isEnabled ? 'Disable task' : 'Enable task'}
                    >
                      <motion.div
                        layout
                        className={`w-4 h-4 rounded-full ${
                          isEnabled
                            ? 'bg-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.8)] ml-4'
                            : 'bg-slate-500 ml-0.5'
                        }`}
                      />
                    </button>

                    {/* Edit button */}
                    <button
                      id={`edit-task-${item.id}`}
                      onClick={() => handleStartEdit(item)}
                      className="p-1.5 rounded-lg bg-slate-800/80 border border-slate-700 text-slate-400 hover:text-cyan-300 hover:border-cyan-500/40 transition-colors"
                      title="Edit Protocol"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>

                    {/* Delete button (custom tasks only) */}
                    {item.isCustom && (
                      <button
                        id={`delete-task-${item.id}`}
                        onClick={() => deleteCustomRoutineItem(item.id)}
                        className="p-1.5 rounded-lg bg-rose-950/30 border border-rose-900/40 text-rose-400 hover:bg-rose-900/40 hover:text-rose-200 transition-colors"
                        title="Delete Custom Task"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {routineItems.length === 0 && (
          <div className="p-8 text-center border border-cyan-500/30 rounded-xl bg-cyan-950/20 my-4">
            <Shield className="w-8 h-8 text-cyan-400 mx-auto mb-2 animate-pulse" />
            <h3 className="font-mono text-sm font-bold text-white uppercase tracking-wider mb-1">
              NO ROUTINE PROTOCOLS
            </h3>
            <p className="text-xs text-slate-400 font-mono mb-4">
              Your system routine is currently empty. Add custom quests to build your personal protocol.
            </p>
            <button
              onClick={handleOpenAddModal}
              className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-black font-mono text-xs font-bold uppercase rounded shadow-[0_0_15px_rgba(6,182,212,0.4)] cursor-pointer"
            >
              [ + ADD PROTOCOL ]
            </button>
          </div>
        )}

        {/* Restore Defaults button */}
        <div className="mt-4 pt-3 border-t border-slate-800/80 flex flex-col items-center">
          <button
            id="restore-defaults-btn"
            onClick={() => setIsResetConfirmOpen(true)}
            className="w-full py-2.5 px-4 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-amber-500/40 text-slate-400 hover:text-amber-300 text-xs font-mono tracking-wider flex items-center justify-center gap-2 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
            <span>RESTORE DEFAULT PROTOCOL SCHEDULE</span>
          </button>
        </div>
      </div>

      {/* Task Create / Edit Modal */}
      <TaskCreateModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingItem(null);
        }}
        onSubmit={handleTaskSubmit}
        initialData={editingItem}
      />

      {/* RESTORE DEFAULTS CONFIRMATION MODAL */}
      <AnimatePresence>
        {isResetConfirmOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-sm rounded-2xl bg-[#0d0d18] border border-amber-500/40 p-5 shadow-[0_0_40px_rgba(245,158,11,0.2)] flex flex-col gap-4 text-slate-100"
            >
              <div className="flex items-center gap-3 text-amber-400">
                <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30">
                  <RotateCcw className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold font-mono tracking-wider uppercase text-amber-300">
                    RESTORE DEFAULT ROUTINE?
                  </h3>
                  <p className="text-[11px] text-slate-400">System schedule reset confirmation</p>
                </div>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed">
                This will reset your routine back to the default Hunter protocol schedule (Wake Up 5:00 AM, Workout 5:10 AM, etc.). Any custom added tasks will be removed from future days.
              </p>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  onClick={() => setIsResetConfirmOpen(false)}
                  className="px-3.5 py-1.5 rounded-lg text-xs font-mono text-slate-400 hover:text-slate-200"
                >
                  CANCEL
                </button>
                <button
                  id="confirm-restore-btn"
                  onClick={handleConfirmRestoreDefault}
                  className="px-4 py-1.5 rounded-lg bg-amber-500 text-slate-950 text-xs font-mono font-bold tracking-wider hover:bg-amber-400 transition-colors shadow-[0_0_15px_rgba(245,158,11,0.4)]"
                >
                  CONFIRM RESTORE
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
