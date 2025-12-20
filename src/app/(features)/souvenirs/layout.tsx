'use client';

import SegmentedHeaderView from '@/components/ui/SegmentedHeaderView';

const SOUVENIRS_SEGMENTS = [
  { label: 'Albums', href: '/souvenirs/albums' },
  { label: 'Mots', href: '/souvenirs/notes' },
  { label: 'Carte', href: '/souvenirs/map' },
];

export default function SouvenirsLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SegmentedHeaderView items={SOUVENIRS_SEGMENTS} />
      {children}
    </>
  );
}
