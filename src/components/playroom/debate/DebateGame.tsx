'use client';

import { useEffect, useState } from 'react';
import { DebateCategory, DebateRepository, DebateTopic } from '@/lib/data/debateDetails';
import DebateCard from './DebateCard';
import { ChevronLeft, RefreshCw, XCircle, X } from 'lucide-react'; // Added X for close button
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { useAppStore } from '@/lib/store/useAppStore';
import { useShallow } from 'zustand/react/shallow';

export default function DebateGame() {
  const [category, setCategory] = useState<DebateCategory | null>(null);
  const [currentTopic, setCurrentTopic] = useState<DebateTopic | null>(null);

  // STORE
  const { 
    viewedDebateIds, 
    markDebateViewed,
    currentDebateTopicId, 
    currentDebateCategory,
    setCurrentDebateState,
    resetDebateHistory
  } = useAppStore(useShallow(state => ({
    viewedDebateIds: state.viewedDebateIds,
    markDebateViewed: state.markDebateViewed,
    currentDebateTopicId: state.currentDebateTopicId,
    currentDebateCategory: state.currentDebateCategory,
    setCurrentDebateState: state.setCurrentDebateState,
    resetDebateHistory: state.resetDebateHistory
  })));

  // 1. RESTORE STATE ON MOUNT
  useEffect(() => {
    // If we have a saved state and local state is empty, restore it
    if (currentDebateCategory && currentDebateTopicId && !category) {
        // Restore category
        const cat = currentDebateCategory as DebateCategory;
        setCategory(cat);
        
        // Restore topic object from ID
        const allTopics = DebateRepository.getAll();
        const topic = allTopics.find(t => t.id === currentDebateTopicId);
        if (topic) {
            setCurrentTopic(topic);
        }
    }
  }, [currentDebateCategory, currentDebateTopicId, category]);

  const startCategory = (cat: DebateCategory) => {
    setCategory(cat);
    nextTopic(cat);
  };

  const nextTopic = (cat: DebateCategory) => {
    // Try to find a NEW topic not in history
    let topic: DebateTopic = DebateRepository.getRandom(cat);
    let attempts = 0;
    
    // Attempt 20 times to find a non-viewed question
    while (viewedDebateIds.includes(topic.id) && attempts < 20) {
        topic = DebateRepository.getRandom(cat);
        attempts++;
    }
    
    // If we failed (all viewed?), we just show a random one (looping)
    // Or we could show a "Category Completed" screen, but random is safer for now.

    setCurrentTopic(topic);
    
    // PERSIST
    setCurrentDebateState(topic.id, cat);
    markDebateViewed(topic.id);
  };

  const quitGame = () => {
      setCategory(null);
      setCurrentTopic(null);
      setCurrentDebateState(null, null); // Clear persistence so we don't auto-restore next time
  };

  // CATEGORY SELECTION VIEW
  if (!category) {
    return (
      <div className="min-h-screen h-screen bg-white dark:bg-neutral-950 flex flex-col gap-6 p-4 pt-[calc(env(safe-area-inset-top)+20px)] animate-in fade-in slide-in-from-bottom-4 duration-500 relative">
        {/* Close button - top right */}
        <Link 
          href="/playroom"
          className="absolute top-[calc(env(safe-area-inset-top)+16px)] right-4 z-50 p-3 rounded-full bg-white/10 hover:bg-white/20 dark:bg-black/10 dark:hover:bg-black/20 backdrop-blur-md shadow-lg transition-all active:scale-95 border border-neutral-200 dark:border-white/10"
        >
          <X className="w-5 h-5 text-neutral-900 dark:text-white" />
        </Link>
        <div className="text-center space-y-2 mb-4">
          <h1 className="text-3xl font-bold font-display">Debate Arena 🎙️</h1>
          <p className="text-neutral-500 dark:text-neutral-400">Choisis un thème et lance le débat !</p>
          <div className="text-xs text-neutral-400 mt-2">
             Déjà {viewedDebateIds.length} questions jouées
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {Object.values(DebateCategory).map((cat) => {
             const colors = DebateRepository.getColors(cat);
             return (
              <button
                key={cat}
                onClick={() => startCategory(cat)}
                className={`
                  relative p-6 rounded-3xl border-2 text-left transition-all active:scale-95
                  ${colors.bg} ${colors.accent}
                `}
              >
                <h3 className={`text-xl font-bold ${colors.text}`}>{cat}</h3>
              </button>
             );
          })}
        </div>

        {viewedDebateIds.length > 0 && (
          <div className="mt-8 flex flex-col items-center gap-4">
            <button 
              onClick={() => {
                if(confirm("Effacer tout l'historique des questions déjà vues ?")) {
                  resetDebateHistory();
                }
              }}
              className="text-xs text-neutral-300 dark:text-neutral-600 hover:text-red-500 transition"
            >
              (Réinitialiser l'historique)
            </button>
          </div>
        )}
      </div>
    );
  }

  // GAME VIEW
  return (
    <div className="min-h-screen h-screen bg-white dark:bg-neutral-950 flex flex-col px-4 pt-[calc(env(safe-area-inset-top)+20px)] pb-20 relative">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <button 
          onClick={quitGame}
          className="p-3 rounded-full bg-white/10 hover:bg-white/20 dark:bg-black/10 dark:hover:bg-black/20 backdrop-blur-md shadow-lg transition-all active:scale-95 border border-neutral-200 dark:border-white/10"
        >
          <X className="w-5 h-5 text-neutral-900 dark:text-white" />
        </button>
        <div className="px-4 py-1.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-sm font-semibold">
          {category}
        </div>
        <div className="w-10" /> {/* Spacer */}
      </div>

      {/* Card Area */}
      <div className="flex-1 flex items-center justify-center relative">
        <AnimatePresence mode="wait">
          {currentTopic && (
             <DebateCard topic={currentTopic} />
          )}
        </AnimatePresence>
      </div>

      {/* Actions */}
      <div className="mt-8 flex justify-center">
        <button
          onClick={() => category && nextTopic(category)}
          className="
            flex items-center gap-3 px-8 py-4 
            rounded-full bg-black dark:bg-white text-white dark:text-black 
            font-bold text-lg shadow-lg active:scale-95 transition-all
          "
        >
          <RefreshCw className="w-5 h-5" />
          Suivant
        </button>
      </div>
    </div>
  );
}
