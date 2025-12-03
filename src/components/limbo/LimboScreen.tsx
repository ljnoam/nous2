'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import ExportDataButton from '@/components/profile/ExportDataButton'
import { HeartCrack, RefreshCw } from 'lucide-react'

type LimboScreenProps = {
  coupleId: string
  deletionScheduledAt: string
  deletionInitiatedBy: string
  currentUserId: string
}

export default function LimboScreen({ coupleId, deletionScheduledAt, deletionInitiatedBy, currentUserId }: LimboScreenProps) {
  const [loading, setLoading] = useState(false)
  const isInitiator = currentUserId === deletionInitiatedBy

  const scheduledDate = new Date(deletionScheduledAt)
  const deadline = new Date(scheduledDate)
  deadline.setDate(deadline.getDate() + 5)
  
  const daysLeft = Math.max(0, Math.ceil((deadline.getTime() - Date.now()) / (1000 * 60 * 60 * 24)))

  async function cancelDeletion() {
    setLoading(true)
    try {
      const { error } = await supabase
        .from('couples')
        .update({
          deletion_scheduled_at: null,
          deletion_initiated_by: null
        })
        .eq('id', coupleId)

      if (error) throw error
      window.location.reload()
    } catch (e: any) {
      alert('Erreur : ' + e.message)
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-white dark:bg-neutral-950 flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-500">
      <div className="max-w-md w-full space-y-8">
        <div className="flex justify-center">
          <div className="h-24 w-24 rounded-full bg-red-50 dark:bg-red-900/20 flex items-center justify-center">
            <HeartCrack className="h-12 w-12 text-red-500" />
          </div>
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight">
            {isInitiator ? 'Compte en sursis' : 'Rupture initiée'}
          </h1>
          <p className="text-neutral-500 dark:text-neutral-400">
            {isInitiator 
              ? `Tu as demandé la suppression de ton compte. Il te reste ${daysLeft} jours pour changer d'avis.`
              : `Ton partenaire a décidé de rompre. Vous avez ${daysLeft} jours pour vous réconcilier ou sauvegarder vos souvenirs.`
            }
          </p>
        </div>

        <div className="space-y-4 pt-4">
          <ExportDataButton className="w-full justify-center py-3 text-base" />
          
          {isInitiator && (
            <button
              onClick={cancelDeletion}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-pink-600 px-4 py-3 text-white font-medium hover:bg-pink-700 transition disabled:opacity-50"
            >
              <RefreshCw className="h-5 w-5" />
              {loading ? 'Annulation...' : 'Annuler la rupture & Rejoindre le couple'}
            </button>
          )}
        </div>
        
        <p className="text-xs text-neutral-400 dark:text-neutral-600">
          Si aucune action n'est prise, toutes les données seront définitivement effacées le {deadline.toLocaleDateString()}.
        </p>
      </div>
    </div>
  )
}
