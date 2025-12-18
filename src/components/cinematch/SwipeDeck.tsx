"use client";

import { useEffect, useState } from "react";
import { useMotionValue, useTransform, motion, AnimatePresence } from "framer-motion";
import { TMDBMedia } from "@/lib/tmdb";
import { getDiscovery, submitSwipe } from "@/lib/actions";
import { X, Heart, Star } from "lucide-react";
import Image from "next/image";

import { supabase } from "@/lib/supabase/client";

interface SwipeDeckProps {
  session: any;
  onMatch: (media: any) => void;
}

export default function SwipeDeck({ session, onMatch }: SwipeDeckProps) {
  const [cards, setCards] = useState<TMDBMedia[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    // Get current user ID
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setCurrentUserId(data.user.id);
      }
    });
  }, []);

  useEffect(() => {
    if (!currentUserId || !session?.id) return;

    const channel = supabase
      .channel(`session-${session.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'match_swipes',
          filter: `session_id=eq.${session.id}`
        },
        async (payload) => {
          const newSwipe = payload.new;
          
          // Ignore my own swipes
          if (newSwipe.user_id === currentUserId) return;

          // If partner swiped RIGHT, check if I also swiped RIGHT
          if (newSwipe.direction === 'right') {
            const { data: mySwipe } = await supabase
              .from('match_swipes')
              .select('*')
              .eq('session_id', session.id)
              .eq('media_id', newSwipe.media_id)
              .eq('user_id', currentUserId)
              .eq('direction', 'right')
              .maybeSingle();

            if (mySwipe) {
              // Exact same match logic as server side, but client triggered
              console.log('Match detected via Realtime!');
              onMatch(newSwipe.media_data);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserId, session?.id, onMatch]);

  useEffect(() => {
    loadCards();
  }, [page]);

  const loadCards = async () => {
    try {
      const filters = session.filters || {};
      const newCards = await getDiscovery(
        filters.type || 'movie',
        page,
        filters.providers,
        filters.genres
      );
      setCards(prev => [...prev, ...newCards]);
      setLoading(false);
    } catch (e) {
      console.error(e);
      setLoading(false);
    }
  };

  const removeCard = (id: number) => {
    setCards(prev => prev.filter(c => c.id !== id));
    if (cards.length < 5) {
      setPage(p => p + 1);
    }
  };

  const handleSwipe = async (direction: 'left' | 'right', card: TMDBMedia) => {
    removeCard(card.id);
    try {
      const result = await submitSwipe(session.id, card.id, direction, {
        title: card.title || card.name,
        poster_path: card.poster_path,
        overview: card.overview
      });

      if (result.status === 'MATCH') {
        onMatch(result.media);
      }
    } catch (e) {
      console.error('Swipe error:', e);
    }
  };

  if (loading && cards.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin text-4xl">🍿</div>
      </div>
    );
  }

  if (cards.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-6">
        <h2 className="text-xl font-bold mb-2">Plus de films...</h2>
        <p className="text-muted-foreground">On dirait que vous avez tout vu !</p>
      </div>
    );
  }

  // Reverse cards to show first one on top
  const activeCards = cards.slice(0, 3).reverse();

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center overflow-hidden">
        {activeCards.map((card, index) => {
           const isFront = index === activeCards.length - 1;
           return (
             <Card 
               key={card.id} 
               data={card} 
               isFront={isFront}
               onSwipe={(dir) => handleSwipe(dir, card)}
             />
           );
        })}
    </div>
  );
}

function Card({ data, isFront, onSwipe }: { data: TMDBMedia, isFront: boolean, onSwipe: (dir: 'left' | 'right') => void }) {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-25, 25]);
  const opacity = useTransform(x, [-200, -150, 0, 150, 200], [0.5, 1, 1, 1, 0.5]);
  
  // Color indicators
  const likeOpacity = useTransform(x, [50, 150], [0, 1]);
  const nopeOpacity = useTransform(x, [-50, -150], [0, 1]);

  const handleDragEnd = (event: any, info: any) => {
    if (info.offset.x > 100) {
      onSwipe('right');
    } else if (info.offset.x < -100) {
      onSwipe('left');
    }
  };

  return (
     <motion.div
       style={{ 
         x: isFront ? x : 0, 
         rotate: isFront ? rotate : 0, 
         opacity: isFront ? 1 : 0.95,
         scale: isFront ? 1 : 0.95,
         zIndex: isFront ? 50 : 10
       }}
       drag={isFront ? "x" : false}
       dragConstraints={{ left: 0, right: 0 }}
       onDragEnd={handleDragEnd}
       className="absolute w-[90%] max-w-sm aspect-[2/3] bg-black rounded-3xl overflow-hidden shadow-2xl border border-neutral-800"
       whileTap={{ cursor: "grabbing" }}
     >
       {/* Poster */}
       <div className="absolute inset-0">
          {data.poster_path ? (
             <Image 
               src={`https://image.tmdb.org/t/p/w500${data.poster_path}`} 
               alt={data.title || data.name || ''} 
               fill 
               className="object-cover pointer-events-none"
             />
          ) : (
            <div className="w-full h-full bg-neutral-800 flex items-center justify-center">No Image</div>
          )}
          
          {/* Gradients */}
          <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black via-black/50 to-transparent" />
       </div>

       {/* Like/Nope Overlays */}
       {isFront && (
         <>
           <motion.div style={{ opacity: likeOpacity }} className="absolute top-8 left-8 border-4 border-green-500 text-green-500 rounded-lg px-4 py-2 transform -rotate-12 font-bold text-4xl bg-black/20 backdrop-blur-sm">
             OUI
           </motion.div>
           <motion.div style={{ opacity: nopeOpacity }} className="absolute top-8 right-8 border-4 border-red-500 text-red-500 rounded-lg px-4 py-2 transform rotate-12 font-bold text-4xl bg-black/20 backdrop-blur-sm">
             NON
           </motion.div>
         </>
       )}

       {/* Info */}
       <div className="absolute bottom-0 inset-x-0 p-6 space-y-2 select-none">
          <h2 className="text-2xl font-bold text-white shadow-black drop-shadow-md">
            {data.title || data.name}
          </h2>
          <div className="flex items-center gap-2">
             <Star className="w-4 h-4 text-yellow-500 fill-current" />
             <span className="text-white font-medium">{data.vote_average.toFixed(1)}</span>
             <span className="text-neutral-400 text-sm">• {new Date(data.release_date || data.first_air_date || '').getFullYear()}</span>
          </div>
          <p className="text-sm text-neutral-300 line-clamp-2">
            {data.overview}
          </p>
       </div>
     </motion.div>
  );
}
