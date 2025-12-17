"use client";

import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";
import { MOODS, MoodType } from "./MoodSelector";

interface MoodCardProps {
  title: string;
  moodValue?: string | null;
  interactive?: boolean;
  onClick?: () => void;
  loading?: boolean;
}

export default function MoodCard({ title, moodValue, interactive, onClick, loading }: MoodCardProps) {
  const mood = MOODS.find(m => m.id === moodValue);

  return (
    <div
      onClick={interactive ? onClick : undefined}
      className={cn(
        "relative flex flex-col items-center justify-center p-4 rounded-3xl transition-all h-full shadow-sm backdrop-blur-sm",
        "border border-neutral-200/50 dark:border-neutral-700/50",
        interactive 
          ? "cursor-pointer hover:shadow-md hover:scale-[1.02] active:scale-95 bg-gradient-to-br from-white/80 to-blue-50/50 dark:from-neutral-800/80 dark:to-neutral-900/80" 
          : "bg-neutral-50/80 dark:bg-neutral-900/80"
      )}
    >
      <span className="text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-2">
        {title}
      </span>

      <div className="flex-1 flex flex-col items-center justify-center min-h-[80px]">
        {loading ? (
          <Loader2 className="w-6 h-6 animate-spin text-neutral-300" />
        ) : mood ? (
          <>
            <div className="text-5xl animate-bounce" style={{ animationDuration: '2s' }}>
              {mood.emoji}
            </div>
            <span className="mt-2 text-sm font-medium text-neutral-600 dark:text-neutral-300">
              {mood.label}
            </span>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center text-neutral-300 dark:text-neutral-600">
            <span className="text-3xl grayscale opacity-50">😶</span>
            <span className="text-xs mt-2 font-medium">En attente...</span>
          </div>
        )}
      </div>

      {interactive && (
        <div className="absolute top-2 right-2 flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
        </div>
      )}
    </div>
  );
}
