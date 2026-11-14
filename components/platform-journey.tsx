import Link from "next/link";

type JourneyRole = "model" | "photographer" | "sponsor" | "host";

type JourneyStep = {
  label: string;
  title: string;
  detail: string;
  href: string;
  action: string;
};

const hostJourney: JourneyStep[] = [
  { label: "01", title: "Create the event", detail: "Publish the brief, participation paths, capacity, media, pricing, and refund terms.", href: "/host/new", action: "Create event" },
  { label: "02", title: "Build the team", detail: "Invite models and photographers and manage bookings for each event.", href: "/dashboard#events", action: "Manage participants" },
  { label: "03", title: "Secure sponsors", detail: "Receive cash or in-kind offers, agree on deliverables, and approve brand assets.", href: "/dashboard#activity", action: "Open sponsor requests" },
  { label: "04", title: "Confirm agreements and payment", detail: "Track accepted agreements, attendee payments, platform fees, invoices, and receipts.", href: "/dashboard#billing", action: "Open billing" },
  { label: "05", title: "Complete and review", detail: "Close the event and leave verified collaboration reviews for participating creatives.", href: "/dashboard#reviews", action: "Review collaborators" },
];

const talentJourney: JourneyStep[] = [
  { label: "01", title: "Complete your profile", detail: "Add verification, measurements or services, portfolio work, availability, and contact preferences.", href: "/dashboard#profile", action: "Update profile" },
  { label: "02", title: "Choose an event", detail: "Browse the brief, dates, price, and refund policy, or open a host invitation.", href: "/events", action: "Explore events" },
  { label: "03", title: "Book your place", detail: "Choose an optional stay, review the total, and pay to receive your confirmation and receipt.", href: "/dashboard#activity", action: "My events" },
  { label: "04", title: "Collaborate", detail: "Use the shared conversation history to keep expectations, updates, and decisions together.", href: "/dashboard#connections", action: "Open messages" },
  { label: "05", title: "Review your collaboration", detail: "After the event, leave a review from your event history.", href: "/dashboard#activity", action: "Open event history" },
];

const sponsorJourney: JourneyStep[] = [
  { label: "01", title: "Prepare your brand profile", detail: "Add company contacts, downloadable logo files, placement preferences, dates, and brand guidelines.", href: "/dashboard#profile", action: "Update company profile" },
  { label: "02", title: "Find an opportunity", detail: "Choose an event, model, or photographer, then select the event your support is for.", href: "/sponsorships", action: "Find opportunities" },
  { label: "03", title: "Make an offer", detail: "Propose cash, product, service, or mixed support with a clear value and message.", href: "/sponsorships", action: "Pitch an event" },
  { label: "04", title: "Accept the agreement", detail: "Host and sponsor review the same deliverables, usage rights, dates, and required wording.", href: "/dashboard#activity", action: "Open partnerships" },
  { label: "05", title: "Activate and measure", detail: "Keep the event relationship, messages, payment records, and final status in one workspace.", href: "/dashboard#billing", action: "Open billing" },
];

export default function PlatformJourney({
  role,
  counts,
}: {
  role: JourneyRole;
  counts: { events: number; requests: number; connections: number };
}) {
  const isHost = role === "host";
  const steps = isHost ? hostJourney : role === "sponsor" ? sponsorJourney : talentJourney;
  const title = isHost
    ? "From concept to verified collaboration."
    : role === "sponsor"
      ? "From opportunity to activation."
      : "From profile to verified reputation.";

  return (
    <section className="platform-journey" aria-labelledby="journey-title">
      <header className="platform-journey-heading">
        <div>
          <p className="eyebrow"><span />Your next steps</p>
          <h2 id="journey-title">{title}</h2>
        </div>
        <div className="platform-journey-summary" aria-label="Current workflow summary">
          <span><strong>{counts.events}</strong> events</span>
          <span><strong>{counts.requests}</strong> open requests</span>
          <span><strong>{counts.connections}</strong> connections</span>
        </div>
      </header>
      <ol className="platform-journey-steps">
        {steps.map((step) => (
          <li key={step.label}>
            <span className="platform-journey-number">{step.label}</span>
            <div>
              <h3>{step.title}</h3>
              <p>{step.detail}</p>
              <Link href={step.href}>{step.action} →</Link>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
