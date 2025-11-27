export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { cookies, headers } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import * as OneSignal from '@onesignal/node-onesignal';

// OneSignal Configuration
const ONESIGNAL_APP_ID = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID!;
const ONESIGNAL_USER_AUTH_KEY = process.env.ONESIGNAL_USER_AUTH_KEY!;
const ONESIGNAL_REST_API_KEY = process.env.ONESIGNAL_REST_API_KEY!;

const configuration = OneSignal.createConfiguration({
  appKey: ONESIGNAL_REST_API_KEY,
} as any);

const client = new OneSignal.DefaultApi(configuration);

// Simple in-memory rate limiter per couple (1 msg/sec)
const RATE_LIMIT_WINDOW_MS = 1000;
const coupleLastNotifyAt = new Map<string, number>();

export async function POST(req: Request) {
  // Parse body once
  let bodyJson: any = {};
  try { bodyJson = await req.json(); } catch {}
  const { type, notePreview, eventTitle, starts_at, url: overrideUrl, targets } = bodyJson || {};

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
        .eq('user_id', user!.id)
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

  // Fetch couple members to identify targets
  const { data: members2, error: membersErr } = await supabase
    .from('couple_members')
    .select('user_id')
    .eq('couple_id', coupleId);
  if (membersErr) return NextResponse.json({ error: membersErr.message }, { status: 400 });
  
  const userIds = (members2 || []).map((m: any) => m.user_id);
  if (!userIds || userIds.length === 0) return NextResponse.json({ ok: true });

  // Fetch preferences
  let prefsRows: any[] | null = null;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (serviceKey) {
    const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey);
    const { data } = await admin
      .from('user_prefs')
      .select('user_id, notes_enabled, events_enabled, do_not_disturb')
      .in('user_id', userIds);
    prefsRows = data || [];
  } else {
    const { data } = await supabase
      .from('user_prefs')
      .select('user_id, notes_enabled, events_enabled, do_not_disturb')
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
    if (type === 'event') return pref?.events_enabled ?? true;
    return pref?.notes_enabled ?? true;
  }

  // Filter target user IDs based on preferences
  const targetUserIds = userIds.filter((uid: string) => {
    const pref = prefsByUser.get(uid);
    // Don't send to self unless testing? Usually we want to notify the PARTNER.
    // The original logic fetched ALL subscriptions for the couple, then filtered.
    // If I send a note, I probably don't want a notification.
    // However, the original logic didn't explicitly exclude self, but usually subscriptions are per device.
    // If I am on device A and send a note, device A might get a push if subscribed.
    // Let's keep it simple: send to all eligible members of the couple (except maybe the sender if we want to be smart, but let's stick to original logic which was "all subs").
    // Wait, original logic: `userIds` = all members. `dbSubs` = all subs for these users.
    // So it sent to everyone including self if subscribed.
    return isTypeEnabled(pref) && !isDndActive(pref);
  });

  if (targetUserIds.length === 0) return NextResponse.json({ ok: true });

  // Compose payload
  let title = 'Nouveau mot doux';
  let message = notePreview ? String(notePreview).slice(0, 100) : 'Tu as reçu un message !';
  let url = overrideUrl || '/notes';

  if (type === 'event') {
    title = 'Nouvel évènement';
    const when = starts_at ? new Date(starts_at).toLocaleString('fr-FR') : '';
    message = eventTitle ? `${eventTitle}${when ? ' · ' + when : ''}` : (when || 'Un évènement a été planifié');
    url = overrideUrl || '/calendar';
  }

  // Send via OneSignal
  const notification = new OneSignal.Notification();
  notification.app_id = ONESIGNAL_APP_ID;
  notification.headings = { en: title, fr: title };
  notification.contents = { en: message, fr: message };
  // notification.url = process.env.NEXT_PUBLIC_APP_URL ? `${process.env.NEXT_PUBLIC_APP_URL}${url}` : url; 
  // URL handling might need adjustment depending on PWA needs, but keeping it simple for now.
  
  // Use include_aliases for targeting by external_id
  notification.include_aliases = {
    external_id: targetUserIds
  };
  notification.target_channel = "push";

  try {
    const response = await client.createNotification(notification);
    return NextResponse.json({ ok: true, result: response });
  } catch (e: any) {
    console.error('OneSignal send error:', e);
    return NextResponse.json({ ok: false, error: e.message || e }, { status: 500 });
  }
}
