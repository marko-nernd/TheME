import Link from "next/link";

export type GuidanceItem = {
  label: string;
  detail: string;
  href: string;
  complete: boolean;
};

export default function DashboardGuidance({
  role,
  next,
  checklist,
}: {
  role: "model" | "photographer" | "sponsor" | "host";
  next: { eyebrow: string; title: string; detail: string; href: string; action: string };
  checklist: GuidanceItem[];
}) {
  const completed = checklist.filter((item) => item.complete).length;
  const percent = Math.round((completed / Math.max(checklist.length, 1)) * 100);

  return (
    <section className="dashboard-guidance" aria-labelledby="dashboard-next-title">
      <article className="dashboard-next-action">
        <span>{next.eyebrow}</span>
        <h2 id="dashboard-next-title">{next.title}</h2>
        <p>{next.detail}</p>
        <Link className="button button-dark" href={next.href}>{next.action} →</Link>
      </article>

      <article className="dashboard-setup-checklist">
        <header>
          <div><span>Account readiness</span><strong>{completed}/{checklist.length}</strong></div>
          <div className="dashboard-progress" aria-label={`${percent}% complete`}><i style={{ width: `${percent}%` }} /></div>
        </header>
        <ul>
          {checklist.map((item) => (
            <li className={item.complete ? "is-complete" : ""} key={item.label}>
              <span aria-hidden="true">{item.complete ? "✓" : "→"}</span>
              <div><strong>{item.label}</strong><small>{item.detail}</small></div>
              <Link href={item.href}>{item.complete ? "Review" : "Complete"}</Link>
            </li>
          ))}
        </ul>
      </article>

      {role === "photographer" && (
        <div className="photographer-path-choice">
          <header><span>Choose your path</span><h3>What are you here to do today?</h3></header>
          <Link href="/events">
            <strong>Join a production</strong>
            <small>Apply as the event photographer or respond to an invitation.</small>
            <b>Browse events →</b>
          </Link>
          <Link href="/host/new">
            <strong>Host your own shoot</strong>
            <small>Create the brief, recruit models, manage sponsors, and run checkout.</small>
            <b>Create a shoot →</b>
          </Link>
        </div>
      )}
    </section>
  );
}
