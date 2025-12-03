'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Download } from 'lucide-react'

export default function ExportDataButton({ className }: { className?: string }) {
  const [loading, setLoading] = useState(false)

  async function handleExport() {
    setLoading(true)
    try {
      const { data, error } = await supabase.rpc('export_user_data')
      if (error) throw error

      // Create blob and download
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `nous2-export-${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (e: any) {
      alert('Erreur lors de l\'export : ' + e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleExport}
      disabled={loading}
      className={`flex items-center gap-2 rounded-xl px-4 py-2 border border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/10 transition ${className}`}
    >
      <Download className="h-4 w-4" />
      <span className="text-sm font-medium">{loading ? 'Export en cours...' : 'Exporter mes données'}</span>
    </button>
  )
}
