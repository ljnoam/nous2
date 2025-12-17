"use client";

import { Button } from "@/components/ui/button";
import { CalendarPlus, ListTodo, Send } from "lucide-react";
import Link from "next/link";

export default function QuickActions() {
  return (
    <div className="grid grid-cols-2 gap-3">
      <QuickAction 
        href="/notes" 
        icon={<Send className="w-5 h-5" />} 
        label="Mot doux" 
        color="bg-rose-50 text-rose-600 dark:bg-rose-900/20 dark:text-rose-400"
      />
      <QuickAction 
        href="/bucket" 
        icon={<ListTodo className="w-5 h-5" />} 
        label="Bucket" 
        color="bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400"
      />
      <QuickAction 
        href="/calendar" 
        icon={<CalendarPlus className="w-5 h-5" />} 
        label="Agenda" 
        color="bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400"
      />
      <QuickAction 
        href="/cinematch" 
        icon={<span className="text-xl">🎬</span>} 
        label="CinéMatch" 
        color="bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400"
      />
    </div>
  );
}

function QuickAction({ href, icon, label, color }: { href: string; icon: React.ReactNode; label: string; color: string }) {
  return (
    <Link href={href} className="block group">
      <div className={`
        flex flex-col items-center justify-center gap-2 p-4 rounded-2xl 
        transition-all duration-300 active:scale-95
        border border-black/5 dark:border-white/5 shadow-sm hover:shadow-md
        bg-white/80 dark:bg-neutral-900/60 backdrop-blur-md
      `}>
        <div className={`p-3 rounded-xl transition-transform group-hover:scale-110 ${color}`}>
          {icon}
        </div>
        <span className="text-xs font-medium text-neutral-600 dark:text-neutral-300">
          {label}
        </span>
      </div>
    </Link>
  );
}
