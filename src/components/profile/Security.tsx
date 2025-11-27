'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { getSiteUrl } from '@/lib/utils'

export default function Security() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loadingEmail, setLoadingEmail] = useState(false)
  const [loadingPwd, setLoadingPwd] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

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
      const resp = await fetch('/api/profile/delete', { method: 'POST' })
      if (!resp.ok) {
        const t = await resp.text()
        throw new Error(t || 'Suppression impossible')
      }
      alert('Compte supprimé. Au revoir ❤️')
      // Let SSR cookie/session cleanup redirect on next navigation
      window.location.href = '/register'
    } catch (e: any) {
      alert(e.message || 'Erreur lors de la suppression')
    }
  }

  return (
    <div className="rounded-2xl border border-black/10 dark:border-white/10 bg-white/70 dark:bg-neutral-900/60 backdrop-blur-md p-4 space-y-4">
      <h2 className="text-lg font-semibold">Sécurité</h2>

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

      <div className="pt-2">
        <button
          onClick={() => setConfirmDelete(true)}
          className="w-full sm:w-auto rounded-xl px-4 py-2 border border-red-500/40 text-red-600 dark:text-red-400 hover:bg-red-500/10"
        >
          Supprimer mon compte
        </button>
        {confirmDelete && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-white dark:bg-neutral-900 rounded-2xl p-5 border border-black/10 dark:border-white/10 max-w-sm w-[92vw]">
              <h3 className="text-lg font-semibold mb-2">Confirmer la suppression</h3>
              <p className="text-sm opacity-70 mb-4">Cette action est définitive et effacera tes données personnelles.</p>
              <div className="flex justify-end gap-2">
                <button onClick={() => setConfirmDelete(false)} className="rounded-xl px-3 py-2 border border-black/10 dark:border-white/10">Annuler</button>
                <button onClick={deleteAccount} className="rounded-xl px-3 py-2 bg-red-600 text-white hover:opacity-90">Supprimer</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

