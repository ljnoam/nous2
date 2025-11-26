-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.bucket_items (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  couple_id uuid NOT NULL,
  author_id uuid NOT NULL,
  title text NOT NULL CHECK (length(TRIM(BOTH FROM title)) > 0),
  is_done boolean NOT NULL DEFAULT false,
  done_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT bucket_items_pkey PRIMARY KEY (id),
  CONSTRAINT bucket_items_couple_id_fkey FOREIGN KEY (couple_id) REFERENCES public.couples(id),
  CONSTRAINT bucket_items_author_id_fkey FOREIGN KEY (author_id) REFERENCES auth.users(id)
);
CREATE TABLE public.couple_events (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  couple_id uuid NOT NULL,
  author_id uuid NOT NULL,
  title text NOT NULL CHECK (length(TRIM(BOTH FROM title)) > 0),
  starts_at timestamp with time zone NOT NULL,
  ends_at timestamp with time zone,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT couple_events_pkey PRIMARY KEY (id),
  CONSTRAINT couple_events_couple_id_fkey FOREIGN KEY (couple_id) REFERENCES public.couples(id),
  CONSTRAINT couple_events_author_id_fkey FOREIGN KEY (author_id) REFERENCES auth.users(id)
);
CREATE TABLE public.couple_members (
  user_id uuid NOT NULL,
  couple_id uuid NOT NULL,
  role text DEFAULT 'partner'::text,
  joined_at timestamp with time zone DEFAULT now(),
  CONSTRAINT couple_members_pkey PRIMARY KEY (user_id),
  CONSTRAINT couple_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id),
  CONSTRAINT couple_members_couple_id_fkey FOREIGN KEY (couple_id) REFERENCES public.couples(id)
);
CREATE TABLE public.couples (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  join_code text NOT NULL UNIQUE,
  started_at date NOT NULL,
  created_by uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT couples_pkey PRIMARY KEY (id),
  CONSTRAINT couples_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id)
);
CREATE TABLE public.love_notes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  couple_id uuid NOT NULL,
  author_id uuid NOT NULL,
  content text NOT NULL CHECK (length(TRIM(BOTH FROM content)) > 0),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT love_notes_pkey PRIMARY KEY (id),
  CONSTRAINT love_notes_couple_id_fkey FOREIGN KEY (couple_id) REFERENCES public.couples(id),
  CONSTRAINT love_notes_author_id_fkey FOREIGN KEY (author_id) REFERENCES auth.users(id)
);
CREATE TABLE public.profiles (
  id uuid NOT NULL,
  display_name text,
  created_at timestamp with time zone DEFAULT now(),
  first_name text,
  avatar_url text,
  CONSTRAINT profiles_pkey PRIMARY KEY (id),
  CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id)
);
CREATE TABLE public.push_subscriptions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  endpoint text NOT NULL UNIQUE,
  p256dh text NOT NULL,
  auth text NOT NULL,
  ua text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT push_subscriptions_pkey PRIMARY KEY (id),
  CONSTRAINT push_subscriptions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);

-- Indexes (context)
CREATE INDEX IF NOT EXISTS idx_love_notes_couple_created_at ON public.love_notes (couple_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bucket_items_couple_done_created_at ON public.bucket_items (couple_id, is_done, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_couple_events_couple_starts_at ON public.couple_events (couple_id, starts_at);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id ON public.push_subscriptions (user_id);
