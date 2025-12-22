"use client";

import { useState } from "react";
import { GENRES_MOVIE, GENRES_TV, PROVIDERS } from "@/lib/tmdb";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { ArrowRight, Film, Tv, Sparkles, Check } from "lucide-react";
import { createMatchSession } from "@/lib/actions";

interface SetupFormProps {
  onSessionStarted: (session: any) => void;
}

const PROVIDER_STYLES: Record<string, string> = {
  '8': 'from-red-600 to-red-900', // Netflix
  '337': 'from-blue-600 to-blue-900', // Disney+
  '119': 'from-sky-500 to-blue-700', // Prime
  '350': 'from-neutral-700 to-black', // Apple TV
};

export default function SetupForm({ onSessionStarted }: SetupFormProps) {
  const [type, setType] = useState<'movie' | 'tv'>('movie');
  const [selectedProviders, setSelectedProviders] = useState<string[]>([]);
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const toggleProvider = (id: string) => {
    setSelectedProviders(prev => prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]);
  };

  const toggleGenre = (id: string) => {
    setSelectedGenres(prev => prev.includes(id) ? prev.filter(g => g !== id) : [...prev, id]);
  };

  const handleStart = async () => {
    setLoading(true);
    try {
      const filters = {
        type,
        providers: selectedProviders,
        genres: selectedGenres
      };
      const session = await createMatchSession(filters);
      onSessionStarted(session);
    } catch (e) {
      console.error(e);
      setLoading(false);
    }
  };

  const genres = type === 'movie' ? GENRES_MOVIE : GENRES_TV;

  return (
    <div className="flex flex-col h-full min-h-screen bg-white dark:bg-neutral-950 px-6 pt-[calc(env(safe-area-inset-top)+20px)] pb-4 relative overflow-y-auto font-sans scrollbar-hide">
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center space-y-1 mb-10"
      >
        <span className="text-4xl mb-2 block animate-bounce">🍿</span>
        <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white">
          CinéMatch
        </h1>
        <p className="text-neutral-500 dark:text-neutral-400 text-sm font-medium">
          La meilleure façon de choisir.
        </p>
      </motion.div>

      <div className="space-y-10 pb-40">
        {/* Type Selection */}
        <section>
          <div className="grid grid-cols-2 gap-4">
            {['movie', 'tv'].map((t) => {
              const isSelected = type === t;
              return (
                <button
                  key={t}
                  onClick={() => setType(t as 'movie' | 'tv')}
                  className={cn(
                    "relative flex flex-col items-center justify-center p-6 rounded-[24px] transition-all duration-300 overflow-hidden",
                    isSelected 
                      ? "bg-white dark:bg-neutral-800 shadow-xl shadow-pink-500/10 ring-2 ring-pink-500/50 scale-[1.02]" 
                      : "bg-white/50 dark:bg-neutral-900/50 hover:bg-white dark:hover:bg-neutral-800 active:scale-95 border border-transparent"
                  )}
                >
                  {isSelected && (
                     <div className="absolute inset-0 bg-gradient-to-br from-pink-500/5 to-purple-600/5 pointer-events-none" />
                  )}
                  <div className={cn(
                    "p-3 rounded-2xl mb-3 transition-colors",
                    isSelected 
                      ? "bg-gradient-to-br from-pink-500 to-purple-600 text-white shadow-lg shadow-pink-500/30" 
                      : "bg-neutral-100 dark:bg-neutral-800 text-neutral-400"
                  )}>
                    {t === 'movie' ? <Film className="w-6 h-6" /> : <Tv className="w-6 h-6" />}
                  </div>
                  <span className={cn(
                    "font-bold text-sm",
                    isSelected ? "text-neutral-900 dark:text-white" : "text-neutral-400"
                  )}>
                    {t === 'movie' ? 'Film' : 'Série'}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        {/* Providers */}
        <section className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <h3 className="font-bold text-sm text-neutral-900 dark:text-white uppercase tracking-wider opacity-70">Plateformes</h3>
            <span className="text-xs font-medium text-neutral-400">{selectedProviders.length} sélectionnée(s)</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {PROVIDERS.map(p => {
               const isSelected = selectedProviders.includes(p.id);
               const gradient = PROVIDER_STYLES[p.id] || 'from-neutral-500 to-neutral-700';
               
               return (
                <button
                  key={p.id}
                  onClick={() => toggleProvider(p.id)}
                  className={cn(
                     "relative h-14 rounded-2xl overflow-hidden transition-all duration-200 active:scale-95 group",
                     isSelected ? "shadow-lg shadow-black/10 ring-2 ring-white/10" : "opacity-100 hover:opacity-80"
                  )}
                >
                   {/* Background */}
                   <div className={cn(
                     "absolute inset-0 bg-gradient-to-br transition-opacity duration-300",
                     isSelected ? gradient : "bg-neutral-100 dark:bg-neutral-800"
                   )} />
                   
                   <div className="relative h-full flex items-center justify-between px-4">
                      <span className={cn(
                        "font-semibold text-sm transition-colors",
                        isSelected ? "text-white" : "text-neutral-500 dark:text-neutral-400"
                      )}>
                        {p.name}
                      </span>
                      {isSelected ? (
                        <div className="bg-white/20 p-1 rounded-full backdrop-blur-sm">
                          <Check className="w-3 h-3 text-white" />
                        </div>
                      ) : (
                        <div className="w-5 h-5 rounded-full border-2 border-neutral-300 dark:border-neutral-700" />
                      )}
                   </div>
                </button>
               );
            })}
          </div>
        </section>

        {/* Genres */}
        <section className="space-y-4">
          <h3 className="font-bold text-sm text-neutral-900 dark:text-white uppercase tracking-wider opacity-70 px-1">Genres</h3>
          <div className="flex flex-wrap gap-2">
            {genres.map(g => {
              const isSelected = selectedGenres.includes(g.id);
              return (
                <button
                  key={g.id}
                  onClick={() => toggleGenre(g.id)}
                  className={cn(
                    "px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 active:scale-95",
                    isSelected
                      ? "bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-md shadow-pink-500/20"
                      : "bg-white dark:bg-neutral-900 text-neutral-500 dark:text-neutral-400 border border-neutral-100 dark:border-neutral-800"
                  )}
                >
                  {g.name}
                </button>
              );
            })}
          </div>
        </section>
      </div>

      {/* Floating Start Button - Raised above Navbar */}
      <div className="fixed bottom-20 left-0 right-0 p-6 bg-gradient-to-t from-neutral-50/90 via-neutral-50/50 to-transparent dark:from-black/90 dark:via-black/50 pointer-events-none pt-16 z-10">
        <div className="max-w-md mx-auto pointer-events-auto">
          <button
            onClick={handleStart}
            disabled={loading}
            className="group w-full h-14 bg-neutral-900 dark:bg-white text-white dark:text-black rounded-[22px] font-bold text-lg shadow-2xl shadow-neutral-900/20 dark:shadow-white/10 flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed hover:bg-neutral-800 dark:hover:bg-neutral-200"
          >
            {loading ? (
              <span className="animate-spin text-xl">⏳</span>
            ) : (
              <>
                Lancer la recherche <ArrowRight className="w-5 h-5 ml-1 transition-transform group-hover:translate-x-1" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
