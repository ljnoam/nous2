"use client";

import { supabase } from "@/lib/supabase/client";
import { relativeTimeFromNow } from "@/lib/utils";
import { Calendar } from "lucide-react";
import { useEffect, useState } from "react";

type CoupleEvent = { id: string; title: string; starts_at: string; couple_id: string };

export default function EventWidget() {
  const [loading, setLoading] = useState(true);
  const [nextEvent, setNextEvent] = useState<CoupleEvent | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { data: s } = await supabase.auth.getSession();
        if (!s.session) { setLoading(false); return; }
        const userId = s.session.user.id;

        const { data: st } = await supabase
          .from('my_couple_status')
          .select('couple_id')
          .eq('user_id', userId)
          .maybeSingle();

        if (!st?.couple_id) { setLoading(false); return; }
        const cpl = st.couple_id;

        const { data } = await supabase
          .from('couple_events')
          .select('id, title, starts_at, couple_id')
          .eq('couple_id', cpl)
          .gte('starts_at', new Date().toISOString())
          .order('starts_at', { ascending: true })
          .limit(1)
          .maybeSingle();

        if (mounted) setNextEvent(data);
      } catch (e) {
        console.error('EventWidget error:', e);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  if (loading) {
    return (
      <div className="h-full w-full flex flex-col justify-center animate-pulse space-y-2">
        <div className="h-4 w-1/2 bg-neutral-200 dark:bg-neutral-800 rounded" />
        <div className="h-6 w-3/4 bg-neutral-200 dark:bg-neutral-800 rounded" />
      </div>
    );
  }

  return (
    <div className="h-full w-full flex flex-col justify-between">
      <div className="flex items-center gap-2">
        <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-xl text-purple-600 dark:text-purple-400">
          <Calendar className="w-4 h-4" />
        </div>
        <span className="text-sm font-medium text-neutral-600 dark:text-neutral-400">Prochain événement</span>
      </div>

      <div className="mt-4">
        {nextEvent ? (
          <>
            <h3 className="text-lg font-semibold line-clamp-2 leading-tight mb-1">
              {nextEvent.title}
            </h3>
            <p className="text-xs font-medium text-purple-600 dark:text-purple-400">
              {relativeTimeFromNow(nextEvent.starts_at)}
            </p>
          </>
        ) : (
          <p className="text-sm text-neutral-400 italic">
            Aucun événement prévu
          </p>
        )}
      </div>
    </div>
  );
}
