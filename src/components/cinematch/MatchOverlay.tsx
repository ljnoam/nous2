"use client";

import { motion } from "framer-motion";
import confetti from "canvas-confetti";
import { useEffect } from "react";
import Image from "next/image";

interface MatchOverlayProps {
  media: any;
  onClose: () => void;
}

export default function MatchOverlay({ media, onClose }: MatchOverlayProps) {
  useEffect(() => {
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 }
    });
  }, []);

  const posterUrl = media.poster_path 
    ? `https://image.tmdb.org/t/p/w500${media.poster_path}`
    : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-6">
      <motion.div 
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="flex flex-col items-center text-center space-y-6 max-w-sm w-full"
      >
        <motion.div 
          animate={{ scale: [1, 1.2, 1], rotate: [0, 5, -5, 0] }}
          transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 2 }}
          className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-purple-500"
        >
          IT'S A MATCH!
        </motion.div>

        <div className="relative w-64 h-96 rounded-2xl overflow-hidden shadow-2xl border-4 border-pink-500/50">
          {posterUrl && (
            <Image 
              src={posterUrl} 
              alt={media.title || media.name} 
              fill 
              className="object-cover"
            />
          )}
        </div>

        <div>
          <h2 className="text-2xl font-bold text-white">{media.title || media.name}</h2>
          <p className="text-neutral-400 mt-2 line-clamp-3">{media.overview}</p>
        </div>

        <button 
          onClick={onClose}
          className="px-8 py-3 bg-white text-black rounded-full font-bold hover:bg-neutral-200 transition-colors"
        >
          Trop bien !
        </button>
      </motion.div>
    </div>
  );
}
