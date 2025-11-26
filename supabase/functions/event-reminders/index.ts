// Supabase Edge Function: event-reminders
// Schedules: every 5 minutes (configure in Supabase dashboard)
// Env required:
// - SUPABASE_URL
// - SUPABASE_SERVICE_ROLE_KEY
// - APP_BASE_URL (https://your-app-domain)
// - PUSH_CRON_SECRET (same secret used by /api/push/notify)

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async () => {
  const url = Deno.env.get('SUPABASE_URL')!;
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const appBase = Deno.env.get('APP_BASE_URL')!;
  const cronSecret = Deno.env.get('PUSH_CRON_SECRET')!;
  const supabase = createClient(url, key);

  const now = new Date();
  const inOneHourStart = new Date(now.getTime() + 55 * 60 * 1000);
  const inOneHourEnd = new Date(now.getTime() + 65 * 60 * 1000);

  const tomorrow = new Date(now.getTime() + 24 * 3600 * 1000);
  const dayStart = new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate());
  const dayEnd = new Date(dayStart.getTime() + 5 * 60 * 1000); // small window

  // Hour reminders: events starting ~1 hour from now
  const { data: hourEvents } = await supabase
    .from('couple_events')
    .select('id, couple_id, title, starts_at')
    .gte('starts_at', inOneHourStart.toISOString())
    .lte('starts_at', inOneHourEnd.toISOString());

  // Day reminders: events happening tomorrow (window at midnight)
  const { data: dayEvents } = await supabase
    .from('couple_events')
    .select('id, couple_id, title, starts_at')
    .gte('starts_at', dayStart.toISOString())
    .lte('starts_at', dayEnd.toISOString());

  const toNotify = [...(hourEvents || []), ...(dayEvents || [])];

  for (const ev of toNotify) {
    // Fetch both members' subscriptions (excluding duplicates by endpoint)
    const { data: members } = await supabase
      .from('couple_members')
      .select('user_id')
      .eq('couple_id', ev.couple_id);
    const userIds = (members || []).map((m) => m.user_id);
    if (userIds.length === 0) continue;

    const { data: subs } = await supabase
      .from('push_subscriptions')
      .select('endpoint, p256dh, auth, user_id')
      .in('user_id', userIds);

    const uniqueByEndpoint = new Map<string, any>();
    (subs || []).forEach((s) => { uniqueByEndpoint.set(s.endpoint, { endpoint: s.endpoint, p256dh: s.p256dh, auth: s.auth }); });

    // Call app notify endpoint with server bypass and targets list
    const body = {
      type: 'event',
      eventTitle: ev.title,
      starts_at: ev.starts_at,
      url: `${appBase}/calendar?event=${ev.id}`,
      couple_id: ev.couple_id,
      targets: Array.from(uniqueByEndpoint.values()),
    };

    try {
      await fetch(`${appBase}/api/push/notify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-server-auth': cronSecret,
        },
        body: JSON.stringify(body),
      });
    } catch (_) {
      // log suppressed
    }
  }

  return new Response(JSON.stringify({ ok: true, processed: toNotify.length }), { headers: { 'Content-Type': 'application/json' } });
});

