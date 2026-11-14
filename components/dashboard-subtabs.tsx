"use client";

import { ReactNode, useEffect, useId, useRef, useState } from "react";

export default function DashboardSubtabs({
  label,
  items,
  defaultActive,
}: {
  label: string;
  items: Array<{ id: string; label: string; content: ReactNode }>;
  defaultActive?: string;
}) {
  const [active, setActive] = useState(defaultActive ?? items[0]?.id);
  const [pending, setPending] = useState<string | null>(null);
  const root = useRef<HTMLDivElement>(null);
  const id = useId();
  useEffect(() => {
    if (!pending) return;
    const previous = document.activeElement as HTMLElement | null;
    const dialog = root.current?.querySelector<HTMLElement>('[role="alertdialog"]');
    const buttons = dialog?.querySelectorAll<HTMLButtonElement>("button");
    buttons?.[0]?.focus();
    const keydown = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); setPending(null); }
      if (event.key === "Tab" && buttons?.length) {
        const first = buttons[0], last = buttons[buttons.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    };
    dialog?.addEventListener("keydown", keydown);
    return () => { dialog?.removeEventListener("keydown", keydown); previous?.focus(); };
  }, [pending]);
  function select(next: string) {
    if (next !== active && root.current?.querySelector('[role="tabpanel"]:not([hidden]) [data-unsaved="true"]')) { setPending(next); return; }
    setActive(next);
  }
  return (
    <div className="dashboard-subtabs" ref={root}>
      <nav aria-label={label} role="tablist">
        {items.map((item, index) => <button key={item.id} type="button" role="tab" id={`${id}-${item.id}`} aria-controls={`${id}-panel-${item.id}`} aria-selected={active === item.id} tabIndex={active === item.id ? 0 : -1} onClick={() => select(item.id)} onKeyDown={(event) => { const next = event.key === "ArrowRight" ? (index + 1) % items.length : event.key === "ArrowLeft" ? (index - 1 + items.length) % items.length : event.key === "Home" ? 0 : event.key === "End" ? items.length - 1 : -1; if (next >= 0) { event.preventDefault(); select(items[next].id); document.getElementById(`${id}-${items[next].id}`)?.focus(); } }}>{item.label}</button>)}
      </nav>
      {items.map((item) => <div role="tabpanel" aria-labelledby={`${id}-${item.id}`} id={`${id}-panel-${item.id}`} hidden={active !== item.id} key={item.id}>{item.content}</div>)}
      {pending && <div className="ux-dialog-backdrop"><section className="ux-dialog" role="alertdialog" aria-modal="true" aria-labelledby={`${id}-warning`}><h2 id={`${id}-warning`}>Save your changes?</h2><p>You have unsaved edits. Stay here to save them, or switch sections and come back to finish them later.</p><div><button className="button" type="button" onClick={() => setPending(null)}>Stay and save</button><button type="button" onClick={() => { setActive(pending); setPending(null); }}>Switch section</button></div></section></div>}
    </div>
  );
}
