﻿'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { setAppBadge } from '@/lib/badging';
import { relativeTimeFromNow } from '@/lib/utils';
import NotesCarousel from '@/components/notes/NotesCarousel';
import { Send, Heart, Inbox, Mail } from 'lucide-react';

// type Note local
export type Note = { id: string; content: string; created_at: string; author_id: string };
type Reaction = { id: string; note_id: string; user_id: string; emoji: string; created_at: string };

// Utility function
function truncate(value: string, max: number) {
  if (value.length <= max) return value;
  return `${value.slice(0, Math.max(0, max - 1)).trimEnd()}…`;
}

export default function NotesPage() {
  const router = useRouter();
  const [me, setMe] = useState<string | null>(null);
  const [coupleId, setCoupleId] = useState<string | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [tab, setTab] = useState<'received'|'sent'>('received');
  const [reactionsByNote, setReactionsByNote] = useState<Record<string, Reaction[]>>({});
  const [loading, setLoading] = useState(true);
  const [newNote, setNewNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const received = useMemo(() => notes.filter(n => n.author_id !== me), [notes, me]);
  const sent = useMemo(() => notes.filter(n => n.author_id === me), [notes, me]);
  const activeList = tab === 'received' ? received : sent;

  const reactionCountsFor = (noteId: string) => {
    const arr = reactionsByNote[noteId] ?? [];
    return {
      '❤️': arr.filter(r => r.emoji === '❤️').length,
      '😆': arr.filter(r => r.emoji === '😆').length,
      '🥲': arr.filter(r => r.emoji === '🥲').length,
    };
  };

  const myReactionFor = (noteId: string) => {
    const arr = reactionsByNote[noteId] ?? [];
    const mine = arr.find(r => r.user_id === me);
    return mine?.emoji ?? null;
  };

  async function toggleReaction(noteId: string, emoji: '❤️'|'😆'|'🥲') {
    const existing = (reactionsByNote[noteId] ?? []).find(r => r.user_id === me);
    if (!existing) {
      const { error } = await supabase.from('note_reactions').insert({ note_id: noteId, emoji });
      if (error) console.error('[insert reaction] error:', error);
    } else {
      if (existing.emoji === emoji) {
        const { error } = await supabase.from('note_reactions').delete().eq('id', existing.id);
        if (error) console.error('[delete reaction] error:', error);
      } else {
        const { error } = await supabase.from('note_reactions').update({ emoji }).eq('id', existing.id);
        if (error) console.error('[update reaction] error:', error);
      }
    }
  }

  async function getCoupleIdForUser(uid: string): Promise<string | null> {
    const { data, error } = await supabase
      .from('couple_members')
      .select('couple_id')
      .eq('user_id', uid)
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('[couple_members] error:', error);
      return null;
    }
    return data?.couple_id ?? null;
  }

  async function deleteNote(id: string) {
    const { error } = await supabase.from('love_notes').delete().eq('id', id);
    if (error) console.error('[delete note] error:', error);
  }

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data: s } = await supabase.auth.getSession();
      const uid = s.session?.user.id ?? null;
      setMe(uid);

      if (!uid) {
        router.push('/login');
        return;
      }

      const cid = await getCoupleIdForUser(uid);
      if (!cid) {
        router.push('/onboarding');
        return;
      }
      setCoupleId(cid);

      const { data: fetchedNotes, error: notesErr } = await supabase
        .from('love_notes')
        .select('*')
        .eq('couple_id', cid)
        .order('created_at', { ascending: false });

      if (notesErr) console.error('[love_notes] error:', notesErr);
      setNotes((fetchedNotes as Note[]) ?? []);

      const noteIds = (fetchedNotes ?? []).map(n => n.id);
      const { data: fetchedReactions, error: reactionsErr } = await supabase
        .from('note_reactions')
        .select('*')
        .in('note_id', noteIds.length ? noteIds : ['00000000-0000-0000-0000-000000000000']);

      if (reactionsErr) console.error('[note_reactions] error:', reactionsErr);

      const grouped: Record<string, Reaction[]> = {};
      (fetchedReactions ?? []).forEach(r => {
        grouped[r.note_id] = grouped[r.note_id] ? [...grouped[r.note_id], r] : [r];
      });
      setReactionsByNote(grouped);

      try {
        setAppBadge((fetchedNotes ?? []).filter(n => n.author_id !== uid).length);
      } catch (e) {
        console.warn('[setAppBadge] not supported:', e);
      }

      setLoading(false);

      const channel = supabase
        .channel('notes_live')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'love_notes', filter: `couple_id=eq.${cid}` }, (payload) => {
          const n = payload.new as Note & { couple_id: string };
          setNotes(prev => (prev.find(x => x.id === n.id) ? prev : [n, ...prev]));
        })
        .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'love_notes', filter: `couple_id=eq.${cid}` }, (payload) => {
          const d = payload.old as Note & { couple_id: string };
          setNotes(prev => prev.filter(x => x.id !== d.id));
          setReactionsByNote(prev => { const next = { ...prev }; delete next[d.id]; return next; });
        })
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'note_reactions' }, (payload) => {
          const r = payload.new as Reaction;
          setReactionsByNote(prev => {
            const has = notes.find(n => n.id === r.note_id);
            if (!has) return prev;
            const arr = (prev[r.note_id] ?? []).filter(x => x.user_id !== r.user_id);
            return { ...prev, [r.note_id]: [...arr, r] };
          });
        })
        .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'note_reactions' }, (payload) => {
          const r = payload.old as Reaction;
          setReactionsByNote(prev => {
            const arr = (prev[r.note_id] ?? []).filter(x => x.id !== r.id);
            return { ...prev, [r.note_id]: arr };
          });
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    })();
  }, [router]);

  if (loading) {
    return (
      <main className="flex items-center justify-center bg-neutral-50 dark:bg-neutral-950">
        <div className="w-8 h-8 border-2 border-neutral-300 dark:border-neutral-700 border-t-neutral-900 dark:border-t-neutral-100 rounded-full animate-spin" />
      </main>
    );
  }

  return (
    <main
      style={{ "--gap": "16px" }}
      className="flex flex-col h-full bg-neutral-50 dark:bg-neutral-950"
    >
      {/* HEADER FIXE */}
      <section className="pt-[calc(env(safe-area-inset-top)+var(--gap))] px-2">
        <div className="bg-white/90 dark:bg-neutral-900/90 backdrop-blur-xl border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-sm pt-4 px-4 pb-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-500 to-rose-500 flex items-center justify-center shadow-lg">
              <Heart className="w-5 h-5 text-white" fill="white" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-neutral-900 dark:text-white">Mots doux</h1>
              <p className="text-sm text-neutral-500 dark:text-neutral-400">Vos messages tendres</p>
            </div>
          </div>

          {/* TABS */}
          <div className="flex gap-2 bg-neutral-100 dark:bg-neutral-800 rounded-xl p-1">
            <button
              onClick={() => setTab("received")}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                tab === "received"
                  ? "bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-sm"
                  : "text-neutral-600 dark:text-neutral-400"
              }`}
            >
              <Inbox className="w-4 h-4" />
              Reçues
              {received.length > 0 && (
                <span className="ml-1 px-2 py-0.5 bg-pink-100 dark:bg-pink-900/30 text-pink-600 dark:text-pink-400 text-xs font-semibold rounded-full">
                  {received.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setTab("sent")}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                tab === "sent"
                  ? "bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-sm"
                  : "text-neutral-600 dark:text-neutral-400"
              }`}
            >
              <Mail className="w-4 h-4" />
              Envoyées
              {sent.length > 0 && (
                <span className="ml-1 px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-xs font-semibold rounded-full">
                  {sent.length}
                </span>
              )}
            </button>
          </div>
        </div>
      </section>

      {/* CAROUSEL (fixe au centre) */}
      <div className="flex-1 flex items-center justify-center px-3 mt-1 mb-2">
        {activeList.length === 0 ? (
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center">
              {tab === "received" ? (
                <Inbox className="w-8 h-8 text-neutral-400 dark:text-neutral-600" />
              ) : (
                <Mail className="w-8 h-8 text-neutral-400 dark:text-neutral-600" />
              )}
            </div>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              {tab === "received"
                ? "Aucun mot doux reçu pour l'instant."
                : "Vous n'avez pas encore envoyé de mot doux."}
            </p>
          </div>
        ) : (
          <NotesCarousel notes={activeList} />
        )}
      </div>

      {/* ESPACE ENTRE CAROUSEL ET COMPOSER */}
      <div className="h-4" />

      {/* COMPOSER COLLÉ EN BAS */}
      <div className="sticky bottom-[calc(env(safe-area-inset-bottom)+var(--nav-h))] z-20 px-3">
        <div className="bg-white/90 dark:bg-neutral-900/90 backdrop-blur-xl border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-sm p-3">
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor="new-note"
                  className="text-xs font-medium text-neutral-700 dark:text-neutral-300"
                >
                  Écrire un mot doux
                </label>
                <span className="text-xs text-neutral-500 dark:text-neutral-400">
                  {newNote.length} car.
                </span>
              </div>
              <textarea
                id="new-note"
                placeholder="Une pensée, un souvenir..."
                className="w-full h-[70px] resize-none rounded-xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 px-3 py-2.5 text-sm text-neutral-900 dark:text-white placeholder:text-neutral-400 dark:placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-pink-500 dark:focus:ring-pink-600 focus:border-transparent transition-all"
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
              />
            </div>
            <button
              type="button"
              disabled={!newNote.trim() || !me || !coupleId || submitting}
              onClick={async () => {
                if (!newNote.trim() || !me || !coupleId) return;
                setSubmitting(true);
                try {
                  const { error } = await supabase.from("love_notes").insert({
                    couple_id: coupleId,
                    author_id: me,
                    content: newNote.trim(),
                  });
                  if (error) {
                    console.error("[insert note] error:", error);
                  } else {
                    setNewNote("");
                    setTab("sent");
                  }
                } finally {
                  setSubmitting(false);
                }
              }}
              className={`flex items-center justify-center w-12 h-12 rounded-xl transition-all ${
                !newNote.trim() || !me || !coupleId || submitting
                  ? "bg-neutral-200 dark:bg-neutral-700 text-neutral-400 dark:text-neutral-500 cursor-not-allowed"
                  : "bg-gradient-to-br from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white shadow-lg shadow-pink-500/25 active:scale-95"
              }`}
            >
              {submitting ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>

        {!newNote && (
          <div className="mt-2 flex gap-2 flex-wrap justify-center">
            {["Je pense à toi ❤️", "Tu me manques 🥹", "Merci d'être toi 💕"].map((msg) => (
              <button
                key={msg}
                onClick={() => setNewNote(msg)}
                className="px-3 py-1.5 text-sm rounded-full bg-pink-100 dark:bg-pink-900/30 text-pink-700 dark:text-pink-300 hover:bg-pink-200/60 dark:hover:bg-pink-800/50 transition active:scale-95"
              >
                {msg}
              </button>
            ))}
          </div>
        )}
      </div>
    </main>
  );

}
