'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';

type SegmentItem = {
  label: string;
  href: string;
};

interface SegmentedHeaderViewProps {
  title?: string;
  items: SegmentItem[];
}

export default function SegmentedHeaderView({ title, items }: SegmentedHeaderViewProps) {
  const pathname = usePathname();

  return (
    <div className="sticky top-[calc(env(safe-area-inset-top)+12px)] z-30 mb-6 px-4">
      <div className="relative mx-auto max-w-md overflow-hidden rounded-2xl border border-black/10 dark:border-white/10 bg-white/80 dark:bg-neutral-900/80 backdrop-blur-xl shadow-sm">
        <div className="flex p-1">
          {items.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
            return (
              <Link
                key={item.href}
                href={item.href}
                className="relative flex-1 py-1.5 text-center text-[13px] font-medium transition-colors z-10"
              >
                {isActive && (
                  <motion.div
                    layoutId={`segment-bg-${items.map(i => i.href).join('')}`}
                    className="absolute inset-0 rounded-xl bg-white dark:bg-neutral-800 shadow-sm"
                    transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                  />
                )}
                <span className={`relative z-10 ${isActive ? 'text-black dark:text-white' : 'text-neutral-500 dark:text-neutral-400'}`}>
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
