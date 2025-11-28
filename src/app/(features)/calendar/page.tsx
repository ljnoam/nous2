"use client";

import HeartBackground from "@/components/home/HeartBackground";

import EventForm from "@/components/calendar/EventForm";
import { supabase } from "@/lib/supabase/client";
import {
    Apple,
    CalendarPlus,
    ChevronDown,
    ChevronUp,
    Clock3,
    MoreVertical,
    Pencil,
    Trash2,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState, type CSSProperties } from "react";

export const dynamic = "force-dynamic";

type EventRow = {
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

export default function CalendarPage() {
  const router = useRouter();
  const [me, setMe] = useState<string | null>(null);
  const [coupleId, setCoupleId] = useState<string | null>(null);
  const [items, setItems] = useState<EventRow[]>([]);
  const [editing, setEditing] = useState<EventRow | null>(null);
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  // form state
  const [title, setTitle] = useState("");
  const [start, setStart] = useState<string>("");
  const [end, setEnd] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [allDay, setAllDay] = useState<boolean>(false);
  const [formCollapsed, setFormCollapsed] = useState<boolean>(false);
  const params = useSearchParams();

  useEffect(() => {
    (async () => {
      const { data: s } = await supabase.auth.getSession();
      if (!s.session) { router.replace('/register'); return; }
      setMe(s.session.user.id);

      const { data: st } = await supabase
        .from('my_couple_status')
        .select('*')
        .eq('user_id', s.session.user.id)
        .maybeSingle();
      if (!st) { router.replace('/onboarding'); return; }
      if (st.members_count < 2) { router.replace('/waiting'); return; }
      setCoupleId(st.couple_id);

      let list: EventRow[] | null = null;
      if (!navigator.onLine) {
        try {
          const cached = localStorage.getItem(`cache_events_${st.couple_id}`);
          if (cached) list = JSON.parse(cached);
        } catch {}
      }
      if (!list) {
        const { data } = await supabase
          .from('couple_events')
          .select('id, couple_id, author_id, title, starts_at, ends_at, notes, created_at, all_day')
          .eq('couple_id', st.couple_id)
          .gte('starts_at', new Date(Date.now() - 1 * 24 * 3600 * 1000).toISOString())
          .order('starts_at', { ascending: true });
        list = (data ?? []) as EventRow[];
        try { localStorage.setItem(`cache_events_${st.couple_id}`, JSON.stringify(list)); } catch {}
      }
      setItems(list ?? []);
    })();
  }, [router]);

  // Realtime universal (filter by couple_id client-side)
  useEffect(() => {
    const ch = supabase
      .channel('couple_events_all')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'couple_events' }, (p) => {
        const row = p.new as EventRow;
        setItems(prev => {
          if (!coupleId || row.couple_id !== coupleId) return prev;
          if (prev.find(i => i.id === row.id)) return prev;
          return [...prev, row].sort((a,b) => a.starts_at.localeCompare(b.starts_at));
        });
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'couple_events' }, (p) => {
        const row = p.new as EventRow;
        setItems(prev => {
          if (!coupleId || row.couple_id !== coupleId) return prev;
          const next = prev.map(i => i.id === row.id ? row : i);
          next.sort((a,b) => a.starts_at.localeCompare(b.starts_at));
          return next;
        });
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'couple_events' }, (p) => {
        const row = p.old as EventRow;
        setItems(prev => {
          if (!coupleId || row.couple_id !== coupleId) return prev;
          return prev.filter(i => i.id !== row.id);
        });
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [coupleId]);

  // Resync on tab visibility
  useEffect(() => {
    async function refetch() {
      if (!coupleId || document.hidden) return;
      const { data } = await supabase
        .from('couple_events')
        .select('id, couple_id, author_id, title, starts_at, ends_at, notes, created_at, all_day')
        .eq('couple_id', coupleId)
        .gte('starts_at', new Date(Date.now() - 1 * 24 * 3600 * 1000).toISOString())
        .order('starts_at', { ascending: true });
      const next = data ?? [];
      setItems(next);
      try { localStorage.setItem(`cache_events_${coupleId}`, JSON.stringify(next)); } catch {}
    }
    document.addEventListener('visibilitychange', refetch);
    return () => document.removeEventListener('visibilitychange', refetch);
  }, [coupleId]);

  async function addEvent() {
    const t = title.trim();
    if (!t || !start || !me || !coupleId) return;
    let starts_at = new Date(start).toISOString();
    let ends_at: string | null = end ? new Date(end).toISOString() : null;
    if (allDay) {
      const d = new Date(start);
      d.setHours(0, 0, 0, 0);
      starts_at = d.toISOString();
      ends_at = null;
    }
    if (!navigator.onLine) {
      const { enqueueOutbox } = await import('@/lib/outbox');
      await enqueueOutbox('event', {
        title: t,
        starts_at,
        ends_at,
        notes: notes.trim() || null,
        author_id: me,
        couple_id: coupleId,
        all_day: allDay,
      });
      console.log('[offline] event queued');
      setTitle(""); setStart(""); setEnd(""); setNotes("");
      return;
    }

    // Server Action
    try {
      const { createEvent } = await import('@/lib/actions')
      const data = await createEvent({
        title: t,
        starts_at,
        ends_at,
        notes: notes.trim() || null,
        couple_id: coupleId,
        all_day: allDay,
      })
      
      // Optimistic update handled by realtime subscription usually, but we can add it manually if needed.
      // The existing code relies on realtime or refetch?
      // Actually the existing code didn't update state manually for insert, it relied on realtime subscription (lines 89-118).
      // So we just need to call the action.
      
      setTitle(""); setStart(""); setEnd(""); setNotes(""); setAllDay(false);
    } catch (e: any) {
      console.error("Error creating event:", e)
      alert(e.message)
    }
  }

  async function deleteEvent(id: string) {
    const { error } = await supabase.from('couple_events').delete().eq('id', id);
    if (error) alert(error.message);
  }

  // Deeplink focus (?event=<id>)
  useEffect(() => {
    const target = params?.get('event');
    if (!target) return;
    const el = document.getElementById(`event-${target}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setHighlightId(target);
      const t = setTimeout(() => setHighlightId(null), 2500);
      return () => clearTimeout(t);
    }
  }, [params, items.length]);

  const grouped = useMemo(() => {
    // map by day, sorted
    const out = new Map<string, EventRow[]>();
    const today = new Date(); today.setHours(0,0,0,0);
    const sorted = [...items]
      .filter(i => new Date(i.starts_at).getTime() >= today.getTime() - 24*3600*1000)
      .sort((a,b) => a.starts_at.localeCompare(b.starts_at));
    for (const ev of sorted) {
      const d = new Date(ev.starts_at);
      const key = d.toISOString().slice(0,10);
      const arr = out.get(key) || [];
      arr.push(ev);
      out.set(key, arr);
    }
    return out;
  }, [items]);

  useEffect(() => {
    if (!openMenuId) return;
    function handleGlobalClick(event: MouseEvent) {
      const target = event.target;
      if (target instanceof HTMLElement && target.closest("[data-calendar-menu]")) return;
      setOpenMenuId(null);
    }
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpenMenuId(null);
    }
    document.addEventListener("click", handleGlobalClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("click", handleGlobalClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [openMenuId]);

  function handleAddToAppleCalendar(ev: EventRow) {
    if (typeof window === "undefined") return;
    const payload = {
      id: ev.id,
      title: ev.title,
      notes: ev.notes ?? "",
      startsAt: ev.starts_at,
      endsAt: ev.ends_at,
      allDay: !!ev.all_day,
    };
    const webkitHandlers = (window as any)?.webkit?.messageHandlers;
    const webkitTarget =
      webkitHandlers?.addToCalendar ??
      webkitHandlers?.calendar ??
      webkitHandlers?.calendarEvent;

    if (webkitTarget && typeof webkitTarget.postMessage === "function") {
      try {
        webkitTarget.postMessage(payload);
        return;
      } catch (error) {
        console.warn("Failed to call webkit handler, falling back to ICS export", error);
      }
    }

    const ics = buildIcsFromEvent(ev);
    triggerIcsDownload(ics, buildIcsFilename(ev));
  }

  const containerStyle: CSSProperties = {
    "--gap": "2px",
  } as any;

  return (
    <>
      <HeartBackground />
      <main
        style={containerStyle}
        className="relative z-10 flex w-full flex-col min-h-[calc(var(--viewport-height)-var(--nav-h))] pb-[calc(env(safe-area-inset-bottom)+var(--gap))]"
    >
      {/* === FORMULAIRE STICKY TOP === */}
      <section
        className={`
          sticky top-[calc(env(safe-area-inset-top)+var(--gap))]
          z-10
        `}
      >
        <div className={`relative rounded-2xl border border-black/10 dark:border-white/10 bg-white/80 dark:bg-neutral-900/70 backdrop-blur-md shadow-lg p-4 sm:p-5 ${formCollapsed ? 'py-3' : ''}`}>
          <button
            type="button"
            onClick={() => setFormCollapsed(v => !v)}
            aria-label={formCollapsed ? 'Réouvrir le formulaire' : 'Réduire le formulaire'}
            className="absolute top-3 right-3 rounded-lg p-1.5 hover:bg-black/5 dark:hover:bg-white/10 active:scale-95 transition"
          >
            {formCollapsed ? <ChevronDown className="h-5 w-5" /> : <ChevronUp className="h-5 w-5" />}
          </button>
          <div className="flex items-center gap-2 mb-3 pr-9">
            <CalendarPlus className="h-5 w-5" />
            <h1 className="text-xl font-semibold">Ajouter un événement</h1>
          </div>
          {!formCollapsed && (
            <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Titre"
              className="rounded-xl border border-black/10 dark:border-white/10 bg-transparent px-3 py-2 outline-none focus:ring-2 focus:ring-black/10 dark:focus:ring-white/10"
            />
            <label className="inline-flex items-center gap-2 text-sm">
              <input type="checkbox" checked={allDay} onChange={(e) => setAllDay(e.target.checked)} />
              Évènement sur une journée
            </label>
            <input
              type="datetime-local"
              value={start}
              onChange={(e) => setStart(e.target.value)}
              placeholder="Début"
              className="rounded-xl border border-black/10 dark:border-white/10 bg-transparent px-3 py-2 outline-none focus:ring-2 focus:ring-black/10 dark:focus:ring-white/10"
            />
            <input
              type="datetime-local"
              value={end}
              onChange={(e) => setEnd(e.target.value)}
              placeholder="Fin (optionnel)"
              className="rounded-xl border border-black/10 dark:border-white/10 bg-transparent px-3 py-2 outline-none focus:ring-2 focus:ring-black/10 dark:focus:ring-white/10"
            />
            <input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Notes (optionnel)"
              className="rounded-xl border border-black/10 dark:border-white/10 bg-transparent px-3 py-2 outline-none focus:ring-2 focus:ring-black/10 dark:focus:ring-white/10"
            />
          </div>
          <div className="mt-3">
            <button
              onClick={addEvent}
              className="inline-flex items-center gap-2 rounded-xl border border-black/10 dark:border-white/10 bg-black text-white dark:bg-white dark:text-black px-3 py-2 font-medium disabled:opacity-50 active:scale-95 transition"
              disabled={!title.trim() || !start}
            >
              Ajouter
            </button>
          </div>
            </>
          )}
        </div>
      </section>

      {/* === LISTE (scroll dans une box) === */}
      <section
        className={`
          flex-1 mt-8 pb-8
        `}
      >
        <div className="space-y-4">
          {Array.from(grouped.entries()).map(([day, evs]) => (
            <div
              key={day}
              className="relative rounded-2xl border border-black/10 dark:border-white/10 bg-white/80 dark:bg-neutral-900/70 backdrop-blur-md shadow p-4 overflow-visible"
              style={{ zIndex: evs.some(ev => openMenuId === ev.id) ? 50 : 'auto' }}
            >
              {/* Date section */}
              <h2 className="text-[11px] uppercase tracking-wide opacity-70 mb-3">
                {new Date(day).toLocaleDateString('fr-FR', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </h2>

              {/* Events */}
              <ul className="relative space-y-3">
                {evs.map((ev) => (
                  <li
                    key={ev.id}
                    className="relative flex items-start justify-between gap-3"
                    style={{ zIndex: openMenuId === ev.id ? 100 : 1 }}
                  >
                    <div className="flex-1">
                      <p className="font-semibold text-lg">{ev.title}</p>
                      <p className="text-xs opacity-70 flex items-center gap-1 mt-0.5">
                        <Clock3 className="h-3.5 w-3.5" />
                        <span>
                          {new Date(ev.starts_at).toLocaleTimeString('fr-FR', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                          {ev.ends_at
                            ? ` → ${new Date(ev.ends_at).toLocaleTimeString('fr-FR', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}`
                            : ''}
                        </span>
                      </p>
                      {ev.notes && (
                        <p className="italic text-sm opacity-60 mt-1">{ev.notes}</p>
                      )}
                    </div>
                    <div data-calendar-menu className="relative shrink-0">
                      <button
                        data-menu-trigger={ev.id}
                        className="rounded-lg px-2 py-1 hover:bg-black/5 dark:hover:bg-white/10 active:scale-95 transition"
                        title="Actions événement"
                        onClick={() => setOpenMenuId(prev => prev === ev.id ? null : ev.id)}
                        aria-haspopup="menu"
                        aria-expanded={openMenuId === ev.id}
                      >
                        <MoreVertical className="h-4 w-4" />
                      </button>
                      {openMenuId === ev.id && (
                        <div
                          role="menu"
                          className="absolute min-w-[180px] rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-neutral-900 shadow-lg py-1"
                          style={{
                            zIndex: 9999,
                          }}
                          ref={(el) => {
                            if (!el) return;
                            const btn = document.querySelector(`[data-menu-trigger="${ev.id}"]`);
                            if (!btn) return;
                            const parent = btn.closest('[data-calendar-menu]') as HTMLElement | null;
                            const rect = btn.getBoundingClientRect();
                            const parentRect = parent ? parent.getBoundingClientRect() : ({
                              left: 0,
                              top: 0,
                              width: window.innerWidth,
                              height: window.innerHeight,
                            } as DOMRect);

                            const menuRect = el.getBoundingClientRect();
                            const naturalMenuW = Math.max(menuRect.width || 180, 180);
                            const naturalMenuH = Math.max(menuRect.height || 120, 80);
                            const padding = 8;

                            // available width inside parent (fallback to viewport)
                            const availW = parentRect.width || window.innerWidth;

                            // If the container is narrow (mobile), make the menu fit the container with side padding
                            if (availW <= naturalMenuW + padding * 2 || availW < 320) {
                              const w = Math.max(140, availW - padding * 2);
                              el.style.width = `${w}px`;
                              // position full-width-ish under the button, but keep some side padding
                              const left = Math.max(padding, rect.left - (parentRect.left || 0) - padding);
                              let top = rect.bottom - (parentRect.top || 0) + 8;
                              const menuH = naturalMenuH;
                              if (top + menuH > (parentRect.height || window.innerHeight) - padding) {
                                top = rect.top - (parentRect.top || 0) - menuH - 8;
                                top = Math.max(padding, Math.min(top, (parentRect.height || window.innerHeight) - menuH - padding));
                              }
                              el.style.left = `${left}px`;
                              el.style.top = `${top}px`;
                              return;
                            }

                            // Prefer to display the menu below and left-aligned to the button
                            // so it doesn't overflow the right edge on small screens.
                            let left = rect.left - (parentRect.left || 0);

                            // If the natural menu width is wider than available, shrink it to fit
                            const availWidth = (parentRect.width || window.innerWidth) - padding * 2;
                            const menuW = Math.min(naturalMenuW, Math.max(140, availWidth));
                            el.style.width = `${menuW}px`;

                            // clamp inside parent/viewport horizontally
                            const minLeft = padding;
                            const maxLeft = Math.max((parentRect.width || window.innerWidth) - menuW - padding, minLeft);
                            left = Math.min(Math.max(left, minLeft), maxLeft);

                            // prefer below the button
                            let top = rect.bottom - (parentRect.top || 0) + 6;
                            if (top + naturalMenuH > (parentRect.height || window.innerHeight) - padding) {
                              top = rect.top - (parentRect.top || 0) - naturalMenuH - 6;
                              top = Math.max(padding, Math.min(top, (parentRect.height || window.innerHeight) - naturalMenuH - padding));
                            }

                            el.style.left = `${left}px`;
                            el.style.top = `${top}px`;
                          }}
                        >
                          <button
                            type="button"
                            role="menuitem"
                            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-black/5 dark:hover:bg-white/10"
                            onClick={() => {
                              setOpenMenuId(null);
                              setEditing(ev);
                            }}
                          >
                            <Pencil className="h-4 w-4" />
                            Modifier
                          </button>
                          <button
                            type="button"
                            role="menuitem"
                            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-black/5 dark:hover:bg-white/10"
                            onClick={() => {
                              setOpenMenuId(null);
                              handleAddToAppleCalendar(ev);
                            }}
                          >
                            <Apple className="h-4 w-4" />
                            Ajouter au calendrier Apple
                          </button>
                          <button
                            type="button"
                            role="menuitem"
                            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-black/5 dark:hover:bg-white/10 text-red-600 dark:text-red-400"
                            onClick={() => {
                              setOpenMenuId(null);
                              deleteEvent(ev.id);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                            Supprimer
                          </button>
                        </div>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          {grouped.size === 0 && (
            <div className="rounded-2xl border border-black/10 dark:border-white/10 bg-white/70 dark:bg-neutral-900/60 backdrop-blur-md shadow p-6 text-center">
              <div className="text-2xl mb-1">🗓️</div>
              <p className="text-sm opacity-80">
                Aucun événement prévu. Ajoutez-en un pour planifier à deux !
              </p>
            </div>
          )}
        </div>
      </section>

      {/* util scrollbar - already defined globally in globals.css */}
      {editing && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50 p-4">
          <EventForm
            initial={{
              id: editing.id,
              title: editing.title,
              starts_at: editing.starts_at,
              ends_at: editing.ends_at,
              notes: editing.notes || '',
              all_day: !!editing.all_day,
              couple_id: coupleId!,
              author_id: me!,
            }}
            onCancel={() => setEditing(null)}
            onSubmit={async (vals) => {
              setItems(prev => prev.map(i => i.id === editing.id ? { ...i, ...vals, starts_at: vals.starts_at, ends_at: vals.ends_at, all_day: vals.all_day } as any : i));
              setEditing(null);
              const { error } = await supabase.from('couple_events').update({
                title: vals.title,
                starts_at: vals.starts_at,
                ends_at: vals.ends_at,
                notes: vals.notes,
                all_day: vals.all_day,
              }).eq('id', editing.id);
              if (error) alert(error.message);
            }}
          />
        </div>
      )}
    </main>
    </>
  );
}

function buildIcsFromEvent(event: EventRow): string {
  const lines: string[] = [];
  const allDay = !!event.all_day;
  const now = new Date();
  const startDate = new Date(event.starts_at);
  lines.push("BEGIN:VCALENDAR");
  lines.push("VERSION:2.0");
  lines.push("PRODID:-//Nous//Calendar//FR");
  lines.push("CALSCALE:GREGORIAN");
  lines.push("BEGIN:VEVENT");
  lines.push(`UID:${event.id}@nous2.app`);
  lines.push(`DTSTAMP:${formatDateUtc(now)}`);
  lines.push(
    allDay
      ? `DTSTART;VALUE=DATE:${formatDateValue(startDate)}`
      : `DTSTART:${formatDateUtc(startDate)}`
  );

  if (event.ends_at) {
    const endDate = new Date(event.ends_at);
    lines.push(
      allDay
        ? `DTEND;VALUE=DATE:${formatDateValue(endDate)}`
        : `DTEND:${formatDateUtc(endDate)}`
    );
  } else if (allDay) {
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 1);
    lines.push(`DTEND;VALUE=DATE:${formatDateValue(endDate)}`);
  }

  lines.push(`SUMMARY:${escapeIcsText(event.title)}`);
  if (event.notes) {
    lines.push(`DESCRIPTION:${escapeIcsText(event.notes)}`);
  }
  lines.push("END:VEVENT");
  lines.push("END:VCALENDAR");
  return lines.join("\r\n") + "\r\n";
}

function triggerIcsDownload(ics: string, filename: string) {
  const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

function buildIcsFilename(event: EventRow): string {
  const pad = (value: number) => String(value).padStart(2, "0");
  const startsAt = new Date(event.starts_at);
  const datePart = `${startsAt.getFullYear()}${pad(startsAt.getMonth() + 1)}${pad(startsAt.getDate())}`;
  const slug = event.title
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  const safeSlug = slug || "event";
  return `${datePart}-${safeSlug}.ics`;
}

function formatDateUtc(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, "0");
  return (
    `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}` +
    `T${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}Z`
  );
}

function formatDateValue(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}`;
}

function escapeIcsText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\r?\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}
