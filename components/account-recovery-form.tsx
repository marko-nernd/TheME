"use client";
import Link from "next/link";
import { type FormEvent, useState } from "react";

export default function AccountRecoveryForm({ action = "password", initialEmail = "", token = "" }: { action?: "password" | "verification" | "reset"; initialEmail?: string; token?: string }) {
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(event.currentTarget));
    if (action === "reset" && values.password !== values.confirmPassword) { setError("Your passwords do not match."); return; }
    setSaving(true); setError("");
    try {
      const response = await fetch("/api/auth/recovery", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action, email: values.email, password: values.password, token }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Please try again.");
      setDone(true);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Connection lost. Please try again."); }
    finally { setSaving(false); }
  }
  if (done) return <div className="recovery-success" role="status"><span>✓</span><h2>{action === "reset" ? "Password updated." : "Check your email."}</h2><p>{action === "reset" ? "Sign in with your new password. Your account approval status stays the same." : "If an eligible account exists, we have sent a link. Check spam too. Allow a minute before requesting another email."}</p><Link className="button" href="/login">Return to sign in →</Link></div>;
  return <form className="styled-form" onSubmit={submit}>{action === "reset" ? <><label>New password<input name="password" type="password" autoComplete="new-password" minLength={10} maxLength={256} required /><small>At least 10 characters.</small></label><label>Confirm new password<input name="confirmPassword" type="password" autoComplete="new-password" minLength={10} maxLength={256} required /></label></> : <label>Email address<input name="email" type="email" autoComplete="email" defaultValue={initialEmail} required /></label>}{error && <p className="form-error" role="alert">{error}</p>}<button className="button" type="submit" disabled={saving}>{saving ? "Please wait…" : action === "reset" ? "Save new password →" : action === "verification" ? "Resend verification email →" : "Send reset link →"}</button>{action === "reset" && <Link href="/forgot-password">Request a new reset link</Link>}</form>;
}
