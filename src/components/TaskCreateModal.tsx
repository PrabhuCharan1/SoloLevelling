import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Sparkles, Clock, CheckCircle2, Camera, Calendar, Shield } from 'lucide-react';
import { QuestCategory, TaskVerificationMethod, RoutineItemConfig } from '../types.ts';
import { SUGGESTED_QUEST_TEMPLATES } from '../data/defaultRoutine.ts';

interface TaskCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (task: {
    title: string;
    category?: QuestCategory;
    startTime?: string;
    endTime?: string;
    duration?: string;
    xp: number;
    verificationMethod: TaskVerificationMethod;
    recurring?: boolean;
    daysOfWeek?: number[];
  }) => void;
  initialData?: RoutineItemConfig | null;
}

const XP_PRESETS = [10, 25, 50, 75, 100];
const WEEKDAYS = [
  { label: 'Sun', value: 0 },
  { label: 'Mon', value: 1 },
  { label: 'Tue', value: 2 },
  { label: 'Wed', value: 3 },
  { label: 'Thu', value: 4 },
  { label: 'Fri', value: 5 },
  { label: 'Sat', value: 6 },
];

export const TaskCreateModal: React.FC<TaskCreateModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialData,
}) => {
  const [title, setTitle] = useState('');
  const [startTime, setStartTime] = useState('');
  const [duration, setDuration] = useState('');
  const [xp, setXp] = useState<number>(25);
  const [customXp, setCustomXp] = useState<string>('');
  const [scheduleMode, setScheduleMode] = useState<'daily' | 'weekdays'>('daily');
  const [selectedDays, setSelectedDays] = useState<number[]>([]);
  const [verificationMethod, setVerificationMethod] = useState<TaskVerificationMethod>('MANUAL + CAPTURE');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialData) {
      setTitle(initialData.title);
      setStartTime(initialData.startTime || '');
      setDuration(initialData.duration || '');
      setXp(Math.min(100, Math.max(1, initialData.xp || 25)));
      if (!XP_PRESETS.includes(initialData.xp)) {
        setCustomXp(String(initialData.xp));
      } else {
        setCustomXp('');
      }
      setVerificationMethod(initialData.verificationMethod || 'MANUAL + CAPTURE');
      if (initialData.daysOfWeek && initialData.daysOfWeek.length > 0) {
        setScheduleMode('weekdays');
        setSelectedDays(initialData.daysOfWeek);
      } else {
        setScheduleMode('daily');
        setSelectedDays([]);
      }
    } else {
      setTitle('');
      setStartTime('');
      setDuration('');
      setXp(25);
      setCustomXp('');
      setScheduleMode('daily');
      setSelectedDays([]);
      setVerificationMethod('MANUAL + CAPTURE');
    }
    setError(null);
  }, [initialData, isOpen]);

  const toggleDay = (day: number) => {
    setSelectedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort()
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanTitle = title.trim();
    if (!cleanTitle) {
      setError('Task name is required.');
      return;
    }

    let finalXp = xp;
    if (customXp) {
      const parsed = parseInt(customXp, 10);
      if (isNaN(parsed) || parsed <= 0) {
        setError('XP reward must be at least 1 XP.');
        return;
      }
      if (parsed > 100) {
        setError('Maximum XP reward is 100 XP.');
        return;
      }
      finalXp = parsed;
    } else {
      finalXp = Math.min(100, Math.max(1, finalXp));
    }

    if (scheduleMode === 'weekdays' && selectedDays.length === 0) {
      setError('Please select at least one weekday or choose Daily.');
      return;
    }

    onSubmit({
      title: cleanTitle,
      startTime: startTime.trim() || undefined,
      duration: duration.trim() || undefined,
      xp: finalXp,
      verificationMethod,
      recurring: true,
      daysOfWeek: scheduleMode === 'weekdays' && selectedDays.length > 0 ? selectedDays : undefined,
    });
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          id="task-create-modal-backdrop"
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm overflow-y-auto"
        >
          <motion.div
            id="task-create-modal-card"
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            className="w-full max-w-lg bg-[#0a0f1d] border border-cyan-500/40 rounded-xl p-5 sm:p-6 shadow-[0_0_50px_rgba(6,182,212,0.2)] my-auto relative text-left"
          >
            {/* Top Glow Bar */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent" />

            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-cyan-400" />
                <h2
                  id="task-modal-title"
                  className="text-lg font-black tracking-wider text-white uppercase font-mono"
                >
                  {initialData ? 'EDIT TASK' : 'ADD TASK'}
                </h2>
              </div>
              <button
                id="btn-close-task-modal"
                onClick={onClose}
                className="text-gray-400 hover:text-white p-1 rounded hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Task Name (Required) */}
              <div>
                <label
                  htmlFor="input-task-name"
                  className="block text-xs font-mono tracking-widest text-cyan-400 uppercase mb-1"
                >
                  TASK NAME *
                </label>
                <input
                  id="input-task-name"
                  type="text"
                  value={title}
                  onChange={(e) => {
                    setTitle(e.target.value);
                    setError(null);
                  }}
                  placeholder="e.g. Read 20 Pages, Drink Water, Pushups..."
                  className="w-full px-3.5 py-2.5 bg-[#0e1626] border border-slate-700 focus:border-cyan-400 rounded text-white placeholder-slate-500 text-sm font-medium outline-none transition"
                  autoFocus
                />
              </div>

              {/* Task Time (Optional) & Task Duration (Optional) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Task Time */}
                <div>
                  <label
                    htmlFor="input-task-time"
                    className="block text-xs font-mono tracking-widest text-cyan-400 uppercase mb-1"
                  >
                    TASK TIME (OPTIONAL)
                  </label>
                  <div className="relative">
                    <Clock className="w-4 h-4 text-cyan-400/70 absolute left-3 top-3 pointer-events-none" />
                    <input
                      id="input-task-time"
                      type="text"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      placeholder="e.g. 07:00 AM"
                      className="w-full pl-9 pr-3 py-2.5 bg-[#0e1626] border border-slate-700 focus:border-cyan-400 rounded text-white text-sm font-mono outline-none transition"
                    />
                  </div>
                </div>

                {/* Task Duration */}
                <div>
                  <label
                    htmlFor="input-task-duration"
                    className="block text-xs font-mono tracking-widest text-cyan-400 uppercase mb-1"
                  >
                    TASK DURATION (OPTIONAL)
                  </label>
                  <input
                    id="input-task-duration"
                    type="text"
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    placeholder="e.g. 30 mins, 1 hour"
                    className="w-full px-3.5 py-2.5 bg-[#0e1626] border border-slate-700 focus:border-cyan-400 rounded text-white text-sm font-mono outline-none transition"
                  />
                </div>
              </div>

              {/* XP Reward (Default 25 XP, Max 100 XP) */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-mono tracking-widest text-cyan-400 uppercase flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5" /> XP REWARD (MAX 100 XP)
                  </label>
                  <span className="text-xs font-mono text-cyan-300 font-bold">
                    +{customXp ? customXp : xp} XP
                  </span>
                </div>
                <div className="grid grid-cols-5 gap-1.5 mb-2">
                  {XP_PRESETS.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => {
                        setXp(preset);
                        setCustomXp('');
                      }}
                      className={`py-1.5 text-xs font-mono font-bold rounded border transition ${
                        xp === preset && !customXp
                          ? 'bg-cyan-500 text-black border-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.4)]'
                          : 'bg-[#0e1626] border-slate-800 text-gray-300 hover:border-slate-700'
                      }`}
                    >
                      +{preset}
                    </button>
                  ))}
                </div>
                <input
                  id="input-custom-xp"
                  type="number"
                  min="1"
                  max="100"
                  value={customXp}
                  onChange={(e) => {
                    const val = e.target.value;
                    setCustomXp(val);
                  }}
                  placeholder="Or enter custom XP (1 - 100)..."
                  className="w-full px-3 py-1.5 bg-[#0e1626] border border-slate-800 focus:border-cyan-400 rounded text-xs font-mono text-white placeholder-slate-500 outline-none transition"
                />
              </div>

              {/* Repeat Schedule: Daily or Selected Weekdays */}
              <div className="pt-1">
                <label className="block text-xs font-mono tracking-widest text-cyan-400 uppercase mb-1.5">
                  REPEAT SCHEDULE
                </label>
                <div className="grid grid-cols-2 gap-2 mb-2">
                  <button
                    type="button"
                    onClick={() => {
                      setScheduleMode('daily');
                      setSelectedDays([]);
                    }}
                    className={`py-2 px-3 rounded border text-xs font-mono font-bold transition ${
                      scheduleMode === 'daily'
                        ? 'bg-cyan-950/60 border-cyan-400 text-cyan-300 shadow-[0_0_10px_rgba(6,182,212,0.25)]'
                        : 'bg-[#0e1626] border-slate-800 text-gray-400 hover:border-slate-700 hover:text-gray-300'
                    }`}
                  >
                    DAILY (EVERY DAY)
                  </button>
                  <button
                    type="button"
                    onClick={() => setScheduleMode('weekdays')}
                    className={`py-2 px-3 rounded border text-xs font-mono font-bold transition ${
                      scheduleMode === 'weekdays'
                        ? 'bg-cyan-950/60 border-cyan-400 text-cyan-300 shadow-[0_0_10px_rgba(6,182,212,0.25)]'
                        : 'bg-[#0e1626] border-slate-800 text-gray-400 hover:border-slate-700 hover:text-gray-300'
                    }`}
                  >
                    SELECTED WEEKDAYS
                  </button>
                </div>

                {/* Weekdays selector if 'weekdays' selected */}
                {scheduleMode === 'weekdays' && (
                  <div className="flex justify-between gap-1 pt-1">
                    {WEEKDAYS.map((wd) => {
                      const isSelected = selectedDays.includes(wd.value);
                      return (
                        <button
                          key={wd.value}
                          type="button"
                          onClick={() => toggleDay(wd.value)}
                          className={`flex-1 py-1.5 text-xs font-mono rounded border transition ${
                            isSelected
                              ? 'bg-cyan-500/25 border-cyan-400 text-cyan-300 font-bold'
                              : 'bg-[#0e1626] border-slate-800 text-gray-400 hover:border-slate-700'
                          }`}
                        >
                          {wd.label}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Verification Method */}
              <div>
                <label className="block text-xs font-mono tracking-widest text-cyan-400 uppercase mb-1.5">
                  VERIFICATION METHOD
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setVerificationMethod('MANUAL')}
                    className={`p-2.5 rounded border text-left flex flex-col items-center justify-center gap-1 transition font-mono ${
                      verificationMethod === 'MANUAL'
                        ? 'bg-cyan-950/40 border-cyan-400 text-white shadow-[0_0_10px_rgba(6,182,212,0.25)]'
                        : 'bg-[#0e1626] border-slate-800 text-gray-400 hover:border-slate-700 hover:text-gray-300'
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span className="text-[11px] font-bold">MANUAL</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setVerificationMethod('CAPTURE')}
                    className={`p-2.5 rounded border text-left flex flex-col items-center justify-center gap-1 transition font-mono ${
                      verificationMethod === 'CAPTURE'
                        ? 'bg-cyan-950/40 border-cyan-400 text-white shadow-[0_0_10px_rgba(6,182,212,0.25)]'
                        : 'bg-[#0e1626] border-slate-800 text-gray-400 hover:border-slate-700 hover:text-gray-300'
                    }`}
                  >
                    <Camera className="w-4 h-4 text-cyan-400" />
                    <span className="text-[11px] font-bold">CAPTURE</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setVerificationMethod('MANUAL + CAPTURE')}
                    className={`p-2.5 rounded border text-left flex flex-col items-center justify-center gap-1 transition font-mono ${
                      verificationMethod === 'MANUAL + CAPTURE'
                        ? 'bg-cyan-950/40 border-cyan-400 text-white shadow-[0_0_10px_rgba(6,182,212,0.25)]'
                        : 'bg-[#0e1626] border-slate-800 text-gray-400 hover:border-slate-700 hover:text-gray-300'
                    }`}
                  >
                    <div className="flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      <Camera className="w-3.5 h-3.5 text-cyan-400" />
                    </div>
                    <span className="text-[10px] font-bold tracking-tight">MANUAL + CAPTURE</span>
                  </button>
                </div>
              </div>

              {error && (
                <div className="text-xs font-mono text-rose-400 bg-rose-950/30 border border-rose-800/40 rounded p-2">
                  {error}
                </div>
              )}

              {/* Action Buttons: Save and Cancel */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  id="btn-cancel-task-modal"
                  onClick={onClose}
                  className="flex-1 py-2.5 rounded bg-slate-800 hover:bg-slate-700 text-gray-300 font-mono text-xs font-bold tracking-wider transition uppercase"
                >
                  [ CANCEL ]
                </button>
                <button
                  type="submit"
                  id="btn-submit-task-modal"
                  className="flex-1 py-2.5 rounded bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-mono text-xs font-bold tracking-wider shadow-[0_0_15px_rgba(6,182,212,0.3)] transition uppercase active:scale-[0.98]"
                >
                  {initialData ? '[ SAVE CHANGES ]' : '[ SAVE TASK ]'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
