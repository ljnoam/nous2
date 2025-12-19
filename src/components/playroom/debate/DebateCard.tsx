'use client';

import { DebateTopic, DebateRepository } from '@/lib/data/debateDetails';
import { motion } from 'framer-motion';

interface DebateCardProps {
  topic: DebateTopic;
}

export default function DebateCard({ topic }: DebateCardProps) {
  const colors = DebateRepository.getColors(topic.category);

  return (
    <motion.div
      key={topic.id}
      initial={{ scale: 0.9, opacity: 0, y: 20 }}
      animate={{ scale: 1, opacity: 1, y: 0 }}
      exit={{ scale: 0.9, opacity: 0, y: -20 }}
      transition={{ type: 'spring', duration: 0.5 }}
      className={`
        relative w-full aspect-[4/5] max-h-[500px]
        flex flex-col items-center justify-center p-8
        rounded-3xl border-4 ${colors.accent}
        ${colors.bg}
        shadow-xl
        text-center
      `}
    >
      <div className={`
        absolute top-6 px-4 py-1.5 rounded-full 
        bg-white/50 dark:bg-black/20 
        text-xs font-bold uppercase tracking-widest
        ${colors.text}
      `}>
        {topic.target}
      </div>

      <h3 className={`text-2xl sm:text-3xl font-bold leading-tight ${colors.text} font-display`}>
        {topic.text}
      </h3>
      
      <div className="absolute bottom-6 opacity-30">
          <span className="text-xl">🤔</span>
      </div>
    </motion.div>
  );
}
