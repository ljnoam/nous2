'use client';

import CountUp from '@/components/ui/CountUp';
import { supabase } from '@/lib/supabase/client';
import { Heart } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

type Status = {
  started_at: string | null;
  members_count: number | null;
};

function daysBetween(startISO: string): number {
  // calcule en UTC pour éviter les surprises de fuseaux
  const MS_PER_DAY = 24 * 60 * 60 * 1000;
  const start = new Date(startISO); // ISO date (YYYY-MM-DD)
  const startUTC = Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate());
  const now = new Date();
  const nowUTC = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const diff = Math.floor((nowUTC - startUTC) / MS_PER_DAY);
  return Math.max(0, diff); // 0 si aujourd'hui
}

export default function DaysSinceCouple() {
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<Status | null>(null);
  const [tick, setTick] = useState(0); // force recalcul à minuit

  // charge started_at via la vue my_couple_status
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
          console.error('DaysSinceCouple error:', JSON.stringify(error));
          setStatus(null);
        } else {
          setStatus({ started_at: data?.started_at ?? null, members_count: data?.members_count ?? null });
        }
      } catch (e) {
        console.error('DaysSinceCouple exception:', e);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  // déclenche un tick à minuit pour rafraîchir le compteur sans reload
  useEffect(() => {
    function msUntilNextMidnight() {
      const now = new Date();
      const next = new Date(now);
      next.setUTCHours(24, 0, 0, 0); // prochain minuit UTC (cohérent avec le calcul UTC)
      return +next - +now;
    }
    const t1 = setTimeout(() => {
      setTick((x) => x + 1); // tick à minuit
      // ensuite, tick toutes les 24h
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

  // UI
  if (loading) {
    return (
      <div className="animate-pulse rounded-3xl border border-black/10 dark:border-white/10 bg-gradient-to-br from-rose-50/70 via-white/60 to-pink-50/70 dark:from-neutral-900/50 dark:via-neutral-900/60 dark:to-neutral-800/50 backdrop-blur-md shadow-xl p-5 sm:p-6">
        <div className="h-4 w-28 rounded bg-black/10 dark:bg-white/10 mb-3" />
        <div className="h-10 w-44 rounded bg-black/10 dark:bg-white/10" />
      </div>
    );
  }

  if (!status?.started_at) {
    // pas encore de date (couple pas créé)
    return null;
  }

  return (
    <div
      className="
        rounded-3xl border border-black/10 dark:border-white/10
        bg-gradient-to-br from-rose-50/80 via-white/70 to-pink-50/80 dark:from-neutral-900/60 dark:via-neutral-900/60 dark:to-neutral-800/60
        backdrop-blur-md shadow-xl
        p-5 sm:p-6
      "
    >
      <div className="flex items-center gap-2 text-sm sm:text-base opacity-80">
        <Heart className="h-4 w-4 text-pink-600 dark:text-pink-400 heart-beat" aria-hidden />
        <span>En couple depuis</span>
      </div>
      <div className="mt-1 flex items-baseline gap-2">
        <CountUp
          to={days ?? 0}
          from={0}
          duration={2}
          className="text-4xl sm:text-5xl font-extrabold tabular-nums leading-none"
        />
        <span className="text-base sm:text-lg font-medium">jours</span>
      </div>
      <div className="mt-2 text-xs sm:text-sm opacity-60">
        Date: {new Date(status.started_at).toLocaleDateString('fr-FR')}
      </div>
    </div>
  );
}

