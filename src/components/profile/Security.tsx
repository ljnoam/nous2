'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { getSiteUrl } from '@/lib/utils'

import LegalModal from '@/components/legal/LegalModal'
import ExportDataButton from './ExportDataButton'

export default function Security() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loadingEmail, setLoadingEmail] = useState(false)
  const [loadingPwd, setLoadingPwd] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [legalModal, setLegalModal] = useState<'privacy' | 'terms' | null>(null)

  async function updateEmail() {
    if (!email.trim()) { alert('Email requis'); return }
    setLoadingEmail(true)
    try {
      const { error } = await supabase.auth.updateUser({ email: email.trim() }, { emailRedirectTo: `${getSiteUrl()}login?email_updated=true` })
      if (error) throw error
      alert('Email mis à jour. Vérifie ta boîte si confirmation requise.')
      setEmail('')
    } catch (e: any) {
      alert(e.message || 'Mise à jour impossible')
    } finally { setLoadingEmail(false) }
  }

  async function updatePassword() {
    setLoadingPwd(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user?.email) throw new Error("Impossible de récupérer ton email")
      
      const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
        redirectTo: `${getSiteUrl()}update-password`,
      })
      if (error) throw error
      alert('Email de réinitialisation envoyé !')
    } catch (e: any) {
      alert(e.message || 'Mise à jour impossible')
    } finally { setLoadingPwd(false) }
  }

  async function deleteAccount() {
    setConfirmDelete(false)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("Utilisateur non trouvé")

      // Get couple ID
      const { data: cm } = await supabase.from('couple_members').select('couple_id').eq('user_id', user.id).single()
      if (!cm) throw new Error("Couple non trouvé")

      // Schedule deletion
      const { error } = await supabase
        .from('couples')
        .update({
          deletion_scheduled_at: new Date().toISOString(),
          deletion_initiated_by: user.id
        })
        .eq('id', cm.couple_id)

      if (error) throw error

      alert('Compte en sursis pour 5 jours. Tu peux annuler la suppression en te reconnectant.')
      window.location.reload() // Reload to trigger Limbo state
    } catch (e: any) {
      alert(e.message || 'Erreur lors de la suppression')
    }
  }

  return (
    <>
      <LegalModal 
        isOpen={!!legalModal} 
        onClose={() => setLegalModal(null)} 
        type={legalModal} 
      />
      
      <div className="rounded-2xl border border-black/10 dark:border-white/10 bg-white/70 dark:bg-neutral-900/60 backdrop-blur-md p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Sécurité & Légal</h2>
          <div className="flex gap-3 text-xs opacity-60">
            <button onClick={() => setLegalModal('terms')} className="hover:underline">CGU</button>
            <button onClick={() => setLegalModal('privacy')} className="hover:underline">Confidentialité</button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="flex items-center gap-2">
            <input
              type="email"
              placeholder="Nouvel email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="flex-1 rounded-xl border border-black/10 dark:border-white/10 bg-transparent px-3 py-2 text-sm"
            />
            <button onClick={updateEmail} disabled={loadingEmail}
              className="rounded-xl px-3 py-2 border border-black/10 dark:border-white/10 text-sm hover:bg-black/5 dark:hover:bg-white/10">
              {loadingEmail ? '...' : 'Changer'}
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={updatePassword} disabled={loadingPwd}
              className="w-full rounded-xl px-3 py-2 border border-black/10 dark:border-white/10 text-sm hover:bg-black/5 dark:hover:bg-white/10">
              {loadingPwd ? '...' : 'Réinitialiser le mot de passe'}
            </button>
          </div>
        </div>

        <div className="pt-2 flex flex-col sm:flex-row gap-3">
           <ExportDataButton className="flex-1 justify-center" />
          <button
            onClick={() => setConfirmDelete(true)}
            className="flex-1 rounded-xl px-4 py-2 border border-red-500/40 text-red-600 dark:text-red-400 hover:bg-red-500/10"
          >
            Supprimer mon compte
          </button>
          {confirmDelete && (
            <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
              <div className="bg-white dark:bg-neutral-900 rounded-2xl p-5 border border-black/10 dark:border-white/10 max-w-sm w-[92vw]">
                <h3 className="text-lg font-semibold mb-2">Confirmer la suppression</h3>
                <p className="text-sm opacity-70 mb-4">Ton compte sera mis en sursis pendant 5 jours avant suppression définitive.</p>
                <div className="flex justify-end gap-2">
                  <button onClick={() => setConfirmDelete(false)} className="rounded-xl px-3 py-2 border border-black/10 dark:border-white/10">Annuler</button>
                  <button onClick={deleteAccount} className="rounded-xl px-3 py-2 bg-red-600 text-white hover:opacity-90">Supprimer</button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

