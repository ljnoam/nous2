'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Send, MessageSquare } from 'lucide-react'
import FeedbackListModal from './FeedbackListModal'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'

export default function FeedbackBox({ userId }: { userId: string }) {
  const [content, setContent] = useState('')
  const [sending, setSending] = useState(false)
  const [showModal, setShowModal] = useState(false)

  const handleSubmit = async () => {
    if (!content.trim()) return
    setSending(true)
    const { error } = await supabase.from('feedbacks').insert({
      content: content.trim(),
      user_id: userId,
    })
    setSending(false)
    if (error) {
      alert('Erreur lors de l\'envoi du feedback')
    } else {
      setContent('')
      setShowModal(true) // Open modal to show it's there
    }
  }

  return (
    <>
      <div className="rounded-2xl border border-black/10 dark:border-white/10 bg-white/70 dark:bg-neutral-900/60 backdrop-blur-md p-4 space-y-3">
        <div className="flex items-center justify-between px-1">
          <h3 className="font-semibold text-neutral-900 dark:text-white flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-pink-500" />
            Boîte à idées
          </h3>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setShowModal(true)}
            className="text-neutral-500 font-normal hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white"
          >
            Voir tout
          </Button>
        </div>
        
        <div className="relative group">
          <Textarea 
            placeholder="Une suggestion, un bug, ou juste un petit mot..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="bg-white/50 dark:bg-black/20 border-black/5 dark:border-white/10 focus-visible:ring-pink-500/20 text-base rounded-xl resize-none min-h-[80px] pb-10 transition-all hover:bg-white/70 dark:hover:bg-black/30"
          />
          <div className="absolute bottom-2 right-2 flex items-center gap-2">
            <Button 
              size="sm" 
              onClick={handleSubmit} 
              disabled={!content.trim() || sending}
              className={`h-8 px-4 rounded-full text-xs font-semibold transition-all ${
                content.trim() 
                  ? 'bg-pink-500 hover:bg-pink-600 text-white shadow-lg shadow-pink-500/20' 
                  : 'bg-neutral-200 text-neutral-400 dark:bg-white/10 dark:text-neutral-500'
              }`}
            >
              {sending ? '...' : <Send className="w-3 h-3" />}
            </Button>
          </div>
        </div>
        
        <p className="text-[10px] text-neutral-400 dark:text-neutral-500 text-center uppercase tracking-widest font-medium">
          Aide-nous à améliorer l'app
        </p>
      </div>

      <FeedbackListModal 
        isOpen={showModal} 
        onClose={() => setShowModal(false)}
        userId={userId}
      />
    </>
  )
}
