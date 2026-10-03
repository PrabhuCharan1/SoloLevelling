import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { getSupabase, isSupabaseConfigured } from '../services/supabaseClient.ts';
import {
  fetchCloudProfile,
  upsertCloudProfile,
  checkHasCloudData,
  fetchFullCloudState,
  uploadFullLocalStateToCloud,
  SyncState,
} from '../services/supabaseSync.ts';
import {
  getStoredData,
} from '../utils/storageCore.ts';
import {
  exportFullBackupPayload,
  applyRestoredBackupToStorage,
} from '../utils/exportManager.ts';
import { loadUserProfile, saveUserProfile, getTodayDateKey } from '../utils/questStorage.ts';

export interface HunterProfile {
  id: string;
  name: string;
  email?: string;
}

interface AuthContextType {
  user: User | null;
  profile: HunterProfile | null;
  session: Session | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isConfigured: boolean;
  syncStatus: SyncState;
  syncError: string | null;
  requiresEmailConfirmation: boolean;
  pendingLocalMigration: boolean;
  signUp: (
    name: string,
    email: string,
    password: string
  ) => Promise<{ success: boolean; error?: string; requiresConfirmation?: boolean }>;
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
  updateProfileName: (newName: string) => Promise<boolean>;
  saveLocalToCloud: () => Promise<boolean>;
  startFreshCloud: () => Promise<void>;
  dismissMigrationPrompt: () => void;
  setSyncStatus: (status: SyncState) => void;
  reloadFromCloud: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * Checks whether meaningful local progress exists on this device prior to cloud sync.
 */
function checkLocalProgressExists(): boolean {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return false;
    const profile = loadUserProfile(getTodayDateKey());
    const hasXpProgress = profile.totalXP > 0;
    const hasStreak = profile.streak > 0;
    const hasCompletedDays = (profile.completedDays?.length ?? 0) > 0;
    
    // Check if any daily completed items exist
    const hasQuests = Object.keys(window.localStorage).some((key) =>
      key.startsWith('questlife_daily_') && key !== 'questlife_daily_' + getTodayDateKey()
    );

    return hasXpProgress || hasStreak || hasCompletedDays || hasQuests;
  } catch {
    return false;
  }
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<HunterProfile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [syncStatus, setSyncStatus] = useState<SyncState>(() => (navigator.onLine ? 'synced' : 'offline'));
  const [syncError, setSyncError] = useState<string | null>(null);
  const [requiresEmailConfirmation, setRequiresEmailConfirmation] = useState<boolean>(false);
  const [pendingLocalMigration, setPendingLocalMigration] = useState<boolean>(false);

