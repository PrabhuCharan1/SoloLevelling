import React, { useState } from 'react';
import { Check, Camera, ShieldCheck, Clock, AlertTriangle, Pencil, Trash2 } from 'lucide-react';
import { XPBadge } from './Badges.tsx';
import { useQuestSystem } from '../context/QuestContext.tsx';
import { getTaskVerificationConfig } from '../utils/taskVerificationConfig.ts';
import { TaskCaptureModal } from './TaskCaptureModal.tsx';
import { TaskVerificationNotificationModal } from './TaskVerificationNotificationModal.tsx';
import { TaskVerificationStatus, TaskVerificationMethod } from '../types.ts';

export interface QuestCardProps {
  id?: string;
  taskId?: string;
  title: string;
  xp: number;
  completed?: boolean;
  initialCompleted?: boolean;
  onToggle?: (nextChecked: boolean) => void;
  className?: string;
  slotTag?: string;
  category?: string;
  timeSpan?: string;
  startTime?: string;
  endTime?: string;
  duration?: string;
  verificationMethod?: TaskVerificationMethod;
  onEdit?: () => void;
  onDelete?: () => void;
}

export const QuestCard: React.FC<QuestCardProps> = ({
  id,
  taskId,
  title,
  xp,
  completed,
  initialCompleted = false,
  onToggle,
  className = '',
  slotTag,
  category,
  timeSpan,
  startTime,
  endTime,
  duration,
  verificationMethod = 'MANUAL + CAPTURE',
  onEdit,
  onDelete,
}) => {
  const questSystem = useQuestSystem();

  // Resolve canonical task ID
  const actualTaskId =
    taskId ||
    id?.replace(/^quest-screen-/, '').replace(/^quest-/, '') ||
    title.toLowerCase().replace(/[^a-z0-9]+/g, '-');

  const [internalCompleted, setInternalCompleted] = useState(initialCompleted);
  const isCompleted = completed !== undefined ? completed : internalCompleted;

  // Delete confirmation modal state
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

  // Verification configuration for this specific task
  const config = getTaskVerificationConfig(actualTaskId, title, startTime, endTime, timeSpan);

  // Existing verification metadata from store
  const verification = questSystem.getTaskVerification(actualTaskId);

  // Modals state
  const [isCaptureModalOpen, setIsCaptureModalOpen] = useState(false);
  const [isNotificationModalOpen, setIsNotificationModalOpen] = useState(false);
  const [notificationData, setNotificationData] = useState<{
    captureTimeStr: string;
    status: TaskVerificationStatus;
    xpAwarded: number;
  }>({
    captureTimeStr: '',
    status: 'verified',
    xpAwarded: xp,
  });

  // Checkbox toggle handler
  const handleToggleCheckbox = (e: React.MouseEvent) => {
    e.stopPropagation();
    const next = !isCompleted;
    if (completed === undefined) {
      setInternalCompleted(next);
    }
    if (onToggle) {
      onToggle(next);
    } else {
      questSystem.toggleQuest(actualTaskId);
    }
  };

  // MANUAL COMPLETE handler
  const handleManualComplete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isCompleted) return;

    if (completed === undefined) {
      setInternalCompleted(true);
    }

    await questSystem.completeQuestWithVerification(actualTaskId, 'manual', {
      targetTimeStr: config.targetTimeStr,
      allowedWindowStr: config.windowDisplayStr,
      verificationStatus: 'manual',
    });

    if (onToggle && !isCompleted) {
      onToggle(true);
    }
  };

  // CAPTURE BUTTON handler
  const handleOpenCapture = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsCaptureModalOpen(true);
  };

  // CAPTURE SUCCESS callback from TaskCaptureModal
  const handleCaptureSuccess = async ({
    photoUrl,
    captureTimestamp,
    captureTimeFormatted,
    isWithinWindow,
  }: {
    photoUrl: string;
    captureTimestamp: number;
    captureTimeFormatted: string;
    isWithinWindow: boolean;
  }) => {
    setIsCaptureModalOpen(false);

    const status: TaskVerificationStatus = isWithinWindow ? 'verified' : 'window_missed';

    if (isWithinWindow) {
      // Mark task verified and award XP
      const res = await questSystem.completeQuestWithVerification(actualTaskId, 'capture', {
        capturedPhotoUrl: photoUrl,
        captureTimestamp,
        verificationStatus: 'verified',
        targetTimeStr: config.targetTimeStr,
        allowedWindowStr: config.windowDisplayStr,
      });

      if (completed === undefined) {
        setInternalCompleted(true);
      }
      if (onToggle && !isCompleted) {
        onToggle(true);
      }

      setNotificationData({
        captureTimeStr: captureTimeFormatted,
        status: 'verified',
        xpAwarded: res.xpAwarded > 0 ? res.xpAwarded : xp,
      });
      setIsNotificationModalOpen(true);
    } else {
      // Out of window: Show Missed Window HUD modal with option to complete manually
      setNotificationData({
        captureTimeStr: captureTimeFormatted,
        status: 'window_missed',
        xpAwarded: xp,
      });
      setIsNotificationModalOpen(true);
    }
  };

  // Target time display text
  const targetDisplay = config.targetTimeStr || timeSpan || 'Scheduled';

  return (
    <>
      <div
        id={id || `task-card-${actualTaskId}`}
        className={`group relative flex flex-col p-3.5 rounded-xl border transition-all duration-200 select-none ${
          isCompleted
            ? 'bg-[#0a0e1c]/70 border-cyan-500/40 shadow-[0_0_15px_-4px_rgba(0,240,255,0.2)]'
            : 'bg-[#090d1c]/90 hover:bg-[#0f162e]/95 border-cyan-500/25 hover:border-cyan-400/50 shadow-[0_0_12px_-4px_rgba(0,240,255,0.1)]'
        } ${className}`}
      >
        {/* Top Row: [ ○ ] Checkbox, Title, Target Time, XP Badge */}
        <div className="flex items-start justify-between gap-3">
          {/* Left: Checkbox and Info */}
          <div className="flex items-start gap-3 min-w-0 flex-1">
            {/* [ ○ ] / [ ✓ ] Checkbox */}
            <button
              type="button"
              id={`checkbox-${actualTaskId}`}
              tabIndex={0}
              aria-label={isCompleted ? `Mark ${title} incomplete` : `Mark ${title} complete`}
              onClick={handleToggleCheckbox}
              className={`mt-0.5 w-5 h-5 rounded-full border flex items-center justify-center shrink-0 transition-all duration-200 cursor-pointer ${
                isCompleted
                  ? 'bg-cyan-400 border-cyan-300 shadow-[0_0_10px_rgba(0,240,255,0.7)] text-[#05070e]'
                  : 'border-cyan-500/50 bg-[#060914] text-transparent hover:border-cyan-400 hover:bg-[#0c1328]'
              }`}
            >
              <Check
                className={`w-3.5 h-3.5 stroke-[3] transition-transform duration-150 ${
                  isCompleted ? 'scale-100 opacity-100' : 'scale-50 opacity-0'
                }`}
              />
            </button>

            {/* Title & Target Details */}
            <div className="flex flex-col min-w-0">
              {/* Category & Tag Bar */}
              {(category || slotTag) && (
                <div className="flex items-center gap-1.5 text-[9px] font-hud tracking-widest uppercase mb-0.5 truncate text-cyan-400/80 font-bold">
                  {category || slotTag}
                </div>
              )}

              {/* Task Title */}
              <span
                className={`font-display text-sm font-semibold tracking-wide transition-all truncate ${
                  isCompleted
                    ? 'text-slate-400 line-through decoration-cyan-500/50'
                    : 'text-slate-100 group-hover:text-cyan-200'
                }`}
              >
                {title}
              </span>

              {/* Target: 5:00 AM & Duration */}
              <div className="flex items-center flex-wrap gap-2 mt-1 text-[11px] font-mono text-slate-400">
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3 text-cyan-400/80 shrink-0" />
                  <span>Target: <strong className="text-slate-200 font-bold">{targetDisplay}</strong></span>
                </span>

                {duration && (
                  <>
                    <span className="text-slate-600">•</span>
                    <span className="text-cyan-300 font-medium">{duration}</span>
                  </>
                )}

                {config.allowCapture && config.windowDisplayStr && (
                  <>
                    <span className="text-slate-600 hidden sm:inline">•</span>
                    <span className="text-[10px] text-slate-500 hidden sm:inline">
                      Window: {config.windowDisplayStr}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Right: XP Badge & Actions */}
          <div className="shrink-0 flex items-center gap-1.5 pl-1">
            {onEdit && (
              <button
                type="button"
                id={`btn-edit-${actualTaskId}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit();
                }}
                className="p-1 rounded text-slate-400 hover:text-cyan-300 hover:bg-slate-800/80 transition cursor-pointer"
                title="Edit Quest"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
            )}
            {onDelete && (
              <button
                type="button"
                id={`btn-delete-${actualTaskId}`}
                onClick={(e) => {
                  e.stopPropagation();
                  setIsDeleteConfirmOpen(true);
                }}
                className="p-1 rounded text-slate-400 hover:text-rose-400 hover:bg-rose-950/30 transition cursor-pointer"
                title="Delete Quest"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
            <XPBadge amount={xp} size="sm" />
          </div>
        </div>

        {/* Bottom Row: [✓ COMPLETE] [📷 CAPTURE] Action Buttons */}
        {!isCompleted ? (
          <div className="mt-3 pt-2.5 border-t border-cyan-950/70 flex items-center gap-2">
            {/* [✓ COMPLETE] Button (Manual Complete) */}
            {(verificationMethod === 'MANUAL' || verificationMethod === 'MANUAL + CAPTURE') && (
              <button
                type="button"
                id={`btn-complete-${actualTaskId}`}
                onClick={handleManualComplete}
                className="flex-1 py-1.5 px-3 rounded-lg bg-[#0b1428] hover:bg-cyan-950/80 border border-cyan-500/40 hover:border-cyan-400 text-cyan-200 font-hud text-[11px] font-bold tracking-wider flex items-center justify-center gap-1.5 transition-all active:scale-[0.98] cursor-pointer"
              >
                <Check className="w-3.5 h-3.5 text-cyan-400" />
                <span>[✓ COMPLETE]</span>
              </button>
            )}

            {/* [📷 CAPTURE] Button (Capture verification) */}
            {(verificationMethod === 'CAPTURE' || verificationMethod === 'MANUAL + CAPTURE') && (
              config.allowCapture ? (
                <button
                  type="button"
                  id={`btn-capture-${actualTaskId}`}
                  onClick={handleOpenCapture}
                  className="flex-1 py-1.5 px-3 rounded-lg bg-gradient-to-r from-cyan-600 via-cyan-500 to-blue-600 hover:shadow-[0_0_15px_rgba(0,240,255,0.4)] text-white font-hud text-[11px] font-black tracking-wider flex items-center justify-center gap-1.5 transition-all active:scale-[0.98] cursor-pointer border border-cyan-300/80"
                >
                  <Camera className="w-3.5 h-3.5 text-white" />
                  <span>[📷 CAPTURE]</span>
                </button>
              ) : (
                <span className="text-[10px] font-mono text-slate-500 px-2 italic select-none">
                  {config.privacyNotice || 'Manual verification only'}
                </span>
              )
            )}
          </div>
        ) : (
          /* Completed Status Badge Bar */
          <div className="mt-2.5 pt-2 border-t border-cyan-950/50 flex items-center justify-between text-[11px] font-mono">
            <div className="flex items-center gap-1.5">
              {verification?.completionMethod === 'capture' ? (
                <span className="flex items-center gap-1 text-cyan-300 font-hud text-[10px] font-bold tracking-wider bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-500/40">
                  <Camera className="w-3 h-3 text-cyan-400" />
                  <span>✓ VERIFIED 📷</span>
                  {verification.captureTimestamp && (
                    <span className="text-slate-300">
                      {new Date(verification.captureTimestamp).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  )}
                </span>
              ) : (
                <span className="flex items-center gap-1 text-cyan-400 font-hud text-[10px] font-bold tracking-wider">
                  <Check className="w-3.5 h-3.5" />
                  <span>✓ COMPLETED</span>
                </span>
              )}
            </div>

            {/* Option to reset or uncheck */}
            <button
              type="button"
              id={`btn-reset-${actualTaskId}`}
              onClick={handleToggleCheckbox}
              className="text-[9px] font-hud text-slate-500 hover:text-slate-300 tracking-wider uppercase cursor-pointer"
            >
              RESET
            </button>
          </div>
        )}

        {/* Corner Neon Accent Bracket */}
        <span
          className={`absolute top-0 right-0 w-2 h-2 border-t border-r rounded-tr-sm pointer-events-none transition-colors ${
            isCompleted ? 'border-cyan-300 shadow-[0_0_6px_#00f0ff]' : 'border-cyan-400/30'
          }`}
        />
      </div>

      {/* Camera Capture Modal */}
      {isCaptureModalOpen && (
        <TaskCaptureModal
          isOpen={isCaptureModalOpen}
          onClose={() => setIsCaptureModalOpen(false)}
          taskId={actualTaskId}
          taskTitle={title}
          xp={xp}
          config={config}
          onCaptureSuccess={handleCaptureSuccess}
          onCompleteManually={async () => {
            setIsCaptureModalOpen(false);
            await questSystem.completeQuestWithVerification(actualTaskId, 'manual');
            if (completed === undefined) setInternalCompleted(true);
            if (onToggle) onToggle(true);
          }}
        />
      )}

      {/* System Verification Pop-up Notification */}
      {isNotificationModalOpen && (
        <TaskVerificationNotificationModal
          isOpen={isNotificationModalOpen}
          onClose={() => setIsNotificationModalOpen(false)}
          taskTitle={title}
          captureTimeStr={notificationData.captureTimeStr}
          status={notificationData.status}
          xpAwarded={notificationData.xpAwarded}
          allowedWindowStr={config.windowDisplayStr}
          onCompleteManually={async () => {
            setIsNotificationModalOpen(false);
            await questSystem.completeQuestWithVerification(actualTaskId, 'manual');
            if (completed === undefined) setInternalCompleted(true);
            if (onToggle) onToggle(true);
          }}
        />
      )}
      {/* Delete Confirmation Modal */}
      {isDeleteConfirmOpen && (
        <div
          id={`delete-confirm-backdrop-${actualTaskId}`}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          onClick={(e) => {
            e.stopPropagation();
            setIsDeleteConfirmOpen(false);
          }}
        >
          <div
            id={`delete-confirm-card-${actualTaskId}`}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-xs bg-[#0b1021] border border-rose-500/50 rounded-lg p-5 shadow-[0_0_30px_rgba(244,63,94,0.25)] text-center relative"
          >
            <div className="text-xs font-mono font-bold tracking-widest text-rose-400 uppercase mb-2">
              SYSTEM
            </div>
            <div className="h-px w-full bg-rose-500/30 mb-3" />
            <h4 className="text-base font-black text-white uppercase tracking-wider mb-2 font-mono">
              DELETE QUEST?
            </h4>
            <p className="text-xs text-gray-400 font-mono mb-5">
              This action cannot be undone.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                id={`btn-cancel-delete-${actualTaskId}`}
                onClick={() => setIsDeleteConfirmOpen(false)}
                className="flex-1 py-2 rounded bg-slate-800 hover:bg-slate-700 text-gray-300 font-mono text-xs font-bold uppercase transition cursor-pointer"
              >
                CANCEL
              </button>
              <button
                type="button"
                id={`btn-confirm-delete-${actualTaskId}`}
                onClick={() => {
                  setIsDeleteConfirmOpen(false);
                  if (onDelete) onDelete();
                }}
                className="flex-1 py-2 rounded bg-rose-600 hover:bg-rose-500 text-white font-mono text-xs font-bold uppercase transition shadow-[0_0_15px_rgba(244,63,94,0.4)] cursor-pointer"
              >
                DELETE
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
