import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  User,
  Clock,
  Droplets,
  Palette,
  Bell,
  Sparkles,
  Database,
  Info,
  ChevronRight,
  Shield,
  Save,
  Download,
  Upload,
  FileCheck,
  RotateCcw,
  AlertTriangle,
  Check,
  Zap,
  Sliders,
  Flame,
  Volume2,
  VolumeX,
  FastForward,
  Cpu,
  Smartphone,
  Wifi,
  WifiOff,
  LogOut,
} from 'lucide-react';

import { SystemHeader } from '../components/SystemHeader.tsx';
import { SyncStatusIndicator } from '../components/SyncStatusIndicator.tsx';
import { AppRoute, QuestLifeBackupPayload } from '../types.ts';
import { useQuestSystem } from '../context/QuestContext.tsx';
import { useWaterSystem } from '../context/WaterContext.tsx';
import { useSettings } from '../context/SettingsContext.tsx';
import { useAuth } from '../context/AuthContext.tsx';
import { validateBackupFileContent } from '../utils/exportManager.ts';
import { getLevelInfo } from '../utils/levelSystem.ts';
import { usePWA } from '../hooks/usePWA.ts';
import { NotificationPermissionModal } from '../components/NotificationPermissionModal.tsx';
import {
  getNotificationPermissionStatus,
  requestNotificationPermission,
} from '../utils/notificationManager.ts';
import { soundService } from '../services/soundService.ts';
import { useAudio } from '../hooks/useAudio.ts';


interface SettingsScreenProps {
  onNavigate: (route: AppRoute) => void;
  onBack?: () => void;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({ onNavigate, onBack }) => {
  const {
    userName,
    updateUserName,
    routineItems,
    levelInfo,
    xp,
    streak,
    todayKey,
    todayFormatted,
    resetTodayProgress,
    resetAllData,
    exportUserDataJson,
    restoreBackupData,
    advanceDayForTesting,
    resetDayForTesting,
    completeAllForTest,
  } = useQuestSystem();

  const { targetMl, setWaterTarget, resetTodayWater } = useWaterSystem();
  const {
    settings,
    updateAccentColor,
    toggleCompactMode,
    updateWaterTarget,
    updateNotificationPref,
    updateGamificationPref,
  } = useSettings();

  const { playQuestComplete, playLevelUp, playUiClick, playRewardClaim } = useAudio();

  // Supabase Auth & Cloud Account
  const { user, isAuthenticated, isConfigured, signOut, updateProfileName } = useAuth();
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);

  // Local editing states
  const [nameInput, setNameInput] = useState(userName);
  const [isEditingName, setIsEditingName] = useState(false);
  const [waterInput, setWaterInput] = useState<string>(targetMl.toString());
  const [waterError, setWaterError] = useState<string | null>(null);

  // PWA & Notification States
  const { isOnline, isInstalled, isInstallable, installApp } = usePWA();
  const [isNotificationModalOpen, setIsNotificationModalOpen] = useState(false);
  const [pendingNotificationKey, setPendingNotificationKey] = useState<string | null>(null);

  // Modals & Feedback Toasts
  const [feedbackToast, setFeedbackToast] = useState<string | null>(null);
  const [isResetTodayModalOpen, setIsResetTodayModalOpen] = useState(false);
  const [isResetAllModalOpen, setIsResetAllModalOpen] = useState(false);
  const [showDevTools, setShowDevTools] = useState(false);

