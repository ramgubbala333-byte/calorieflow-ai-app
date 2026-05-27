-- =============================================================================
-- CalorieFlow AI — Complete Backend Migration
-- Adds all missing tables, profile extensions, RLS policies, and indexes.
-- Run this against your Supabase project after the base migrations.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Profile extensions
-- ---------------------------------------------------------------------------
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS gender TEXT
    CHECK (gender IN ('male','female','non_binary','prefer_not_to_say')),
  ADD COLUMN IF NOT EXISTS goal_weight NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS goal_type TEXT
    CHECK (goal_type IN ('lose_weight','maintain','gain_muscle')),
  ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'UTC',
  ADD COLUMN IF NOT EXISTS week_start_day SMALLINT DEFAULT 1
    CHECK (week_start_day BETWEEN 0 AND 6);

-- ---------------------------------------------------------------------------
-- 2. weight_logs  (manual entries; synced_weight holds health-app data)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.weight_logs (
  id          UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  weight_kg   NUMERIC(5,2) NOT NULL,
  note        TEXT,
  logged_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_weight_logs_user_date
  ON public.weight_logs(user_id, logged_at DESC);
ALTER TABLE public.weight_logs ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.weight_logs TO authenticated;
GRANT ALL ON public.weight_logs TO service_role;
DROP POLICY IF EXISTS "own weight_logs all" ON public.weight_logs;
CREATE POLICY "own weight_logs all" ON public.weight_logs
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- 3. progress_photos
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.progress_photos (
  id            UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id       UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  storage_path  TEXT        NOT NULL,  -- path inside the progress-photos bucket
  note          TEXT,
  weight_kg     NUMERIC(5,2),
  taken_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_progress_photos_user_date
  ON public.progress_photos(user_id, taken_at DESC);
ALTER TABLE public.progress_photos ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.progress_photos TO authenticated;
GRANT ALL ON public.progress_photos TO service_role;
DROP POLICY IF EXISTS "own progress_photos all" ON public.progress_photos;
CREATE POLICY "own progress_photos all" ON public.progress_photos
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- 4. workout_plans  (gym schedule / recurring plan)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.workout_plans (
  id             UUID    NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id        UUID    NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name           TEXT    NOT NULL,
  days_of_week   INT[]   NOT NULL DEFAULT '{1,2,3,4,5}',  -- 0=Sun … 6=Sat
  workout_type   TEXT    DEFAULT 'gym',
  reminder_time  TIME    NOT NULL DEFAULT '07:00',
  active         BOOLEAN DEFAULT true,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.workout_plans ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workout_plans TO authenticated;
GRANT ALL ON public.workout_plans TO service_role;
DROP POLICY IF EXISTS "own workout_plans all" ON public.workout_plans;
CREATE POLICY "own workout_plans all" ON public.workout_plans
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
DROP TRIGGER IF EXISTS trg_workout_plans_updated ON public.workout_plans;
CREATE TRIGGER trg_workout_plans_updated
  BEFORE UPDATE ON public.workout_plans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------------------------------------------------------------------------
-- 5. reminders  (push notification schedules)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.reminders (
  id             UUID    NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id        UUID    NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type           TEXT    NOT NULL
    CHECK (type IN ('workout','meal','water','weigh_in','custom')),
  title          TEXT    NOT NULL,
  message        TEXT,
  scheduled_time TIME    NOT NULL,
  days_of_week   INT[]   NOT NULL DEFAULT '{0,1,2,3,4,5,6}',
  enabled        BOOLEAN DEFAULT true,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_reminders_user_enabled
  ON public.reminders(user_id, enabled);
ALTER TABLE public.reminders ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reminders TO authenticated;
GRANT ALL ON public.reminders TO service_role;
DROP POLICY IF EXISTS "own reminders all" ON public.reminders;
CREATE POLICY "own reminders all" ON public.reminders
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
DROP TRIGGER IF EXISTS trg_reminders_updated ON public.reminders;
CREATE TRIGGER trg_reminders_updated
  BEFORE UPDATE ON public.reminders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------------------------------------------------------------------------
-- 6. notification_tokens  (FCM / APNs / Web Push)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.notification_tokens (
  id          UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token       TEXT NOT NULL UNIQUE,
  platform    TEXT NOT NULL CHECK (platform IN ('ios','android','web')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_notification_tokens_user
  ON public.notification_tokens(user_id);
ALTER TABLE public.notification_tokens ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, DELETE ON public.notification_tokens TO authenticated;
GRANT ALL ON public.notification_tokens TO service_role;
DROP POLICY IF EXISTS "own notification_tokens all" ON public.notification_tokens;
CREATE POLICY "own notification_tokens all" ON public.notification_tokens
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- 7. daily_summaries  (cached per-day totals; updated server-side)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.daily_summaries (
  id              UUID  NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id         UUID  NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  summary_date    DATE  NOT NULL,
  total_calories  INT   DEFAULT 0,
  total_protein   NUMERIC(6,2) DEFAULT 0,
  total_carbs     NUMERIC(6,2) DEFAULT 0,
  total_fat       NUMERIC(6,2) DEFAULT 0,
  meals_logged    INT   DEFAULT 0,
  workout_minutes INT   DEFAULT 0,
  goal_met        BOOLEAN DEFAULT false,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, summary_date)
);
CREATE INDEX IF NOT EXISTS idx_daily_summaries_user_date
  ON public.daily_summaries(user_id, summary_date DESC);
ALTER TABLE public.daily_summaries ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.daily_summaries TO authenticated;
GRANT ALL ON public.daily_summaries TO service_role;
DROP POLICY IF EXISTS "own daily_summaries all" ON public.daily_summaries;
CREATE POLICY "own daily_summaries all" ON public.daily_summaries
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
DROP TRIGGER IF EXISTS trg_daily_summaries_updated ON public.daily_summaries;
CREATE TRIGGER trg_daily_summaries_updated
  BEFORE UPDATE ON public.daily_summaries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------------------------------------------------------------------------
-- 8. streaks  (one row per user)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.streaks (
  id                       UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id                  UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  logging_streak           INT  DEFAULT 0,
  longest_logging_streak   INT  DEFAULT 0,
  workout_streak           INT  DEFAULT 0,
  longest_workout_streak   INT  DEFAULT 0,
  last_log_date            DATE,
  last_workout_date        DATE,
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.streaks ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE ON public.streaks TO authenticated;
GRANT ALL ON public.streaks TO service_role;
DROP POLICY IF EXISTS "own streaks all" ON public.streaks;
CREATE POLICY "own streaks all" ON public.streaks
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
DROP TRIGGER IF EXISTS trg_streaks_updated ON public.streaks;
CREATE TRIGGER trg_streaks_updated
  BEFORE UPDATE ON public.streaks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------------------------------------------------------------------------
-- 9. ai_chat_history
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ai_chat_history (
  id          UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role        TEXT NOT NULL CHECK (role IN ('user','assistant')),
  content     TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ai_chat_user_date
  ON public.ai_chat_history(user_id, created_at DESC);
ALTER TABLE public.ai_chat_history ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, DELETE ON public.ai_chat_history TO authenticated;
GRANT ALL ON public.ai_chat_history TO service_role;
DROP POLICY IF EXISTS "own ai_chat all" ON public.ai_chat_history;
CREATE POLICY "own ai_chat all" ON public.ai_chat_history
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- 10. privacy_settings  (one row per user)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.privacy_settings (
  id                      UUID    NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id                 UUID    NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  ai_features_enabled     BOOLEAN DEFAULT true,
  ai_scan_on_demand_only  BOOLEAN DEFAULT true,
  data_training_opt_out   BOOLEAN DEFAULT true,
  share_anonymous_stats   BOOLEAN DEFAULT false,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.privacy_settings ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE ON public.privacy_settings TO authenticated;
GRANT ALL ON public.privacy_settings TO service_role;
DROP POLICY IF EXISTS "own privacy_settings all" ON public.privacy_settings;
CREATE POLICY "own privacy_settings all" ON public.privacy_settings
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
DROP TRIGGER IF EXISTS trg_privacy_settings_updated ON public.privacy_settings;
CREATE TRIGGER trg_privacy_settings_updated
  BEFORE UPDATE ON public.privacy_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------------------------------------------------------------------------
-- 11. audit_logs  (immutable; only service_role may insert)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id          UUID  NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID  REFERENCES auth.users(id) ON DELETE SET NULL,
  action      TEXT  NOT NULL
    CHECK (action IN (
      'data_export','meal_delete','account_delete',
      'ai_history_clear','progress_photo_delete','account_created'
    )),
  details     JSONB DEFAULT '{}',
  ip_address  INET,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_date
  ON public.audit_logs(user_id, created_at DESC);
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
-- Authenticated users may only read their own audit trail
GRANT SELECT ON public.audit_logs TO authenticated;
GRANT ALL ON public.audit_logs TO service_role;
REVOKE INSERT, UPDATE, DELETE ON public.audit_logs FROM authenticated;
DROP POLICY IF EXISTS "own audit_logs select" ON public.audit_logs;
CREATE POLICY "own audit_logs select" ON public.audit_logs
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- 12. barcode_cache  (shared; no user scope; service_role writes)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.barcode_cache (
  barcode              TEXT          PRIMARY KEY,
  product_name         TEXT          NOT NULL,
  brand                TEXT,
  serving_size         NUMERIC(7,2),
  serving_unit         TEXT          DEFAULT 'g',
  calories_per_serving INT,
  protein              NUMERIC(6,2),
  carbs                NUMERIC(6,2),
  fat                  NUMERIC(6,2),
  fiber                NUMERIC(6,2),
  sugar                NUMERIC(6,2),
  sodium               NUMERIC(6,2),
  image_url            TEXT,
  cached_at            TIMESTAMPTZ   NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_barcode_cache_age ON public.barcode_cache(cached_at DESC);
-- No RLS: barcode data is public nutrition info
ALTER TABLE public.barcode_cache DISABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.barcode_cache TO authenticated;
GRANT ALL ON public.barcode_cache TO service_role;

-- ---------------------------------------------------------------------------
-- 13. Update handle_new_user to bootstrap privacy_settings + streaks
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, display_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1))
  )
  ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO public.goals (user_id) VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO public.privacy_settings (user_id) VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO public.streaks (user_id) VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Revoke public execution of helper functions (defence in depth)
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 14. Streak update helper (called by server functions after meal/workout log)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.refresh_streaks(p_user_id UUID, p_type TEXT)
RETURNS VOID AS $$
DECLARE
  today DATE := CURRENT_DATE;
  rec   RECORD;
BEGIN
  SELECT * INTO rec FROM public.streaks WHERE user_id = p_user_id FOR UPDATE;

  IF NOT FOUND THEN
    INSERT INTO public.streaks (user_id) VALUES (p_user_id);
    SELECT * INTO rec FROM public.streaks WHERE user_id = p_user_id FOR UPDATE;
  END IF;

  IF p_type = 'log' THEN
    IF rec.last_log_date IS NULL OR rec.last_log_date < today - INTERVAL '1 day' THEN
      -- Reset streak if gap > 1 day; continue if yesterday logged
      UPDATE public.streaks
      SET logging_streak = CASE WHEN last_log_date = today - INTERVAL '1 day' THEN logging_streak + 1 ELSE 1 END,
          longest_logging_streak = GREATEST(
            CASE WHEN last_log_date = today - INTERVAL '1 day' THEN logging_streak + 1 ELSE 1 END,
            longest_logging_streak
          ),
          last_log_date = today
      WHERE user_id = p_user_id;
    ELSIF rec.last_log_date = today THEN
      NULL; -- already counted today
    END IF;
  ELSIF p_type = 'workout' THEN
    IF rec.last_workout_date IS NULL OR rec.last_workout_date < today - INTERVAL '1 day' THEN
      UPDATE public.streaks
      SET workout_streak = CASE WHEN last_workout_date = today - INTERVAL '1 day' THEN workout_streak + 1 ELSE 1 END,
          longest_workout_streak = GREATEST(
            CASE WHEN last_workout_date = today - INTERVAL '1 day' THEN workout_streak + 1 ELSE 1 END,
            longest_workout_streak
          ),
          last_workout_date = today
      WHERE user_id = p_user_id;
    ELSIF rec.last_workout_date = today THEN
      NULL;
    END IF;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
REVOKE EXECUTE ON FUNCTION public.refresh_streaks(UUID, TEXT) FROM PUBLIC, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 15. Supabase Storage: run these in Dashboard → Storage → New bucket
--     (Cannot be created via SQL; instructions only)
--
--  Bucket: progress-photos   Public: false   File size: 10MB   Allowed: image/*
--  Bucket: food-scans        Public: false   File size: 8MB    Allowed: image/*
--
--  Storage RLS policies for progress-photos bucket:
--    SELECT  (bucket_id = 'progress-photos') AND (auth.uid()::text = (storage.foldername(name))[1])
--    INSERT  (bucket_id = 'progress-photos') AND (auth.uid()::text = (storage.foldername(name))[1])
--    DELETE  (bucket_id = 'progress-photos') AND (auth.uid()::text = (storage.foldername(name))[1])
-- ---------------------------------------------------------------------------
