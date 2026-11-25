import type { EventRecord } from "@/lib/data/types";

export function EventPoster({ event, compact = false }: { event: EventRecord; compact?: boolean }) {
  const hero = event.eventPage?.sections.find((section): section is Extract<typeof section, { type: "hero" }> => section.type === "hero");
  const heroImage = hero?.media?.src;
  return (
    <div className={`event-poster event-poster--${event.cover}${heroImage ? " event-poster--hero" : ""}${compact ? " event-poster--compact" : ""}`} style={heroImage ? { backgroundImage: `url(${heroImage})` } : undefined}>
      <span className="event-poster__grain" aria-hidden="true" />
      <div className="event-poster__top"><span>NASA SELECT</span><span>{event.category.toUpperCase()}</span></div>
      <div className="event-poster__art" aria-hidden="true"><i /><i /><i /></div>
      <div className="event-poster__title"><small>{event.eyebrow}</small><strong>{event.shortTitle}</strong></div>
      <div className="event-poster__date"><b>{event.dateLabel.split(", ")[1]?.split(" ")[0] ?? "24"}</b><span>{event.dateLabel.split(" ")[2]?.slice(0, 3).toUpperCase() ?? "AUG"}</span></div>
    </div>
  );
}
