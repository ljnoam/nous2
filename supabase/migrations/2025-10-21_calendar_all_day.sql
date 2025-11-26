-- Add all_day flag to couple_events (idempotent)
-- Date: 2025-10-21

alter table if exists public.couple_events
  add column if not exists all_day boolean not null default false;

