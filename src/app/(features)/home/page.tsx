'use client';
import DaysSinceCouple from '@/components/counter/DaysSinceCouple';
import ActivityWidget from '@/components/home/ActivityWidget';
import HeartBackground from '@/components/home/HeartBackground';
import BlurText from '@/components/ui/BlurText';
import RotatingText from '@/components/ui/RotatingText';
import { supabase } from '@/lib/supabase/client';
import { CalendarPlus, Heart, ListChecks, Send } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';

export default function HomePage() {
  const router = useRouter();
  const [firstName, setFirstName] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const { data: s } = await supabase.auth.getSession();
        if (!s.session) { router.replace('/register'); return; }
        const uid = s.session.user.id;

        const { data, error } = await supabase
          .from('my_couple_status')
          .select('*')
          .eq('user_id', uid)
          .maybeSingle();

        if (error) {
          console.error('HomePage couple check error:', JSON.stringify(error));
          // Do not redirect to onboarding on error, just return or show error
          return;
        }

        if (!data) { router.replace('/onboarding'); return; }
        if (data.members_count < 2) { router.replace('/waiting'); return; }

        const { data: prof } = await supabase
          .from('profiles')
          .select('first_name')
          .eq('id', uid)
          .maybeSingle();
        setFirstName(prof?.first_name ?? null);
      } catch (e) {
        console.error('HomePage exception:', e);
      }
    })();
  }, [router]);

  return (
    <>
      <HeartBackground />
      <main className="relative z-10 flex flex-col space-y-5 sm:space-y-6 pt-8 pb-28 px-4">
      {/* Hero section */}
      <section className="space-y-4">
        <DaysSinceCouple />
        <div className="rounded-3xl border border-black/10 dark:border-white/10 bg-white/70 dark:bg-neutral-900/60 backdrop-blur-md shadow-xl p-6 sm:p-8">
          <div className="flex items-center gap-2">
            <Heart className="h-5 w-5 text-pink-600 dark:text-pink-400" aria-hidden />
            <BlurText
              text={`Bienvenue ${firstName ? `❤️ ${firstName}` : '❤️'}`}
              className="text-2xl font-bold tracking-tight"
              delay={50}
              animateBy="words"
              direction="top"
            />
          </div>
          <div className="mt-2 flex items-center gap-2 text-sm opacity-70">
            <span>Ici pour</span>
            <RotatingText
              texts={['Partager', 'Planifier', 'Aimer']}
              mainClassName="font-semibold text-pink-600 dark:text-pink-400"
              staggerFrom="last"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "-120%" }}
              staggerDuration={0.025}
              splitLevelClassName="overflow-hidden pb-0.5 sm:pb-1 md:pb-1"
              transition={{ type: "spring", damping: 30, stiffness: 400 }}
              rotationInterval={2000}
            />
          </div>
        </div>
      </section>
      {/* Counter bento */}
      <div className="hidden">
        <DaysSinceCouple />
      </div>

      {/* Heading + Warm welcome */}
      <header className="hidden">
        <h1 className="text-2xl font-bold tracking-tight" aria-live="polite">
          Bienvenue ❤️ {firstName || 'toi'}
        </h1>
        <p className="opacity-70 text-sm mt-1">Heureux de vous revoir ici.</p>
      </header>

      {/* Quick actions */}
      <section aria-label="Actions rapides" className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <HomeCTA href="/notes" label="Écrire un mot doux" ariaLabel="Aller écrire un mot doux" icon={<Send className="h-4 w-4" />} />
        <HomeCTA href="/bucket" label="Ajouter à la bucket" ariaLabel="Ajouter un élément à la bucket list" icon={<ListChecks className="h-4 w-4" />} />
        <HomeCTA href="/calendar" label="Créer un événement" ariaLabel="Créer un événement" icon={<CalendarPlus className="h-4 w-4" />} />
      </section>

      {/* CTAs */}
      <div className="px-1">
        <h2 className="text-sm font-semibold opacity-70">Aperçu rapide</h2>
      </div>
      <section aria-label="Actions rapides" className="hidden grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <HomeCTA href="/notes" label="Écrire un mot doux" ariaLabel="Aller écrire un mot doux" />
        <HomeCTA href="/bucket" label="Ajouter à la bucket" ariaLabel="Ajouter un élément à la bucket list" />
        <HomeCTA href="/calendar" label="Créer un évènement" ariaLabel="Créer un évènement" />
      </section>

      {/* Activity Widget */}
      <ActivityWidget />
    </main>
    </>
  );
}

function HomeCTA({ href, label, ariaLabel, icon }: { href: string; label: string; ariaLabel: string; icon?: React.ReactNode }) {
  return (
    <Button
      asChild
      variant="outline"
      className="w-full h-auto py-4 justify-start px-4 rounded-2xl border-black/10 dark:border-white/10 bg-white/80 dark:bg-neutral-900/70 backdrop-blur-md shadow-sm hover:shadow-md transition-all active:scale-[0.99]"
    >
      <Link href={href} aria-label={ariaLabel}>
        <span className="flex items-center gap-3 w-full">
          {icon && <span className="shrink-0 text-pink-600 dark:text-pink-400 group-hover:scale-105 transition-transform">{icon}</span>}
          <span className="text-base font-medium">{label}</span>
        </span>
      </Link>
    </Button>
  );
}
