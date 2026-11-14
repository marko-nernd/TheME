"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, type RefObject } from "react";

export function useHomeScrollExperience(root: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const page = root.current;
    if (!page) return;
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    let dispose = () => {};
    function setup() {
      dispose();
      if (!page) return;
      if (preference.matches) { page.classList.remove("motion-ready"); return; }
      const reveals = [...page.querySelectorAll<HTMLElement>("[data-reveal]")];
      const observer = new IntersectionObserver((entries) => entries.forEach((entry) => {
        if (entry.isIntersecting) { entry.target.classList.add("is-revealed"); observer.unobserve(entry.target); }
      }), { rootMargin: "0px 0px -40px", threshold: .08 });
      reveals.forEach((element) => observer.observe(element));
      page.classList.add("motion-ready");
      const hero = page.querySelector<HTMLElement>(".hero");
      const intro = page.querySelector<HTMLElement>(".scroll-intro");
      const words = [...page.querySelectorAll<HTMLElement>("[data-scroll-word]")];
      const chapters = [...page.querySelectorAll<HTMLElement>("[data-story-step]")];
      const images = [...page.querySelectorAll<HTMLElement>("[data-story-image]")];
      let frame = 0;
      const clamp = (value: number) => Math.max(0, Math.min(1, value));
      function draw() {
        frame = 0;
        if (!page) return;
        if (hero) { const rect = hero.getBoundingClientRect(); hero.style.setProperty("--hero-progress", String(clamp(-rect.top / rect.height))); }
        if (intro) { const rect = intro.getBoundingClientRect(); const progress = clamp((window.innerHeight * .65 - rect.top) / Math.max(1, rect.height - window.innerHeight * .3)); words.forEach((word, index) => { word.style.opacity = String(.2 + .8 * clamp(progress * (words.length + 3) - index)); }); }
        let selected = 0, distance = Infinity;
        chapters.forEach((chapter, index) => { const rect = chapter.getBoundingClientRect(); const next = Math.abs(rect.top + rect.height / 2 - window.innerHeight * .55); if (next < distance) { distance = next; selected = index; } });
        if (window.innerWidth <= 760) selected = 0;
        chapters.forEach((chapter, index) => chapter.classList.toggle("is-current", index === selected));
        images.forEach((image, index) => image.classList.toggle("is-current", index === selected));
      }
      function schedule() { if (!frame) frame = requestAnimationFrame(draw); }
      draw();
      window.addEventListener("scroll", schedule, { passive: true });
      window.addEventListener("resize", schedule);
      dispose = () => { observer.disconnect(); cancelAnimationFrame(frame); window.removeEventListener("scroll", schedule); window.removeEventListener("resize", schedule); hero?.style.removeProperty("--hero-progress"); words.forEach((word) => word.style.removeProperty("opacity")); };
    }
    setup(); preference.addEventListener("change", setup);
    return () => { dispose(); preference.removeEventListener("change", setup); page.classList.remove("motion-ready"); };
  }, [root]);
}

export function ScrollIntroduction() {
  const words = "Find your people. Book your next shoot. Make work worth escaping for.".split(" ");
  return <section className="scroll-intro" aria-label="From connection to creation"><div className="scroll-intro-sticky"><p className="eyebrow"><span />From connection to creation</p><p className="scroll-statement">{words.map((word, index) => <span data-scroll-word key={index}>{word} </span>)}</p><Link href="#experiences" className="cinematic-text-link">Find your next event <span aria-hidden="true">↓</span></Link></div></section>;
}

export function ScrollStory({ content }: { content: Record<string, string> }) {
  const steps = [
    { title: "Find your people.", copy: "Explore models, photographers, and hosts. Choose the creative connections that fit your next project.", image: "/images/poolside-network.png", label: "The right people", href: "/discover", link: "Explore the community" },
    { title: "Choose your escape.", copy: "See the brief, location, dates, and full cost. Choose your participation and any optional accommodation before you pay.", image: "/images/desert-production.png", label: "A clear plan", href: "/events", link: "Browse upcoming events" },
    { title: "Make the work.", copy: "Keep your confirmation, QR event pass, and preparation details in one place. Show up ready to create.", image: "/images/neon-studio.png", label: "Your next chapter", href: "/signup", link: "Create your free profile" },
  ];
  return <section className="scroll-story" id="story"><header data-reveal><p className="eyebrow"><span />{content.builtEyebrow || "Built for the work"}</p><h2>{content.builtTitle || "Less chasing. More creating."}</h2><p>{content.builtIntro || "One place to discover your crew, book an event, and get ready for the shoot."}</p></header><div className="scroll-story-layout"><div className="scroll-story-visual" aria-hidden="true">{steps.map((step, index) => <div className={`scroll-story-image${index === 0 ? " is-current" : ""}`} key={step.title} data-story-image><Image unoptimized src={step.image} alt="" fill sizes="(max-width: 760px) 100vw, 55vw" /><div className="scroll-story-image-shade" /><span>0{index + 1} / {step.label}</span></div>)}<span className="scroll-story-wordmark">MODEL ESCAPE</span></div><ol className="scroll-story-steps">{steps.map((step, index) => <li key={step.title} data-story-step className={index === 0 ? "is-current" : ""}><span className="story-step-number">0{index + 1} /</span><h3>{step.title}</h3><p>{step.copy}</p><Link href={step.href} className="cinematic-text-link">{step.link} <span aria-hidden="true">↗</span></Link></li>)}</ol></div></section>;
}
