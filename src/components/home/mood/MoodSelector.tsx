"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Drawer, DrawerContent, DrawerFooter, DrawerHeader, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer";
import { useMediaQuery } from "@/hooks/use-media-query";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { useState } from "react";

export const MOODS = [
  { id: 'happy', label: 'Heureux', emoji: '😄', color: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800' },
  { id: 'sad', label: 'Triste', emoji: '😢', color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800' },
  { id: 'tired', label: 'Fatigué', emoji: '😴', color: 'bg-slate-100 dark:bg-slate-900/30 text-slate-700 dark:text-slate-400 border-slate-200 dark:border-slate-800' },
  { id: 'angry', label: 'Colère', emoji: '😡', color: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800' },
  { id: 'love', label: 'Amoureux', emoji: '😍', color: 'bg-pink-100 dark:bg-pink-900/30 text-pink-700 dark:text-pink-400 border-pink-200 dark:border-pink-800' },
  { id: 'cool', label: 'Détendu', emoji: '😎', color: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800' },
] as const;

export type MoodType = typeof MOODS[number]['id'];

interface MoodSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (mood: MoodType) => void;
  currentMood?: string | null;
}

export default function MoodSelector({ open, onOpenChange, onSelect, currentMood }: MoodSelectorProps) {
  const isDesktop = useMediaQuery("(min-width: 768px)");

  // Common content for both Dialog and Drawer
  const SelectionGrid = () => (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 p-4">
      {MOODS.map((mood) => (
        <motion.button
          key={mood.id}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => {
            onSelect(mood.id);
            onOpenChange(false);
          }}
          className={cn(
            "flex flex-col items-center justify-center p-4 rounded-2xl border transition-all cursor-pointer h-28 relative overflow-hidden group",
            mood.color,
            currentMood === mood.id ? "ring-2 ring-offset-2 ring-primary border-primary" : "border-transparent",
            "backdrop-blur-sm shadow-sm"
          )}
        >
          <span className="text-4xl mb-2 drop-shadow-sm transition-transform group-hover:scale-110 duration-300">
            {mood.emoji}
          </span>
          <span className="font-semibold text-sm tracking-wide">{mood.label}</span>
        </motion.button>
      ))}
    </div>
  );

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md bg-white/80 dark:bg-neutral-900/80 backdrop-blur-xl border-neutral-200 dark:border-neutral-800">
          <DialogHeader>
            <DialogTitle className="text-center text-2xl font-bold tracking-tight mb-2">Comment te sens-tu ?</DialogTitle>
          </DialogHeader>
          <SelectionGrid />
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="bg-white/90 dark:bg-neutral-900/95 backdrop-blur-xl border-t border-neutral-200 dark:border-neutral-800">
        <DrawerHeader className="text-left">
          <DrawerTitle className="text-center text-xl font-bold tracking-tight my-2">Comment te sens-tu ?</DrawerTitle>
        </DrawerHeader>
        <SelectionGrid />
        <DrawerFooter className="pt-2">
          {/* Optional footer content */}
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
