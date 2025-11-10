// src/components/notes/NotesCarousel.tsx
'use client';

<<<<<<< HEAD
import { FiFileText } from 'react-icons/fi';
import Carousel, { type CarouselItem } from '@/components/ui/Carousel';

function noteToItem(n: Note, idx: number): CarouselItem {
  const lines = (n.content || '').split('\n');
  const title = (lines[0] || '').trim() || 'Sans titre';
  const description = lines.slice(1).join('\n').trim() || '—';
  return {
    id: idx,
    title,
    description,
    icon: <FiFileText className="h-[16px] w-[16px] text-white" />,
  };
}

export default function NotesCarousel({ notes }: { notes: Note[] }) {
  const items = notes.map(noteToItem);
  return (
    <div className="relative w-full flex justify-center">
      <Carousel
        items={items}
        baseWidth={300}
        autoplay={false}
        pauseOnHover
        loop={notes.length > 1}
        round={false}
      />
=======
import React, { useEffect, useRef, useState } from 'react';

// Local Note type (kept simple to avoid cross-file imports)
type Note = { id: string; content: string; created_at: string; author_id: string };

export default function NotesCarousel({ notes }: { notes: Note[] }) {
  const carouselRef = useRef<HTMLDivElement | null>(null);
  const [cardMaxHeight, setCardMaxHeight] = useState<number | null>(null);
  // A small set of font stacks to vary the look of each card. These use common families
  // so they work without external font loading. We pick one based on index.
  const fonts = [
    "Georgia, 'Times New Roman', Times, serif",
    "'Palatino Linotype', 'Book Antiqua', Palatino, serif",
    "'Trebuchet MS', Helvetica, Arial, sans-serif",
    "'Courier New', Courier, monospace",
    "cursive",
  ];

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const header = document.getElementById('notes-header');
    const composer = document.getElementById('notes-composer');
    const carousel = carouselRef.current;

    function compute() {
      if (!header || !composer || !carousel) return;
      const headerRect = header.getBoundingClientRect();
      const composerRect = composer.getBoundingClientRect();
      const padding = 36; // increased desired padding above/below cards
      // available space between header bottom and composer top
      const available = composerRect.top - headerRect.bottom - padding * 2;
      const viewportLimit = Math.floor(window.innerHeight * 0.85); // prefer large cards but not full viewport
      // desired should never exceed available (to avoid overlap) and should be capped by viewportLimit
      let desired = Math.min(available, viewportLimit);
      // allow shrinking but keep a sensible minimum for readability
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
      {/* Horizontal scroll on small screens, grid on larger. Cards adapt to available height. */}
      <div ref={carouselRef} className="flex gap-6 overflow-x-auto snap-x snap-mandatory py-6 px-2">
        {notes.map((n, idx) => (
          <article
            key={n.id}
            className="snap-start min-w-[300px] max-w-[720px] flex-shrink-0 relative overflow-hidden rounded-2xl p-0"
            style={{ height: cardMaxHeight ? `${cardMaxHeight}px` : undefined, paddingLeft: 6 }}
            aria-label={`Note ${idx + 1}`}
          >
            {/* Left accent bar */}
            <div className="absolute left-0 top-0 bottom-0 w-3 bg-gradient-to-b from-pink-500 to-rose-600 rounded-tr-lg rounded-br-lg shadow-sm" />

            <div className="relative h-full flex flex-col bg-gradient-to-br from-pink-50/60 via-white/60 to-rose-50/40 dark:from-neutral-900/75 dark:to-neutral-900/60 border border-neutral-200 dark:border-neutral-800 p-6 shadow-2xl">
              <header className="flex items-start gap-3 mb-4">
                <div className="w-14 h-14 rounded-lg bg-gradient-to-br from-pink-500 to-rose-500 flex items-center justify-center text-white text-lg shadow-md">💌</div>
                <div className="flex-1">
                  <div className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">Mot doux</div>
                  <div className="text-xs text-neutral-500 dark:text-neutral-400">{new Date(n.created_at).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}</div>
                </div>
              </header>

              <div className="prose-sm grow overflow-auto text-neutral-900 dark:text-neutral-100 whitespace-pre-wrap break-words leading-relaxed">
                <div
                  className="rounded-xl p-6 bg-gradient-to-b from-white/80 to-pink-50/40 dark:from-neutral-900/70 dark:to-neutral-900/60 backdrop-blur-md border border-dashed border-pink-100 dark:border-pink-900/30 shadow-inner"
                  style={{ fontFamily: fonts[idx % fonts.length], fontSize: '1.05rem' }}
                >
                  <div className="text-base leading-relaxed text-neutral-900 dark:text-neutral-100">{n.content}</div>
                </div>
              </div>

              <div className="mt-5 flex items-center justify-between text-xs text-neutral-500 dark:text-neutral-400">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-1 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-600">#{idx + 1}</span>
                </div>
                <div className="opacity-80">{new Date(n.created_at).toLocaleDateString('fr-FR')}</div>
              </div>
            </div>
          </article>
        ))}
      </div>

      {/* Dots / progress indicator for wider screens */}
      <div className="hidden sm:flex items-center justify-center gap-2 mt-3">
        {notes.map((_, i) => (
          <span key={i} className="w-2 h-2 rounded-full bg-neutral-300 dark:bg-neutral-700" />
        ))}
      </div>
>>>>>>> 4e6203b (Version 1 : update /notes et /login)
    </div>
  );
}
