import type { TimelineEvent } from "@/lib/bill-types";
import { formatDate } from "@/lib/format";

export function Timeline({ events }: { events: TimelineEvent[] }) {
  return (
    <ol className="timeline">
      {events.map((event, index) => (
        <li key={`${event.date}-${index}`} className={`timeline__item${event.status ? ` timeline__item--${event.status}` : ""}`}>
          <span className="timeline__dot" aria-hidden="true" />
          <time className="timeline__date" dateTime={event.date ?? undefined}>
            {event.date ? formatDate(event.date) : "data nieznana"}
          </time>
          <span className="timeline__label">{event.label}</span>
          {event.details && <span className="timeline__details">{event.details}</span>}
        </li>
      ))}
    </ol>
  );
}
