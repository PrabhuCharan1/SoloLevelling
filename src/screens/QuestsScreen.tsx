import React, { useState } from 'react';
import { Sun, GraduationCap, Sunset, Moon, Sparkles, Plus, Shield, Calendar } from 'lucide-react';
import { SystemHeader } from '../components/SystemHeader.tsx';
import { QuestCard } from '../components/QuestCard.tsx';
import { TaskCreateModal } from '../components/TaskCreateModal.tsx';
import { NewQuestRegisteredModal } from '../components/NewQuestRegisteredModal.tsx';
import { AppRoute, QuestCategory, TaskVerificationMethod, RoutineItemConfig } from '../types.ts';
import { useQuestSystem } from '../context/QuestContext.tsx';

interface QuestsScreenProps {
  onNavigate: (route: AppRoute) => void;
}

export const QuestsScreen: React.FC<QuestsScreenProps> = ({ onNavigate }) => {
  const {
    quests,
    routineItems,
    completedCount,
    totalCount,
    toggleQuest,
    addCustomRoutineItem,
    updateRoutineItem,
    deleteCustomRoutineItem,
  } = useQuestSystem();

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<RoutineItemConfig | null>(null);
  const [registeredQuestInfo, setRegisteredQuestInfo] = useState<{
    isOpen: boolean;
    title: string;
    time: string;
    xp: number;
  }>({
    isOpen: false,
    title: '',
    time: '',
    xp: 0,
  });

  const handleTaskSubmit = (taskData: {
    title: string;
    category?: QuestCategory;
    startTime?: string;
    endTime?: string;
    duration?: string;
    xp: number;
    verificationMethod: TaskVerificationMethod;
    recurring?: boolean;
    daysOfWeek?: number[];
  }) => {
    if (editingItem) {
      updateRoutineItem(editingItem.id, taskData);
      setEditingItem(null);
    } else {
      const wasEmpty = quests.length === 0;
      addCustomRoutineItem(taskData);
      if (wasEmpty) {
        setRegisteredQuestInfo({
          isOpen: true,
          title: taskData.title,
          time: taskData.startTime || 'Anytime',
          xp: taskData.xp,
        });
      }
    }
    setIsCreateModalOpen(false);
  };

  const sections: Array<{
    category: QuestCategory;
    name: string;
    timeSpan: string;
    icon: typeof Sun;
    color: 'cyan' | 'purple';
  }> = [
    {
      category: 'Morning',
      name: 'MORNING',
      timeSpan: '05:00 - 08:30',
      icon: Sun,
      color: 'cyan',
    },
    {
      category: 'College',
      name: 'COLLEGE',
      timeSpan: '09:00 - 16:00',
      icon: GraduationCap,
      color: 'purple',
    },
    {
      category: 'Evening',
      name: 'EVENING',
      timeSpan: '16:30 - 20:30',
      icon: Sunset,
      color: 'cyan',
    },
    {
      category: 'Night',
      name: 'NIGHT',
      timeSpan: '21:00 - 22:30',
      icon: Moon,
      color: 'purple',
    },
  ];

  const standardCategories = ['Morning', 'College', 'Evening', 'Night'];
  const otherQuests = quests.filter((q) => !q.category || !standardCategories.includes(q.category));

  const totalPossibleXp = quests.reduce((sum, q) => sum + q.xp, 0);
  const earnedXp = quests.filter((q) => q.completed).reduce((sum, q) => sum + q.xp, 0);

  return (
    <div className="relative min-h-screen pb-24 select-none">
      {/* Background ambient lighting */}
      <div className="absolute top-12 left-1/2 -translate-x-1/2 w-80 h-72 rounded-full bg-cyan-600/10 blur-[90px] pointer-events-none" />

      {/* Screen Header */}
      <SystemHeader
        variant="subscreen"
        title="DAILY QUESTS"
        subtitle={`${completedCount}/${totalCount} OBJECTIVES CLEARED`}
        onNavigate={onNavigate}
      />

      <div className="p-4 space-y-6">
        {/* Top System Mission Banner */}
        <div className="relative overflow-hidden p-3.5 rounded-xl bg-gradient-to-r from-cyan-950/40 via-[#0a0f22] to-purple-950/40 border border-cyan-500/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-cyan-400" />
              <span className="font-hud text-xs font-bold tracking-widest text-white uppercase">
                SYSTEM PROTOCOL // ACTIVE
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-hud text-cyan-300 border border-cyan-500/30 px-2 py-0.5 rounded bg-[#060914]">
                DAILY POOL: {earnedXp} / {totalPossibleXp} XP
              </span>
              <button
                type="button"
                id="btn-add-quest-quests-screen"
                onClick={() => {
                  setEditingItem(null);
                  setIsCreateModalOpen(true);
                }}
                className="px-2.5 py-0.5 rounded bg-cyan-500 hover:bg-cyan-400 text-black font-hud text-[11px] font-bold tracking-wider flex items-center gap-1 cursor-pointer transition shadow-[0_0_10px_rgba(6,182,212,0.4)]"
              >
                <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>[+ QUEST]</span>
              </button>
            </div>
          </div>
        </div>

        {/* Empty Quests State */}
        {quests.length === 0 ? (
          <div
            id="empty-quests-state"
            className="p-6 bg-[#0a0f1d] border border-cyan-500/40 rounded-xl text-center shadow-[0_0_35px_rgba(6,182,212,0.15)] relative overflow-hidden my-4"
          >
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent" />
            <div className="flex items-center justify-center gap-2 mb-2">
              <Shield className="w-5 h-5 text-cyan-400 animate-pulse" />
              <span className="text-xs font-mono font-bold tracking-[0.25em] text-cyan-400 uppercase">
                SYSTEM
              </span>
            </div>
            <div className="h-px w-full bg-gradient-to-r from-transparent via-cyan-500/40 to-transparent mb-4" />
            <h3 className="text-lg font-black text-white tracking-widest uppercase mb-2 font-mono">
              DAILY TASK SETUP
            </h3>
            <p className="text-xs text-slate-300 font-mono leading-relaxed mb-5 max-w-xs mx-auto">
              Create your own daily routine.
            </p>
            <button
              id="btn-add-first-task-quests-screen"
              onClick={() => {
                setEditingItem(null);
                setIsCreateModalOpen(true);
              }}
              className="py-3 px-6 rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-mono text-xs font-bold tracking-[0.2em] uppercase shadow-[0_0_20px_rgba(6,182,212,0.4)] transition-all cursor-pointer active:scale-[0.98]"
            >
              [ ADD MY FIRST TASK ]
            </button>
            <div className="h-px w-full bg-gradient-to-r from-transparent via-cyan-500/40 to-transparent mt-5" />
          </div>
        ) : (
          <>
            {/* Standard Quest Sections: MORNING, COLLEGE, EVENING, NIGHT */}
            {sections.map((section) => {
              const Icon = section.icon;
              const isPurple = section.color === 'purple';
              const sectionQuests = quests.filter((q) => q.category === section.category);
              if (sectionQuests.length === 0) return null;
              const sectionCompleted = sectionQuests.filter((q) => q.completed).length;

              return (
                <div key={section.category} className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-7 h-7 rounded-lg flex items-center justify-center border ${
                          isPurple
                            ? 'bg-purple-950/60 border-purple-500/50 text-purple-300'
                            : 'bg-cyan-950/60 border-cyan-500/50 text-cyan-300'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                      </div>
                      <h2
                        className={`font-display text-sm font-bold tracking-widest uppercase ${
                          isPurple ? 'text-purple-300' : 'text-cyan-300'
                        }`}
                      >
                        {section.name}
                      </h2>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-hud text-slate-400">
                        {sectionCompleted}/{sectionQuests.length}
                      </span>
                      <span className="font-hud text-xs font-medium text-slate-500 tracking-wider">
                        {section.timeSpan}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2 pl-1">
                    {sectionQuests.map((q) => (
                      <QuestCard
                        key={q.id}
                        id={`quest-screen-${q.id}`}
                        taskId={q.id}
                        title={q.title}
                        xp={q.xp}
                        category={section.name}
                        timeSpan={q.timeSpan}
                        startTime={q.startTime}
                        endTime={q.endTime}
                        duration={q.duration}
                        completed={q.completed}
                        verificationMethod={q.verificationMethod}
                        onToggle={() => toggleQuest(q.id)}
                        onEdit={() => {
                          const routineItem = routineItems.find((r) => r.id === q.id) || {
                            id: q.id,
                            title: q.title,
                            xp: q.xp,
                            startTime: q.startTime,
                            endTime: q.endTime,
                            duration: q.duration,
                            category: q.category,
                            verificationMethod: q.verificationMethod,
                          };
                          setEditingItem(routineItem);
                          setIsCreateModalOpen(true);
                        }}
                        onDelete={() => deleteCustomRoutineItem(q.id)}
                      />
                    ))}
                  </div>
                </div>
              );
            })}

            {/* Custom Scheduled Quests Section */}
            {otherQuests.length > 0 && (
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center border bg-cyan-950/60 border-cyan-500/50 text-cyan-300">
                      <Calendar className="w-4 h-4" />
                    </div>
                    <h2 className="font-display text-sm font-bold tracking-widest uppercase text-cyan-300">
                      SCHEDULED QUESTS
                    </h2>
                  </div>
                  <span className="text-[10px] font-hud text-slate-400">
                    {otherQuests.filter((q) => q.completed).length}/{otherQuests.length}
                  </span>
                </div>

                <div className="space-y-2 pl-1">
                  {otherQuests.map((q) => (
                    <QuestCard
                      key={q.id}
                      id={`quest-screen-${q.id}`}
                      taskId={q.id}
                      title={q.title}
                      xp={q.xp}
                      timeSpan={q.timeSpan}
                      startTime={q.startTime}
                      endTime={q.endTime}
                      duration={q.duration}
                      completed={q.completed}
                      verificationMethod={q.verificationMethod}
                      onToggle={() => toggleQuest(q.id)}
                      onEdit={() => {
                        const routineItem = routineItems.find((r) => r.id === q.id) || {
                          id: q.id,
                          title: q.title,
                          xp: q.xp,
                          startTime: q.startTime,
                          endTime: q.endTime,
                          duration: q.duration,
                          category: q.category,
                          verificationMethod: q.verificationMethod,
                        };
                        setEditingItem(routineItem);
                        setIsCreateModalOpen(true);
                      }}
                      onDelete={() => deleteCustomRoutineItem(q.id)}
                    />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Task Create / Edit Modal */}
      <TaskCreateModal
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          setEditingItem(null);
        }}
        onSubmit={handleTaskSubmit}
        initialData={editingItem}
      />

      {/* New Quest Registered Modal */}
      <NewQuestRegisteredModal
        isOpen={registeredQuestInfo.isOpen}
        questTitle={registeredQuestInfo.title}
        time={registeredQuestInfo.time}
        xp={registeredQuestInfo.xp}
        onAccept={() =>
          setRegisteredQuestInfo({
            isOpen: false,
            title: '',
            time: '',
            xp: 0,
          })
        }
      />
    </div>
  );
};
