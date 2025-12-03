"use client";

import { supabase } from "@/lib/supabase/client";
import { relativeTimeFromNow } from "@/lib/utils";
import { NotebookPen } from "lucide-react";
import { useEffect, useState } from "react";

type LoveNote = { id: string; content: string; created_at: string; author_id: string };

export default function NoteWidget() {
  const [loading, setLoading] = useState(true);
  const [lastNote, setLastNote] = useState<LoveNote | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { data: s } = await supabase.auth.getSession();
        if (!s.session) { setLoading(false); return; }
        const userId = s.session.user.id;

        const { data: st } = await supabase
          .from('my_couple_status')
          .select('couple_id')
          .eq('user_id', userId)
          .maybeSingle();

        if (!st?.couple_id) { setLoading(false); return; }
        const cpl = st.couple_id;

        const { data } = await supabase
          .from('love_notes')
          .select('id, content, created_at, author_id')
          .eq('couple_id', cpl)
          .neq('author_id', userId) // Notes received from partner
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (mounted) setLastNote(data);
      } catch (e) {
        console.error('NoteWidget error:', e);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  if (loading) {
    return (
      <div className="h-full w-full flex flex-col justify-center animate-pulse space-y-2">
        <div className="h-4 w-1/2 bg-neutral-200 dark:bg-neutral-800 rounded" />
        <div className="h-16 w-full bg-neutral-200 dark:bg-neutral-800 rounded" />
      </div>
    );
  }

  return (
    <div className="h-full w-full flex flex-col justify-between relative">
       {/* Tape effect */}
       <div className="absolute -top-6 left-1/2 -translate-x-1/2 w-12 h-4 bg-white/30 dark:bg-white/10 backdrop-blur-md rotate-[-2deg] shadow-sm border border-white/20" />

      <div className="flex items-center gap-2">
        <div className="p-2 bg-rose-100 dark:bg-rose-900/30 rounded-xl text-rose-600 dark:text-rose-400">
          <NotebookPen className="w-4 h-4" />
        </div>
        <span className="text-sm font-medium text-neutral-600 dark:text-neutral-400">Dernier mot doux</span>
      </div>

      <div className="mt-4 flex-1 flex flex-col justify-center">
        {lastNote ? (
          <>
            <p className="text-sm font-handwriting leading-relaxed line-clamp-3 italic text-neutral-800 dark:text-neutral-200">
              "{lastNote.content}"
            </p>
            <p className="text-xs text-right mt-2 text-rose-500 opacity-80">
              {relativeTimeFromNow(lastNote.created_at)}
            </p>
          </>
        ) : (
          <p className="text-sm text-neutral-400 italic text-center">
            Ta boîte aux lettres est vide... pour l'instant !
          </p>
        )}
      </div>
    </div>
  );
}
