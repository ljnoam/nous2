'use client';

import {
    Calendar as CalendarIcon,
    Home,
    Image,
    NotebookPen
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import UserAvatar from './UserAvatar';

type Item = {
  href: string;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  custom?: React.ReactNode; // pour l’avatar
  match?: (path: string) => boolean;
};

const NAV_ITEMS: Item[] = [
  { href: '/home',     label: 'Home',   icon: Home },
  { href: '/notes',    label: 'Notes',  icon: NotebookPen },
  { href: '/albums',   label: 'Albums', icon: Image },
  { href: '/calendar', label: 'Agenda', icon: CalendarIcon },
  // Profil (avatar custom)
  { href: '/profile',  label: 'Moi',    custom: <UserAvatar size={28} /> },
];

function isActive(pathname: string, item: Item) {
  if (item.match) return item.match(pathname);
  return pathname === item.href || pathname.startsWith(item.href + '/');
}

export default function MainNav() {
  const pathname = usePathname();

  return (
    <div className="pointer-events-none fixed left-0 right-0 bottom-0 z-50 flex justify-center px-3 sm:px-6">
      <nav
        className="
          pointer-events-auto
          mx-auto w-full max-w-3xl
          rounded-2xl sm:rounded-3xl
          border border-black/10 dark:border-white/10
          bg-white/75 dark:bg-neutral-900/70
          backdrop-blur-md shadow-lg
          supports-[backdrop-filter]:backdrop-blur
          mb-[calc(env(safe-area-inset-bottom)+8px)]
        "
      >
        <ul className="flex items-center justify-between px-2 sm:px-3">
          {NAV_ITEMS.map((item) => {
            const active = isActive(pathname, item);
            const Icon = item.icon;
            return (
              <li key={item.href} className="flex-1">
                <Link
                  href={item.href}
                  className={`
                    group flex flex-col items-center justify-center gap-1 py-3 sm:py-3.5
                    text-xs sm:text-sm font-medium transition
                    ${active
                      ? 'text-black dark:text-white'
                      : 'text-neutral-600 hover:text-black dark:text-neutral-300 dark:hover:text-white'}
                  `}
                  aria-current={active ? 'page' : undefined}
                >
                  <span className={`
                    relative flex h-9 w-9 items-center justify-center rounded-xl
                    transition-all
                    ${active
                      ? 'bg-black/5 dark:bg-white/10 shadow-inner'
                      : 'bg-transparent group-hover:bg-black/5 dark:group-hover:bg-white/10'}
                  `}>
                    {item.custom ? item.custom : Icon ? <Icon className="h-5 w-5" /> : null}
                    {active && (
                      <span className="absolute -bottom-1 h-1 w-6 rounded-full bg-black/20 dark:bg-white/20" />
                    )}
                  </span>
                  <span className="hidden xs:block">{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
