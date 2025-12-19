'use client';

import SegmentedHeaderView from '@/components/ui/SegmentedHeaderView';

const LIFE_SEGMENTS = [
  { label: 'Agenda', href: '/life/calendar' },
  { label: 'Dépenses', href: '/life/expenses' },
  { label: 'Listes', href: '/life/bucket' },
];

export default function LifeLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SegmentedHeaderView items={LIFE_SEGMENTS} />
      {children}
    </>
  );
}
