"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { memberPlaceholder } from "@/lib/member-placeholder";
import MemberNotifications from "@/components/member-notifications";

const menuGroups = [
  { id: "events", label: "Events", href: "/events", title: "Your next escape starts here.", image: "/images/desert-production.png", links: [["Upcoming events", "/events", "Find your next shoot"], ["How it works", "/#story", "From booking to event pass"], ["Membership", "/membership", "Start free. Grow your access."]] },
  { id: "community", label: "Community", href: "/discover", title: "Find your people. Make your work.", image: "/images/poolside-network.png", links: [["Models", "/models", "Explore the talent"], ["Photographers", "/photographers", "Find your perspective"], ["Discover everyone", "/discover", "Meet the creative community"]] },
  { id: "host", label: "Host", href: "/host", title: "Bring the vision. Build the experience.", image: "/images/creative-planning.png", links: [["Host an event", "/host", "See how hosting works"], ["Create an event", "/host/new", "Dates, details, and a clear plan"], ["Host membership", "/membership", "Find the right plan"]] },
] as const;

export default function SiteHeader({ inner = false, backgroundColor }: { inner?: boolean; backgroundColor?: string }) {
  const [open, setOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [menuImages, setMenuImages] = useState<Record<string, string>>({});
  const headerRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [account, setAccount] = useState<{
    id: string;
    name: string;
    username: string | null;
    role: "model" | "photographer" | "sponsor" | "host";
    avatarVersion: number | null;
    profileHref: string;
    notifications: Array<{ id: string; title: string; message: string; href: string }>;
  } | null>(null);
  const accountRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const selectedMenu = menuGroups.find((group) => group.id === activeMenu);

  useEffect(() => {
    let active = true;
    fetch("/api/site-branding", { cache: "no-store" }).then((response) => response.ok ? response.json() : null).then((settings) => {
      if (!active || !settings) return;
      setMenuImages({ events: settings.menuEventsImagePath, community: settings.menuCommunityImagePath, host: settings.menuHostImagePath });
    }).catch(() => { /* Original menu images remain available if settings cannot be loaded. */ });
    return () => { active = false; };
  }, [pathname]);

  function closeNavigation() { setOpen(false); setActiveMenu(null); }
  function openGroup(id: string) { if (closeTimer.current) clearTimeout(closeTimer.current); setActiveMenu(id); setAccountOpen(false); }
  function hoverGroup(id: string) { if (window.matchMedia("(min-width: 1101px) and (hover: hover)").matches) openGroup(id); }
  useEffect(() => {
    let frame = 0;
    function draw() { frame = 0; const height = document.documentElement.scrollHeight - window.innerHeight; progressRef.current?.style.setProperty("--page-progress", String(height > 0 ? Math.max(0, Math.min(1, window.scrollY / height)) : 0)); }
    function schedule() { if (!frame) frame = requestAnimationFrame(draw); }
    const observer = new ResizeObserver(schedule); observer.observe(document.body);
    window.addEventListener("scroll", schedule, { passive: true }); window.addEventListener("resize", schedule); draw();
    return () => { cancelAnimationFrame(frame); observer.disconnect(); window.removeEventListener("scroll", schedule); window.removeEventListener("resize", schedule); if (closeTimer.current) clearTimeout(closeTimer.current); };
  }, [pathname]);
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const media = window.matchMedia("(min-width: 1101px)");
    const resize = () => { if (media.matches) { setOpen(false); setActiveMenu(null); } };
    media.addEventListener("change", resize);
    return () => { document.body.style.overflow = previous; media.removeEventListener("change", resize); };
  }, [open]);

  useEffect(() => {
    let active = true;
    async function refreshAccount() {
      if (document.visibilityState !== "visible") return;
      try {
        const response = await fetch("/api/auth/me", { cache: "no-store" });
        const result = await response.json();
        if (active) setAccount(result.member ?? null);
      } catch {
        if (active) setAccount(null);
      }
    }
    refreshAccount();
    const heartbeat = window.setInterval(refreshAccount, 60_000);
    document.addEventListener("visibilitychange", refreshAccount);
    return () => {
      active = false;
      window.clearInterval(heartbeat);
      document.removeEventListener("visibilitychange", refreshAccount);
    };
  }, [pathname]);

  useEffect(() => {
    function closeAccount(event: PointerEvent) {
      if (!accountRef.current?.contains(event.target as Node)) setAccountOpen(false);
      if (!headerRef.current?.contains(event.target as Node)) setActiveMenu(null);
    }
    document.addEventListener("pointerdown", closeAccount);
    return () => document.removeEventListener("pointerdown", closeAccount);
  }, []);

  const host = account?.role === "host";
  const roleAction = host
    ? { label: "Create an event", href: "/host/new" }
    : account?.role === "sponsor"
      ? { label: "Sponsorship opportunities", href: "/sponsorships" }
      : { label: "Browse opportunities", href: "/events" };

  return (
    <div className="site-header-shell" ref={headerRef} onKeyDown={(event) => {
      if (event.key === "Escape") { const trigger = headerRef.current?.querySelector<HTMLButtonElement>(`[data-menu-toggle="${activeMenu}"]`); closeNavigation(); setAccountOpen(false); (open ? menuButtonRef.current : trigger)?.focus(); }
      if (event.key === "Tab" && open) { const focusable = [...headerRef.current!.querySelectorAll<HTMLElement>('a[href], button, input')].filter((element) => element.offsetParent !== null); const first = focusable[0], last = focusable[focusable.length - 1]; if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); } else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); } }
    }} onBlurCapture={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setActiveMenu(null); }} onMouseEnter={() => { if (closeTimer.current) clearTimeout(closeTimer.current); }} onMouseLeave={() => { if (!open) closeTimer.current = setTimeout(() => setActiveMenu(null), 180); }}>
    <a className="site-skip-link" href="#page-content">Skip to content</a>
    <header className={`${inner ? "site-header inner-header" : "site-header"}${open ? " mobile-menu-open" : ""}${selectedMenu ? " has-mega-menu" : ""}`} style={backgroundColor ? { backgroundColor } : undefined}>
      <div className="site-scroll-progress" ref={progressRef} aria-hidden="true" />
      <Link className="brand" href="/" aria-label="Platform home" data-platform-brand data-platform-short-name>MODEL ESCAPE</Link>
      <nav id="main-navigation" className={`main-menu${open ? " is-open" : ""}`} aria-label="Main navigation">
        {menuGroups.map((group) => <div className={`main-menu-group${activeMenu === group.id ? " is-active" : ""}`} key={group.id}><div className="main-menu-group-heading"><Link href={group.href} onMouseEnter={() => hoverGroup(group.id)} className={pathname === group.href || pathname.startsWith(`${group.href}/`) ? "current" : ""} onClick={closeNavigation}>{group.label}</Link><button type="button" data-menu-toggle={group.id} aria-label={`${group.label} pages`} aria-expanded={activeMenu === group.id} aria-controls={`menu-panel-${group.id} menu-mobile-${group.id}`} onClick={() => { if (activeMenu === group.id) setActiveMenu(null); else openGroup(group.id); }}><span aria-hidden="true">⌄</span></button></div><div id={`menu-mobile-${group.id}`} className="mobile-menu-group-links" hidden={activeMenu !== group.id}>{group.links.map(([label, href, detail]) => <Link key={href} href={href} onClick={closeNavigation}><strong>{label}</strong><span>{detail}</span></Link>)}</div></div>)}
        <Link href="/membership" onMouseEnter={() => setActiveMenu(null)} onClick={closeNavigation} className={pathname.startsWith("/membership") ? "current" : ""}>Membership</Link>
        <Link href="/about" onMouseEnter={() => setActiveMenu(null)} onClick={closeNavigation} className={pathname === "/about" ? "current" : ""}>Our story</Link>
        <div className="mobile-menu-account"><Link href={account ? "/dashboard" : "/login"} onClick={closeNavigation}>{account ? "My dashboard" : "Sign in"} ↗</Link><Link href={account ? roleAction.href : "/signup"} onClick={closeNavigation}>{account ? roleAction.label : "Apply to join"} ↗</Link></div>
      </nav>
      <div className="header-actions">
        {account ? (
          <div className="account-menu" ref={accountRef}>
            <button
              className="account-menu-trigger"
              type="button"
              aria-label={`${account.name}: account menu`}
              aria-expanded={accountOpen}
              aria-haspopup="menu"
              onClick={() => { setAccountOpen((value) => !value); closeNavigation(); }}
            >
              <span className="account-menu-avatar">
                {account.avatarVersion ? (
                  <Image
                    unoptimized
                    src={`/api/members/${account.id}/avatar?v=${account.avatarVersion}`}
                    alt=""
                    width={40}
                    height={40}
                  />
                ) : (
                  <Image
                    unoptimized
                    src={memberPlaceholder(account.role)}
                    alt=""
                    width={40}
                    height={40}
                  />
                )}
                <i aria-label="Online" />
              </span>
              <span><strong>{account.name.split(/\s+/)[0]}</strong><small>My account</small></span>
              <b aria-hidden="true">⌄</b>
            </button>
            {accountOpen && (
              <div className="account-menu-popover" role="menu">
                <div><strong>{account.name}</strong><span>{account.role} · @{account.username}</span></div>
                <Link role="menuitem" href="/dashboard" onClick={() => setAccountOpen(false)}>Dashboard <span>↗</span></Link>
                <MemberNotifications compact />
                <Link role="menuitem" href={account.profileHref} onClick={() => setAccountOpen(false)}>View public profile <span>↗</span></Link>
                <Link role="menuitem" href="/dashboard#profile" onClick={() => setAccountOpen(false)}>Edit profile <span>↗</span></Link>
                <Link role="menuitem" href={roleAction.href} onClick={() => setAccountOpen(false)}>{roleAction.label} <span>↗</span></Link>
                {host && <Link role="menuitem" href="/dashboard#events" onClick={() => setAccountOpen(false)}>Manage events <span>↗</span></Link>}
                {!host && <Link role="menuitem" href="/dashboard#activity" onClick={() => setAccountOpen(false)}>{account.role === "sponsor" ? "My partnerships" : "My events"} <span>↗</span></Link>}
                <Link role="menuitem" href="/dashboard#connections" onClick={() => setAccountOpen(false)}>Messages & requests <span>↗</span></Link>
                <Link role="menuitem" href="/dashboard#billing" onClick={() => setAccountOpen(false)}>Membership & billing <span>↗</span></Link>
                <form action="/api/auth/logout" method="post">
                  <button role="menuitem" type="submit">Sign out <span>→</span></button>
                </form>
              </div>
            )}
          </div>
        ) : (
          <>
            <Link className="text-button" href="/login">Sign in</Link>
            <Link className="button button-small" href="/signup">Apply to join</Link>
          </>
        )}
        <button ref={menuButtonRef} className="menu-button" type="button" aria-expanded={open} aria-controls="main-navigation" aria-label={open ? "Close navigation" : "Toggle navigation"} onClick={() => { setOpen((value) => !value); setActiveMenu(null); setAccountOpen(false); }}><span /><span /></button>
      </div>
      {selectedMenu && <section id={`menu-panel-${selectedMenu.id}`} className="mega-menu-panel" aria-label={`${selectedMenu.label} pages`}><div className="mega-menu-intro"><span>EXPLORE / {selectedMenu.label}</span><h2>{selectedMenu.title}</h2><Link href={selectedMenu.href} onClick={closeNavigation}>{selectedMenu.label} overview <b aria-hidden="true">↗</b></Link></div><div className="mega-menu-links">{selectedMenu.links.map(([label, href, detail]) => <Link key={href} href={href} onClick={closeNavigation}><strong>{label}</strong><span>{detail}</span><b aria-hidden="true">↗</b></Link>)}</div><div className="mega-menu-image"><Image unoptimized src={menuImages[selectedMenu.id] || selectedMenu.image} alt="" fill sizes="30vw" /></div></section>}
    </header>
    {selectedMenu && !open && <button className="mega-menu-backdrop" type="button" aria-label="Close navigation dropdown" onClick={() => setActiveMenu(null)} tabIndex={-1} />}
    <span id="page-content" tabIndex={-1} className="site-content-anchor" />
    </div>
  );
}
