export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import webpush from 'web-push';
import { cookies, headers } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';

// Simple in-memory rate limiter per couple (1 msg/sec)
// Note: In-memory only for this instance; adequate for basic anti-spam.
const RATE_LIMIT_WINDOW_MS = 1000;
const coupleLastNotifyAt = new Map<string, number>();

// VAPID configuration for Web Push
webpush.setVapidDetails(
  process.env.VAPID_SUBJECT!,
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

export async function POST(req: Request) {
  // Parse body once
  let bodyJson: any = {};
  try { bodyJson = await req.json(); } catch {}
  const { type, notePreview, bucketTitle, eventTitle, starts_at, url: overrideUrl, targets } = bodyJson || {};

  const cookieStore = await cookies();
  const hdrs = await headers();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options as any)),
      },
      headers: hdrs,
    }
  );

  const serverBypass = (req.headers as any).get?.('x-server-auth') === process.env.PUSH_CRON_SECRET;
  const { data: { user } } = await supabase.auth.getUser();
  if (!serverBypass && !user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  // Resolve couple_id for rate-limiting
  const { data: membership, error: membershipErr } = serverBypass
    ? { data: { couple_id: bodyJson?.couple_id }, error: null } as any
    : await supabase
        .from('couple_members')
        .select('couple_id')
        .eq('user_id', user.id)
        .maybeSingle();

  if (membershipErr) {
    return NextResponse.json({ error: membershipErr.message }, { status: 400 });
  }

  const coupleId = membership?.couple_id as string | null;
  if (!coupleId) {
    return NextResponse.json({ error: 'no_couple' }, { status: 403 });
  }

  // Basic per-couple rate-limit: 1 message/second
  const now = Date.now();
  const lastAt = coupleLastNotifyAt.get(coupleId) || 0;
  if (!serverBypass && now - lastAt < RATE_LIMIT_WINDOW_MS) {
    return NextResponse.json({ error: 'rate_limited' }, { status: 429 });
  }
  coupleLastNotifyAt.set(coupleId, now);

  // Fetch couple members and their subscriptions; then apply user preferences and DND
  const { data: members2, error: membersErr } = await supabase
    .from('couple_members')
    .select('user_id')
    .eq('couple_id', coupleId);
  if (membersErr) return NextResponse.json({ error: membersErr.message }, { status: 400 });
  const userIds = (members2 || []).map((m: any) => m.user_id);
  if (!userIds || userIds.length === 0) return NextResponse.json({ ok: true });

  const { data: dbSubs, error: subsErr } = await supabase
    .from('push_subscriptions')
    .select('endpoint, p256dh, auth, user_id')
    .in('user_id', userIds);
  if (subsErr) return NextResponse.json({ error: subsErr.message }, { status: 400 });

  // Fetch preferences in one go (use service role to avoid leaking partner prefs via RLS)
  let prefsRows: any[] | null = null;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (serviceKey) {
    const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey);
    const { data } = await admin
      .from('user_prefs')
      .select('user_id, notes_enabled, bucket_enabled, events_enabled, do_not_disturb')
      .in('user_id', userIds);
    prefsRows = data || [];
  } else {
    // Fallback: only own prefs can be read under RLS; partner prefs will default to enabled
    const { data } = await supabase
      .from('user_prefs')
      .select('user_id, notes_enabled, bucket_enabled, events_enabled, do_not_disturb')
      .in('user_id', userIds);
    prefsRows = data || [];
  }
  const prefsByUser = new Map<string, any>();
  (prefsRows || []).forEach((p: any) => prefsByUser.set(p.user_id, p));

  function isDndActive(pref: any): boolean {
    const d = pref?.do_not_disturb || { start: '22:00', end: '07:00' } as any;
    const [sh, sm] = String(d.start || '22:00').split(':').map((x: string) => parseInt(x, 10) || 0);
    const [eh, em] = String(d.end || '07:00').split(':').map((x: string) => parseInt(x, 10) || 0);
    const now = new Date();
    const mins = now.getHours() * 60 + now.getMinutes();
    const s = sh * 60 + sm;
    const e = eh * 60 + em;
    if (s === e) return false; // disabled
    if (s < e) return mins >= s && mins < e; // same day window
    return mins >= s || mins < e; // overnight window
  }

  function isTypeEnabled(pref: any): boolean {
    if (type === 'bucket') return pref?.bucket_enabled ?? true;
    if (type === 'event') return pref?.events_enabled ?? true;
    return pref?.notes_enabled ?? true;
  }

  const uniq = new Map<string, any>();
  (dbSubs || []).forEach((s: any) => { uniq.set(s.endpoint, s); });
  const subs = Array.from(uniq.values()).filter((s: any) => {
    const pref = prefsByUser.get(s.user_id);
    return isTypeEnabled(pref) && !isDndActive(pref);
  });

  if (!subs || subs.length === 0) return NextResponse.json({ ok: true });

  // Compose payload
  let title = 'Nouveau mot doux';
  let message = notePreview ? String(notePreview).slice(0, 100) : 'Tu as reçu un message !';
  let url = overrideUrl || '/notes';

  if (type === 'bucket') {
    title = 'Nouvelle idée ajoutée';
    message = bucketTitle
      ? `${bucketTitle} vient d’être ajoutée à votre bucket list !`
      : 'Une nouvelle idée a été ajoutée à votre bucket list !';
    url = overrideUrl || '/bucket';
  } else if (type === 'event') {
    title = 'Nouvel évènement';
    const when = starts_at ? new Date(starts_at).toLocaleString('fr-FR') : '';
    message = eventTitle ? `${eventTitle}${when ? ' · ' + when : ''}` : (when || 'Un évènement a été planifié');
    url = overrideUrl || '/calendar';
  }

  const payload = JSON.stringify({ title, body: message, url });

  // Send notifications; prune invalid endpoints (410/404)
  const results = await Promise.allSettled(
    subs.map(async (s) => {
      const subscription = {
        endpoint: s.endpoint,
        keys: { p256dh: s.p256dh, auth: s.auth },
      } as webpush.PushSubscription;
      try {
        await webpush.sendNotification(subscription, payload);
        return { ok: true };
      } catch (err: any) {
        const code = err?.statusCode;
        if (code === 404 || code === 410) {
          // Silently remove stale endpoint
          await supabase.from('push_subscriptions').delete().eq('endpoint', s.endpoint);
        }
        return { ok: false, error: code || err?.message };
      }
    })
  );

  return NextResponse.json({ ok: true, results });
}
