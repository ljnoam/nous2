"use client"

import { cn } from "@/lib/utils"
import { Trash2 } from "lucide-react"
import { motion } from "motion/react"

type Note = {
  id: string
  content: string
  created_at: string
  author_id: string
  author_name?: string
}

interface NoteCardProps {
  note: Note
  index: number
  onDelete: (id: string) => void
  isAuthor: boolean
}

const FONTS = ["font-caveat", "font-indie", "font-patrick", "font-shadows"]

// Light mode: Soft pinks, creams, white
// Dark mode: Deep burgundy, plum, dark rose (glassmorphism)
const VARIANTS = [
  // Variant 1: Rose
  "bg-rose-50 border-rose-100 text-rose-900 dark:bg-rose-950/40 dark:border-rose-800/50 dark:text-rose-100",
  // Variant 2: White/Pink
  "bg-white border-pink-100 text-neutral-800 dark:bg-neutral-900/60 dark:border-pink-900/30 dark:text-neutral-200",
  // Variant 3: Red tint
  "bg-red-50 border-red-100 text-red-900 dark:bg-red-950/40 dark:border-red-800/50 dark:text-red-100",
  // Variant 4: Cream/Love
  "bg-[#fff1f2] border-[#ffe4e6] text-pink-900 dark:bg-pink-950/30 dark:border-pink-800/40 dark:text-pink-100",
]

import { memo } from "react"

const NoteCard = memo(function NoteCard({ note, index, onDelete, isAuthor }: NoteCardProps) {
  const font = FONTS[index % FONTS.length]
  const variant = VARIANTS[index % VARIANTS.length]
  const rotation = index % 2 === 0 ? "rotate-1" : "-rotate-1"

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.4, delay: index * 0.05 }}
      className={cn(
        "relative group break-inside-avoid mb-4 rounded-2xl border p-6 shadow-sm backdrop-blur-sm transition-all duration-300 hover:shadow-md hover:-translate-y-1 hover:z-10",
        variant,
        rotation
      )}
    >
      {/* Tape effect (visual decoration) */}
      <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-16 h-6 bg-white/30 dark:bg-white/10 backdrop-blur-md rotate-[-2deg] shadow-sm border border-white/20" />

      <div className={cn("text-xl leading-relaxed whitespace-pre-wrap", font)}>
        {note.content}
      </div>

      <div className="mt-4 flex items-center justify-between text-xs opacity-60 font-sans">
        <span>{new Date(note.created_at).toLocaleDateString("fr-FR")}</span>
        <span className="font-medium">{note.author_name || "Anonyme"}</span>
      </div>

      {isAuthor && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            if (confirm("Supprimer ce mot doux ?")) onDelete(note.id)
          }}
          className="absolute top-2 right-2 p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/5 dark:hover:bg-white/10 text-red-500 dark:text-red-400"
          title="Supprimer"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      )}
    </motion.div>
  )
})

export default NoteCard
