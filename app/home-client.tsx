"use client";

import Image from "next/image";
import Link from "next/link";
import { FormEvent, useEffect, useRef, useState } from "react";
import EventPreviewCard from "@/components/event-preview-card";
import ModelPreviewCard from "@/components/model-preview-card";
import SiteHeader from "@/components/site-header";
import CookieConsent from "@/components/cookie-consent";
import { ScrollIntroduction, ScrollStory, useHomeScrollExperience } from "@/components/home-scroll-experience";

export type HomeEvent = {
  id?: string;
  slug: string;
  image: string;
  poster?: string;
  mediaType?: "image" | "video";
  date: string;
  month: string;
  title: string;
  location: string;
  detail: string;
  category: string;
  summary: string;
  startsLabel: string;
  venue: string;
  price: string;
  spotsRemaining: number;
  capacity: number;
};

export type HomeMember = {
  slug: string;
  name: string;
  role: "Model" | "Photographer";
  location: string;
  image: string;
  available: boolean;
  tier: string;
  bio?: string | null;
  experienceYears?: number | null;
  specialties?: string[];
  isPremiumBlur?: boolean;
};

export type HomeHeroSlide = {
  id: string;
  mediaType: "image" | "video";
  media: string;
  poster?: string;
  eyebrow: string;
  title: string;
  accentText: string;
  copy: string;
  ctaLabel: string;
  href: string;
  alt: string;
};

const fallbackEvents: HomeEvent[] = [
  {
    slug: "desert-light-editorial",
    image: "/images/desert-production.png",
    date: "17",
    month: "OCT",
    title: "Desert Light Editorial",
    location: "Scottsdale, AZ",
    detail: "Sunset shoot · 12 creatives",
    category: "Editorial",
    summary: "A sunset-led fashion production shaped around warm desert light.",
    startsLabel: "October 17 · 3:00 PM",
    venue: "Private North Scottsdale residence",
    price: "$325",
    spotsRemaining: 4,
    capacity: 12,
  },
  {
    slug: "neon-after-dark",
    image: "/images/neon-studio.png",
    date: "08",
    month: "NOV",
    title: "Neon After Dark",
    location: "Phoenix, AZ",
    detail: "Night studio · 8 creatives",
    category: "Studio",
    summary: "A controlled night-studio session for cinematic color and movement.",
    startsLabel: "November 8 · 6:00 PM",
    venue: "Warehouse 215 Studio",
    price: "$275",
    spotsRemaining: 3,
    capacity: 8,
  },
  {
    slug: "poolside-portfolio-day",
    image: "/images/poolside-network.png",
    date: "22",
    month: "NOV",
    title: "Poolside Portfolio Day",
    location: "Paradise Valley, AZ",
    detail: "Full day · 16 creatives",
    category: "Lifestyle",
    summary: "A full-day resort portfolio production with lifestyle and swim sets.",
    startsLabel: "November 22 · 9:00 AM",
    venue: "Paradise Valley private resort",
    price: "$425",
    spotsRemaining: 7,
    capacity: 16,
  },
  {
    slug: "sedona-motion-lab",
    image: "/images/models/model-08.jpg",
    date: "05",
    month: "DEC",
    title: "Sedona Motion Lab",
    location: "Sedona, AZ",
    detail: "Two-day production · 10 creatives",
    category: "Movement",
    summary: "A two-day movement and fabric study set against red-rock landscapes.",
    startsLabel: "December 5 · 6:00 AM",
    venue: "West Sedona production base",
    price: "$690",
    spotsRemaining: 4,
    capacity: 10,
  },
  {
    slug: "downtown-campaign-night",
    image: "/images/models/model-13.jpg",
    date: "12",
    month: "DEC",
    title: "Downtown Campaign Night",
    location: "Phoenix, AZ",
    detail: "Evening production · 12 creatives",
    category: "Campaign",
    summary: "An evening street-style campaign with real locations and a commercial brief.",
    startsLabel: "December 12 · 4:00 PM",
    venue: "Roosevelt Row production hub",
    price: "$240",
    spotsRemaining: 5,
    capacity: 12,
  },
  {
    slug: "miami-swim-editorial",
    image: "/images/models/model-16.jpg",
    date: "16",
    month: "JAN",
    title: "Miami Swim Editorial",
    location: "Miami Beach, FL",
    detail: "Sunrise call · 14 creatives",
    category: "Swim",
    summary: "A sunrise swim and resort editorial designed for publication-ready work.",
    startsLabel: "January 16 · 5:30 AM",
    venue: "South Beach and private resort",
    price: "$550",
    spotsRemaining: 6,
    capacity: 14,
  },
  {
    slug: "joshua-tree-lookbook",
    image: "/images/models/model-19.jpg",
    date: "30",
    month: "JAN",
    title: "Joshua Tree Lookbook",
    location: "Joshua Tree, CA",
    detail: "Two-day escape · 9 creatives",
    category: "Lookbook",
    summary: "A focused two-day lookbook production in a quiet desert house.",
    startsLabel: "January 30 · 8:00 AM",
    venue: "Joshua Tree production house",
    price: "$780",
    spotsRemaining: 3,
    capacity: 9,
  },
  {
    slug: "la-beauty-studio",
    image: "/images/models/model-22.jpg",
    date: "13",
    month: "FEB",
    title: "LA Beauty Studio",
    location: "Los Angeles, CA",
    detail: "Full studio day · 8 creatives",
    category: "Beauty",
    summary: "A precision beauty day for clean portraits, detail work, and bold color.",
    startsLabel: "February 13 · 9:00 AM",
    venue: "Arts District beauty studio",
    price: "$475",
    spotsRemaining: 2,
    capacity: 8,
  },
];

