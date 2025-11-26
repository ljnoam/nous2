// src/components/notes/NotesCarousel.tsx
'use client';

import { Button } from '@/components/ui/button';
import { AnimatePresence, motion } from 'framer-motion';
import { Trash2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

// Local Note type (kept simple to avoid cross-file imports)
type Note = { id: string; content: string; created_at: string; author_id: string };

export default function NotesCarousel({ notes, onDelete }: { notes: Note[]; onDelete: (id: string) => void }) {
  const carouselRef = useRef<HTMLDivElement | null>(null);
  const [cardMaxHeight, setCardMaxHeight] = useState<number | null>(null);

  // Design variations
  const fonts = ['font-caveat', 'font-indie', 'font-patrick', 'font-shadows'];
  const textures = ['texture-grid', 'texture-dots', 'texture-lines', 'bg-white'];
  const colors = [
    'bg-rose-50 dark:bg-rose-950/30',
    'bg-yellow-50 dark:bg-yellow-950/30',
    'bg-blue-50 dark:bg-blue-950/30',
    'bg-green-50 dark:bg-green-950/30',
    'bg-white dark:bg-neutral-900'
  ];
  const rotations = ['rotate-1', '-rotate-1', 'rotate-2', '-rotate-2', 'rotate-0'];

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const header = document.getElementById('notes-header');
    const composer = document.getElementById('notes-composer');
    const carousel = carouselRef.current;

    function compute() {
      if (!header || !composer || !carousel) return;
      const headerRect = header.getBoundingClientRect();
      const composerRect = composer.getBoundingClientRect();
      const padding = 36;
      const available = composerRect.top - headerRect.bottom - padding * 2;
      const viewportLimit = Math.floor(window.innerHeight * 0.85);
      let desired = Math.min(available, viewportLimit);
      const minAllow = 160;
      if (!isFinite(desired) || isNaN(desired)) desired = Math.floor(window.innerHeight * 0.7);
      if (desired < minAllow) desired = Math.max(120, Math.floor(available));
      setCardMaxHeight(Math.max(120, Math.floor(desired)));
    }

    compute();
    const ro = new ResizeObserver(() => compute());
    ro.observe(document.documentElement);
    if (composer) ro.observe(composer);
    if (header) ro.observe(header);
    window.addEventListener('resize', compute);
    window.addEventListener('orientationchange', compute);

    return () => {
      ro.disconnect();
      window.removeEventListener('resize', compute);
      window.removeEventListener('orientationchange', compute);
    };
  }, [carouselRef]);

  if (!notes || notes.length === 0) return null;

  return (
    <div className="w-full">
      <div ref={carouselRef} className="flex gap-6 overflow-x-auto snap-x snap-mandatory py-8 px-4 no-scrollbar items-center">
        <AnimatePresence>
          {notes.map((n, idx) => {
            // Deterministic random based on ID for stable rendering
            const seed = n.id.charCodeAt(0) + n.id.charCodeAt(n.id.length - 1) + idx;
            const font = fonts[seed % fonts.length];
            const texture = textures[seed % textures.length];
            const color = colors[seed % colors.length];
            const rot = rotations[seed % rotations.length];
            const showTape = seed % 3 === 0;

            return (
              <motion.article
                initial={{ opacity: 0, scale: 0.9, rotate: 0 }}
                animate={{ opacity: 1, scale: 1, rotate: seed % 2 === 0 ? 1 : -1 }}
                exit={{ opacity: 0, scale: 0.8, transition: { duration: 0.2 } }}
                whileHover={{ scale: 1.02, rotate: 0, transition: { duration: 0.2 } }}
                key={n.id}
                className={`
                  snap-center min-w-[85vw] sm:min-w-[350px] max-w-[90vw] sm:max-w-[500px]
                  flex-shrink-0 relative overflow-visible rounded-sm shadow-lg
                  ${color} ${rot} transition-shadow duration-300 hover:shadow-2xl
                `}
                style={{ height: cardMaxHeight ? `${cardMaxHeight}px` : undefined }}
              >
                {/* Washi Tape Decoration */}
                {showTape && <div className="washi-tape" />}

                {/* Pin Decoration (if no tape) */}
                {!showTape && seed % 2 === 0 && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-red-500 shadow-md border border-red-600 z-20" />
                )}

                <div className={`relative h-full flex flex-col ${texture} rounded-sm border border-black/5 dark:border-white/5 overflow-hidden`}>

                  {/* Header */}
                  <header className="flex items-center justify-between p-4 pb-2">
                    <div className="text-xs font-medium text-black/40 dark:text-white/40 uppercase tracking-widest">
                      {new Date(n.created_at).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => {
                        if (confirm('Veux-tu vraiment jeter ce petit mot ?')) onDelete(n.id);
                      }}
                      className="text-black/20 hover:text-red-500 hover:bg-transparent transition-colors -mr-2"
                      title="Jeter"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </header>

                  {/* Content */}
                  <div className="flex-1 overflow-y-auto p-6 pt-2 scrollbar-thin scrollbar-thumb-black/10 dark:scrollbar-thumb-white/10">
                    <div className={`${font} text-2xl sm:text-3xl leading-relaxed text-neutral-800 dark:text-neutral-200 whitespace-pre-wrap break-words`}>
                      {n.content}
                    </div>
                  </div>

                  {/* Footer / Signature */}
                  <div className="p-4 pt-0 flex justify-end">
                    <div className={`${font} text-lg text-black/40 dark:text-white/40 rotate-[-2deg]`}>
                      ~ Pour toi ❤️
                    </div>
                  </div>
                </div>
              </motion.article>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
