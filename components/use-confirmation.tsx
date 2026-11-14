"use client";
import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";

type Options = { title: string; message: string; confirmLabel?: string };
export function useConfirmation() {
  const [pending, setPending] = useState<Options | null>(null);
  const resolve = useRef<((confirmed: boolean) => void) | null>(null);
  const dialog = useRef<HTMLElement>(null);
  const id = useId();
  function finish(confirmed: boolean) { resolve.current?.(confirmed); resolve.current = null; setPending(null); }
  function ask(options: Options) {
    resolve.current?.(false);
    setPending(options);
    return new Promise<boolean>((done) => { resolve.current = done; });
  }
  useEffect(() => {
    if (!pending) return;
    const previous = document.activeElement as HTMLElement | null;
    const buttons = dialog.current?.querySelectorAll<HTMLButtonElement>("button");
    buttons?.[0]?.focus();
    const keydown = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); resolve.current?.(false); resolve.current = null; setPending(null); }
      if (event.key === "Tab" && buttons?.length) {
        const first = buttons[0], last = buttons[buttons.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener("keydown", keydown);
    return () => { document.removeEventListener("keydown", keydown); previous?.focus(); };
  }, [pending]);
  useEffect(() => () => { resolve.current?.(false); }, []);
  const confirmationDialog = pending ? createPortal(<div className="ux-dialog-backdrop"><section ref={dialog} className="ux-dialog" role="alertdialog" aria-modal="true" aria-labelledby={`${id}-title`} aria-describedby={`${id}-description`}><h2 id={`${id}-title`}>{pending.title}</h2><p id={`${id}-description`}>{pending.message}</p><div><button type="button" onClick={() => finish(false)}>Keep editing</button><button className="button" type="button" onClick={() => finish(true)}>{pending.confirmLabel ?? "Discard changes"}</button></div></section></div>, document.body) : null;
  return { ask, confirmationDialog };
}