const fallbackMembers: HomeMember[] = [
  {
    slug: "daisy-monroe",
    name: "Daisy Monroe",
    role: "Model",
    location: "Miami · Phoenix",
    image: "/images/daisy.jpg",
    available: true,
    tier: "pro",
    bio: "Destination and swim model focused on polished campaign work.",
    experienceYears: 7,
    specialties: ["Swim", "Editorial"],
    isPremiumBlur: true,
  },
  {
    slug: "sofia-reyes",
    name: "Sofia Reyes",
    role: "Model",
    location: "Las Vegas · LA",
    image: "/images/desert-model.jpg",
    available: true,
    tier: "creator",
    bio: "Editorial model working between Las Vegas and Los Angeles.",
    experienceYears: 5,
    specialties: ["Editorial", "Beauty"],
  },
  {
    slug: "mara-scott",
    name: "Mara Scott",
    role: "Model",
    location: "Scottsdale, AZ",
    image: "/images/scottsdale.jpg",
    available: false,
    tier: "profile",
    bio: "Lifestyle and commercial talent based in Scottsdale.",
    experienceYears: 3,
    specialties: ["Lifestyle", "Commercial"],
  },
];

const fallbackPhotographers: HomeMember[] = [
  { slug: "leo-martin", name: "Leo Martin", role: "Photographer", location: "Phoenix, AZ", image: "/images/desert-production.png", available: true, tier: "gold", specialties: ["Editorial", "Campaign"] },
  { slug: "nia-wells", name: "Nia Wells", role: "Photographer", location: "Los Angeles, CA", image: "/images/neon-studio.png", available: true, tier: "silver", specialties: ["Beauty", "Studio"] },
  { slug: "andre-cole", name: "Andre Cole", role: "Photographer", location: "Miami, FL", image: "/images/poolside-network.png", available: true, tier: "creator", specialties: ["Swim", "Lifestyle"] },
  { slug: "morgan-lee", name: "Morgan Lee", role: "Photographer", location: "Scottsdale, AZ", image: "/images/creative-planning.png", available: false, tier: "basic", specialties: ["Commercial", "Portrait"] },
];

