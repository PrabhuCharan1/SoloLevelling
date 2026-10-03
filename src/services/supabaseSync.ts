import { getSupabase, isSupabaseConfigured } from './supabaseClient.ts';
import {
  QuestLifeBackupPayload,
  UserProfileStorage,
  AppSettings,
  RoutineItemConfig,
  DailyQuestStorage,
  DailyWorkoutStorage,
  DailyWaterStorage,
  DailyRewardRecord,
  XpTransaction,
  AiMessage,
} from '../types.ts';

export type SyncState = 'synced' | 'syncing' | 'offline' | 'error';

/**
 * Checks if the user already has cloud data in Supabase.
 */
export async function checkHasCloudData(userId: string): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase || !isSupabaseConfigured) return false;

  try {
    const { count, error } = await supabase
      .from('daily_quests')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    if (error) {
      console.warn('[Sync] Error checking cloud data in daily_quests:', error.message);
    }
    if ((count ?? 0) > 0) return true;

    // Check xp_transactions
    const { count: xpCount } = await supabase
      .from('xp_transactions')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    if ((xpCount ?? 0) > 0) return true;

    // Check settings
    const { data: settingsData } = await supabase
      .from('questlife_settings')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();

    return Boolean(settingsData);
  } catch (err) {
    console.error('[Sync] Exception checking cloud data:', err);
    return false;
  }
}

/**
 * Fetches user profile from Supabase profiles table.
 */
export async function fetchCloudProfile(userId: string): Promise<{ name: string } | null> {
  const supabase = getSupabase();
  if (!supabase || !isSupabaseConfigured) return null;

  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('name')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      console.warn('[Sync] Failed to fetch profile:', error.message);
      return null;
    }

    if (data && typeof data.name === 'string') {
      return { name: data.name };
    }
    return null;
  } catch (err) {
    console.error('[Sync] Profile fetch error:', err);
    return null;
  }
}

/**
 * Upserts user profile in Supabase profiles table.
 */
