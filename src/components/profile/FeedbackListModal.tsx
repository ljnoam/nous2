'use client'

import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer'
import { supabase } from '@/lib/supabase/client'
import { Heart } from 'lucide-react'
import { useEffect, useState } from 'react'

type Feedback = {
  id: string
  content: string
  created_at: string
  user_id: string
  profiles: {
    first_name: string | null
    avatar_url: string | null
  } | null
  likes: { user_id: string }[]
}

export default function FeedbackListModal({
  isOpen,
  onClose,
  userId,
}: {
  isOpen: boolean
  onClose: () => void
  userId: string
}) {
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([])
  const [loading, setLoading] = useState(false)

  // Fetch only when opened
  useEffect(() => {
    if (isOpen) {
      fetchFeedbacks()
    }
  }, [isOpen])

  const fetchFeedbacks = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('feedbacks')
      .select(`
        id,
        content,
        created_at,
        user_id,
        profiles (first_name, avatar_url),
        likes:feedback_likes (user_id)
      `)
      .order('created_at', { ascending: false })

    if (!error && data) {
      // Sort: most likes first, then newest
      const sorted = (data as any[]).sort((a, b) => {
        const aLikes = a.likes?.length || 0
        const bLikes = b.likes?.length || 0
        if (aLikes !== bLikes) return bLikes - aLikes
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      })
      setFeedbacks(sorted)
    }
    setLoading(false)
  }

  const toggleLike = async (feedbackId: string, hasLiked: boolean) => {
    // Optimistic Update
    setFeedbacks((prev) =>
      prev.map((f) => {
        if (f.id === feedbackId) {
          const newLikes = hasLiked
            ? f.likes.filter((l) => l.user_id !== userId)
            : [...(f.likes || []), { user_id: userId }]
          return { ...f, likes: newLikes }
        }
        return f
      })
      // Note: We don't re-sort immediately to avoid jumps during interaction
    )

    if (hasLiked) {
      await supabase
        .from('feedback_likes')
        .delete()
        .eq('feedback_id', feedbackId)
        .eq('user_id', userId)
    } else {
      await supabase
        .from('feedback_likes')
        .insert({ feedback_id: feedbackId, user_id: userId })
    }
  }

  return (
    <Drawer open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DrawerContent className="max-h-[85vh] h-[85vh] rounded-t-[32px] bg-neutral-50 dark:bg-neutral-900 border-none px-0">
        <DrawerHeader className="px-6 py-4 bg-transparent border-b border-black/5 dark:border-white/5 pb-4">
          <DrawerTitle className="text-center text-xl font-bold tracking-tight">💡 Idées de la communauté</DrawerTitle>
        </DrawerHeader>
        
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          {loading && feedbacks.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 space-y-3 opacity-50">
               <div className="w-8 h-8 border-4 border-pink-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : feedbacks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-neutral-100 dark:bg-white/5 flex items-center justify-center text-3xl">📭</div>
                <p className="text-neutral-500 max-w-[200px]">C'est calme par ici... Soyez le premier à proposer une idée !</p>
            </div>
          ) : (
            feedbacks.map((f) => {
              const hasLiked = f.likes.some((l) => l.user_id === userId)
              const likesCount = f.likes?.length || 0
              
              return (
                <div key={f.id} className="group relative bg-white dark:bg-neutral-800/60 rounded-3xl p-5 border border-black/5 dark:border-white/5 shadow-[0_4px_20px_-8px_rgba(0,0,0,0.05)] transition-all active:scale-[0.99] touch-manipulation">
                  <div className="flex gap-4">
                    {/* Avatar */}
                    <div className="w-11 h-11 rounded-full bg-gradient-to-br from-pink-100 to-rose-100 dark:from-pink-900/30 dark:to-rose-900/30 border border-white/20 flex items-center justify-center overflow-hidden shrink-0 shadow-sm">
                         {f.profiles?.avatar_url ? (
                            <img src={f.profiles.avatar_url} alt="" className="w-full h-full object-cover" />
                         ) : (
                             <span className="text-sm font-bold text-pink-500">{f.profiles?.first_name?.[0] || '?'}</span>
                         )}
                    </div>
                    
                    <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-base justify-between">
                            <h4 className="text-base font-bold text-neutral-900 dark:text-gray-100 truncate pr-2">
                                {f.profiles?.first_name || 'Anonyme'}
                            </h4>
                            <span className="text-[10px] uppercase font-medium tracking-wider text-neutral-400 mt-1">
                                {new Date(f.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                            </span>
                        </div>
                        
                        <p className="text-[15px] leading-relaxed text-neutral-600 dark:text-neutral-300 break-words whitespace-pre-wrap">
                            {f.content}
                        </p>
                    </div>
                  </div>
                  
                  {/* Like Button - Integrated into card but bottom right */}
                  <div className="flex justify-end mt-3 -mb-1">
                     <button
                        onClick={(e) => { e.stopPropagation(); toggleLike(f.id, hasLiked); }}
                        className={`group/btn flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                            hasLiked 
                            ? 'bg-pink-500 text-white shadow-lg shadow-pink-500/30' 
                            : 'bg-neutral-50 dark:bg-white/5 text-neutral-400 hover:bg-neutral-100 dark:hover:bg-white/10'
                        }`}
                        >
                        <Heart className={`w-3.5 h-3.5 transition-transform group-active/btn:scale-125 ${hasLiked ? 'fill-current' : ''}`} />
                        <span>{likesCount > 0 ? likesCount : 'J\'aime'}</span>
                    </button>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </DrawerContent>
    </Drawer>
  )
}
