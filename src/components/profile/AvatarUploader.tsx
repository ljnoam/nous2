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
    <div className="relative group w-full h-full">
      <img
        src={avatarUrl || '/icons/icon-192.png'}
        alt="Avatar"
        className="w-full h-full rounded-full object-cover transition-transform duration-200 group-hover:scale-105"
      />
      <div className={`absolute inset-0 rounded-full flex items-center justify-center bg-black/30 transition-opacity duration-200 ${loading ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
         {loading ? (
           <div className="h-5 w-5 border-2 border-white/50 border-t-white rounded-full animate-spin" />
         ) : (
           <Camera className="h-6 w-6 text-white/90 drop-shadow-md" />
         )}
      </div>
      <label className="absolute inset-0 cursor-pointer rounded-full">
        <input type="file" accept="image/*" onChange={onFile} className="hidden" disabled={loading} />
      </label>
    </div>
  )
}
