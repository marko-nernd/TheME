import Image from "next/image";
import PageShell from "@/components/page-shell";

const images = ["/images/desert-model.jpg", "/images/neon-studio.png", "/images/daisy.jpg", "/images/desert-production.png", "/images/scottsdale.jpg", "/images/poolside-network.png"];
export default function GalleryPage() {
  return <PageShell eyebrow="Selected work" title="Made on an escape." intro="A look at the people, places, and production energy behind the Model Escape community." image="/images/neon-studio.png"><section className="gallery-grid">{images.map((src, index) => <figure key={src} className={index % 3 === 0 ? "wide" : ""}><Image unoptimized src={src} alt={`Model Escape editorial project ${index + 1}`} fill sizes="(max-width: 700px) 100vw, 50vw" /><figcaption>PROJECT {String(index + 1).padStart(2, "0")} · ARIZONA</figcaption></figure>)}</section></PageShell>;
}