export async function upsertCloudProfile(userId: string, name: string): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase || !isSupabaseConfigured) return false;

  try {
    const { error } = await supabase.from('profiles').upsert(
      {
        id: userId,
        name: name.trim() || 'HUNTER',
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' }
    );

    if (error) {
      console.error('[Sync] Failed to update cloud profile:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.error('[Sync] Error upserting profile:', err);
    return false;
  }
}

/**
 * Downloads entire user account data from Supabase.
 */
export async function fetchFullCloudState(
  userId: string
): Promise<{
  profile?: { name: string };
  settings?: AppSettings;
  routine?: RoutineItemConfig[];
  dailyQuests?: Record<string, DailyQuestStorage>;
  xpTransactions?: XpTransaction[];
  workouts?: Record<string, DailyWorkoutStorage>;
  water?: Record<string, DailyWaterStorage>;
  rewards?: Record<string, DailyRewardRecord>;
  aiHistory?: AiMessage[];
  dailyHistory?: Record<string, any>;
} | null> {
  const supabase = getSupabase();
  if (!supabase || !isSupabaseConfigured) return null;

  try {
    const [
      profileRes,
      settingsRes,
      routinesRes,
      questsRes,
      xpRes,
      workoutRes,
      waterRes,
      rewardsRes,
      aiRes,
      historyRes,
    ] = await Promise.all([
      supabase.from('profiles').select('name').eq('id', userId).maybeSingle(),
      supabase.from('questlife_settings').select('settings').eq('user_id', userId).maybeSingle(),
      supabase.from('questlife_routines').select('routine').eq('user_id', userId).maybeSingle(),
      supabase.from('daily_quests').select('date_key, quests, updated_at').eq('user_id', userId),
      supabase.from('xp_transactions').select('key, amount, reason, date, timestamp').eq('user_id', userId),
      supabase.from('workout_history').select('date_key, completed_exercises, updated_at').eq('user_id', userId),
      supabase.from('water_entries').select('date_key, logs, total_ml, updated_at').eq('user_id', userId),
      supabase.from('reward_history').select('date_key, reward, updated_at').eq('user_id', userId),
      supabase.from('ai_chat_history').select('messages').eq('user_id', userId).maybeSingle(),
      supabase.from('daily_history').select('date_key, summary').eq('user_id', userId),
    ]);

    const dailyQuests: Record<string, DailyQuestStorage> = {};
    if (questsRes.data) {
      for (const row of questsRes.data) {
        dailyQuests[row.date_key] = {
          date: row.date_key,
          completedIds: Array.isArray(row.quests) ? row.quests : [],
          updatedAt: row.updated_at || new Date().toISOString(),
        };
      }
    }

    const workouts: Record<string, DailyWorkoutStorage> = {};
    if (workoutRes.data) {
      for (const row of workoutRes.data) {
        workouts[row.date_key] = {
          date: row.date_key,
          dayOfWeek: new Date(row.date_key).getDay(),
          exercises: row.completed_exercises || {},
          updatedAt: row.updated_at || new Date().toISOString(),
        };
      }
    }

    const water: Record<string, DailyWaterStorage> = {};
    if (waterRes.data) {
      for (const row of waterRes.data) {
        water[row.date_key] = {
          date: row.date_key,
          totalMl: row.total_ml || 0,
          entries: Array.isArray(row.logs) ? row.logs : [],
          updatedAt: row.updated_at || new Date().toISOString(),
        };
      }
    }

    const rewards: Record<string, DailyRewardRecord> = {};
    if (rewardsRes.data) {
      for (const row of rewardsRes.data) {
        if (row.reward && typeof row.reward === 'object') {
          rewards[row.date_key] = row.reward;
        }
      }
    }

    const dailyHistory: Record<string, any> = {};
    if (historyRes.data) {
      for (const row of historyRes.data) {
        dailyHistory[row.date_key] = row.summary;
      }
    }

    const xpTransactions: XpTransaction[] = (xpRes.data || []).map((tx) => ({
      id: tx.key,
      amount: tx.amount,
      date: tx.date || new Date(tx.timestamp).toISOString().slice(0, 10),
      source: (tx.reason?.toLowerCase().includes('workout')
        ? 'workout'
        : tx.reason?.toLowerCase().includes('water')
        ? 'water'
        : 'quest') as any,
      sourceId: tx.key,
      timestamp: tx.timestamp,
    }));

    return {
      profile: profileRes.data ? { name: profileRes.data.name } : undefined,
      settings: settingsRes.data?.settings,
      routine: routinesRes.data?.routine,
      dailyQuests,
      xpTransactions,
      workouts,
      water,
      rewards,
      aiHistory: aiRes.data?.messages,
      dailyHistory,
    };
  } catch (err) {
    console.error('[Sync] Full cloud state fetch failed:', err);
    return null;
  }
}

/**
 * Uploads an entire local backup/state snapshot to the authenticated user's cloud account.
 * (Used when user clicks [ SAVE TO ACCOUNT ] upon first login).
 */
export async function uploadFullLocalStateToCloud(
  userId: string,
  localState: QuestLifeBackupPayload
): Promise<{ success: boolean; error?: string }> {
  const supabase = getSupabase();
  if (!supabase || !isSupabaseConfigured) {
    return { success: false, error: 'Supabase is not configured' };
  }

  try {
    // 1. Profile
    await supabase.from('profiles').upsert(
      {
        id: userId,
        name: localState.profile.userName || 'HUNTER',
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' }
    );

    // 2. Settings
    if (localState.settings) {
      await supabase.from('questlife_settings').upsert(
        {
          user_id: userId,
          settings: localState.settings,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      );
    }

    // 3. Routine
    if (localState.routine) {
      await supabase.from('questlife_routines').upsert(
        {
          user_id: userId,
          routine: localState.routine,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      );
    }

    // 4. Daily Quests
    if (localState.dailyData) {
      const rows = Object.entries(localState.dailyData).map(([dateKey, val]) => ({
        user_id: userId,
        date_key: dateKey,
        quests: val.completedIds,
        updated_at: val.updatedAt || new Date().toISOString(),
      }));
      if (rows.length > 0) {
        await supabase.from('daily_quests').upsert(rows, { onConflict: 'user_id,date_key' });
      }
    }

    // 5. XP Transactions
    if (localState.xpData?.ledger && localState.xpData.ledger.length > 0) {
      const rows = localState.xpData.ledger.map((tx) => ({
        user_id: userId,
        key: tx.id,
        amount: tx.amount,
        reason: tx.source,
        date: tx.date,
        timestamp: tx.timestamp || new Date().toISOString(),
      }));
      await supabase.from('xp_transactions').upsert(rows, { onConflict: 'user_id,key' });
    }

    // 6. Workout History
    if (localState.workoutData) {
      const rows = Object.entries(localState.workoutData).map(([dateKey, val]) => ({
        user_id: userId,
        date_key: dateKey,
        completed_exercises: val.exercises,
        updated_at: val.updatedAt || new Date().toISOString(),
      }));
      if (rows.length > 0) {
        await supabase.from('workout_history').upsert(rows, { onConflict: 'user_id,date_key' });
      }
    }

    // 7. Water History
    if (localState.waterData?.history) {
      const rows = Object.entries(localState.waterData.history).map(([dateKey, val]) => ({
        user_id: userId,
        date_key: dateKey,
        logs: val.entries,
        total_ml: val.totalMl,
        updated_at: val.updatedAt || new Date().toISOString(),
      }));
      if (rows.length > 0) {
        await supabase.from('water_entries').upsert(rows, { onConflict: 'user_id,date_key' });
      }
    }

    // 8. Reward History
    if (localState.rewardData?.daily) {
      const rows = Object.entries(localState.rewardData.daily).map(([dateKey, val]) => ({
        user_id: userId,
        date_key: dateKey,
        reward: val,
        updated_at: new Date().toISOString(),
      }));
      if (rows.length > 0) {
        await supabase.from('reward_history').upsert(rows, { onConflict: 'user_id,date_key' });
      }
    }

    // 9. Daily History (Calendar Summaries)
    if (localState.history) {
      const rows = Object.entries(localState.history).map(([dateKey, val]) => ({
        user_id: userId,
        date_key: dateKey,
        summary: val,
        updated_at: new Date().toISOString(),
      }));
      if (rows.length > 0) {
        await supabase.from('daily_history').upsert(rows, { onConflict: 'user_id,date_key' });
      }
    }

    return { success: true };
  } catch (err: any) {
    console.error('[Sync] uploadFullLocalStateToCloud failed:', err);
    return { success: false, error: err?.message || 'Upload failed' };
  }
}

/**
 * Individual background cloud update methods (non-blocking, debounced)
 */

export async function syncDailyQuestsToCloud(
  userId: string,
  dateKey: string,
  completedIds: string[]
): Promise<void> {
  const supabase = getSupabase();
  if (!supabase || !isSupabaseConfigured) return;

  try {
    await supabase.from('daily_quests').upsert(
      {
        user_id: userId,
        date_key: dateKey,
        quests: completedIds,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,date_key' }
    );
  } catch (err) {
    console.warn('[Sync] syncDailyQuestsToCloud error:', err);
  }
}

export async function syncXpTransactionToCloud(
  userId: string,
  tx: XpTransaction
): Promise<void> {
  const supabase = getSupabase();
  if (!supabase || !isSupabaseConfigured) return;

  try {
    await supabase.from('xp_transactions').upsert(
      {
        user_id: userId,
        key: tx.id,
        amount: tx.amount,
        reason: tx.source,
        date: tx.date,
        timestamp: tx.timestamp,
      },
      { onConflict: 'user_id,key' }
    );
  } catch (err) {
    console.warn('[Sync] syncXpTransactionToCloud error:', err);
  }
}

export async function syncWorkoutToCloud(
  userId: string,
  dateKey: string,
  exercises: Record<string, any>
): Promise<void> {
  const supabase = getSupabase();
  if (!supabase || !isSupabaseConfigured) return;

  try {
    await supabase.from('workout_history').upsert(
      {
        user_id: userId,
        date_key: dateKey,
        completed_exercises: exercises,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,date_key' }
    );
  } catch (err) {
    console.warn('[Sync] syncWorkoutToCloud error:', err);
  }
}

export async function syncWaterToCloud(
  userId: string,
  dateKey: string,
  entries: any[],
  totalMl: number
): Promise<void> {
  const supabase = getSupabase();
  if (!supabase || !isSupabaseConfigured) return;

  try {
    await supabase.from('water_entries').upsert(
      {
        user_id: userId,
        date_key: dateKey,
        logs: entries,
        total_ml: totalMl,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,date_key' }
    );
  } catch (err) {
    console.warn('[Sync] syncWaterToCloud error:', err);
  }
}

export async function syncRewardToCloud(
  userId: string,
  dateKey: string,
  reward: DailyRewardRecord
): Promise<void> {
  const supabase = getSupabase();
  if (!supabase || !isSupabaseConfigured) return;

  try {
    await supabase.from('reward_history').upsert(
      {
        user_id: userId,
        date_key: dateKey,
        reward,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,date_key' }
    );
  } catch (err) {
    console.warn('[Sync] syncRewardToCloud error:', err);
  }
}

export async function syncRoutineToCloud(
  userId: string,
  routine: RoutineItemConfig[]
): Promise<void> {
  const supabase = getSupabase();
  if (!supabase || !isSupabaseConfigured) return;

  try {
    await supabase.from('questlife_routines').upsert(
      {
        user_id: userId,
        routine,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    );
  } catch (err) {
    console.warn('[Sync] syncRoutineToCloud error:', err);
  }
}

export async function syncSettingsToCloud(
  userId: string,
  settings: AppSettings
): Promise<void> {
  const supabase = getSupabase();
  if (!supabase || !isSupabaseConfigured) return;

  try {
    await supabase.from('questlife_settings').upsert(
      {
        user_id: userId,
        settings,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    );
  } catch (err) {
    console.warn('[Sync] syncSettingsToCloud error:', err);
  }
}

export async function syncAiMessagesToCloud(
  userId: string,
  messages: AiMessage[]
): Promise<void> {
  const supabase = getSupabase();
  if (!supabase || !isSupabaseConfigured) return;

  try {
    await supabase.from('ai_chat_history').upsert(
      {
        user_id: userId,
        messages,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    );
  } catch (err) {
    console.warn('[Sync] syncAiMessagesToCloud error:', err);
  }
}
