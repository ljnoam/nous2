'use client';

import { supabase } from '@/lib/supabase/client';
import { cn, relativeTimeFromNow } from '@/lib/utils';
import { Calendar, Heart, ListTodo } from 'lucide-react';
import { useEffect, useState } from 'react';

type LoveNote = { id: string; content: string; created_at: string; author_id: string; couple_id: string };
type BucketItem = { id: string; title: string; created_at: string; couple_id: string };
type CoupleEvent = { id: string; title: string; starts_at: string; couple_id: string };

export default function ActivityWidget() {
  const [loading, setLoading] = useState(true);
  const [me, setMe] = useState<string | null>(null);
  const [coupleId, setCoupleId] = useState<string | null>(null);

  const [lastNote, setLastNote] = useState<LoveNote | null>(null);
  const [lastBucket, setLastBucket] = useState<BucketItem | null>(null);
  const [nextEvent, setNextEvent] = useState<CoupleEvent | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { data: s } = await supabase.auth.getSession();
        if (!s.session) { setLoading(false); return; }
        const userId = s.session.user.id;
        setMe(userId);

        const { data: st } = await supabase
          .from('my_couple_status')
          .select('*')
          .eq('user_id', userId)
          .maybeSingle();

        if (!st?.couple_id) { setLoading(false); return; }
        const cpl = st.couple_id as string;
        setCoupleId(cpl);

        // One request per resource, no N+1.
        const [notesRes, bucketRes, eventRes] = await Promise.all([
          supabase
            .from('love_notes')
            .select('id, content, created_at, author_id, couple_id')
            .eq('couple_id', cpl)
            .neq('author_id', userId)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle(),
          supabase
            .from('bucket_items')
            .select('id, title, created_at, couple_id')
            .eq('couple_id', cpl)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle(),
          supabase
            .from('couple_events')
            .select('id, title, starts_at, couple_id')
            .eq('couple_id', cpl)
            .gte('starts_at', new Date().toISOString())
            .order('starts_at', { ascending: true })
            .limit(1)
            .maybeSingle(),
        ]);

        if (!mounted) return;
        setLastNote(notesRes?.data ?? null);
        setLastBucket(bucketRes?.data ?? null);
        setNextEvent(eventRes?.data ?? null);
      } catch (e) {
        console.error('ActivityWidget error:', JSON.stringify(e));
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  return (
    <section aria-label="Activité récente" className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
      <ActivityCard
        icon={<Heart className="h-4 w-4 text-pink-600 dark:text-pink-400" aria-hidden />}
        title="Dernier mot doux"
        loading={loading}
        empty="Aucun mot doux reçu pour l'instant"
        content={lastNote ? truncate(lastNote.content, 60) : undefined}
        meta={lastNote ? relativeTimeFromNow(lastNote.created_at) : undefined}
      />
      <ActivityCard
        icon={<ListTodo className="h-4 w-4 text-rose-600 dark:text-rose-400" aria-hidden />}
        title="Dernier ajout bucket"
        loading={loading}
        empty="Ta bucket list est vide"
        content={lastBucket ? truncate(lastBucket.title, 60) : undefined}
        meta={lastBucket ? relativeTimeFromNow(lastBucket.created_at) : undefined}
      />
      <ActivityCard
        icon={<Calendar className="h-4 w-4 text-fuchsia-600 dark:text-fuchsia-400" aria-hidden />}
        title="Prochain évènement"
        loading={loading}
        empty="Aucun évènement à venir"
        content={nextEvent ? truncate(nextEvent.title, 60) : undefined}
        meta={nextEvent ? relativeTimeFromNow(nextEvent.starts_at) : undefined}
      />
    </section>
  );
}

function ActivityCard({
  icon,
  title,
  loading,
  empty,
  content,
  meta,
}: {
  icon: React.ReactNode;
  title: string;
  loading: boolean;
  empty: string;
  content?: string;
  meta?: string;
}) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-black/10 dark:border-white/10',
        'bg-white/75 dark:bg-neutral-900/70 backdrop-blur-md',
        'shadow p-4 sm:p-5 h-full'
      )}
      role="status"
      aria-live="polite"
    >
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <h3 className="text-sm font-semibold">{title}</h3>
      </div>
      {loading ? (
        <div className="animate-pulse space-y-2" aria-busy="true" aria-label="Chargement">
          <div className="h-3 w-3/4 rounded bg-black/10 dark:bg-white/10" />
          <div className="h-3 w-1/2 rounded bg-black/10 dark:bg-white/10" />
        </div>
      ) : content ? (
        <>
          <p className="text-sm leading-snug">{content}</p>
          {meta && <p className="text-xs opacity-60 mt-1">{meta}</p>}
        </>
      ) : (
        <p className="text-sm opacity-70">{empty}</p>
      )}
    </div>
  );
}

function truncate(s: string, n: number) {
  if (s.length <= n) return s;
  return s.slice(0, Math.max(0, n - 1)).trimEnd() + '…';
}
