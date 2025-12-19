'use client';

import { 
  Camera, 
  Wallet, 
  NotebookPen, 
  CalendarPlus, 
  X 
} from 'lucide-react';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerClose,
} from '@/components/ui/drawer';
import Link from 'next/link';

interface GlobalActionDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ACTIONS = [
  { 
    label: 'Souvenir', 
    icon: Camera, 
    href: '/souvenirs/albums?action=new',
    color: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' 
  },
  { 
    label: 'Dépense', 
    icon: Wallet, 
    href: '/life/expenses?action=new',
    color: 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400' 
  },
  { 
    label: 'Mot Doux', 
    icon: NotebookPen, 
    href: '/souvenirs/notes?action=new',
    color: 'bg-pink-100 text-pink-600 dark:bg-pink-900/30 dark:text-pink-400' 
  },
  { 
    label: 'Événement', 
    icon: CalendarPlus, 
    href: '/life/calendar?action=new',
    color: 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400' 
  },
];

export default function GlobalActionDrawer({ open, onOpenChange }: GlobalActionDrawerProps) {
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="bg-white dark:bg-neutral-950 border-t border-black/5 dark:border-white/5">
        <div className="mx-auto w-full max-w-sm pb-8">
          <DrawerHeader className="text-center pt-6 pb-2">
            <DrawerTitle className="text-xl font-display font-bold">Quoi de neuf ?</DrawerTitle>
          </DrawerHeader>

          <div className="grid grid-cols-2 gap-4 p-4">
            {ACTIONS.map((action) => {
              const Icon = action.icon;
              return (
                <Link
                  key={action.label}
                  href={action.href}
                  onClick={() => onOpenChange(false)}
                  className="flex flex-col items-center justify-center gap-3 p-6 rounded-3xl bg-neutral-50 dark:bg-neutral-900/50 hover:scale-[0.98] active:scale-95 transition-all border border-black/5 dark:border-white/5"
                >
                  <div className={`p-4 rounded-2xl ${action.color}`}>
                    <Icon className="w-7 h-7" />
                  </div>
                  <span className="font-medium text-neutral-700 dark:text-neutral-300">
                    {action.label}
                  </span>
                </Link>
              );
            })}
          </div>

          <div className="px-4 mt-2">
            <DrawerClose asChild>
              <button className="flex items-center justify-center w-full h-14 rounded-full bg-neutral-100 dark:bg-neutral-900 text-neutral-500 hover:text-black dark:hover:text-white transition-colors">
                <X className="w-6 h-6" />
              </button>
            </DrawerClose>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
