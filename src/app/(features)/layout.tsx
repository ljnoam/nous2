'use client';


import { usePathname } from 'next/navigation';
import type { CSSProperties, ReactNode } from 'react';
import MainNav from '@/components/nav/MainNav';
import LimboGuard from '@/components/limbo/LimboGuard';

const NAV_HEIGHT = '96px';

export default function FeaturesLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <LimboGuard>
      <div
        className="min-h-screen min-h-[var(--viewport-height)] bg-white text-neutral-900 dark:bg-neutral-950 dark:text-neutral-50"
        style={{ '--nav-h': NAV_HEIGHT } as CSSProperties}
      >
        <div
          className="w-full max-w-3xl mx-auto px-3 sm:px-4 min-h-screen min-h-[var(--viewport-height)] max-h-[var(--viewport-height)] overflow-y-auto no-scrollbar"
        >
          {children}
        </div>
        <MainNav />
      </div>
    </LimboGuard>
  );
}
