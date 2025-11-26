"use client";

import { useEffect, useMemo, useState } from "react";
import type { CalendarEvent } from "./EventCard";

export default function EventForm({
  initial,
  onCancel,
  onSubmit,
}: {
  initial: Partial<CalendarEvent> & { couple_id: string; author_id: string };
  onCancel: () => void;
  onSubmit: (values: { title: string; all_day: boolean; starts_at: string; ends_at: string | null; notes: string | null }) => Promise<void> | void;
}) {
  const [title, setTitle] = useState(initial.title || "");
  const [notes, setNotes] = useState(initial.notes || "");
  const [allDay, setAllDay] = useState<boolean>(!!initial.all_day);
  const [start, setStart] = useState<string>(() => toLocalInput(initial.starts_at));
  const [end, setEnd] = useState<string>(() => toLocalInput(initial.ends_at || ""));

  useEffect(() => {
    if (allDay && start) {
      // force to 00:00
      const d = new Date(start);
      d.setHours(0, 0, 0, 0);
      setStart(toLocalInput(d.toISOString()));
      setEnd("");
    }
  }, [allDay]);

  const valid = useMemo(() => Boolean(title.trim() && start), [title, start]);

  return (
    <div className="w-full max-w-lg mx-auto rounded-2xl border border-black/10 dark:border-white/10 bg-white dark:bg-neutral-900 shadow-xl p-4">
      <h2 className="text-lg font-semibold mb-2">Modifier l’évènement</h2>
      <div className="space-y-3">
        <div>
          <label className="text-sm block mb-1 opacity-70">Titre</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} className="w-full rounded-lg border border-black/10 dark:border-white/10 bg-transparent px-2 py-1.5" />
        </div>
        <div className="flex items-center gap-2">
          <input id="allDay" type="checkbox" checked={allDay} onChange={(e) => setAllDay(e.target.checked)} />
          <label htmlFor="allDay" className="text-sm">Évènement sur une journée</label>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-sm block mb-1 opacity-70">Début</label>
            <input type="datetime-local" value={start} onChange={(e) => setStart(e.target.value)} className="w-full rounded-lg border border-black/10 dark:border-white/10 bg-transparent px-2 py-1.5" />
          </div>
          {!allDay && (
            <div>
              <label className="text-sm block mb-1 opacity-70">Fin (optionnel)</label>
              <input type="datetime-local" value={end} onChange={(e) => setEnd(e.target.value)} className="w-full rounded-lg border border-black/10 dark:border-white/10 bg-transparent px-2 py-1.5" />
            </div>
          )}
        </div>
        <div>
          <label className="text-sm block mb-1 opacity-70">Notes</label>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="w-full rounded-lg border border-black/10 dark:border-white/10 bg-transparent px-2 py-1.5" rows={3} />
        </div>
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <button onClick={onCancel} className="rounded-lg px-3 py-1.5 border border-black/10 dark:border-white/10">Annuler</button>
        <button
          disabled={!valid}
          onClick={async () => {
            if (!valid) return;
            const starts_at = new Date(start).toISOString();
            const ends_at = allDay || !end ? null : new Date(end).toISOString();
            await onSubmit({ title: title.trim(), all_day: allDay, starts_at, ends_at, notes: notes.trim() || null });
          }}
          className="rounded-lg px-3 py-1.5 bg-black text-white dark:bg-white dark:text-black disabled:opacity-50"
        >
          Enregistrer
        </button>
      </div>
    </div>
  );
}

function toLocalInput(iso?: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  const yyyy = d.getFullYear();
  const mm = pad(d.getMonth() + 1);
  const dd = pad(d.getDate());
  const hh = pad(d.getHours());
  const mi = pad(d.getMinutes());
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
}

