'use client'

import HeartBackground from '@/components/home/HeartBackground'
import { supabase } from '@/lib/supabase/client'
import { Plus, ListTodo } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useState, type CSSProperties } from 'react'
import { Bucket } from '@/lib/types'
import { getBuckets } from '@/lib/api/buckets'
import BucketCard from '@/components/bucket/BucketCard'
import CreateBucketDrawer from '@/components/bucket/CreateBucketDrawer'

export default function BucketPage() {
  const router = useRouter()
  const [me, setMe] = useState<string | null>(null)
  const [coupleId, setCoupleId] = useState<string | null>(null)
  const [buckets, setBuckets] = useState<Bucket[]>([])
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    ;(async () => {
      const { data: s } = await supabase.auth.getSession()
      if (!s.session) {
        router.replace('/register')
        return
      }
      setMe(s.session.user.id)

      const { data: status } = await supabase
        .from('my_couple_status')
        .select('*')
        .eq('user_id', s.session.user.id)
        .maybeSingle()

      if (!status) {
        router.replace('/onboarding')
        return
      }

      if (status.members_count < 2) {
        router.replace('/waiting')
        return
      }

      setCoupleId(status.couple_id)
      await loadBuckets(status.couple_id)
      setLoading(false)
    })()
  }, [router])

  async function loadBuckets(cid: string) {
    try {
      const data = await getBuckets(cid)
      setBuckets(data)
    } catch (error) {
      console.error('Error loading buckets:', error)
    }
  }

  const containerStyle: CSSProperties = {
    "--gap": "8px",
  } as any;

  return (
    <>
      <HeartBackground />
      
      <main 
        style={containerStyle}
        className="relative z-10 min-h-screen pb-28 px-2 pt-[calc(env(safe-area-inset-top)+var(--gap))]"
      >
        <div className="max-w-6xl mx-auto space-y-6">
          
          {/* Floating Header */}
          <div className="sticky top-[calc(env(safe-area-inset-top)+var(--gap))] z-20">
            <div className="flex items-center justify-between rounded-2xl border border-black/10 dark:border-white/10 bg-white/80 dark:bg-neutral-900/70 backdrop-blur-md shadow-lg p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/10 rounded-xl text-blue-600 dark:text-blue-400">
                  <ListTodo className="h-5 w-5" />
                </div>
                <h1 className="text-xl font-bold tracking-tight">Listes</h1>
              </div>
              
              <button
                onClick={() => setIsDrawerOpen(true)}
                className="p-2 rounded-xl bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20 active:scale-95 transition"
              >
                <Plus className="h-5 w-5" />
              </button>
            </div>
          </div>

          <section>
            {loading ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
              </div>
            ) : buckets.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 opacity-50">
                <div className="text-4xl mb-2">📝</div>
                <p>Aucune liste pour le moment</p>
                <button 
                  onClick={() => setIsDrawerOpen(true)}
                  className="mt-4 text-sm text-blue-500 hover:underline"
                >
                  Créer ma première liste
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-6">
                {buckets.map(bucket => (
                  <BucketCard key={bucket.id} bucket={bucket} />
                ))}
              </div>
            )}
          </section>
        </div>

        {/* Create Bucket Drawer */}
        {coupleId && me && (
          <CreateBucketDrawer
            open={isDrawerOpen}
            onOpenChange={setIsDrawerOpen}
            coupleId={coupleId}
            userId={me}
            onSuccess={() => {
              if (coupleId) loadBuckets(coupleId)
            }}
          />
        )}
      </main>
    </>
  )
}