  // Backup Import & Restore States
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isRestoreModalOpen, setIsRestoreModalOpen] = useState(false);
  const [pendingBackup, setPendingBackup] = useState<QuestLifeBackupPayload | null>(null);
  const [restoreError, setRestoreError] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setFeedbackToast(msg);
    setTimeout(() => setFeedbackToast(null), 2500);
  };

  const handleToggleNotification = async (key: string, nextValue: boolean) => {
    if (nextValue) {
      const status = getNotificationPermissionStatus();
      if (status === 'default') {
        setPendingNotificationKey(key);
        setIsNotificationModalOpen(true);
        return;
      }
      if (status === 'denied') {
        showToast('Notifications blocked in browser settings');
        return;
      }
    }
    updateNotificationPref(key as any, nextValue);
    showToast(nextValue ? 'Reminder enabled' : 'Reminder disabled');
  };

  const handleAllowNotificationPermission = async () => {
    const outcome = await requestNotificationPermission();
    setIsNotificationModalOpen(false);
    if (outcome === 'granted') {
      if (pendingNotificationKey) {
        updateNotificationPref(pendingNotificationKey as any, true);
      }
      showToast('Notifications enabled successfully');
    } else {
      showToast('Permission not granted');
    }
    setPendingNotificationKey(null);
  };

  // Backup File Picker Handler
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const validation = validateBackupFileContent(content);

      if (!validation.success || !validation.data) {
        setRestoreError(validation.error || 'Corrupted or invalid QuestLife backup.');
        showToast('Error: Invalid backup file');
        return;
      }

      setPendingBackup(validation.data);
      setRestoreError(null);
      setIsRestoreModalOpen(true);
    };

    reader.onerror = () => {
      setRestoreError('Failed to read backup file.');
      showToast('Error reading file');
    };

    reader.readAsText(file);
    // Reset file input so selecting the same file again triggers onChange
    e.target.value = '';
  };

  // Confirm Restore Action
  const handleConfirmRestore = () => {
    if (!pendingBackup) return;
    const result = restoreBackupData(JSON.stringify(pendingBackup));
    if (result.success) {
      setIsRestoreModalOpen(false);
      setPendingBackup(null);
      showToast('System Backup Restored Successfully');
    } else {
      showToast(result.error || 'Restore failed');
    }
  };


  // Profile Save
  const handleSaveName = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = nameInput.trim();
    if (!trimmed) return;
    updateUserName(trimmed);
    if (updateProfileName) {
      await updateProfileName(trimmed);
    }
    setIsEditingName(false);
    showToast('Hunter Identity Updated');
  };

  // Logout Action
  const handleConfirmLogout = async () => {
    setIsLogoutModalOpen(false);
    await signOut();
    showToast('Logged out of QuestLife');
    onNavigate('/login');
  };

  // Water Target Adjustments
  const handleQuickWaterAdjust = (delta: number) => {
    const next = Math.max(500, Math.min(10000, targetMl + delta));
    setWaterTarget(next);
    updateWaterTarget(next);
    setWaterInput(next.toString());
    setWaterError(null);
    showToast(`Hydration Target set to ${(next / 1000).toFixed(1)} L`);
  };

  const handleSaveWaterInput = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseInt(waterInput, 10);
    if (isNaN(val) || val < 500 || val > 10000) {
      setWaterError('Target must be between 500ml and 10,000ml');
      return;
    }
    setWaterTarget(val);
    updateWaterTarget(val);
    setWaterError(null);
    showToast(`Hydration Target Updated: ${(val / 1000).toFixed(1)} L`);
  };

  // Reset Actions
  const handleConfirmResetToday = () => {
    resetTodayProgress();
    resetTodayWater();
    setIsResetTodayModalOpen(false);
    showToast("Today's progress reset to zero");
  };

  const handleConfirmResetAll = () => {
    resetAllData();
    setIsResetAllModalOpen(false);
    showToast('All QuestLife memory cleared');
  };

  const activeRoutineCount = routineItems.filter((r) => r.enabled !== false).length;

  return (
    <div className="relative min-h-screen pb-28 select-none bg-[#05070e] text-slate-100 font-sans">
      {/* Background ambient glow */}
      <div className="absolute top-10 left-1/2 -translate-x-1/2 w-80 h-72 rounded-full bg-cyan-600/10 blur-[90px] pointer-events-none" />

      {/* Floating System Toast */}
      <AnimatePresence>
        {feedbackToast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2 bg-cyan-950/90 border border-cyan-500/50 text-cyan-200 text-xs font-mono rounded-lg shadow-[0_0_20px_rgba(6,182,212,0.4)] flex items-center gap-2"
          >
            <Sparkles className="w-3.5 h-3.5 text-cyan-400 animate-spin" />
            <span>{feedbackToast}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <SystemHeader
        variant="subscreen"
        title="SETTINGS"
        subtitle="SYSTEM CONFIGURATION"
        onNavigate={onNavigate}
        onBack={onBack || (() => onNavigate('/home'))}
      />

      <div className="p-4 space-y-4">
        {/* ==================================================== */}
        {/* SECTION A: ACCOUNT & HUNTER PROFILE */}
        {/* ==================================================== */}
        <section id="settings-profile-section" className="rounded-2xl bg-[#090d1c]/90 border border-cyan-500/30 p-4 shadow-[0_0_20px_rgba(6,182,212,0.08)]">
          <div className="flex items-center justify-between mb-3 border-b border-cyan-950/60 pb-2">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-cyan-400" />
              <h2 className="text-xs font-mono font-bold tracking-widest text-cyan-300 uppercase">
                HUNTER PROFILE
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <SyncStatusIndicator />
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950/60 border border-cyan-500/30 text-cyan-300">
                LV. {levelInfo.level}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3.5 mb-4">
            {/* Avatar Circle */}
            <div className="relative flex-shrink-0">
              <div className="w-13 h-13 rounded-xl bg-gradient-to-br from-cyan-600/30 via-slate-900 to-purple-600/30 border border-cyan-400/50 flex items-center justify-center text-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.2)]">
                <span className="font-display font-black text-xl tracking-wider">
                  {userName ? userName.charAt(0).toUpperCase() : 'J'}
                </span>
              </div>
              <span className="absolute -bottom-1 -right-1 w-3 h-3 rounded-full bg-cyan-400 border-2 border-[#090d1c] shadow-[0_0_6px_#00f0ff]" />
            </div>

            {/* Name / Title */}
            <div className="flex-1 min-w-0">
              {!isEditingName ? (
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-slate-100 tracking-wide truncate">
                      {userName}
                    </h3>
                    <button
                      id="edit-profile-name-btn"
                      onClick={() => {
                        setNameInput(userName);
                        setIsEditingName(true);
                      }}
                      className="text-[11px] font-mono text-cyan-400 hover:text-cyan-300 underline cursor-pointer"
                    >
                      EDIT
                    </button>
                  </div>
                  <p className="text-[11px] font-mono text-cyan-400/80 tracking-wider">
                    SHADOW HUNTER // {levelInfo.rank} (LEVEL {levelInfo.level})
                  </p>
                  <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                    {xp.toLocaleString()} TOTAL XP • {streak} DAY STREAK
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSaveName} className="flex flex-col gap-2">
                  <input
                    id="profile-name-input"
                    type="text"
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    placeholder="Enter Hunter Name"
                    className="w-full px-2.5 py-1.5 rounded bg-slate-900 border border-cyan-500/50 text-slate-100 text-xs font-mono focus:outline-none focus:border-cyan-400"
                    autoFocus
                  />
                  <div className="flex items-center gap-2">
                    <button
                      id="save-profile-name-btn"
                      type="submit"
                      className="px-3 py-1 rounded bg-cyan-500 text-slate-950 text-xs font-mono font-bold hover:bg-cyan-400 transition-colors cursor-pointer"
                    >
                      SAVE
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsEditingName(false)}
                      className="px-2.5 py-1 rounded text-xs font-mono text-slate-400 hover:text-slate-200 cursor-pointer"
                    >
                      CANCEL
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>

          {/* Account Details Box */}
          <div className="pt-3 border-t border-cyan-950/60 flex flex-col gap-2.5 text-xs font-mono">
            <div className="flex items-center justify-between text-slate-300">
              <span className="text-slate-400">Hunter Name:</span>
              <span className="text-cyan-300 font-bold">{userName}</span>
            </div>
            <div className="flex items-center justify-between text-slate-300">
              <span className="text-slate-400">Account Email:</span>
              <span className="text-slate-200 font-medium truncate max-w-[200px]">
                {user?.email || 'Local Terminal (Offline Mode)'}
              </span>
            </div>
            <div className="flex items-center justify-between text-slate-300">
              <span className="text-slate-400">Cloud Sync:</span>
              <span className="flex items-center gap-1.5">
                {isAuthenticated ? (
                  <span className="text-emerald-400 font-bold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Connected
                  </span>
                ) : (
                  <span className="text-amber-400 font-semibold">
                    {isConfigured ? 'Not Connected (Guest)' : 'Offline / Local Mode'}
                  </span>
                )}
              </span>
            </div>

            {/* Account Action Buttons */}
            <div className="flex items-center gap-2 pt-1.5">
              {isAuthenticated ? (
                <>
                  <button
                    type="button"
                    id="account-edit-profile-btn"
                    onClick={() => {
                      setNameInput(userName);
                      setIsEditingName(true);
                    }}
                    className="flex-1 py-2 px-3 rounded-xl bg-cyan-950/60 hover:bg-cyan-900/70 border border-cyan-500/40 text-cyan-300 text-xs font-mono font-bold tracking-wider uppercase transition-colors text-center cursor-pointer"
                  >
                    EDIT PROFILE
                  </button>
                  <button
                    type="button"
                    id="account-logout-btn"
                    onClick={() => setIsLogoutModalOpen(true)}
                    className="flex-1 py-2 px-3 rounded-xl bg-rose-950/40 hover:bg-rose-900/60 border border-rose-500/40 text-rose-300 text-xs font-mono font-bold tracking-wider uppercase transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-[0_0_15px_rgba(244,63,94,0.15)]"
                  >
                    <LogOut className="w-3.5 h-3.5 text-rose-400" />
                    <span>LOG OUT</span>
                  </button>
                </>
              ) : (
                <div className="flex items-center gap-2 w-full">
                  <button
                    type="button"
                    id="account-login-btn"
                    onClick={() => onNavigate('/login')}
                    className="flex-1 py-2 px-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-mono font-bold tracking-wider uppercase transition-colors text-center cursor-pointer shadow-[0_0_15px_rgba(0,240,255,0.3)]"
                  >
                    LOGIN
                  </button>
                  <button
                    type="button"
                    id="account-signup-btn"
                    onClick={() => onNavigate('/signup')}
                    className="flex-1 py-2 px-3 rounded-xl bg-purple-950/50 hover:bg-purple-900/60 border border-purple-500/40 text-purple-300 text-xs font-mono font-bold tracking-wider uppercase transition-colors text-center cursor-pointer"
                  >
                    SIGN UP
                  </button>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* ==================================================== */}
        {/* SCAR SYSTEM COMPANION */}
        {/* ==================================================== */}
        <section id="settings-scar-section" className="rounded-2xl bg-gradient-to-r from-[#061226]/90 via-[#0a1024]/90 to-[#0d0722] border border-cyan-500/40 p-4 shadow-[0_0_20px_rgba(6,182,212,0.12)]">
          <div className="flex items-center justify-between mb-3 border-b border-cyan-950/60 pb-2">
            <div className="flex items-center gap-2">
              <Cpu className="w-4 h-4 text-cyan-400" />
              <h2 className="text-xs font-mono font-bold tracking-widest text-cyan-300 uppercase">
                SCAR INTELLIGENCE
              </h2>
            </div>
            <span className="text-[10px] font-mono text-cyan-400/90 tracking-wider">
              SYSTEM COMPANION
            </span>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed mb-3">
            Your personal QuestLife tactical companion. Talk or chat with SCAR for task updates, workout analysis, XP and rank progression, and disciplined hunter guidance.
          </p>

          <button
            id="settings-open-scar-btn"
            onClick={() => onNavigate('/ai')}
            className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-mono font-bold text-xs tracking-wider transition-all shadow-[0_0_15px_rgba(6,182,212,0.3)] flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>LAUNCH SCAR</span>
            <ChevronRight className="w-4 h-4 text-slate-950" />
          </button>
        </section>

        {/* ==================================================== */}
        {/* SECTION B: DAILY ROUTINE */}
        {/* ==================================================== */}
        <section id="settings-routine-section" className="rounded-2xl bg-[#090d1c]/90 border border-purple-500/30 p-4 shadow-[0_0_20px_rgba(168,85,247,0.08)]">
          <div className="flex items-center justify-between mb-3 border-b border-purple-950/60 pb-2">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-purple-400" />
              <h2 className="text-xs font-mono font-bold tracking-widest text-purple-300 uppercase">
                DAILY ROUTINE
              </h2>
            </div>
            <span className="text-[10px] font-mono text-purple-400/90">
              {activeRoutineCount} / {routineItems.length} ACTIVE
            </span>
          </div>

          {/* Quick summary of routine protocols */}
          <div className="space-y-1.5 mb-3 max-h-48 overflow-y-auto pr-1 scrollbar-thin">
            {routineItems.slice(0, 5).map((item) => (
              <div
                key={item.id}
                className={`flex items-center justify-between p-2 rounded-lg text-xs font-mono ${
                  item.enabled !== false
                    ? 'bg-slate-900/80 border border-slate-800 text-slate-200'
                    : 'bg-slate-950/40 border border-slate-900/60 text-slate-500 opacity-60'
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-400 flex-shrink-0" />
                  <span className="truncate font-medium">{item.title}</span>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0 text-[11px] text-slate-400">
                  <span>{item.timeSpan || item.startTime}</span>
                  <span className="text-amber-400/80">+{item.xp}XP</span>
                </div>
              </div>
            ))}
            {routineItems.length > 5 && (
              <p className="text-[10px] text-center font-mono text-slate-500 pt-1">
                + {routineItems.length - 5} more routine blocks...
              </p>
            )}
          </div>

          <button
            id="customize-routine-nav-btn"
            onClick={() => onNavigate('/settings/routine')}
            className="w-full py-2.5 px-3 rounded-xl bg-purple-950/50 border border-purple-500/40 hover:bg-purple-900/50 text-purple-200 text-xs font-mono font-bold tracking-wider flex items-center justify-center gap-2 transition-colors shadow-[0_0_15px_rgba(168,85,247,0.15)]"
          >
            <span>CUSTOMIZE DAILY PROTOCOLS</span>
            <ChevronRight className="w-4 h-4 text-purple-400" />
          </button>
        </section>

        {/* ==================================================== */}
        {/* SECTION C: WATER TRACKER SETTINGS */}
        {/* ==================================================== */}
        <section id="settings-water-section" className="rounded-2xl bg-[#090d1c]/90 border border-cyan-500/30 p-4 shadow-[0_0_20px_rgba(6,182,212,0.08)]">
          <div className="flex items-center justify-between mb-3 border-b border-cyan-950/60 pb-2">
            <div className="flex items-center gap-2">
              <Droplets className="w-4 h-4 text-cyan-400" />
              <h2 className="text-xs font-mono font-bold tracking-widest text-cyan-300 uppercase">
                HYDRATION TARGET
              </h2>
            </div>
            <span className="text-xs font-mono text-cyan-300 font-bold">
              {(targetMl / 1000).toFixed(1)} L / DAY
            </span>
          </div>

          <div className="flex flex-col gap-3">
            {/* Quick adjust pills */}
            <div className="flex items-center gap-2">
              <button
                id="water-target-minus-250"
                onClick={() => handleQuickWaterAdjust(-250)}
                className="flex-1 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 text-xs font-mono hover:border-cyan-500/40 hover:text-cyan-300 transition-colors"
              >
                -250 ML
              </button>
              <button
                id="water-target-plus-250"
                onClick={() => handleQuickWaterAdjust(250)}
                className="flex-1 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 text-xs font-mono hover:border-cyan-500/40 hover:text-cyan-300 transition-colors"
              >
                +250 ML
              </button>
              <button
                id="water-target-plus-500"
                onClick={() => handleQuickWaterAdjust(500)}
                className="flex-1 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 text-xs font-mono hover:border-cyan-500/40 hover:text-cyan-300 transition-colors"
              >
                +500 ML
              </button>
            </div>

            {/* Direct Input */}
            <form onSubmit={handleSaveWaterInput} className="flex items-center gap-2">
              <div className="relative flex-1">
                <input
                  id="water-target-input"
                  type="number"
                  min={500}
                  max={10000}
                  step={50}
                  value={waterInput}
                  onChange={(e) => setWaterInput(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-100 text-xs font-mono focus:outline-none focus:border-cyan-500 pr-10"
                />
                <span className="absolute right-3 top-2 text-[10px] font-mono text-slate-500">
                  ML
                </span>
              </div>
              <button
                id="save-water-target-btn"
                type="submit"
                className="px-3.5 py-1.5 rounded-lg bg-cyan-500/20 border border-cyan-500/50 hover:bg-cyan-500/30 text-cyan-300 text-xs font-mono font-bold tracking-wider transition-colors"
              >
                SET
              </button>
            </form>

            {waterError && (
              <p className="text-[11px] text-rose-400 font-mono flex items-center gap-1">
                <AlertTriangle className="w-3 h-3 flex-shrink-0" />
                <span>{waterError}</span>
              </p>
            )}
          </div>
        </section>

        {/* ==================================================== */}
        {/* SECTION D: APPEARANCE */}
        {/* ==================================================== */}
        <section id="settings-appearance-section" className="rounded-2xl bg-[#090d1c]/90 border border-slate-800 p-4">
          <div className="flex items-center justify-between mb-3 border-b border-slate-800/80 pb-2">
            <div className="flex items-center gap-2">
              <Palette className="w-4 h-4 text-cyan-400" />
              <h2 className="text-xs font-mono font-bold tracking-widest text-slate-300 uppercase">
                APPEARANCE
              </h2>
            </div>
            <span className="text-[10px] font-mono text-cyan-400 uppercase">DARK SYSTEM HUD</span>
          </div>

          <div className="flex flex-col gap-3">
            <div>
              <label className="text-[11px] font-mono text-slate-400 block mb-2 uppercase tracking-wider">
                System Accent Lighting
              </label>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { id: 'blue', name: 'HUNTER', color: 'bg-cyan-500 border-cyan-400' },
                  { id: 'purple', name: 'SHADOW', color: 'bg-purple-500 border-purple-400' },
                  { id: 'red', name: 'CRIMSON', color: 'bg-rose-500 border-rose-400' },
                  { id: 'gold', name: 'MONARCH', color: 'bg-amber-500 border-amber-400' },
                ].map((acc) => (
                  <button
                    key={acc.id}
                    id={`accent-btn-${acc.id}`}
                    type="button"
                    onClick={() => {
                      updateAccentColor(acc.id as any);
                      showToast(`${acc.name} Accent Applied`);
                    }}
                    className={`py-2 px-1 rounded-xl border text-center font-mono text-[10px] font-bold tracking-wider transition-all flex flex-col items-center gap-1.5 ${
                      settings.accentColor === acc.id
                        ? 'bg-slate-900 border-cyan-400 text-white shadow-[0_0_12px_rgba(6,182,212,0.3)]'
                        : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <span className={`w-3 h-3 rounded-full ${acc.color}`} />
                    <span>{acc.name}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
              <div>
                <h4 className="text-xs font-semibold text-slate-200">Compact Density HUD</h4>
                <p className="text-[10px] text-slate-400">Streamline card padding for smaller viewports</p>
              </div>
              <button
                id="toggle-compact-mode-btn"
                type="button"
                onClick={toggleCompactMode}
                className={`w-10 h-6 rounded-full transition-colors relative flex items-center px-0.5 ${
                  settings.compactMode
                    ? 'bg-cyan-500/30 border border-cyan-500/60'
                    : 'bg-slate-800 border border-slate-700'
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full transition-all ${
                    settings.compactMode
                      ? 'bg-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.8)] ml-4'
                      : 'bg-slate-500 ml-0.5'
                  }`}
                />
              </button>
            </div>
          </div>
        </section>

        {/* ==================================================== */}
        {/* SECTION E: NOTIFICATIONS & REMINDERS */}
        {/* ==================================================== */}
        <section id="settings-notifications-section" className="rounded-2xl bg-[#090d1c]/90 border border-slate-800 p-4">
          <div className="flex items-center justify-between mb-3 border-b border-slate-800/80 pb-2">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-purple-400" />
              <h2 className="text-xs font-mono font-bold tracking-widest text-slate-300 uppercase">
                REMINDER PREFERENCES
              </h2>
            </div>
            <span className="text-[10px] font-mono text-purple-400">PWA NOTIFICATIONS</span>
          </div>

          <div className="space-y-2.5 mb-3">
            {[
              {
                key: 'dailyReminder',
                title: 'Daily Routine Schedule Alert',
                desc: 'Alerts aligned with your customized routine schedule',
              },
              {
                key: 'workoutReminder',
                title: 'Combat Workout Reminder',
                desc: 'Alert for today’s workout plan (Sunday recovery respected)',
              },
              {
                key: 'waterReminder',
                title: 'Hydration Target Alerts',
                desc: 'Periodic reminders to reach daily water goal during active routine',
              },
              {
                key: 'questCompletion',
                title: 'Quest Completion Alert',
                desc: 'Instant ping upon finishing a quest (+XP reward)',
              },
              {
                key: 'rewardReady',
                title: 'Mystery Reward Unlocked Alert',
                desc: 'Alert immediately when daily 100% threshold is reached',
              },
            ].map((item) => {
              const active = (settings.notifications as any)[item.key];
              return (
                <div
                  key={item.key}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/80"
                >
                  <div className="pr-3">
                    <h4 className="text-xs font-medium text-slate-200">{item.title}</h4>
                    <p className="text-[10px] text-slate-400 leading-normal">{item.desc}</p>
                  </div>
                  <button
                    id={`toggle-notification-${item.key}`}
                    type="button"
                    onClick={() => handleToggleNotification(item.key, !active)}
                    className={`w-10 h-6 rounded-full transition-colors relative flex items-center px-0.5 flex-shrink-0 ${
                      active
                        ? 'bg-purple-500/30 border border-purple-500/60'
                        : 'bg-slate-800 border border-slate-700'
                    }`}
                  >
                    <div
                      className={`w-4 h-4 rounded-full transition-all ${
                        active
                          ? 'bg-purple-400 shadow-[0_0_8px_rgba(168,85,247,0.8)] ml-4'
                          : 'bg-slate-500 ml-0.5'
                      }`}
                    />
                  </button>
                </div>
              );
            })}
          </div>

          <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 text-[11px] font-mono text-slate-400 flex items-start gap-2">
            <Info className="w-3.5 h-3.5 text-purple-400 flex-shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              Background reminders depend on your device and browser support. Notifications are sent only when enabled with permission.
            </p>
          </div>
        </section>

        {/* ==================================================== */}
        {/* SECTION F: GAMIFICATION */}
        {/* ==================================================== */}
        <section id="settings-gamification-section" className="rounded-2xl bg-[#090d1c]/90 border border-slate-800 p-4">
          <div className="flex items-center justify-between mb-3 border-b border-slate-800/80 pb-2">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-400" />
              <h2 className="text-xs font-mono font-bold tracking-widest text-slate-300 uppercase">
                GAMIFICATION HUD
              </h2>
            </div>
            <span className="text-[10px] font-mono text-amber-400">XP & REWARDS</span>
          </div>

          <div className="space-y-2.5">
            {[
              {
                key: 'floatingXp',
                title: 'Floating XP Particles',
                desc: 'Show floating animated XP gains when tasks are checked',
              },
              {
                key: 'levelUpModal',
                title: 'Level-Up Celebration Screen',
                desc: 'Display modal ceremony when ascending to a new level',
              },
              {
                key: 'soundEffects',
                title: 'Haptic / Audio Cues',
                desc: 'Audio feedback on quest completions and level ups',
              },
            ].map((item) => {
              const active = (settings.gamification as any)[item.key];
              return (
                <div
                  key={item.key}
                  className="flex items-center justify-between p-2 rounded-xl bg-slate-900/60 border border-slate-800/80"
                >
                  <div>
                    <h4 className="text-xs font-medium text-slate-200">{item.title}</h4>
                    <p className="text-[10px] text-slate-400">{item.desc}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {item.key === 'soundEffects' && active && (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            playQuestComplete({ force: true });
                          }}
                          className="px-1.5 py-0.5 rounded bg-cyan-950/80 border border-cyan-500/40 text-[9px] font-hud text-cyan-300 hover:text-white hover:border-cyan-400 active:scale-95 transition-all cursor-pointer"
                          title="Preview quest-complete.mp3"
                        >
                          QUEST
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            playLevelUp({ force: true });
                          }}
                          className="px-1.5 py-0.5 rounded bg-purple-950/80 border border-purple-500/40 text-[9px] font-hud text-purple-300 hover:text-white hover:border-purple-400 active:scale-95 transition-all cursor-pointer"
                          title="Preview level-up.mp3"
                        >
                          LVL UP
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            playUiClick({ force: true });
                          }}
                          className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-600 text-[9px] font-hud text-slate-300 hover:text-white hover:border-slate-400 active:scale-95 transition-all cursor-pointer"
                          title="Preview ui-click.mp3"
                        >
                          CLICK
                        </button>
                      </div>
                    )}
                    <button
                      id={`toggle-gamification-${item.key}`}
                      type="button"
                      onClick={() => {
                        const nextVal = !active;
                        updateGamificationPref(item.key as any, nextVal);
                        if (item.key === 'soundEffects') {
                          if (nextVal) {
                            playQuestComplete({ force: true });
                          }
                        } else {
                          playUiClick({ force: true });
                        }
                      }}
                      className={`w-10 h-6 rounded-full transition-colors relative flex items-center px-0.5 cursor-pointer ${
                        active
                          ? 'bg-amber-500/30 border border-amber-500/60'
                          : 'bg-slate-800 border border-slate-700'
                      }`}
                    >
                      <div
                        className={`w-4 h-4 rounded-full transition-all ${
                          active
                            ? 'bg-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.8)] ml-4'
                            : 'bg-slate-500 ml-0.5'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* ==================================================== */}
        {/* SECTION: PWA APPLICATION & OFFLINE ENGINE */}
        {/* ==================================================== */}
        <section id="settings-pwa-section" className="rounded-2xl bg-[#090d1c]/90 border border-slate-800 p-4">
          <div className="flex items-center justify-between mb-3 border-b border-slate-800/80 pb-2">
            <div className="flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-cyan-400" />
              <h2 className="text-xs font-mono font-bold tracking-widest text-slate-300 uppercase">
                PWA & OFFLINE ENGINE
              </h2>
            </div>
            <span className="text-[10px] font-mono text-cyan-400">STANDALONE READY</span>
          </div>

          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2 text-xs font-mono">
              <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
                <span className="text-[10px] text-slate-400 block mb-1">Display Mode</span>
                <span className={`font-bold ${isInstalled ? 'text-emerald-400' : 'text-cyan-300'}`}>
                  {isInstalled ? 'Installed Standalone' : 'Browser Viewport'}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
                <span className="text-[10px] text-slate-400 block mb-1">Network Status</span>
                <span className={`font-bold flex items-center gap-1.5 ${isOnline ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {isOnline ? <Wifi className="w-3.5 h-3.5 text-emerald-400" /> : <WifiOff className="w-3.5 h-3.5 text-amber-400" />}
                  <span>{isOnline ? 'Online' : 'Offline Mode'}</span>
                </span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between text-xs font-mono">
              <div>
                <span className="text-slate-200 font-semibold block">Offline Asset Cache</span>
                <span className="text-[10px] text-slate-400">Service worker precached for offline launch</span>
              </div>
              <span className="px-2 py-0.5 rounded bg-emerald-950/80 border border-emerald-500/40 text-emerald-400 text-[10px] font-bold">
                ACTIVE
              </span>
            </div>

            {isInstallable && !isInstalled && (
              <button
                id="install-pwa-settings-btn"
                type="button"
                onClick={installApp}
                className="w-full py-2.5 px-3 rounded-xl bg-cyan-500/20 border border-cyan-500/50 hover:bg-cyan-500/30 text-cyan-300 text-xs font-mono font-bold tracking-wider flex items-center justify-center gap-2 transition-colors shadow-[0_0_15px_rgba(6,182,212,0.2)]"
              >
                <Download className="w-4 h-4 text-cyan-400" />
                <span>INSTALL QUESTLIFE TO HOME SCREEN</span>
              </button>
            )}
          </div>
        </section>

        {/* ==================================================== */}
        {/* SECTION G: DATA MANAGEMENT */}
        {/* ==================================================== */}
        <section id="settings-data-section" className="rounded-2xl bg-[#090d1c]/90 border border-slate-800 p-4">
          <div className="flex items-center justify-between mb-3 border-b border-slate-800/80 pb-2">
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-cyan-400" />
              <h2 className="text-xs font-mono font-bold tracking-widest text-slate-300 uppercase">
                DATA MANAGEMENT
              </h2>
            </div>
            <span className="text-[10px] font-mono text-slate-400">STORAGE & BACKUPS</span>
          </div>

          <div className="space-y-2.5">
            {/* Export button */}
            <button
              id="export-data-btn"
              onClick={exportUserDataJson}
              className="w-full py-2.5 px-3 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-cyan-500/40 text-slate-200 hover:text-cyan-300 text-xs font-mono tracking-wider flex items-center justify-between transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <Download className="w-4 h-4 text-cyan-400" />
                <div className="text-left">
                  <div className="font-semibold text-slate-100">EXPORT MY DATA</div>
                  <div className="text-[10px] text-slate-400">Download complete QuestLife JSON backup</div>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-500" />
            </button>

            {/* Hidden file input for backup restore */}
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              className="hidden"
              onChange={handleFileSelect}
            />

            {/* Import / Restore Backup Button */}
            <button
              id="import-data-btn"
              onClick={() => fileInputRef.current?.click()}
              className="w-full py-2.5 px-3 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-purple-500/40 text-slate-200 hover:text-purple-300 text-xs font-mono tracking-wider flex items-center justify-between transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <Upload className="w-4 h-4 text-purple-400" />
                <div className="text-left">
                  <div className="font-semibold text-slate-100">IMPORT BACKUP (.JSON)</div>
                  <div className="text-[10px] text-slate-400">Restore application snapshot from file</div>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-500" />
            </button>

            {restoreError && (
              <div className="p-2.5 rounded-lg bg-rose-950/30 border border-rose-900/50 text-rose-300 text-[11px] font-mono flex items-center gap-2">
                <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 text-rose-400" />
                <span>{restoreError}</span>
              </div>
            )}


            {/* Reset Today Progress */}
            <button
              id="reset-today-progress-btn"
              onClick={() => setIsResetTodayModalOpen(true)}
              className="w-full py-2.5 px-3 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-amber-500/40 text-slate-200 hover:text-amber-300 text-xs font-mono tracking-wider flex items-center justify-between transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <RotateCcw className="w-4 h-4 text-amber-400" />
                <div className="text-left">
                  <div className="font-semibold text-slate-100">RESET TODAY'S PROGRESS</div>
                  <div className="text-[10px] text-slate-400">Reverts quests, water, & workout for today</div>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-500" />
            </button>

            {/* Danger Zone: Reset All Data */}
            <div className="pt-2 border-t border-rose-950/40">
              <button
                id="reset-all-data-btn"
                onClick={() => setIsResetAllModalOpen(true)}
                className="w-full py-2.5 px-3 rounded-xl bg-rose-950/20 border border-rose-900/40 hover:bg-rose-950/40 text-rose-300 text-xs font-mono tracking-wider flex items-center justify-between transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-rose-400" />
                  <div className="text-left">
                    <div className="font-semibold text-rose-200">RESET ALL DATA</div>
                    <div className="text-[10px] text-rose-400/70">Wipe all local storage and history</div>
                  </div>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-950 border border-rose-800 text-rose-400">
                  DANGER
                </span>
              </button>
            </div>
          </div>
        </section>

        {/* ==================================================== */}
        {/* SECTION H: APP INFO & DIAGNOSTICS */}
        {/* ==================================================== */}
        <section id="settings-about-section" className="rounded-2xl bg-[#090d1c]/90 border border-slate-800/80 p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-slate-400" />
              <h2 className="text-xs font-mono font-bold tracking-widest text-slate-300 uppercase">
                SYSTEM DIAGNOSTICS
              </h2>
            </div>
            <span className="text-[10px] font-mono text-cyan-400 font-bold">ONLINE</span>
          </div>

          <div className="space-y-1 text-xs font-mono text-slate-400 pt-1">
            <div className="flex justify-between py-1 border-b border-slate-900">
              <span>SYSTEM VERSION</span>
              <span className="text-slate-200">1.0.0 (PHASE 8 BUILD)</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-900">
              <span>CORE ARCHITECTURE</span>
              <span className="text-slate-200">HUNTER SYSTEM PROTOCOL</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-900">
              <span>DATA PERSISTENCE</span>
              <span className="text-slate-200">BROWSER LOCAL STORAGE</span>
            </div>
            <div className="flex justify-between py-1">
              <span>SIMULATED DATE</span>
              <span className="text-cyan-300">{todayFormatted}</span>
            </div>
          </div>

          {/* Collapsible Developer Testing Tools */}
          <div className="mt-3 pt-3 border-t border-slate-800/60">
            <button
              onClick={() => setShowDevTools(!showDevTools)}
              className="w-full py-1 text-[11px] font-mono text-slate-500 hover:text-cyan-400 flex items-center justify-between"
            >
              <span>{showDevTools ? '▼ HIDE DEV TESTING TOOLS' : '▶ EXPAND DEV TESTING TOOLS'}</span>
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800">
                QA
              </span>
            </button>

            {showDevTools && (
              <div className="mt-2 space-y-2 pt-2 border-t border-slate-800/40">
                <button
                  onClick={advanceDayForTesting}
                  className="w-full py-2 px-3 rounded-lg bg-slate-900 border border-slate-800 hover:border-cyan-500/40 text-cyan-300 text-xs font-mono flex items-center justify-center gap-2"
                >
                  <FastForward className="w-3.5 h-3.5" />
                  <span>ADVANCE SYSTEM DATE (+1 DAY)</span>
                </button>
                <button
                  onClick={resetDayForTesting}
                  className="w-full py-2 px-3 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 text-xs font-mono flex items-center justify-center gap-2"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>RESET TO REAL CALENDAR TODAY</span>
                </button>
                <button
                  onClick={completeAllForTest}
                  className="w-full py-2 px-3 rounded-lg bg-slate-900 border border-slate-800 hover:border-amber-500/40 text-amber-300 text-xs font-mono flex items-center justify-center gap-2"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>COMPLETE ALL DAILY PROTOCOLS (TEST 100%)</span>
                </button>
              </div>
            )}
          </div>
        </section>
      </div>

      {/* ==================================================== */}
      {/* MODAL: RESET TODAY CONFIRMATION */}
      {/* ==================================================== */}
      <AnimatePresence>
        {isResetTodayModalOpen && (
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
                    RESET TODAY'S PROGRESS?
                  </h3>
                  <p className="text-[11px] text-slate-400">Session recovery protocol</p>
                </div>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed">
                This will reset today's quest checkboxes, workout exercises, and water intake to zero. Your historical calendar, streaks, and lifetime XP will remain completely preserved.
              </p>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  onClick={() => setIsResetTodayModalOpen(false)}
                  className="px-3.5 py-1.5 rounded-lg text-xs font-mono text-slate-400 hover:text-slate-200"
                >
                  CANCEL
                </button>
                <button
                  id="confirm-reset-today-btn"
                  onClick={handleConfirmResetToday}
                  className="px-4 py-1.5 rounded-lg bg-amber-500 text-slate-950 text-xs font-mono font-bold tracking-wider hover:bg-amber-400 transition-colors shadow-[0_0_15px_rgba(245,158,11,0.4)]"
                >
                  RESET TODAY
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ==================================================== */}
      {/* MODAL: RESET ALL DATA CONFIRMATION */}
      {/* ==================================================== */}
      <AnimatePresence>
        {isResetAllModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-sm rounded-2xl bg-[#140608] border border-rose-500/50 p-5 shadow-[0_0_50px_rgba(244,63,94,0.3)] flex flex-col gap-4 text-slate-100"
            >
              <div className="flex items-center gap-3 text-rose-400">
                <div className="p-2.5 rounded-xl bg-rose-500/20 border border-rose-500/40">
                  <AlertTriangle className="w-5 h-5 text-rose-400" />
                </div>
                <div>
                  <h3 className="text-sm font-bold font-mono tracking-wider uppercase text-rose-200">
                    PURGE ALL QUESTLIFE DATA?
                  </h3>
                  <p className="text-[11px] text-rose-400/80">Permanent storage wipeout</p>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-rose-950/40 border border-rose-900/60 text-xs text-rose-200 leading-relaxed">
                WARNING: This will permanently delete all your daily quest records, workouts, water logs, unlocked rewards, custom routine items, and reset your Hunter level back to Level 1.
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-rose-950/60">
                <button
                  onClick={() => setIsResetAllModalOpen(false)}
                  className="px-3.5 py-1.5 rounded-lg text-xs font-mono text-slate-400 hover:text-slate-200"
                >
                  CANCEL
                </button>
                <button
                  id="confirm-reset-all-btn"
                  onClick={handleConfirmResetAll}
                  className="px-4 py-1.5 rounded-lg bg-rose-600 text-white text-xs font-mono font-bold tracking-wider hover:bg-rose-500 transition-colors shadow-[0_0_20px_rgba(244,63,94,0.5)]"
                >
                  CONFIRM PURGE
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ==================================================== */}
      {/* MODAL: BACKUP RESTORE CONFIRMATION */}
      {/* ==================================================== */}
      <AnimatePresence>
        {isRestoreModalOpen && pendingBackup && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md rounded-2xl bg-[#0e0c1f] border border-purple-500/50 p-5 shadow-[0_0_50px_rgba(168,85,247,0.3)] flex flex-col gap-4 text-slate-100"
            >
              <div className="flex items-center gap-3 text-purple-400">
                <div className="p-2.5 rounded-xl bg-purple-500/20 border border-purple-500/40">
                  <FileCheck className="w-5 h-5 text-purple-300" />
                </div>
                <div>
                  <h3 className="text-sm font-bold font-mono tracking-wider uppercase text-purple-200">
                    RESTORE SYSTEM SNAPSHOT?
                  </h3>
                  <p className="text-[11px] text-purple-400/80">Valid QuestLife Schema V{pendingBackup.schemaVersion}</p>
                </div>
              </div>

              {/* Snapshot Metadata card */}
              <div className="rounded-xl bg-[#090714] border border-purple-900/50 p-3.5 space-y-2 text-xs font-mono">
                <div className="flex items-center justify-between text-slate-400">
                  <span>Hunter:</span>
                  <span className="text-purple-300 font-bold">{pendingBackup.profile.userName}</span>
                </div>
                <div className="flex items-center justify-between text-slate-400">
                  <span>Rank & Level:</span>
                  <span className="text-cyan-400 font-semibold">
                    Level {getLevelInfo(pendingBackup.profile.totalXP).level} ({pendingBackup.profile.totalXP} XP)
                  </span>
                </div>
                <div className="flex items-center justify-between text-slate-400">
                  <span>Streak:</span>
                  <span className="text-amber-400 font-semibold">{pendingBackup.profile.streak} Days</span>
                </div>
                <div className="flex items-center justify-between text-slate-400">
                  <span>Routine Items:</span>
                  <span className="text-slate-200">{pendingBackup.routine?.length || 0} configured</span>
                </div>
                <div className="flex items-center justify-between text-slate-400">
                  <span>Backup Timestamp:</span>
                  <span className="text-[10px] text-slate-300">
                    {new Date(pendingBackup.exportedAt).toLocaleDateString()} {new Date(pendingBackup.exportedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-amber-950/20 border border-amber-800/40 text-xs text-amber-200/90 leading-relaxed">
                Restoring will replace all current tasks, water history, and workout logs with the state contained in this backup.
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-purple-900/40">
                <button
                  onClick={() => {
                    setIsRestoreModalOpen(false);
                    setPendingBackup(null);
                  }}
                  className="px-3.5 py-1.5 rounded-lg text-xs font-mono text-slate-400 hover:text-slate-200"
                >
                  CANCEL
                </button>
                <button
                  id="confirm-restore-backup-btn"
                  onClick={handleConfirmRestore}
                  className="px-4 py-1.5 rounded-lg bg-purple-600 text-white text-xs font-mono font-bold tracking-wider hover:bg-purple-500 transition-colors shadow-[0_0_20px_rgba(168,85,247,0.5)]"
                >
                  APPLY RESTORE
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ==================================================== */}
      {/* MODAL: LOG OUT CONFIRMATION */}
      {/* ==================================================== */}
      <AnimatePresence>
        {isLogoutModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-sm rounded-2xl bg-[#0f0d1a] border border-rose-500/40 p-5 shadow-[0_0_50px_rgba(244,63,94,0.25)] flex flex-col gap-4 text-slate-100"
            >
              <div className="flex items-center gap-3 text-rose-400">
                <div className="p-2.5 rounded-xl bg-rose-500/20 border border-rose-500/40">
                  <LogOut className="w-5 h-5 text-rose-300" />
                </div>
                <div>
                  <h3 className="text-sm font-bold font-mono tracking-wider uppercase text-rose-200">
                    LOG OUT OF QUESTLIFE?
                  </h3>
                  <p className="text-[11px] text-rose-400/80">Security Protocol Verification</p>
                </div>
              </div>

              <p className="text-xs font-mono text-slate-300 leading-relaxed">
                Are you sure you want to log out? Your cloud data will remain safely preserved in Supabase. You will need your credentials to log back in.
              </p>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-rose-950/60">
                <button
                  type="button"
                  id="cancel-logout-btn"
                  onClick={() => setIsLogoutModalOpen(false)}
                  className="px-3.5 py-1.5 rounded-lg text-xs font-mono text-slate-400 hover:text-slate-200 cursor-pointer"
                >
                  CANCEL
                </button>
                <button
                  type="button"
                  id="confirm-logout-btn"
                  onClick={handleConfirmLogout}
                  className="px-4 py-1.5 rounded-lg bg-rose-600 text-white text-xs font-mono font-bold tracking-wider hover:bg-rose-500 transition-colors shadow-[0_0_20px_rgba(244,63,94,0.5)] cursor-pointer"
                >
                  LOG OUT
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ==================================================== */}
      {/* MODAL: NOTIFICATION PERMISSION REQUEST */}
      {/* ==================================================== */}
      <NotificationPermissionModal
        isOpen={isNotificationModalOpen}
        onAllow={handleAllowNotificationPermission}
        onDismiss={() => {
          setIsNotificationModalOpen(false);
          setPendingNotificationKey(null);
        }}
      />
    </div>
  );
};

