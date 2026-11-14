import Link from "next/link";

export default function SiteFooter() {
  return (
    <footer>
      <div className="footer-top footer-links-layout">
        <div><Link className="brand brand-large" href="/" data-platform-brand data-platform-short-name>MODEL ESCAPE</Link><p>Creative people. Remarkable places.<br />Work worth remembering.</p></div>
        <div className="footer-link-columns">
          <div><strong>Explore</strong><Link href="/events">Events</Link><Link href="/models">Models</Link><Link href="/photographers">Photographers</Link></div>
          <div><strong>Build</strong><Link href="/host">Host an event</Link><Link href="/sponsorships">Sponsorships</Link><Link href="/membership">Membership</Link></div>
          <div><strong>Company</strong><Link href="/about">Our story</Link><Link href="/contact">Contact</Link><Link href="/dashboard">Dashboard</Link></div>
        </div>
      </div>
      <div className="footer-bottom"><span>© 2026 <b data-platform-name>Model Escape</b></span><div><Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link><Link href="/contact">Contact</Link></div><Link href="#top">Back to top ↑</Link></div>
    </footer>
  );
}