const fallbackHeroSlides: HomeHeroSlide[] = [
  { id: "desert", mediaType: "image", media: "/images/desert-model.jpg", eyebrow: "A private creative network", title: "Make work worth", accentText: "escaping for.", copy: "Curated destination shoots that bring serious models and photographers together—without the noise, guesswork, or endless DMs.", ctaLabel: "Explore experiences", href: "/events", alt: "Creative portrait session in the Arizona desert" },
  { id: "production", mediaType: "image", media: "/images/desert-production.png", eyebrow: "Produced in remarkable places", title: "A better crew.", accentText: "A bigger idea.", copy: "Join small, professionally planned productions with a clear brief, a trusted team, and room to make ambitious work.", ctaLabel: "Meet the community", href: "/discover", alt: "Creative production team at a modern Arizona house" },
  { id: "neon", mediaType: "image", media: "/images/neon-studio.png", eyebrow: "Studio to destination", title: "Build the frame.", accentText: "Own the night.", copy: "From controlled studio sessions to destination editorials, every escape is designed around portfolio-defining outcomes.", ctaLabel: "Browse the gallery", href: "/gallery", alt: "Professional fashion photography production in a neon studio" },
  { id: "planning", mediaType: "image", media: "/images/creative-planning.png", eyebrow: "For people who make things happen", title: "Bring the vision.", accentText: "We’ll build the plan.", copy: "Hosts and creative-led teams can propose funded experiences and manage them from feasibility through launch.", ctaLabel: "Host an event", href: "/host", alt: "Event producers planning on a Scottsdale rooftop" },
  { id: "network", mediaType: "image", media: "/images/poolside-network.png", eyebrow: "Connection without the algorithm", title: "The right room.", accentText: "The right people.", copy: "Meet verified creatives through focused gatherings where introductions become collaborations and collaborations become real work.", ctaLabel: "Discover members", href: "/discover", alt: "Creative professionals networking at a desert resort" },
  { id: "portfolio", mediaType: "image", media: "/images/daisy.jpg", eyebrow: "Portfolio-first experiences", title: "Leave with work", accentText: "you believe in.", copy: "Considered locations, production support, and serious collaborators—so the time away produces more than a camera roll.", ctaLabel: "See membership", href: "/membership", alt: "Editorial portrait created during a destination session" },
  { id: "trust", mediaType: "image", media: "/images/scottsdale.jpg", eyebrow: "Built on trust", title: "Smaller network.", accentText: "Stronger signal.", copy: "Every profile is reviewed, every experience is scoped, and every collaboration starts with clear expectations.", ctaLabel: "Read our story", href: "/about", alt: "Model Escape editorial portrait in Scottsdale" },
];

