"use client";

import { Children, type ReactNode, useEffect, useState } from "react";

export default function ConfirmedModelCarousel({ children, label = "Confirmed models" }: { children: ReactNode; label?: string }) {
  const models = Children.toArray(children);
  const pages = Math.ceil(models.length / 8);
  const [page, setPage] = useState(0);
  const [paused, setPaused] = useState(false);
  const active = page % Math.max(pages, 1);
  useEffect(() => {
    if (pages < 2 || paused || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = window.setInterval(() => setPage((current) => (current + 1) % pages), 6000);
    return () => window.clearInterval(timer);
  }, [pages, paused]);
  if (!models.length) return null;
  return <div className="confirmed-model-carousel" role="region" aria-roledescription="carousel" aria-label={label} onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} onFocusCapture={() => setPaused(true)}>
    <div className="confirmed-model-grid">{models.slice(active * 8, active * 8 + 8)}</div>
    {pages > 1 && <nav className="model-carousel-controls" aria-label={`${label} carousel controls`}>
      <button type="button" onClick={() => { setPaused(true); setPage((active + pages - 1) % pages); }} aria-label="Previous eight profiles">←</button>
      <span aria-live={paused ? "polite" : "off"}>{active * 8 + 1}–{Math.min((active + 1) * 8, models.length)} of {models.length}</span>
      <button type="button" onClick={() => setPaused(!paused)}>{paused ? "Play" : "Pause"}</button>
      <button type="button" onClick={() => { setPaused(true); setPage((active + 1) % pages); }} aria-label="Next eight profiles">→</button>
    </nav>}
  </div>;
}
