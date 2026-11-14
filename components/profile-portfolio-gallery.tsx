"use client";

import Image from "next/image";
import { useState } from "react";

type Item = {
  id: string;
  imagePath: string;
  hasUpload: boolean;
  caption: string;
  credit: string | null;
  isPrivate: boolean;
};

export default function ProfilePortfolioGallery({ name, items }: { name: string; items: Item[] }) {
  const [selected, setSelected] = useState<Item | null>(null);
  const source = (item: Item) => item.hasUpload ? `/api/portfolio/${item.id}` : item.imagePath;
  return <>
    <div className="profile-portfolio-grid">
      {items.map((item, index) => (
        <button type="button" className={item.isPrivate ? "premium-blurred" : ""} onClick={() => setSelected(item)} key={item.id} aria-label={`Open ${item.caption || `${name} portfolio image ${index + 1}`}`}>
          <Image unoptimized src={source(item)} alt={item.caption || `${name} portfolio image ${index + 1}`} fill sizes="10vw" />
          {item.isPrivate && <span>Private</span>}
        </button>
      ))}
    </div>
    {selected && <div className="portfolio-lightbox" onMouseDown={(event) => event.target === event.currentTarget && setSelected(null)}>
      <section role="dialog" aria-modal="true" aria-label={selected.caption || "Selected portfolio image"}>
        <button type="button" onClick={() => setSelected(null)} aria-label="Close image">×</button>
        <div><Image unoptimized src={source(selected)} alt={selected.caption || `${name} selected portfolio image`} fill sizes="90vw" /></div>
        {(selected.caption || selected.credit) && <footer><strong>{selected.caption}</strong>{selected.credit && <span>{selected.credit}</span>}</footer>}
      </section>
    </div>}
  </>;
}
