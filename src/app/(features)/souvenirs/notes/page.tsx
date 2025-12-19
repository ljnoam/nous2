"use client"


import NoteCard from "@/components/notes/NoteCard"
import BlurText from "@/components/ui/BlurText"
import { Button } from "@/components/ui/button"
import { supabase } from "@/lib/supabase/client"
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
  DrawerClose,
} from "@/components/ui/drawer"
import { NotebookPen, Plus } from "lucide-react"
import { AnimatePresence } from "motion/react"
import { useRouter } from "next/navigation"
import { useEffect, useState, useCallback } from "react"

type Note = {
  id: string
  content: string
  created_at: string
  author_id: string
  author_name?: string
}

export default function NotesPage() {
  const router = useRouter()
  const [notes, setNotes] = useState<Note[]>([])
  const [newNote, setNewNote] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [loading, setLoading] = useState(true)
  const [me, setMe] = useState<string | null>(null)
  const [coupleId, setCoupleId] = useState<string | null>(null)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)

  useEffect(() => {
    init()
  }, [])

  async function init() {
    try {
      setLoading(true)
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push("/login")
        return
      }
      setMe(session.user.id)

      // Get couple ID
      const { data: coupleData, error: coupleError } = await supabase
        .from("couple_members")
        .select("couple_id")
        .eq("user_id", session.user.id)
        .single()

      if (coupleError || !coupleData) {
        console.error("Error fetching couple:", coupleError)
        return
      }
      setCoupleId(coupleData.couple_id)

      // Fetch notes
      await fetchNotes(coupleData.couple_id, session.user.id)
    } catch (e) {
      console.error("Error initializing:", e)
    } finally {
      setLoading(false)
    }
  }

  async function fetchNotes(cid: string, uid: string) {
    try {
      // Fetch notes
      const { data: notesData, error: notesError } = await supabase
        .from("love_notes")
        .select("*")
        .eq("couple_id", cid)
        .order("created_at", { ascending: false })

      if (notesError) throw notesError

      // Fetch user names to map author_id to names
      const authorIds = [uid, ...((notesData || []).map((n: any) => n.author_id))]
      const { data: usersData } = await supabase
        .from('profiles')
        .select("id, first_name")
        .in("id", authorIds)

      const userMap = new Map(usersData?.map((u: any) => [u.id, u.first_name]) || [])

      const formattedNotes = (notesData || []).map((n: any) => ({
        ...n,
        author_name: userMap.get(n.author_id) || (n.author_id === uid ? "Moi" : "Partenaire")
      }))

      setNotes(formattedNotes)
    } catch (e) {
      console.error("Error fetching notes:", e)
    }
  }

  async function addNote() {
    if (!newNote.trim() || !me || !coupleId) return

    setIsSubmitting(true)
    try {
      // Use Server Action
      const { createNote } = await import('@/lib/actions')
      const data = await createNote(newNote, coupleId)

      if (data) {
        // Optimistically add note with "Moi" as author
        const newNoteObj = { ...data, author_name: "Moi" }
        setNotes([newNoteObj, ...notes])
        setNewNote("")
        setIsDrawerOpen(false)
      }
    } catch (e) {
      console.error("Error adding note:", e)
      alert("Erreur lors de l'ajout de la note")
    } finally {
      setIsSubmitting(false)
    }
  }

  const deleteNote = useCallback(async (id: string) => {
    // Optimistic delete
    const previousNotes = [...notes]
    setNotes(notes.filter(n => n.id !== id))

    try {
      const { error } = await supabase.from("love_notes").delete().eq("id", id)
      if (error) throw error
    } catch (e) {
      console.error("Error deleting note:", e)
      setNotes(previousNotes)
    }
  }, [notes])

  const containerStyle: React.CSSProperties = {
    "--gap": "12px",
  } as any;

  return (
    <>

      <main 
        style={containerStyle}
        className="relative z-10 min-h-screen pb-20 px-3 pt-[calc(env(safe-area-inset-top)+var(--gap))]"
      >
        <div className="max-w-6xl mx-auto space-y-6">
          
          {/* Floating Header */}
          <div className="sticky top-[calc(env(safe-area-inset-top)+var(--gap))] z-20">
            <div className="flex items-center justify-between rounded-2xl border border-black/10 dark:border-white/10 bg-white/80 dark:bg-neutral-900/70 backdrop-blur-md shadow-lg p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-pink-500/10 rounded-xl text-pink-600 dark:text-pink-400">
                  <NotebookPen className="h-5 w-5" />
                </div>
                <h1 className="text-xl font-bold tracking-tight">Mots doux</h1>
              </div>
              
              <button
                onClick={() => setIsDrawerOpen(true)}
                className="p-2 rounded-xl bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20 active:scale-95 transition"
              >
                <Plus className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Masonry Grid */}
          {loading ? (
            <div className="flex items-center justify-center py-20 text-neutral-400">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-500" />
            </div>
          ) : notes.length > 0 ? (
            <div className="columns-1 sm:columns-2 md:columns-3 gap-4 space-y-4">
              <AnimatePresence mode="popLayout">
                {notes.map((note, i) => (
                  <NoteCard
                    key={note.id}
                    note={note}
                    index={i}
                    onDelete={deleteNote}
                    isAuthor={note.author_id === me}
                  />
                ))}
              </AnimatePresence>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 opacity-50">
              <div className="text-4xl mb-2">💌</div>
              <p>Aucun mot doux pour le moment</p>
              <button 
                onClick={() => setIsDrawerOpen(true)}
                className="mt-4 text-sm text-pink-500 hover:underline"
              >
                Écrire le premier mot
              </button>
            </div>
          )}
        </div>

        {/* Create Note Drawer */}
        <Drawer open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
          <DrawerContent className="bg-white dark:bg-neutral-900">
            <div className="mx-auto w-full max-w-md">
              <DrawerHeader>
                <DrawerTitle>Nouveau mot doux</DrawerTitle>
                <DrawerDescription>Écris un petit mot pour ton partenaire.</DrawerDescription>
              </DrawerHeader>
              
              <div className="p-4 space-y-4">
                <textarea
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder="Écris quelque chose de mignon..."
                  className="w-full rounded-xl border border-black/10 dark:border-white/10 bg-transparent px-4 py-3 outline-none focus:ring-2 focus:ring-pink-500 resize-none h-32 text-lg"
                  autoFocus
                />

                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                  {["Je t'aime ❤️", "Merci ✨", "Tu me manques 🌙", "Bonne journée ☀️"].map(preset => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setNewNote(preset)}
                      className="flex-shrink-0 text-xs px-3 py-1.5 rounded-full bg-pink-50 text-pink-600 hover:bg-pink-100 dark:bg-pink-900/20 dark:text-pink-400 dark:hover:bg-pink-900/40 transition-colors"
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              <DrawerFooter>
                <Button 
                  onClick={addNote} 
                  disabled={!newNote.trim() || isSubmitting}
                  className="w-full rounded-xl h-12 text-base bg-pink-600 hover:bg-pink-700 text-white"
                >
                  {isSubmitting ? "Envoi..." : "Envoyer ❤️"}
                </Button>
                <DrawerClose asChild>
                  <Button variant="outline" className="w-full rounded-xl h-12 text-base">Annuler</Button>
                </DrawerClose>
              </DrawerFooter>
            </div>
          </DrawerContent>
        </Drawer>
      </main>
    </>
  )
}
