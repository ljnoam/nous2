'use client';

import {
  CalendarDays,
  Home,
  Images,
  Gamepad2,
  Plus
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import GlobalActionDrawer from './GlobalActionDrawer';

type Item = {
  href: string;
  label: string;
  icon: React.ComponentType<any>;
  isAction?: boolean;
};

const NAV_ITEMS: Item[] = [
  { href: '/home',       label: 'Home',      icon: Home },
  { href: '/life',       label: 'Vie Pratique', icon: CalendarDays },
  { href: '#action',     label: 'Nouveau',    icon: Plus, isAction: true },
  { href: '/souvenirs',  label: 'Souvenirs', icon: Images },
  { href: '/playroom',   label: 'Playroom',  icon: Gamepad2 },
];

function isActive(pathname: string, item: Item) {
  if (item.isAction) return false;
  // Special check for consolidated tabs to highlight parent even if on sub-route
  if (item.href === '/life' && pathname.startsWith('/life')) return true;
  if (item.href === '/souvenirs' && pathname.startsWith('/souvenirs')) return true;
  if (item.href === '/playroom' && pathname.startsWith('/playroom')) return true;
  
  return pathname === item.href || pathname.startsWith(item.href + '/');
}

export default function MainNav() {
  const pathname = usePathname();
  const [isActionOpen, setIsActionOpen] = useState(false);

  return (
    <>
      <div className="pointer-events-none fixed left-0 right-0 bottom-0 z-50 flex justify-center px-2 pb-1 sm:pb-4">
        <nav
          className="
            pointer-events-auto
            w-full max-w-md
            rounded-[2rem]
            border border-black/10 dark:border-white/10
            bg-white/80 dark:bg-neutral-900/80
            backdrop-blur-xl shadow-2xl
            mb-[calc(env(safe-area-inset-bottom))]
            overflow-hidden
          "
        >
          <ul className="flex items-center justify-between px-2">
            {NAV_ITEMS.map((item) => {
              const active = isActive(pathname, item);
              const Icon = item.icon;
              
              if (item.isAction) {
                return (
                  <li key="action" className="flex-1 -mt-6">
                     <button
                        onClick={() => setIsActionOpen(true)}
                        className="
                          relative group flex items-center justify-center
                          mx-auto
                          w-14 h-14
                          rounded-full
                          bg-gradient-to-tr from-purple-600 to-pink-600
                          text-white shadow-lg shadow-purple-500/30
                          transition-transform active:scale-95
                          border-4 border-white dark:border-neutral-900
                        "
                      >
                        <Plus className="h-7 w-7" />
                      </button>
                  </li>
                );
              }

              return (
                <li key={item.href} className="flex-1">
                  <Link
                    href={item.href}
                    className={`
                      group flex flex-col items-center justify-center gap-1 py-4
                      transition duration-300
                    `}
                    aria-current={active ? 'page' : undefined}
                  >
                    <span className={`
                      relative transition-colors duration-300
                      ${active ? 'text-purple-600 dark:text-purple-400' : 'text-neutral-400 group-hover:text-neutral-600 dark:text-neutral-500 dark:group-hover:text-neutral-300'}
                    `}>
                      <Icon className={`h-6 w-6 ${active ? 'fill-current' : ''}`} strokeWidth={active ? 2.5 : 2} />
                      {active && (
                        <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-current" />
                      )}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
      <GlobalActionDrawer open={isActionOpen} onOpenChange={setIsActionOpen} />
    </>
  );
}
