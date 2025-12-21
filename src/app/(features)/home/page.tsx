'use client';

import { BentoGrid, BentoGridItem } from '@/components/home/bento/BentoGrid';
import EventWidget from '@/components/home/bento/EventWidget';
import LoveWidget from '@/components/home/bento/LoveWidget';
import NoteWidget from '@/components/home/bento/NoteWidget';
import QuickActions from '@/components/home/bento/QuickActions';
import MoodWidget from '@/components/home/mood/MoodWidget';

import UserAvatar from '@/components/nav/UserAvatar';
import AppSkeleton from '@/components/ui/AppSkeleton';
import BlurText from '@/components/ui/BlurText';
import { useAppReady } from '@/lib/context/AppReadyContext';
import { useAppStore } from '@/lib/store/useAppStore';
import { supabase } from '@/lib/supabase/client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';

export default function HomePage() {
  const router = useRouter();

  // ZUSTAND STATE
  const {
    firstName,
    setFirstName,
    _hasHydrated,
    user, setUser,
    couple, setCouple
  } = useAppStore(useShallow(state => ({
    firstName: state.firstName,
    setFirstName: state.setFirstName,
    _hasHydrated: state._hasHydrated,
    user: state.user,
    setUser: state.setUser,
    couple: state.couple,
    setCouple: state.setCouple
  })));

  const [loading, setLoading] = useState(true);
  const { setAppReady } = useAppReady();

  useEffect(() => {
    (async () => {
      try {
        // 1. Auth Check
        const { data: s } = await supabase.auth.getSession();
        if (!s.session) { router.replace('/register'); return; }
        const uid = s.session.user.id;

        // Update Store User
        if (s.session.user.id !== user?.id) {
             setUser(s.session.user);
        }

        // 2. Couple Check (Use local cache first if available?)
        // Always verify couple status for redirection safety, but non-blocking if we assume valid?
        // For security/logic correctness, let's fetch.

        const { data: cData, error } = await supabase
          .from('my_couple_status')
          .select('*')
          .eq('user_id', uid)
          .maybeSingle();

        if (error) {
          console.error('HomePage couple check error:', JSON.stringify(error));
          return;
        }

        if (!cData) { router.replace('/onboarding'); return; }
        if (cData.members_count < 2) { router.replace('/waiting'); return; }

        setCouple({ id: cData.couple_id, members_count: cData.members_count });

        // 3. Profile Name
        // Only fetch if we don't have it or want to refresh? Let's refresh silently
        const { data: prof } = await supabase
          .from('profiles')
          .select('first_name')
          .eq('id', uid)
          .maybeSingle();

        if (prof?.first_name) {
             setFirstName(prof.first_name);
        }

        setLoading(false);
        setAppReady(); // Signal splash screen that app is ready
      } catch (e) {
        console.error('HomePage exception:', e);
        setLoading(false);
        setAppReady(); // Signal even on error to not block splash
      }
    })();
  }, [router, setFirstName, setUser, setCouple, user?.id, setAppReady]);

  // SKELETON: Show if not hydrated (localStorage loading) OR if pure initial load with no cached name
  // If we have a cached firstName, we show the page immediately (Optimistic/Offline-First)
  const showSkeleton = !_hasHydrated || (loading && !firstName);

  if (showSkeleton) {
      return <AppSkeleton />;
  }

  return (
    <>
      <main className="relative z-10 min-h-screen pb-20 px-3 pt-[calc(env(safe-area-inset-top)+12px)] space-y-6">

        {/* Header */}
        <header className="relative flex items-center justify-center py-2 mb-4">
           {/* Centered Title */}
          <BlurText
            text={`Bonjour ${firstName || 'toi'} ❤️`}
            className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white"
            delay={50}
            animateBy="words"
            direction="top"
          />

          {/* Profile Icon Top Right */}
          <div className="absolute right-0 top-1/2 -translate-y-1/2">
             <Link href="/profile" className="block p-1 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition">
                <UserAvatar size={36} />
             </Link>
          </div>
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

          {/* Mood Widget */}
          <BentoGridItem
            className="md:col-span-3 row-span-1 min-h-[160px]"
            header={<MoodWidget />}
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
