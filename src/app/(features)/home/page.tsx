'use client';

import { BentoGrid, BentoGridItem } from '@/components/home/bento/BentoGrid';
import EventWidget from '@/components/home/bento/EventWidget';
import LoveWidget from '@/components/home/bento/LoveWidget';
import NoteWidget from '@/components/home/bento/NoteWidget';
import QuickActions from '@/components/home/bento/QuickActions';
import HeartBackground from '@/components/home/HeartBackground';
import BlurText from '@/components/ui/BlurText';
import { supabase } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

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
      <main className="relative z-10 min-h-screen pb-20 px-3 pt-[calc(env(safe-area-inset-top)+12px)] space-y-6">
        
        {/* Header */}
        <header className="flex flex-col items-center text-center space-y-1">
          <BlurText
            text={`Bonjour ${firstName || 'toi'} ❤️`}
            className="text-3xl font-bold tracking-tight text-neutral-900 dark:text-white"
            delay={50}
            animateBy="words"
            direction="top"
          />
        </header>

        {/* Bento Grid */}
        <BentoGrid className="max-w-4xl mx-auto">
          
          {/* Main Love Widget (Large) */}
          <BentoGridItem
            className="md:col-span-2 md:row-span-2 min-h-[150px] bg-gradient-to-br from-rose-50 to-pink-50 dark:from-neutral-900 dark:to-neutral-800"
            header={<LoveWidget />}
          />

          {/* Quick Actions (Row) */}
          <div className="md:col-span-1 row-span-1">
             <QuickActions />
          </div>

          {/* Event Widget */}
          <BentoGridItem
            className="md:col-span-1 row-span-1 min-h-[140px]"
            header={<EventWidget />}
          />

          {/* Note Widget */}
          <BentoGridItem
            className="md:col-span-3 row-span-1 min-h-[160px] bg-gradient-to-br from-white to-neutral-50 dark:from-neutral-900 dark:to-neutral-900"
            header={<NoteWidget />}
          />

        </BentoGrid>
      </main>
    </>
  );
}
