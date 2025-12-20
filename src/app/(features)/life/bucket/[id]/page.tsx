'use client'


import { supabase } from '@/lib/supabase/client'
import { ArrowLeft, Check, Plus, Trash2, MoreVertical } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useState, type CSSProperties } from 'react'
import { Bucket, BucketItem } from '@/lib/types'
import { getBucketItems, toggleBucketItem, deleteBucketItem, deleteBucket } from '@/lib/api/buckets'
import { createBucketItem } from '@/lib/actions'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export default function BucketDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [bucket, setBucket] = useState<Bucket | null>(null)
  const [items, setItems] = useState<BucketItem[]>([])
  const [newItemContent, setNewItemContent] = useState('')
  const [loading, setLoading] = useState(true)
  const [me, setMe] = useState<string | null>(null)

  useEffect(() => {
    ;(async () => {
      const { data: s } = await supabase.auth.getSession()
      if (!s.session) {
        router.replace('/register')
        return
      }
      setMe(s.session.user.id)

      // Fetch bucket details
      const { data: bucketData, error } = await supabase
        .from('buckets')
        .select('*')
        .eq('id', params.id)
        .single()

      if (error || !bucketData) {
        console.error('Error fetching bucket:', error)
        router.replace('/life/bucket')
        return
      }

      setBucket(bucketData)
      await loadItems()
      setLoading(false)
    })()
  }, [params.id, router])

  async function loadItems() {
    try {
      const data = await getBucketItems(params.id)
      setItems(data)
    } catch (error) {
      console.error('Error loading items:', error)
    }
  }

  async function handleAddItem(e?: React.FormEvent) {
    e?.preventDefault()
    if (!newItemContent.trim() || !me || !bucket) return

    try {
      const newItem = await createBucketItem({
        bucket_id: params.id,
        content: newItemContent.trim(),
        couple_id: bucket.couple_id
      })
      setItems([...items, newItem])
      setNewItemContent('')
    } catch (error) {
      console.error('Error adding item:', error)
    }
  }

  async function handleToggle(item: BucketItem) {
    try {
      // Optimistic update
      const updatedItems = items.map(i => 
        i.id === item.id ? { ...i, is_completed: !i.is_completed } : i
      )
      setItems(updatedItems)

      await toggleBucketItem(item.id, !item.is_completed)
    } catch (error) {
      console.error('Error toggling item:', error)
      // Revert on error
      loadItems()
    }
  }

  async function handleDeleteItem(itemId: string) {
    if (!confirm('Supprimer cet élément ?')) return
    try {
      setItems(items.filter(i => i.id !== itemId))
      await deleteBucketItem(itemId)
    } catch (error) {
      console.error('Error deleting item:', error)
      loadItems()
    }
  }

  async function handleDeleteBucket() {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette liste et tout son contenu ?')) return
    try {
      await deleteBucket(params.id)
      router.replace('/life/bucket')
    } catch (error) {
      console.error('Error deleting bucket:', error)
      alert('Erreur lors de la suppression')
    }
  }

  const containerStyle: CSSProperties = {
    "--gap": "16px",
  } as any;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
      </div>
    )
  }

  if (!bucket) return null

  return (
    <>

      
      <main 
        style={containerStyle}
        className="relative z-10 min-h-screen pb-28 px-4 pt-[calc(env(safe-area-inset-top)+var(--gap))]"
      >
        <div className="max-w-3xl mx-auto space-y-6">
          
          {/* Header */}
          <div className="sticky top-[calc(env(safe-area-inset-top)+var(--gap))] z-20">
            <div className="flex items-center justify-between rounded-2xl border border-black/10 dark:border-white/10 bg-white/80 dark:bg-neutral-900/70 backdrop-blur-md shadow-lg p-4">
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => router.back()}
                  className="p-2 -ml-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 transition"
                >
                  <ArrowLeft className="h-5 w-5" />
                </button>
                <div>
                  <h1 className="text-lg font-bold tracking-tight flex items-center gap-2">
                    {bucket.icon && <span>{bucket.icon}</span>}
                    {bucket.title}
                  </h1>
                </div>
              </div>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="p-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 transition">
                    <MoreVertical className="h-5 w-5" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem 
                    className="text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-900/20"
                    onClick={handleDeleteBucket}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Supprimer la liste
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Add Item Input */}
          <form onSubmit={handleAddItem} className="relative">
            <input
              type="text"
              value={newItemContent}
              onChange={(e) => setNewItemContent(e.target.value)}
              placeholder="Ajouter un élément..."
              className="w-full rounded-2xl border border-black/10 dark:border-white/10 bg-white/50 dark:bg-neutral-900/50 backdrop-blur-sm px-4 py-4 pr-12 outline-none focus:ring-2 focus:ring-blue-500 transition shadow-sm"
            />
            <button
              type="submit"
              disabled={!newItemContent.trim()}
              className="absolute right-2 top-2 bottom-2 aspect-square rounded-xl bg-blue-500 text-white flex items-center justify-center disabled:opacity-50 disabled:bg-neutral-400 transition"
            >
              <Plus className="h-5 w-5" />
            </button>
          </form>

          {/* Items List */}
          <div className="space-y-2">
            {items.length === 0 ? (
              <div className="text-center py-12 opacity-50 text-sm">
                Cette liste est vide
              </div>
            ) : (
              [...items]
                .sort((a, b) => {
                  if (a.is_completed === b.is_completed) return 0
                  return a.is_completed ? 1 : -1
                })
                .map(item => (
                <div
                  key={item.id}
                  className={`
                    group flex items-center gap-3 p-4 rounded-2xl border transition-all duration-300
                    ${item.is_completed 
                      ? 'bg-neutral-100/50 dark:bg-neutral-800/50 border-transparent opacity-60' 
                      : 'bg-white dark:bg-neutral-900 border-black/5 dark:border-white/5 shadow-sm'}
                  `}
                >
                  <button
                    onClick={() => handleToggle(item)}
                    className={`
                      flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors
                      ${item.is_completed
                        ? 'bg-blue-500 border-blue-500 text-white'
                        : 'border-neutral-300 dark:border-neutral-600 hover:border-blue-500'}
                    `}
                  >
                    {item.is_completed && <Check className="h-3.5 w-3.5" />}
                  </button>
                  
                  <span className={`flex-1 font-medium ${item.is_completed ? 'line-through text-neutral-500' : ''}`}>
                    {item.content}
                  </span>

                  <button
                    onClick={() => handleDeleteItem(item.id)}
                    className="opacity-0 group-hover:opacity-100 p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))
            )}
          </div>

        </div>
      </main>
    </>
  )
}
