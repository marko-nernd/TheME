"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import type { HomeEvent } from "@/app/home-client";
import { publicAvailabilityLabel } from "@/lib/event-availability";

export default function EventPreviewCard({ event }: { event: HomeEvent }) {
  const router = useRouter();

  return (
    <article
      className="event-preview-card"
      onClick={() => router.push(`/events/${event.slug}`)}
      onKeyDown={(keyboardEvent) => {
        if (keyboardEvent.key === "Enter" || keyboardEvent.key === " ") {
          keyboardEvent.preventDefault();
          router.push(`/events/${event.slug}`);
        }
      }}
      tabIndex={0}
      aria-label={`${event.title}, ${event.location}. From ${event.price}; ${publicAvailabilityLabel(event.capacity, event.spotsRemaining)}.`}
    >
      {event.mediaType === "video" ? (
        <video
          src={event.image}
          poster={event.poster}
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          aria-label={`${event.title} preview`}
        />
      ) : (
        <Image
          unoptimized
          src={event.image}
          alt={`${event.title} preview`}
          fill
          sizes="(max-width: 700px) 100vw, 25vw"
        />
      )}
      <div className="event-preview-shade" />
      <div className="event-preview-inline">
        <p>{event.month} {event.date} · {event.location}</p>
        <h3>{event.title}</h3>
      </div>
      <div className="event-preview-hover-stats">
        <span>From <strong>{event.price}</strong></span>
        <span>{publicAvailabilityLabel(event.capacity, event.spotsRemaining)}</span>
      </div>
    </article>
  );
}
