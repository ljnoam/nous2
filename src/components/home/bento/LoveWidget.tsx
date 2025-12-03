"use client";

import CountUp from "@/components/ui/CountUp";
import { supabase } from "@/lib/supabase/client";
import { Heart } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

type Status = {
  started_at: string | null;
  members_count: number | null;
};

function daysBetween(startISO: string): number {
  const MS_PER_DAY = 24 * 60 * 60 * 1000;
  const start = new Date(startISO);
  const startUTC = Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate());
  const now = new Date();
  const nowUTC = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const diff = Math.floor((nowUTC - startUTC) / MS_PER_DAY);
  return Math.max(0, diff);
}

export default function LoveWidget() {
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<Status | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { data: s } = await supabase.auth.getSession();
        if (!s.session) { setLoading(false); return; }
        const { data, error } = await supabase
          .from('my_couple_status')
          .select('started_at, members_count')
          .eq('user_id', s.session.user.id)
          .maybeSingle();
        if (!mounted) return;
        if (error) {
          console.error('LoveWidget error:', JSON.stringify(error));
          setStatus(null);
        } else {
          setStatus({ started_at: data?.started_at ?? null, members_count: data?.members_count ?? null });
        }
      } catch (e) {
        console.error('LoveWidget exception:', e);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    function msUntilNextMidnight() {
      const now = new Date();
      const next = new Date(now);
      next.setUTCHours(24, 0, 0, 0);
      return +next - +now;
    }
    const t1 = setTimeout(() => {
      setTick((x) => x + 1);
      const t2 = setInterval(() => setTick((x) => x + 1), 24 * 60 * 60 * 1000);
      // @ts-ignore
      window.__daysCounterInterval = t2;
    }, msUntilNextMidnight());
    return () => {
      clearTimeout(t1);
      // @ts-ignore
      if (window.__daysCounterInterval) clearInterval(window.__daysCounterInterval);
    };
  }, []);

  const days = useMemo(() => {
    if (!status?.started_at) return null;
    return daysBetween(status.started_at);
  }, [status?.started_at, tick]);

  if (loading) {
    return (
      <div className="h-full w-full flex flex-col justify-center items-center animate-pulse">
        <div className="h-8 w-24 bg-neutral-200 dark:bg-neutral-800 rounded mb-2" />
        <div className="h-12 w-32 bg-neutral-200 dark:bg-neutral-800 rounded" />
      </div>
    );
  }

  if (!status?.started_at) return null;

  return (
    <div className="h-full w-full flex flex-col justify-between relative overflow-hidden">
      <div className="absolute top-0 right-0 p-4 opacity-10">
        <Heart className="w-24 h-24 text-pink-500" />
      </div>
      
      <div className="flex items-center gap-2 z-10">
        <div className="p-2 bg-pink-100 dark:bg-pink-900/30 rounded-full">
          <Heart className="w-4 h-4 text-pink-600 dark:text-pink-400 heart-beat" fill="currentColor" />
        </div>
        <span className="text-sm font-medium text-neutral-600 dark:text-neutral-400">Ensemble depuis</span>
      </div>

      <div className="mt-4 z-10">
        <div className="flex items-baseline gap-2">
          <CountUp
            to={days ?? 0}
            from={0}
            duration={2}
            className="text-5xl font-bold tracking-tight text-neutral-900 dark:text-white"
          />
          <span className="text-lg font-medium text-neutral-500 dark:text-neutral-400">jours</span>
        </div>
        <p className="text-xs text-neutral-400 mt-1">
          {new Date(status.started_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      </div>
    </div>
  );
}
