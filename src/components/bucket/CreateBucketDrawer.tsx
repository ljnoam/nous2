'use client'

import { Button } from '@/components/ui/button'
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer'
import { createBucket } from '@/lib/api/buckets'
import { useState } from 'react'
import { ListTodo } from 'lucide-react'

interface CreateBucketDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  coupleId: string
  userId: string
  onSuccess: () => void
}

export default function CreateBucketDrawer({
  open,
  onOpenChange,
  coupleId,
  userId,
  onSuccess
}: CreateBucketDrawerProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [icon, setIcon] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleCreate() {
    if (!title.trim()) return

    setLoading(true)
    try {
      await createBucket({
        couple_id: coupleId,
        created_by: userId,
        title: title.trim(),
        description: description.trim() || null,
        icon: icon.trim() || null,
        color: null
      })
      
      setTitle('')
      setDescription('')
      setIcon('')
      onSuccess()
      onOpenChange(false)
    } catch (error) {
      console.error('Error creating bucket:', error)
      alert('Erreur lors de la création de la liste')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="bg-white dark:bg-neutral-900">
        <div className="mx-auto w-full max-w-md">
          <DrawerHeader>
            <DrawerTitle>Nouvelle Liste</DrawerTitle>
            <DrawerDescription>Crée une nouvelle liste pour vos projets.</DrawerDescription>
          </DrawerHeader>
          
          <div className="p-4 space-y-4">
            <div>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Titre de la liste"
                className="w-full rounded-xl border border-black/10 dark:border-white/10 bg-transparent px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 text-lg font-medium"
              />
            </div>

            <div>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Description (optionnel)"
                className="w-full rounded-xl border border-black/10 dark:border-white/10 bg-transparent px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 resize-none h-24"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-500 mb-1.5 ml-1">Icône (emoji)</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={icon}
                  onChange={(e) => setIcon(e.target.value)}
                  placeholder="🎨"
                  className="w-12 text-center rounded-xl border border-black/10 dark:border-white/10 bg-transparent px-2 py-3 outline-none focus:ring-2 focus:ring-blue-500 text-xl"
                  maxLength={2}
                />
                <div className="flex-1 flex items-center text-sm text-neutral-400">
                  Choisis un emoji pour illustrer ta liste
                </div>
              </div>
            </div>
          </div>

          <DrawerFooter>
            <Button 
              onClick={handleCreate} 
              disabled={!title.trim() || loading}
              className="w-full rounded-xl h-12 text-base"
            >
              {loading ? 'Création...' : 'Créer la liste'}
            </Button>
            <DrawerClose asChild>
              <Button variant="outline" className="w-full rounded-xl h-12 text-base">Annuler</Button>
            </DrawerClose>
          </DrawerFooter>
        </div>
      </DrawerContent>
    </Drawer>
  )
}
