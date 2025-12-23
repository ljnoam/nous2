'use client'

import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer'
import { supabase } from '@/lib/supabase/client'
import { Heart, ThumbsDown } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"

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
  dislikes: { user_id: string }[]
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
  const [sortBy, setSortBy] = useState<'popular' | 'recent'>('popular')

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
        likes:feedback_likes (user_id),
        dislikes:feedback_dislikes (user_id)
      `)
      .order('created_at', { ascending: false })

    if (!error && data) {
      setFeedbacks(data as any[])
    }
    setLoading(false)
  }

  // Sorting logic
  const sortedFeedbacks = [...feedbacks].sort((a, b) => {
    if (sortBy === 'recent') {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    }
    // Popular: (Likers - Dislikers)
    const scoreA = (a.likes?.length || 0) - (a.dislikes?.length || 0)
    const scoreB = (b.likes?.length || 0) - (b.dislikes?.length || 0)
    if (scoreA !== scoreB) return scoreB - scoreA
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  })

  const handleVote = async (feedbackId: string, type: 'like' | 'dislike') => {
    const feedback = feedbacks.find(f => f.id === feedbackId)
    if (!feedback) return

    const hasLiked = feedback.likes.some(l => l.user_id === userId)
    const hasDisliked = feedback.dislikes.some(l => l.user_id === userId)

    // Optimistic Update
    setFeedbacks(prev => prev.map(f => {
        if (f.id !== feedbackId) return f
        
        let newLikes = [...(f.likes || [])]
        let newDislikes = [...(f.dislikes || [])]

        if (type === 'like') {
            if (hasLiked) {
                // Remove like
                newLikes = newLikes.filter(l => l.user_id !== userId)
            } else {
                // Add like, remove dislike if present
                newLikes.push({ user_id: userId })
                newDislikes = newDislikes.filter(l => l.user_id !== userId)
            }
        } else { // dislike
             if (hasDisliked) {
                // Remove dislike
                newDislikes = newDislikes.filter(l => l.user_id !== userId)
             } else {
                // Add dislike, remove like if present
                newDislikes.push({ user_id: userId })
                newLikes = newLikes.filter(l => l.user_id !== userId)
             }
        }
        return { ...f, likes: newLikes, dislikes: newDislikes }
    }))

    // DB Operations
    if (type === 'like') {
        if (hasLiked) {
             await supabase.from('feedback_likes').delete().eq('feedback_id', feedbackId).eq('user_id', userId)
        } else {
             if (hasDisliked) await supabase.from('feedback_dislikes').delete().eq('feedback_id', feedbackId).eq('user_id', userId)
             await supabase.from('feedback_likes').insert({ feedback_id: feedbackId, user_id: userId })
        }
    } else {
        if (hasDisliked) {
             await supabase.from('feedback_dislikes').delete().eq('feedback_id', feedbackId).eq('user_id', userId)
        } else {
             if (hasLiked) await supabase.from('feedback_likes').delete().eq('feedback_id', feedbackId).eq('user_id', userId)
             await supabase.from('feedback_dislikes').insert({ feedback_id: feedbackId, user_id: userId })
        }
    }
  }

  return (
    <Drawer open={isOpen} onOpenChange={(open) => !open && onClose()}>
      {/* 
        Scroll Fix:
        - Ensure DrawerContent has a fixed max-height or height
        - Use flex-col to organize header and content
        - Content area must have flex-1 and overflow-y-auto
      */}
      <DrawerContent className="h-[85vh] flex flex-col rounded-t-[32px] bg-neutral-50 dark:bg-neutral-900 border-none px-0 outline-none mt-0">
        
        <DrawerHeader className="px-6 py-4 bg-neutral-50 dark:bg-neutral-900 border-b border-black/5 dark:border-white/5 shrink-0 z-10 rounded-t-[32px]">
          <div className="flex flex-col gap-4">
             <DrawerTitle className="text-center text-xl font-bold tracking-tight">💡 Idées de la communauté</DrawerTitle>
             
             <Tabs defaultValue="popular" className="w-full" onValueChange={(v) => setSortBy(v as any)}>
                <TabsList className="grid w-full grid-cols-2 bg-neutral-200/50 dark:bg-white/5 rounded-full p-1 h-10">
                    <TabsTrigger value="popular" className="rounded-full data-[state=active]:bg-white dark:data-[state=active]:bg-neutral-800 data-[state=active]:shadow-sm text-xs font-semibold">Populaires 🔥</TabsTrigger>
                    <TabsTrigger value="recent" className="rounded-full data-[state=active]:bg-white dark:data-[state=active]:bg-neutral-800 data-[state=active]:shadow-sm text-xs font-semibold">Récentes 🕒</TabsTrigger>
                </TabsList>
             </Tabs>
          </div>
        </DrawerHeader>
        
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 relative overscroll-y-contain" data-vaul-no-drag>
          {loading && feedbacks.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 space-y-3 opacity-50">
               <div className="w-8 h-8 border-4 border-pink-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : sortedFeedbacks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-neutral-100 dark:bg-white/5 flex items-center justify-center text-3xl">📭</div>
                <p className="text-neutral-500 max-w-[200px] text-sm">Aucune idée pour le moment.<br/>Lancez-vous !</p>
            </div>
          ) : (
            sortedFeedbacks.map((f) => {
              const hasLiked = f.likes.some((l) => l.user_id === userId)
              const hasDisliked = f.dislikes?.some(l => l.user_id === userId)
              
              const likesCount = f.likes?.length || 0
              const dislikesCount = f.dislikes?.length || 0
              const score = likesCount - dislikesCount
              
              return (
                <div key={f.id} className="group relative bg-white dark:bg-neutral-800/60 rounded-3xl p-5 border border-black/5 dark:border-white/5 shadow-[0_4px_20px_-8px_rgba(0,0,0,0.05)] transition-all touch-manipulation">
                  <div className="flex gap-4">
                    {/* Avatar */}
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-100 to-rose-100 dark:from-pink-900/30 dark:to-rose-900/30 border border-white/20 flex items-center justify-center overflow-hidden shrink-0 shadow-sm">
                         {f.profiles?.avatar_url ? (
                            <img src={f.profiles.avatar_url} alt="" className="w-full h-full object-cover" />
                         ) : (
                             <span className="text-sm font-bold text-pink-500">{f.profiles?.first_name?.[0] || '?'}</span>
                         )}
                    </div>
                    
                    <div className="flex-1 min-w-0 space-y-1.5 pt-0.5">
                        <div className="flex items-baseline justify-between">
                            <h4 className="text-[15px] font-bold text-neutral-900 dark:text-gray-100 truncate pr-2">
                                {f.profiles?.first_name || 'Anonyme'}
                            </h4>
                            <span className="text-[10px] uppercase font-medium tracking-wider text-neutral-400">
                                {new Date(f.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                            </span>
                        </div>
                        
                        <p className="text-[15px] leading-relaxed text-neutral-600 dark:text-neutral-300 break-words whitespace-pre-wrap">
                            {f.content}
                        </p>
                    </div>
                  </div>
                  
                  {/* Action Bar */}
                  <div className="flex items-center justify-end gap-3 mt-4 pt-3 border-t border-black/5 dark:border-white/5">
                     
                     {/* Score Indicator (Optional, maybe just showing counts on buttons is cleaner) */}
                     {/* <span className={`text-xs font-bold ${score > 0 ? 'text-green-500' : score < 0 ? 'text-red-500' : 'text-neutral-400'}`}>
                        {score > 0 ? '+' : ''}{score} points
                     </span> */}

                     {/* Dislike */}
                     <button
                        onClick={(e) => { e.stopPropagation(); handleVote(f.id, 'dislike'); }}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                            hasDisliked 
                            ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' 
                            : 'bg-transparent text-neutral-400 hover:bg-neutral-100 dark:hover:bg-white/5'
                        }`}
                     >
                        <ThumbsDown className={`w-4 h-4 ${hasDisliked ? 'fill-current' : ''}`} />
                        {dislikesCount > 0 && <span>{dislikesCount}</span>}
                     </button>

                     {/* Like */}
                     <button
                        onClick={(e) => { e.stopPropagation(); handleVote(f.id, 'like'); }}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                            hasLiked 
                            ? 'bg-pink-100 text-pink-600 dark:bg-pink-900/30 dark:text-pink-400' 
                            : 'bg-transparent text-neutral-400 hover:bg-neutral-100 dark:hover:bg-white/5'
                        }`}
                     >
                        <Heart className={`w-4 h-4 ${hasLiked ? 'fill-current' : ''}`} />
                        {likesCount > 0 ? <span>{likesCount}</span> : <span>J'aime</span>}
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
