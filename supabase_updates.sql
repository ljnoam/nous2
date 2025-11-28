-- Drop the obsolete push_subscriptions table
DROP TABLE IF EXISTS public.push_subscriptions;

-- Update user_prefs table
ALTER TABLE public.user_prefs 
  DROP COLUMN IF EXISTS bucket_enabled;

ALTER TABLE public.user_prefs 
  ADD COLUMN IF NOT EXISTS notify_notes BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS notify_calendar BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS notify_gallery BOOLEAN DEFAULT TRUE;

-- Rename old columns if they exist (optional, based on assumption "anciennement notes_enabled ?")
-- If notes_enabled exists, we might want to migrate data, but for now we just add new columns as requested.
-- If you want to migrate data from notes_enabled to notify_notes:
-- UPDATE public.user_prefs SET notify_notes = notes_enabled WHERE notes_enabled IS NOT NULL;
-- ALTER TABLE public.user_prefs DROP COLUMN IF EXISTS notes_enabled;

-- Same for events_enabled -> notify_calendar
-- UPDATE public.user_prefs SET notify_calendar = events_enabled WHERE events_enabled IS NOT NULL;
-- ALTER TABLE public.user_prefs DROP COLUMN IF EXISTS events_enabled;
