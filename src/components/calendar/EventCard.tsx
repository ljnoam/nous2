"use client";

import { Pencil } from "lucide-react";

export type CalendarEvent = {
  id: string;
  couple_id: string;
  author_id: string;
  title: string;
  starts_at: string;
  ends_at: string | null;
  notes: string | null;
  created_at: string;
  all_day?: boolean;
};

export default function EventCard({ ev, onEdit }: { ev: CalendarEvent; onEdit: (e: CalendarEvent) => void }) {
  const start = new Date(ev.starts_at);
  const end = ev.ends_at ? new Date(ev.ends_at) : null;

  const timeLabel = ev.all_day
    ? 'Toute la journée'
    : `${start.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}${end ? ` → ${end.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}` : ''}`;

  return (
    <article id={`event-${ev.id}`} className="rounded-2xl border border-black/10 dark:border-white/10 bg-white/80 dark:bg-neutral-900/70 backdrop-blur-md shadow-sm p-4 flex gap-3 items-start">
      <div className="flex-1">
        <h3 className="font-semibold text-base leading-tight">{ev.title}</h3>
        <p className="text-sm opacity-70 mt-0.5">{timeLabel}</p>
        {ev.notes && <p className="text-sm mt-1 opacity-80">{ev.notes}</p>}
      </div>
      <button
        onClick={() => onEdit(ev)}
        aria-label="Éditer l’évènement"
        title="Éditer l’évènement"
        className="shrink-0 inline-flex items-center gap-1 rounded-lg px-2 py-1 hover:bg-black/5 dark:hover:bg-white/10"
      >
        <Pencil className="h-4 w-4" />
      </button>
    </article>
  );
}