export default function HomeClient({
  events = fallbackEvents,
  members = fallbackMembers,
  photographers = fallbackPhotographers,
  heroSlides = fallbackHeroSlides,
  headerBackgroundColor,
  pageContent = {},
}: {
  events?: HomeEvent[];
  members?: HomeMember[];
  photographers?: HomeMember[];
  heroSlides?: HomeHeroSlide[];
  headerBackgroundColor?: string;
  pageContent?: Record<string, string>;
}) {
  const slides = heroSlides.length ? heroSlides : fallbackHeroSlides;
  const [subscribed, setSubscribed] = useState(false);
  const [activeSlide, setActiveSlide] = useState(0);
  const [slidePaused, setSlidePaused] = useState(false);
  const [slideHovered, setSlideHovered] = useState(false);
  const [slideFocused, setSlideFocused] = useState(false);
  const homeRef = useRef<HTMLElement>(null);
  useHomeScrollExperience(homeRef);

  useEffect(() => {
    if (slidePaused || slideHovered || slideFocused || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = window.setInterval(() => setActiveSlide((current) => (current + 1) % slides.length), 6500);
    return () => window.clearInterval(timer);
  }, [slidePaused, slideHovered, slideFocused, slides.length]);

  useEffect(() => {
    const hero = homeRef.current?.querySelector(".hero");
    if (!hero) return;
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    let visible = true;
    const sync = () => hero.querySelectorAll<HTMLVideoElement>("video").forEach((video) => {
      if (visible && !document.hidden && !media.matches && video.classList.contains("active")) void video.play().catch(() => {});
      else video.pause();
    });
    const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; sync(); });
    observer.observe(hero); document.addEventListener("visibilitychange", sync); media.addEventListener("change", sync); sync();
    return () => { observer.disconnect(); document.removeEventListener("visibilitychange", sync); media.removeEventListener("change", sync); hero.querySelectorAll("video").forEach((video) => video.pause()); };
  }, [activeSlide]);

  async function handleSubscribe(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const email = String(formData.get("email") ?? "");
    const response = await fetch("/api/newsletter", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email }),
    });

    if (response.ok) {
      setSubscribed(true);
      form.reset();
    }
  }

  return (
    <main className="home-cinematic" ref={homeRef}>
      <SiteHeader backgroundColor={headerBackgroundColor} />
      {!slides.some((slide) => slide.title || slide.accentText) && <h1 className="sr-only">Model Escape — events and creative community</h1>}

      <section className="hero hero-slideshow" id="top" aria-roledescription="carousel" aria-label="Model Escape highlights" onMouseEnter={() => setSlideHovered(true)} onMouseLeave={() => setSlideHovered(false)} onFocusCapture={() => setSlideFocused(true)} onBlurCapture={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setSlideFocused(false); }}>
        <div className="hero-image-wrap">
          {slides.map((slide, index) => slide.mediaType === "video" ? (
            <video
              key={slide.id}
              className={index === activeSlide ? "hero-image hero-video active" : "hero-image hero-video"}
              src={slide.media}
              poster={slide.poster || "/images/desert-production.png"}
              autoPlay={index === activeSlide}
              muted
              loop
              playsInline
              preload={index === 0 ? "auto" : "metadata"}
              aria-label={index === activeSlide ? slide.alt : undefined}
              aria-hidden={index !== activeSlide}
            />
          ) : (
            <Image key={slide.id} unoptimized src={slide.media} alt={index === activeSlide ? slide.alt : ""} fill priority={index === 0} sizes="100vw" className={index === activeSlide ? "hero-image active" : "hero-image"} aria-hidden={index !== activeSlide} />
          ))}
          <div className="image-wash" />
          <span className="vertical-caption">SCOTTSDALE · ARIZONA · EST. 2025</span>
        </div>
        {(slides[activeSlide].eyebrow || slides[activeSlide].title || slides[activeSlide].accentText || slides[activeSlide].copy || (slides[activeSlide].ctaLabel && slides[activeSlide].href)) && (
          <div className="hero-copy" aria-live="polite">
            {slides[activeSlide].eyebrow && <p className="eyebrow"><span /> {slides[activeSlide].eyebrow}</p>}
            {(slides[activeSlide].title || slides[activeSlide].accentText) && <h1>{slides[activeSlide].title}{slides[activeSlide].title && slides[activeSlide].accentText && <br />}{slides[activeSlide].accentText && <em>{slides[activeSlide].accentText}</em>}</h1>}
            {slides[activeSlide].copy && <p className="hero-lede">{slides[activeSlide].copy}</p>}
            {slides[activeSlide].ctaLabel && slides[activeSlide].href && (
              <div className="hero-actions">
                <Link className="button" href={slides[activeSlide].href}>{slides[activeSlide].ctaLabel} <b>↗</b></Link>
              </div>
            )}
          </div>
        )}
        <div className="slide-controls" aria-label="Choose a slide">
          {slides.map((slide, index) => <button key={slide.id} type="button" className={index === activeSlide ? "active" : ""} onClick={() => setActiveSlide(index)} aria-label={`Show slide ${index + 1}`} aria-current={index === activeSlide ? "true" : undefined}><span /></button>)}
          <button className="pause-slide" type="button" onClick={() => setSlidePaused((value) => !value)} aria-label={slidePaused ? "Resume slideshow" : "Pause slideshow"}>{slidePaused ? "▶" : "Ⅱ"}</button>
        </div>
        <nav className="home-hero-dock" aria-label="Start exploring">
          <Link href="/events"><span>01 / Join</span><strong>Upcoming events</strong><b>↗</b></Link>
          <Link href="/models"><span>02 / Cast</span><strong>Browse models</strong><b>↗</b></Link>
          <Link href="/photographers"><span>03 / Create</span><strong>Find photographers</strong><b>↗</b></Link>
        </nav>
      </section>

      <ScrollIntroduction />

      <section className="section experiences" id="experiences">
        <div className="section-heading" data-reveal>
          <div>
            <p className="eyebrow"><span /> Upcoming escapes</p>
            <h2>Your next best<br />shoot starts here.</h2>
          </div>
          <p className="section-intro">
            Small groups, considered locations, and a production plan that lets you
            focus on making excellent work.
          </p>
        </div>

        <div className="home-event-grid">
          {events.map((event) => (
            <EventPreviewCard event={event} key={event.slug} />
          ))}
        </div>
        <div className="section-end-action"><Link className="button home-section-button" href="/events">View all events ↗</Link></div>
      </section>

      <section className="section discover" id="discover">
        <div className="discover-top" data-reveal>
          <div>
            <p className="eyebrow light"><span /> Recently active</p>
            <h2>Meet your next<br /><em>collaborator.</em></h2>
          </div>
        </div>

        <div className="member-grid">
          {members.map((member) => (
            <ModelPreviewCard
              key={member.slug}
              model={member}
            />
          ))}
          {members.length === 0 && (
            <div className="empty-state">
              <span>⌁</span>
              <h3>Model profiles are being reviewed.</h3>
              <p>Published profiles will appear here automatically.</p>
            </div>
          )}
        </div>
        <div className="discover-more"><Link className="button button-light" href="/models">More models ↗</Link></div>
      </section>

      <ScrollStory content={pageContent} />

      <section className="section home-photographers">
        <div className="section-heading" data-reveal>
          <div>
            <p className="eyebrow"><span /> Behind the lens</p>
            <h2>Photographers<br />ready to create.</h2>
          </div>
          <p className="section-intro">Discover photographers ranked by membership access, then recent activity.</p>
        </div>
        <div className="member-grid">
          {photographers.map((photographer) => (
            <ModelPreviewCard key={photographer.slug} model={photographer} />
          ))}
        </div>
        <div className="section-end-action"><Link className="button home-section-button" href="/photographers">More photographers ↗</Link></div>
      </section>

      <section className="membership" id="membership">
        <div className="membership-inner" data-reveal>
          <p className="eyebrow light"><span /> {pageContent.membershipEyebrow || "Founding membership"}</p>
          <h2>{pageContent.membershipTitle || "Come for the escape. Stay for the people."}</h2>
          <p>{pageContent.membershipIntro || "Start with a free profile. Upgrade when you need more portfolio space, priority access, and direct messaging."}</p>
          <div className="membership-actions">
            <Link className="button button-light" href="/signup">Apply to join <b>↗</b></Link>
            <span>No card required · Applications reviewed weekly</span>
          </div>
        </div>
        <div className="price-card">
          <div className="price-card-top"><span>Member</span><strong>$0</strong><small>/ forever</small></div>
          <ul>
            <li><span>✓</span> Verified public profile</li>
            <li><span>✓</span> Browse events and members</li>
            <li><span>✓</span> One portfolio image</li>
          </ul>
          <p>Paid plans from $1.99/month after launch.</p>
        </div>
      </section>

      <footer>
        <div className="footer-top">
          <div>
            <Link className="brand brand-large" href="/">MODEL<span>ESCAPE</span></Link>
            <p>Creative people. Remarkable places.<br />Work worth remembering.</p>
          </div>
          <form onSubmit={handleSubscribe}>
            <label htmlFor="email">Occasional notes from the road</label>
            <div className="email-field">
              <input id="email" name="email" type="email" required placeholder="Your email address" aria-label="Email address" />
              <button type="submit" aria-label="Subscribe">{subscribed ? "✓" : "→"}</button>
            </div>
            {subscribed && <p className="success-message">You’re on the local preview list.</p>}
          </form>
        </div>
        <div className="footer-bottom">
          <span>© 2026 <b data-platform-name>Model Escape</b></span>
          <div><Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link><Link href="/contact">Contact</Link></div>
          <a href="#top">Back to top ↑</a>
        </div>
      </footer>
      <CookieConsent />
    </main>
  );
}