  // Monitor online / offline network state
  useEffect(() => {
    const handleOnline = () => {
      setSyncStatus('synced');
    };
    const handleOffline = () => {
      setSyncStatus('offline');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Restore existing session on initial load
  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase || !isSupabaseConfigured) {
      setIsLoading(false);
      return;
    }

    let isMounted = true;

    async function initSession() {
      try {
        const { data: { session: existingSession }, error } = await supabase.auth.getSession();
        if (error) {
          console.warn('[Auth] Session check warning:', error.message);
        }

        if (existingSession && existingSession.user && isMounted) {
          setSession(existingSession);
          setUser(existingSession.user);

          // Fetch cloud profile
          const cloudProfile = await fetchCloudProfile(existingSession.user.id);
          const hunterName =
            cloudProfile?.name ||
            existingSession.user.user_metadata?.name ||
            'HUNTER';

          setProfile({
            id: existingSession.user.id,
            name: hunterName,
            email: existingSession.user.email,
          });

          // Sync hunter name to local profile as well
          const localProf = loadUserProfile(getTodayDateKey());
          if (localProf.userName !== hunterName) {
            localProf.userName = hunterName;
            localProf.avatarInitial = hunterName.charAt(0).toUpperCase();
            saveUserProfile(localProf);
          }
        }
      } catch (err) {
        console.error('[Auth] Error initializing session:', err);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    initSession();

    // Listen to Supabase auth state changes
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        if (!isMounted) return;

        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          if (newSession && newSession.user) {
            setSession(newSession);
            setUser(newSession.user);
            const cloudProf = await fetchCloudProfile(newSession.user.id);
            const hunterName =
              cloudProf?.name ||
              newSession.user.user_metadata?.name ||
              'HUNTER';

            setProfile({
              id: newSession.user.id,
              name: hunterName,
              email: newSession.user.email,
            });
          }
        } else if (event === 'SIGNED_OUT') {
          setSession(null);
          setUser(null);
          setProfile(null);
          setPendingLocalMigration(false);
        }
      }
    );

    return () => {
      isMounted = false;
      authListener?.subscription.unsubscribe();
    };
  }, []);

  /**
   * Reload all cloud data into local storage (used when logging in on new device)
   */
  const reloadFromCloud = useCallback(async (): Promise<boolean> => {
    const supabase = getSupabase();
    if (!supabase || !user) return false;

    setSyncStatus('syncing');
    try {
      const cloudData = await fetchFullCloudState(user.id);
      if (!cloudData) {
        setSyncStatus('synced');
        return false;
      }

      // Build payload for applyRestoredBackupToStorage
      const backupPayload = exportFullBackupPayload();
      
      if (cloudData.profile?.name) {
        backupPayload.profile.userName = cloudData.profile.name;
        backupPayload.profile.avatarInitial = cloudData.profile.name.charAt(0).toUpperCase();
      }

      if (cloudData.settings) {
        backupPayload.settings = cloudData.settings;
      }

      if (cloudData.routine && cloudData.routine.length > 0) {
        backupPayload.routine = cloudData.routine;
      }

      if (cloudData.dailyQuests) {
        backupPayload.dailyData = cloudData.dailyQuests;
      }

      if (cloudData.workouts) {
        backupPayload.workoutData = cloudData.workouts;
      }

      if (cloudData.water) {
        backupPayload.waterData = {
          targetMl: cloudData.settings?.waterTargetMl || 3000,
          history: cloudData.water,
        };
      }

      if (cloudData.rewards) {
        backupPayload.rewardData = {
          history: Object.values(cloudData.rewards),
          daily: cloudData.rewards,
        };
      }

      if (cloudData.dailyHistory) {
        backupPayload.history = cloudData.dailyHistory;
      }

      if (cloudData.xpTransactions && cloudData.xpTransactions.length > 0) {
        backupPayload.xpData.ledger = cloudData.xpTransactions;
        // Recalculate total XP from ledger + base
        const txTotal = cloudData.xpTransactions.reduce((acc, tx) => acc + tx.amount, 0);
        backupPayload.xpData.totalXp = Math.max(0, (backupPayload.xpData.baseXp || 0) + txTotal);
        backupPayload.profile.totalXP = backupPayload.xpData.totalXp;
      }

      // Apply restored state into local storage
      applyRestoredBackupToStorage(backupPayload);

      setSyncStatus('synced');
      return true;
    } catch (err: any) {
      console.error('[Auth] reloadFromCloud failed:', err);
      setSyncStatus('error');
      setSyncError(err?.message || 'Failed to download cloud data');
      return false;
    }
  }, [user]);

  /**
   * Email + Password Sign Up
   */
  const signUp = useCallback(
    async (
      name: string,
      email: string,
      password: string
    ): Promise<{ success: boolean; error?: string; requiresConfirmation?: boolean }> => {
      const supabase = getSupabase();
      if (!supabase || !isSupabaseConfigured) {
        return {
          success: false,
          error:
            'Supabase is not configured. Please define VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.',
        };
      }

      setSyncStatus('syncing');
      setSyncError(null);

      try {
        const trimmedName = name.trim() || 'HUNTER';
        const trimmedEmail = email.trim();
        const { data, error } = await supabase.auth.signUp({
          email: trimmedEmail,
          password,
          options: {
            data: {
              name: trimmedName,
            },
          },
        });

        if (error) {
          setSyncStatus('error');
          let friendlyError = error.message;
          if (friendlyError.toLowerCase().includes('already registered')) {
            friendlyError = 'This email is already registered. Please login instead.';
          }
          setSyncError(friendlyError);
          return { success: false, error: friendlyError };
        }

        if (!data.user) {
          setSyncStatus('error');
          return { success: false, error: 'Sign up failed: unable to create user.' };
        }

        let activeSession = data.session;
        let activeUser = data.user;

        // If session was not immediately returned by Supabase, attempt auto-confirm and immediate sign-in
        if (!activeSession) {
          try {
            await fetch('/api/auth/auto-confirm', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email: trimmedEmail }),
            });
          } catch {
            // Ignore if backend auto-confirm route is unreachable
          }

          const loginAttempt = await supabase.auth.signInWithPassword({
            email: trimmedEmail,
            password,
          });

          if (loginAttempt.data?.session && loginAttempt.data?.user) {
            activeSession = loginAttempt.data.session;
            activeUser = loginAttempt.data.user;
          }
        }

        // Active session established - log in immediately without email confirmation
        if (activeSession && activeUser) {
          setSession(activeSession);
          setUser(activeUser);
          setProfile({
            id: activeUser.id,
            name: trimmedName,
            email: activeUser.email,
          });

          // Create profile in profiles table
          await upsertCloudProfile(activeUser.id, trimmedName);

          // Update local profile name
          const localProf = loadUserProfile(getTodayDateKey());
          localProf.userName = trimmedName;
          localProf.avatarInitial = trimmedName.charAt(0).toUpperCase();
          saveUserProfile(localProf);

          // Check for existing local data migration
          if (checkLocalProgressExists()) {
            setPendingLocalMigration(true);
          } else {
            // Upload initial state to cloud
            const currentBackup = exportFullBackupPayload();
            currentBackup.profile.userName = trimmedName;
            await uploadFullLocalStateToCloud(activeUser.id, currentBackup);
          }
        } else {
          // Local fallback in case session handshake delayed
          const localProf = loadUserProfile(getTodayDateKey());
          localProf.userName = trimmedName;
          localProf.avatarInitial = trimmedName.charAt(0).toUpperCase();
          saveUserProfile(localProf);
        }

        setRequiresEmailConfirmation(false);
        setSyncStatus('synced');
        return { success: true };
      } catch (err: any) {
        console.error('[Auth] Signup exception:', err);
        setSyncStatus('error');
        return { success: false, error: err?.message || 'Unable to connect. Please try again.' };
      }
    },
    []
  );

  /**
   * Email + Password Sign In
   */
  const signIn = useCallback(
    async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
      const supabase = getSupabase();
      if (!supabase || !isSupabaseConfigured) {
        return {
          success: false,
          error:
            'Supabase is not configured. Please define VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.',
        };
      }

      setSyncStatus('syncing');
      setSyncError(null);

      try {
        const trimmedEmail = email.trim();
        let { data, error } = await supabase.auth.signInWithPassword({
          email: trimmedEmail,
          password,
        });

        // If error indicates unconfirmed email, invoke backend auto-confirmation and retry immediately
        if (
          error &&
          (error.message.toLowerCase().includes('email not confirmed') ||
           error.message.toLowerCase().includes('not confirmed') ||
           error.message.toLowerCase().includes('email_not_confirmed'))
        ) {
          try {
            const confirmRes = await fetch('/api/auth/auto-confirm', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email: trimmedEmail }),
            });
            if (confirmRes.ok) {
              const retryRes = await supabase.auth.signInWithPassword({
                email: trimmedEmail,
                password,
              });
              data = retryRes.data;
              error = retryRes.error;
            }
          } catch (e) {
            console.warn('[Auth] Auto-confirm error during login retry:', e);
          }
        }

        if (error) {
          setSyncStatus('error');
          let friendlyMessage = 'Email or password is incorrect.';
          const lowerMsg = error.message.toLowerCase();

          if (lowerMsg.includes('fetch') || lowerMsg.includes('network') || lowerMsg.includes('failed to fetch')) {
            friendlyMessage = 'Unable to connect to authentication service. Please check your connection and try again.';
          } else if (
            lowerMsg.includes('invalid login credentials') ||
            lowerMsg.includes('invalid credentials') ||
            lowerMsg.includes('email not confirmed') ||
            lowerMsg.includes('not confirmed')
          ) {
            // NEVER show "Email not confirmed" or verification blocks.
            // Check only whether credentials are correct.
            friendlyMessage = 'Email or password is incorrect.';
          } else if (lowerMsg.includes('rate limit') || lowerMsg.includes('too many requests')) {
            friendlyMessage = 'Too many attempts. Please wait a moment and try again.';
          } else {
            friendlyMessage = 'Authentication failed. Please check your credentials.';
          }

          setSyncError(friendlyMessage);
          return { success: false, error: friendlyMessage };
        }

        if (!data.user || !data.session) {
          setSyncStatus('error');
          return { success: false, error: 'Email or password is incorrect.' };
        }

        setSession(data.session);
        setUser(data.user);

        // Fetch cloud profile
        const cloudProf = await fetchCloudProfile(data.user.id);
        const hunterName =
          cloudProf?.name || data.user.user_metadata?.name || 'HUNTER';

        setProfile({
          id: data.user.id,
          name: hunterName,
          email: data.user.email,
        });

        // Check if cloud data exists
        const hasCloud = await checkHasCloudData(data.user.id);
        const hasLocal = checkLocalProgressExists();

        if (hasCloud) {
          // Existing user with cloud data: restore cloud state onto this device
          await reloadFromCloud();
        } else if (hasLocal) {
          // New cloud account, but this device has local progress: prompt user to upload or start fresh
          setPendingLocalMigration(true);
        } else {
          // Fresh account with no prior local data: initialize cloud snapshot
          const initialPayload = exportFullBackupPayload();
          initialPayload.profile.userName = hunterName;
          await uploadFullLocalStateToCloud(data.user.id, initialPayload);
        }

        setSyncStatus('synced');
        return { success: true };
      } catch (err: any) {
        console.error('[Auth] Sign in exception:', err);
        setSyncStatus('error');
        const isNetwork =
          err?.message?.toLowerCase().includes('fetch') ||
          err?.message?.toLowerCase().includes('network') ||
          err?.name === 'TypeError';
        const msg = isNetwork ? 'Unable to connect. Please try again.' : err?.message || 'Login failed';
        return { success: false, error: msg };
      }
    },
    [reloadFromCloud]
  );

  /**
   * Log out of QuestLife
   */
  const signOut = useCallback(async () => {
    const supabase = getSupabase();
    try {
      if (supabase) {
        await supabase.auth.signOut();
      }
    } catch (err) {
      console.warn('[Auth] Sign out error:', err);
    } finally {
      setUser(null);
      setSession(null);
      setProfile(null);
      setPendingLocalMigration(false);
      setSyncStatus('synced');
    }
  }, []);

  /**
   * Update Profile Name in Cloud and Local
   */
  const updateProfileName = useCallback(
    async (newName: string): Promise<boolean> => {
      const trimmed = newName.trim();
      if (!trimmed) return false;

      if (profile) {
        setProfile((prev) => (prev ? { ...prev, name: trimmed } : null));
      }

      if (user) {
        await upsertCloudProfile(user.id, trimmed);
      }
      return true;
    },
    [user, profile]
  );

  /**
   * Save Local Progress to Authenticated User's Cloud Account
   */
  const saveLocalToCloud = useCallback(async (): Promise<boolean> => {
    if (!user) return false;

    setSyncStatus('syncing');
    try {
      const payload = exportFullBackupPayload();
      if (profile?.name) {
        payload.profile.userName = profile.name;
      }
      const res = await uploadFullLocalStateToCloud(user.id, payload);
      if (res.success) {
        setPendingLocalMigration(false);
        setSyncStatus('synced');
        return true;
      } else {
        setSyncStatus('error');
        setSyncError(res.error || 'Failed to save local progress to cloud');
        return false;
      }
    } catch (err: any) {
      console.error('[Auth] saveLocalToCloud error:', err);
      setSyncStatus('error');
      setSyncError(err?.message || 'Upload error');
      return false;
    }
  }, [user, profile]);

  /**
   * Start Fresh in Cloud (discards local progress and initializes fresh clean baseline)
   */
  const startFreshCloud = useCallback(async () => {
    if (!user) return;

    setSyncStatus('syncing');
    try {
      // Reset local profile with fresh starting XP
      const todayKey = getTodayDateKey();
      const freshProf = loadUserProfile(todayKey);
      freshProf.userName = profile?.name || 'HUNTER';
      freshProf.baseXP = 0;
      freshProf.totalXP = 0;
      freshProf.streak = 0;
      freshProf.completedDays = [];
      saveUserProfile(freshProf);

      // Upload fresh initial state
      const freshPayload = exportFullBackupPayload();
      await uploadFullLocalStateToCloud(user.id, freshPayload);

      setPendingLocalMigration(false);
      setSyncStatus('synced');
    } catch (err) {
      console.error('[Auth] startFreshCloud error:', err);
      setSyncStatus('error');
    }
  }, [user, profile]);

  const dismissMigrationPrompt = useCallback(() => {
    setPendingLocalMigration(false);
  }, []);

  const value = useMemo<AuthContextType>(
    () => ({
      user,
      profile,
      session,
      isAuthenticated: Boolean(user && session),
      isLoading,
      isConfigured: isSupabaseConfigured,
      syncStatus,
      syncError,
      requiresEmailConfirmation,
      pendingLocalMigration,
      signUp,
      signIn,
      signOut,
      updateProfileName,
      saveLocalToCloud,
      startFreshCloud,
      dismissMigrationPrompt,
      setSyncStatus,
      reloadFromCloud,
    }),
    [
      user,
      profile,
      session,
      isLoading,
      syncStatus,
      syncError,
      requiresEmailConfirmation,
      pendingLocalMigration,
      signUp,
      signIn,
      signOut,
      updateProfileName,
      saveLocalToCloud,
      startFreshCloud,
      dismissMigrationPrompt,
      reloadFromCloud,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
