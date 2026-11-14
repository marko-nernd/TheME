"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

export type ModelPreview = {
  slug: string;
  name: string;
  role: string;
  location: string;
  image: string;
  available: boolean;
  tier: string;
  bio?: string | null;
  experienceYears?: number | null;
  specialties?: string[];
  isPremiumBlur?: boolean;
};

export default function ModelPreviewCard({
  model,
  variant = "home",
}: {
  model: ModelPreview;
  variant?: "home" | "directory";
}) {
  const router = useRouter();
  const cardRef = useRef<HTMLElement>(null);
  const [hovered, setHovered] = useState(false);
  const [pinned, setPinned] = useState(false);
  const isOpen = hovered || pinned;
  const status = model.available ? "Available" : "On assignment";

  useEffect(() => {
    function closeOnOutsideClick(event: PointerEvent) {
      if (cardRef.current && !cardRef.current.contains(event.target as Node)) {
        setPinned(false);
        setHovered(false);
      }
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setPinned(false);
        setHovered(false);
      }
    }

    document.addEventListener("pointerdown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, []);

  return (
    <article
      ref={cardRef}
      className={`model-preview-card ${variant} ${isOpen ? "preview-open" : ""} ${model.isPremiumBlur ? "premium-privacy" : ""}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={(event) => {
        if ((event.target as HTMLElement).closest("a,button")) return;
        router.push(`/members/${model.slug}`);
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter") router.push(`/members/${model.slug}`);
      }}
      onFocus={() => setPinned(true)}
      tabIndex={0}
      aria-label={`${model.name}, ${model.location}, ${status}. View full profile.`}
    >
      <div className="model-preview-image">
        <Image
          unoptimized
          src={model.image}
          alt={`${model.name}, ${model.role}`}
          fill
          sizes={variant === "home" ? "(max-width: 700px) 90vw, 25vw" : "(max-width: 700px) 100vw, 25vw"}
        />
        <div className="model-preview-shade" />
        <div className={`model-preview-status ${model.available ? "available" : ""}`}>
          <span /> {status}
        </div>
        <div className="model-preview-inline">
          <p>{model.role} · {model.location}</p>
          <h3>{model.name}</h3>
        </div>
        {model.isPremiumBlur && (
          <div className="premium-privacy-label">
            <strong>Pro privacy</strong>
            <span>Open the profile to request access</span>
          </div>
        )}
      </div>

      <div className="model-preview-popover" aria-hidden={!isOpen}>
        <span className="preview-tier">{model.tier} member</span>
        <h3>{model.name}</h3>
        <p className="preview-location">{model.location} · {status}</p>
        <p>{model.bio || `${model.name} is available for considered campaigns, editorials, and creative collaborations.`}</p>
        <div className="preview-meta">
          {model.experienceYears ? <span>{model.experienceYears} years</span> : null}
          {model.specialties?.slice(0, 2).map((specialty) => <span key={specialty}>{specialty}</span>)}
        </div>
        <Link
          href={`/members/${model.slug}`}
          onClick={(event) => event.stopPropagation()}
        >
          View full profile →
        </Link>
      </div>
    </article>
  );
}
