"use client"

import HeartBackground from "@/components/home/HeartBackground"
import NoteCard from "@/components/notes/NoteCard"
import BlurText from "@/components/ui/BlurText"
import { Button } from "@/components/ui/button"
import { supabase } from "@/lib/supabase/client"
import { Send } from "lucide-react"
import { AnimatePresence } from "motion/react"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"

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

  async function addNote(e: React.FormEvent) {
    e.preventDefault()
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
      }
    } catch (e) {
      console.error("Error adding note:", e)
      alert("Erreur lors de l'ajout de la note")
    } finally {
      setIsSubmitting(false)
    }
  }

  async function deleteNote(id: string) {
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
  }

  return (
    <>
      <HeartBackground />
      <div className="relative z-10 min-h-screen pt-8 pb-28 px-4 overflow-x-hidden bg-neutral-50 dark:bg-neutral-950 transition-colors duration-500">
        <div className="max-w-5xl mx-auto space-y-8">
        <header className="text-center space-y-2 mb-8">
          <BlurText
            text="Mots doux"
            className="text-4xl font-bold tracking-tight text-neutral-900 dark:text-white"
            delay={150}
            animateBy="chars"
            direction="top"
          />
          <p className="text-neutral-500 dark:text-neutral-400">
            Le mur de vos petites attentions
          </p>
        </header>

        {/* Input Area - Sticky or just at top */}
        <div className="max-w-2xl mx-auto bg-white dark:bg-neutral-900 rounded-3xl p-4 shadow-sm border border-neutral-100 dark:border-neutral-800 mb-10 transition-colors duration-300">
          <form onSubmit={addNote} className="relative">
            <textarea
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              placeholder="Écris quelque chose de mignon..."
              className="w-full h-24 bg-transparent resize-none outline-none text-lg placeholder:text-neutral-400 dark:placeholder:text-neutral-600 dark:text-white p-2"
            />
            <div className="flex justify-between items-center mt-2 px-2">
              <div className="flex gap-2">
                {["Je t'aime ❤️", "Merci ✨", "Tu me manques 🌙"].map(preset => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setNewNote(preset)}
                    className="text-xs px-3 py-1.5 rounded-full bg-pink-50 text-pink-600 hover:bg-pink-100 dark:bg-pink-900/20 dark:text-pink-400 dark:hover:bg-pink-900/40 transition-colors"
                  >
                    {preset}
                  </button>
                ))}
              </div>
              <Button
                type="submit"
                disabled={isSubmitting || !newNote.trim()}
                className="rounded-full px-6 bg-pink-600 hover:bg-pink-700 text-white dark:bg-pink-700 dark:hover:bg-pink-600"
              >
                {isSubmitting ? "..." : <Send className="w-4 h-4" />}
              </Button>
            </div>
          </form>
        </div>

        {/* Masonry Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-20 text-neutral-400">
            Chargement des mots doux...
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
          <div className="flex flex-col items-center justify-center py-20 text-neutral-400 space-y-4">
            <p>Aucun mot doux pour le moment.</p>
            <p className="text-sm">Sois le premier à épingler un mot sur le mur !</p>
          </div>
        )}
        </div>
      </div>
    </>
  )
}
