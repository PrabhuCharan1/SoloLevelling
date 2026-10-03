-- ==============================================================================
-- QUESTLIFE SUPABASE DATABASE SCHEMA & ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================
-- Run this script in your Supabase project SQL Editor (Database -> SQL Editor).
-- This provisions all user-isolated tables, indexes, constraints, and RLS policies.
-- ==============================================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ------------------------------------------------------------------------------
-- 1. PROFILES TABLE (Associated with auth.users)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'HUNTER',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_select_own" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "profiles_insert_own" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "profiles_delete_own" ON public.profiles
  FOR DELETE USING (auth.uid() = id);

-- ------------------------------------------------------------------------------
-- 2. QUESTLIFE SETTINGS TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.questlife_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT questlife_settings_user_unique UNIQUE (user_id)
);

ALTER TABLE public.questlife_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "settings_select_own" ON public.questlife_settings
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "settings_insert_own" ON public.questlife_settings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "settings_update_own" ON public.questlife_settings
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "settings_delete_own" ON public.questlife_settings
  FOR DELETE USING (auth.uid() = user_id);

-- ------------------------------------------------------------------------------
-- 3. QUESTLIFE ROUTINES TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.questlife_routines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  routine JSONB NOT NULL DEFAULT '[]'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT questlife_routines_user_unique UNIQUE (user_id)
);

ALTER TABLE public.questlife_routines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "routines_select_own" ON public.questlife_routines
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "routines_insert_own" ON public.questlife_routines
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "routines_update_own" ON public.questlife_routines
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "routines_delete_own" ON public.questlife_routines
  FOR DELETE USING (auth.uid() = user_id);

-- ------------------------------------------------------------------------------
-- 4. DAILY QUESTS TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.daily_quests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date_key TEXT NOT NULL,
  quests JSONB NOT NULL DEFAULT '[]'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT daily_quests_user_date_unique UNIQUE (user_id, date_key)
);

CREATE INDEX IF NOT EXISTS idx_daily_quests_user_date ON public.daily_quests(user_id, date_key);

ALTER TABLE public.daily_quests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "quests_select_own" ON public.daily_quests
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "quests_insert_own" ON public.daily_quests
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "quests_update_own" ON public.daily_quests
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "quests_delete_own" ON public.daily_quests
  FOR DELETE USING (auth.uid() = user_id);

-- ------------------------------------------------------------------------------
-- 5. XP TRANSACTIONS TABLE (Transaction-based XP ledger)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.xp_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  amount INT NOT NULL,
  reason TEXT,
  date TEXT,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT xp_transactions_user_key_unique UNIQUE (user_id, key)
);

CREATE INDEX IF NOT EXISTS idx_xp_transactions_user ON public.xp_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_xp_transactions_user_date ON public.xp_transactions(user_id, date);

ALTER TABLE public.xp_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "xp_tx_select_own" ON public.xp_transactions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "xp_tx_insert_own" ON public.xp_transactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "xp_tx_update_own" ON public.xp_transactions
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "xp_tx_delete_own" ON public.xp_transactions
  FOR DELETE USING (auth.uid() = user_id);

-- ------------------------------------------------------------------------------
-- 6. WORKOUT HISTORY TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.workout_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date_key TEXT NOT NULL,
  completed_exercises JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT workout_history_user_date_unique UNIQUE (user_id, date_key)
);

CREATE INDEX IF NOT EXISTS idx_workout_history_user_date ON public.workout_history(user_id, date_key);

ALTER TABLE public.workout_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "workout_select_own" ON public.workout_history
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "workout_insert_own" ON public.workout_history
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "workout_update_own" ON public.workout_history
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "workout_delete_own" ON public.workout_history
  FOR DELETE USING (auth.uid() = user_id);

-- ------------------------------------------------------------------------------
-- 7. WATER ENTRIES TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.water_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date_key TEXT NOT NULL,
  logs JSONB NOT NULL DEFAULT '[]'::jsonb,
  total_ml INT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT water_entries_user_date_unique UNIQUE (user_id, date_key)
);

CREATE INDEX IF NOT EXISTS idx_water_entries_user_date ON public.water_entries(user_id, date_key);

ALTER TABLE public.water_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "water_select_own" ON public.water_entries
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "water_insert_own" ON public.water_entries
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "water_update_own" ON public.water_entries
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "water_delete_own" ON public.water_entries
  FOR DELETE USING (auth.uid() = user_id);

-- ------------------------------------------------------------------------------
-- 8. REWARD HISTORY TABLE (Single reward per date, identity protected)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.reward_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date_key TEXT NOT NULL,
  reward JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT reward_history_user_date_unique UNIQUE (user_id, date_key)
);

CREATE INDEX IF NOT EXISTS idx_reward_history_user_date ON public.reward_history(user_id, date_key);

ALTER TABLE public.reward_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rewards_select_own" ON public.reward_history
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "rewards_insert_own" ON public.reward_history
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "rewards_update_own" ON public.reward_history
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "rewards_delete_own" ON public.reward_history
  FOR DELETE USING (auth.uid() = user_id);

-- ------------------------------------------------------------------------------
-- 9. AI CHAT HISTORY TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ai_chat_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  messages JSONB NOT NULL DEFAULT '[]'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT ai_chat_history_user_unique UNIQUE (user_id)
);

ALTER TABLE public.ai_chat_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ai_chat_select_own" ON public.ai_chat_history
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "ai_chat_insert_own" ON public.ai_chat_history
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "ai_chat_update_own" ON public.ai_chat_history
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "ai_chat_delete_own" ON public.ai_chat_history
  FOR DELETE USING (auth.uid() = user_id);

-- ------------------------------------------------------------------------------
-- 10. DAILY HISTORY TABLE (Calendar Archive snapshots)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.daily_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date_key TEXT NOT NULL,
  summary JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT daily_history_user_date_unique UNIQUE (user_id, date_key)
);

CREATE INDEX IF NOT EXISTS idx_daily_history_user_date ON public.daily_history(user_id, date_key);

ALTER TABLE public.daily_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "daily_history_select_own" ON public.daily_history
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "daily_history_insert_own" ON public.daily_history
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "daily_history_update_own" ON public.daily_history
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "daily_history_delete_own" ON public.daily_history
  FOR DELETE USING (auth.uid() = user_id);

-- ------------------------------------------------------------------------------
-- 11. AUTOMATIC PROFILE CREATION TRIGGER ON SIGNUP (Optional convenience trigger)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, name, created_at, updated_at)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', 'HUNTER'),
    now(),
    now()
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ------------------------------------------------------------------------------
-- 12. BODY PROGRESS SCANS TABLE (Private Biometric Tracking)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.body_progress_scans (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  timestamp BIGINT NOT NULL,
  date_key TEXT NOT NULL,
  scan_number INT NOT NULL,
  label TEXT NOT NULL,
  is_baseline BOOLEAN NOT NULL DEFAULT false,
  storage_path TEXT,
  comparison_with_previous JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_body_scans_user_time ON public.body_progress_scans(user_id, timestamp);

ALTER TABLE public.body_progress_scans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "body_scans_select_own" ON public.body_progress_scans
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "body_scans_insert_own" ON public.body_progress_scans
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "body_scans_update_own" ON public.body_progress_scans
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "body_scans_delete_own" ON public.body_progress_scans
  FOR DELETE USING (auth.uid() = user_id);

