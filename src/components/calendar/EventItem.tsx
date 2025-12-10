import { Clock3, MoreVertical } from "lucide-react";
import { memo } from "react";

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

interface EventItemProps {
  ev: EventRow;
  isOpen: boolean;
  onOpenMenu: (id: string) => void;
}

const EventItem = memo(function EventItem({ ev, isOpen, onOpenMenu }: EventItemProps) {
  return (
    <li
      className="relative flex items-start justify-between gap-3"
      style={{ zIndex: isOpen ? 100 : 1 }}
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
          onClick={() => onOpenMenu(ev.id)}
        >
          <MoreVertical className="h-4 w-4" />
        </button>
      </div>
    </li>
  );
});

export default EventItem;
