'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Camera } from 'lucide-react'

export default function AvatarUploader({
  userId,
  avatarUrl,
  onChange,
}: {
  userId: string
  avatarUrl?: string | null
  onChange: (newUrl: string) => void
}) {
  const [loading, setLoading] = useState(false)

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !userId) return
    setLoading(true)
    try {
      const ext = file.name.split('.').pop() || 'png'
      const path = `${userId}/avatar.${ext}`

      const { error: upErr } = await supabase.storage.from('avatars').upload(path, file, { upsert: true })
      if (upErr) throw upErr

      const { data: pub } = supabase.storage.from('avatars').getPublicUrl(path)
      const url = pub?.publicUrl || ''
      const { error: dbErr } = await supabase.from('profiles').update({ avatar_url: url }).eq('id', userId)
      if (dbErr) throw dbErr

      onChange(url)
    } catch (e: any) {
      alert(e.message || 'Upload impossible')
    } finally {
      setLoading(false)
      e.target.value = ''
    }
  }

  return (
    <div className="flex flex-col items-center">
      <div className="relative">
        <img
          src={avatarUrl || '/icons/icon-192.png'}
          alt="Avatar"
          className="h-28 w-28 rounded-full object-cover border-2 border-white dark:border-neutral-800 shadow-lg ring-2 ring-pink-400/40 transition-all duration-200"
        />
        <label className="absolute -bottom-2 -right-2 cursor-pointer rounded-full bg-black text-white dark:bg-white dark:text-black p-2 shadow hover:scale-105 active:scale-95 transition">
          <Camera className="h-4 w-4" />
          <input type="file" accept="image/*" onChange={onFile} className="hidden" disabled={loading} />
        </label>
      </div>
      <p className="text-xs opacity-60 mt-2">{loading ? 'Envoi…' : 'Changer la photo'}</p>
    </div>
  )
}
