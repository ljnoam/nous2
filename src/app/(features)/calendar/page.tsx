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
    Plus,
    Trash2,
} from "lucide-react";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
  DrawerClose,
} from "@/components/ui/drawer";
import { Switch } from "@/components/ui/switch";
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
  const [date, setDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [startTime, setStartTime] = useState<string>("");
  const [endTime, setEndTime] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [isSingleDay, setIsSingleDay] = useState<boolean>(true);
  const [formCollapsed, setFormCollapsed] = useState<boolean>(true); // Default to true (closed drawer)
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
    if (!t || !date || !startTime || !me || !coupleId) return;
    
    let starts_at: string;
    let ends_at: string | null = null;

    if (isSingleDay) {
      // Single day: starts at date+startTime, ends at date+endTime (if provided)
      starts_at = new Date(`${date}T${startTime}`).toISOString();
      if (endTime) {
        ends_at = new Date(`${date}T${endTime}`).toISOString();
      }
    } else {
      // Multi day: starts at date+startTime, ends at endDate+endTime
      if (!endDate) return; // required for multi-day
      starts_at = new Date(`${date}T${startTime}`).toISOString();
      if (endTime) {
        ends_at = new Date(`${endDate}T${endTime}`).toISOString();
      } else {
        // if no end time, maybe end of day? or just date?
        // let's assume end of day or same time as start if not specified?
        // User asked for "heure de début et heure de fin", so let's assume they provide it.
        // If not, we can default to null or same time.
        // Let's require endTime for multi-day to be safe, or default to 23:59?
        // For now, if no endTime, we just use the date part? No, ISO needs time.
        // Let's default to 23:59:59 if no time provided for end date?
        // Or better: require it.
        // But to avoid blocking, let's default to same time as start if missing.
        ends_at = new Date(`${endDate}T${startTime}`).toISOString();
      }
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
        all_day: false, // We are using specific times now
      });
      console.log('[offline] event queued');
      setTitle(""); setDate(""); setEndDate(""); setStartTime(""); setEndTime(""); setNotes("");
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
        all_day: false,
      })
      
      setTitle(""); setDate(""); setEndDate(""); setStartTime(""); setEndTime(""); setNotes(""); setIsSingleDay(true);
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
    "--gap": "8px",
  } as any;

  return (
    <>
      <HeartBackground />
      <main
        style={containerStyle}
        className="relative z-10 flex w-full flex-col min-h-[calc(var(--viewport-height)-var(--nav-h))] pb-[calc(env(safe-area-inset-bottom)+var(--gap))] px-2 pt-[calc(env(safe-area-inset-top)+var(--gap))]"
      >
        {/* Floating Header */}
        <div className="sticky top-[calc(env(safe-area-inset-top)+var(--gap))] z-20 mb-4">
          <div className="flex items-center justify-between rounded-2xl border border-black/10 dark:border-white/10 bg-white/80 dark:bg-neutral-900/70 backdrop-blur-md shadow-lg p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-500/10 rounded-xl text-purple-600 dark:text-purple-400">
                <CalendarPlus className="h-5 w-5" />
              </div>
              <h1 className="text-xl font-bold tracking-tight">Agenda</h1>
            </div>
            
            <button
              onClick={() => setFormCollapsed(false)} // Reusing formCollapsed as "isDrawerOpen" inverted, or better: let's change state usage.
              // Actually, let's use a new state for create drawer to be clean, or reuse formCollapsed logic if we want to minimize changes.
              // The user said "ne touche à rien niveau backend et logique".
              // But UI state is frontend logic.
              // Let's use a new state `isCreateOpen` and map it.
              className="p-2 rounded-xl bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20 active:scale-95 transition"
            >
              <Plus className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Create Event Drawer */}
        <Drawer open={!formCollapsed} onOpenChange={(open) => setFormCollapsed(!open)}>
          <DrawerContent className="bg-white dark:bg-neutral-900">
             <div className="mx-auto w-full max-w-md">
              <DrawerHeader>
                <DrawerTitle>Nouvel Événement</DrawerTitle>
                <DrawerDescription>Ajoutez un événement à votre agenda partagé.</DrawerDescription>
              </DrawerHeader>

              <div className="p-4 space-y-4">
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Titre"
                  className="w-full rounded-xl border border-black/10 dark:border-white/10 bg-transparent px-4 py-3 outline-none focus:ring-2 focus:ring-purple-500 text-lg font-medium"
                  autoFocus
                />
                
                <div className="flex items-center justify-between py-1">
                  <label className="text-sm font-medium">Toute la journée</label>
                  <Switch checked={isSingleDay} onCheckedChange={setIsSingleDay} />
                </div>

                <div className="flex flex-col gap-3">
                  {isSingleDay ? (
                    <>
                      {/* Single Day Mode */}
                      <div className="flex items-center gap-2 rounded-xl border border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5 px-3 py-2">
                        <span className="text-sm opacity-70 w-16">Date</span>
                        <input
                          type="date"
                          value={date}
                          onChange={(e) => setDate(e.target.value)}
                          className="flex-1 bg-transparent outline-none text-right"
                        />
                      </div>
                      <div className="flex items-center gap-2 rounded-xl border border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5 px-3 py-2">
                        <span className="text-sm opacity-70 w-16">Début</span>
                        <input
                          type="time"
                          value={startTime}
                          onChange={(e) => setStartTime(e.target.value)}
                          className="flex-1 bg-transparent outline-none text-right"
                        />
                      </div>
                      <div className="flex items-center gap-2 rounded-xl border border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5 px-3 py-2">
                        <span className="text-sm opacity-70 w-16">Fin</span>
                        <input
                          type="time"
                          value={endTime}
                          onChange={(e) => setEndTime(e.target.value)}
                          className="flex-1 bg-transparent outline-none text-right"
                        />
                      </div>
                    </>
                  ) : (
                    <>
                      {/* Multi Day Mode */}
                      <div className="flex items-center gap-2 rounded-xl border border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5 px-3 py-2">
                        <span className="text-sm opacity-70 w-16">Début</span>
                        <div className="flex flex-1 gap-2 justify-end">
                          <input
                            type="date"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            className="bg-transparent outline-none text-right w-[120px]"
                          />
                          <input
                            type="time"
                            value={startTime}
                            onChange={(e) => setStartTime(e.target.value)}
                            className="bg-transparent outline-none text-right w-[70px]"
                          />
                        </div>
                      </div>
                      <div className="flex items-center gap-2 rounded-xl border border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5 px-3 py-2">
                        <span className="text-sm opacity-70 w-16">Fin</span>
                        <div className="flex flex-1 gap-2 justify-end">
                          <input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className="bg-transparent outline-none text-right w-[120px]"
                          />
                          <input
                            type="time"
                            value={endTime}
                            onChange={(e) => setEndTime(e.target.value)}
                            className="bg-transparent outline-none text-right w-[70px]"
                          />
                        </div>
                      </div>
                    </>
                  )}
                </div>

                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Notes (optionnel)"
                  className="w-full rounded-xl border border-black/10 dark:border-white/10 bg-transparent px-4 py-3 outline-none focus:ring-2 focus:ring-purple-500 resize-none h-24"
                />
              </div>

              <DrawerFooter>
                <button
                  onClick={() => {
                    addEvent();
                    setFormCollapsed(true); // Close drawer on submit
                  }}
                  disabled={!title.trim() || !date || !startTime || (!isSingleDay && !endDate)}
                  className="w-full rounded-xl bg-black text-white dark:bg-white dark:text-black h-12 text-base font-medium disabled:opacity-50 active:scale-95 transition"
                >
                  Ajouter
                </button>
                <DrawerClose asChild>
                  <button className="w-full rounded-xl border border-black/10 dark:border-white/10 h-12 text-base font-medium">Annuler</button>
                </DrawerClose>
              </DrawerFooter>
            </div>
          </DrawerContent>
        </Drawer>

      {/* === LISTE (scroll dans une box) === */}
      <section
        className={`
          flex-1 mt-4 pb-8
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
                        onClick={() => setOpenMenuId(ev.id)}
                      >
                        <MoreVertical className="h-4 w-4" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          {grouped.size === 0 && (
            <div className="flex flex-col items-center justify-center py-12 opacity-50">
              <div className="text-4xl mb-2">🗓️</div>
              <p>Aucun événement prévu</p>
              <button 
                onClick={() => setFormCollapsed(false)}
                className="mt-4 text-sm text-purple-500 hover:underline"
              >
                Créer mon premier événement
              </button>
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
      <Drawer open={!!openMenuId} onOpenChange={(open) => !open && setOpenMenuId(null)}>
        <DrawerContent className="bg-transparent border-none shadow-none p-4 pb-8">
          <div className="flex flex-col gap-4 max-w-md mx-auto w-full">
            {/* Main Actions Group */}
            <div className="overflow-hidden rounded-2xl bg-white/90 dark:bg-neutral-800/90 backdrop-blur-md">
              <div className="px-4 py-3 text-center border-b border-black/5 dark:border-white/5">
                <DrawerTitle className="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wide">
                  Options de l'événement
                </DrawerTitle>
                {/* <DrawerDescription className="sr-only">Options</DrawerDescription> */}
              </div>
              
              <div className="flex flex-col">
                <button
                  className="flex w-full items-center justify-between px-4 py-3.5 text-[17px] text-black dark:text-white active:bg-black/5 dark:active:bg-white/10 transition border-b border-black/5 dark:border-white/5 last:border-0"
                  onClick={() => {
                    const ev = items.find(i => i.id === openMenuId);
                    if (ev) {
                      setOpenMenuId(null);
                      setEditing(ev);
                    }
                  }}
                >
                  <span className="flex items-center gap-3">
                    <Pencil className="h-5 w-5 text-blue-500" />
                    Modifier
                  </span>
                </button>
                
                <button
                  className="flex w-full items-center justify-between px-4 py-3.5 text-[17px] text-black dark:text-white active:bg-black/5 dark:active:bg-white/10 transition border-b border-black/5 dark:border-white/5 last:border-0"
                  onClick={() => {
                    const ev = items.find(i => i.id === openMenuId);
                    if (ev) {
                      setOpenMenuId(null);
                      handleAddToAppleCalendar(ev);
                    }
                  }}
                >
                  <span className="flex items-center gap-3">
                    <Apple className="h-5 w-5 text-black dark:text-white" />
                    Ajouter au calendrier Apple
                  </span>
                </button>

                <button
                  className="flex w-full items-center justify-between px-4 py-3.5 text-[17px] text-red-600 dark:text-red-500 active:bg-black/5 dark:active:bg-white/10 transition"
                  onClick={() => {
                    const ev = items.find(i => i.id === openMenuId);
                    if (ev) {
                      setOpenMenuId(null);
                      deleteEvent(ev.id);
                    }
                  }}
                >
                  <span className="flex items-center gap-3">
                    <Trash2 className="h-5 w-5" />
                    Supprimer
                  </span>
                </button>
              </div>
            </div>

            {/* Cancel Button */}
            <DrawerClose asChild>
              <button className="w-full rounded-2xl bg-white dark:bg-neutral-800 py-3.5 text-[17px] font-semibold text-blue-600 dark:text-blue-500 active:scale-[0.98] transition shadow-sm">
                Annuler
              </button>
            </DrawerClose>
          </div>
        </DrawerContent>
      </Drawer>
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
