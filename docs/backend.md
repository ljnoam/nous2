Backend Setup and Migrations

Overview

- Next.js App Router + Supabase (Auth, RLS, Realtime, Storage)
- Web Push notifications (VAPID)
- PWA service worker at `public/sw.js`

Env vars

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_VAPID_PUBLIC_KEY`
- `VAPID_PRIVATE_KEY`
- `VAPID_SUBJECT` (e.g., `mailto:you@example.com`)

Generate VAPID keys

- Node one‑liner:
  - `node -e "console.log(require('web-push').generateVAPIDKeys())"`
  - Copy `publicKey` to `NEXT_PUBLIC_VAPID_PUBLIC_KEY` and `privateKey` to `VAPID_PRIVATE_KEY`

Migrations (Supabase)

- Apply the migration: `supabase/migrations/2025-10-19_backend.sql`
  - Enables RLS (safe if already enabled)
  - Adds RLS policies for `public.couple_events` (CRUD by couple members; insert enforces `author_id = auth.uid()`)
  - Adds helpful indexes
  - Ensures `love_notes`, `bucket_items`, `couple_events` are in publication `supabase_realtime`
- Schema context files updated:
  - `supabase/schema.sql` (indexes added for reference)
  - `supabase/policies.sql` (JSON includes `couple_events` policies)
- Storage bucket `avatars` must exist (public read). Apply storage policies from `supabase/policies.sql` if needed.

Auth trigger

- A trigger (or external hook) should insert a row in `public.profiles` on new `auth.users`. See `handle_new_user` in `policies.sql` if using a trigger.

RLS summary

- `profiles`: read/update self; read partner within same couple
- `couples`: read if member (writes via RPC/server only)
- `couple_members`: read own membership
- `love_notes`, `bucket_items`, `couple_events`: CRUD by couple members; `INSERT` enforces `author_id = auth.uid()`
- `push_subscriptions`: user manages own rows; plus `SELECT` partner’s subs via “same couple” policy (excludes self)
- `storage.objects` (bucket `avatars`): public `SELECT`; insert/update/delete only within folder `{auth.uid()}/…`

Realtime setup

- Client subscribes on a single channel per page; filter locally by `couple_id`
- Listen to `INSERT/UPDATE/DELETE`
- Light resync on `visibilitychange`

Push API and cleanup

- Routes use `@supabase/ssr` with cookie adapter (`getAll/setAll`) and `export const runtime = 'nodejs'`
- `/api/push/notify` looks up partner subscriptions via RLS (no custom joins) and removes stale endpoints (410/404)
- Service worker reads `event.data.json()` and opens `notification.data.url`

Scheduled reminders (calendar)

- Edge Function `event-reminders` queries upcoming events and triggers push reminders:
  - Hour reminder: events starting in ~1 hour (55–65 min window)
  - Day reminder: events happening tomorrow (midnight ±5 min window)
- Deploy: `supabase functions deploy event-reminders`
- Schedule: Supabase Dashboard → Edge Functions → Schedules → Cron `*/5 * * * *`
- Env (Edge Function): `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `APP_BASE_URL`, `PUSH_CRON_SECRET`
- The function calls your app `POST /api/push/notify` with header `x-server-auth: PUSH_CRON_SECRET`, passing `targets` and `url: '/calendar?event=<id>'` for deep links.

Testing (two browsers/profiles)

- Allow notifications and subscribe (Profile)
- Perform actions and verify realtime + push

QA checklist

- [ ] Auth redirects: guest → `/register`; no couple → `/onboarding`; 1/2 → `/waiting`; 2/2 → `/home`
- [ ] Notes: A creates/deletes → B sees live; push on INSERT
- [ ] Bucket: A adds/checks/deletes → B sees live; push on INSERT
- [ ] Calendar: A creates/edits/deletes → B sees live; push on INSERT
- [ ] Profile: update first name/avatar persists; partner visible via “same couple”
- [ ] Storage avatars: upload OK; files under `{auth.uid()}`; public read
- [ ] SSR cookies: no `getAll/setAll required` errors
- [ ] Realtime publication: `love_notes`, `bucket_items`, `couple_events` included and enabled
- [ ] `.env.example` filled and documented
