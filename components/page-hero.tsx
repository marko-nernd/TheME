import Image from "next/image";

export default function PageHero({ eyebrow, title, intro, image = "/images/desert-production.png" }: { eyebrow: string; title: string; intro: string; image?: string }) {
  return (
    <section className="page-hero" id="top">
      <Image unoptimized src={image} alt="" fill priority sizes="100vw" />
      <div className="page-hero-shade" />
      <div className="page-hero-content"><p className="eyebrow light"><span />{eyebrow}</p><h1>{title}</h1><p>{intro}</p></div>
    </section>
  );
}
