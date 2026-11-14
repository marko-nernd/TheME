"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginForm({ next = "/dashboard" }: { next?: string }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [needsVerification, setNeedsVerification] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    const values = Object.fromEntries(new FormData(event.currentTarget));
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(values),
      });
      const data = await response.json();
      if (data.code === "approval_pending") { router.push("/account/pending"); return; }
      setNeedsVerification(data.code === "verification_required");
      if (!response.ok) throw new Error(data.error ?? "Could not sign in.");
      router.push(next);
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not sign in.");
      setSaving(false);
    }
  }

  return (
    <form className="styled-form signin-form" onSubmit={submit}>
      <label>Username or email<input name="credential" type="text" autoComplete="username" placeholder="name@example.com" required /></label>
      <label>Password<input name="password" type="password" autoComplete="current-password" placeholder="Enter your password" required /></label>
      <Link className="account-help-link" href="/forgot-password">Forgot password?</Link>
      {needsVerification && <Link className="account-help-link" href="/signup/check-email">Resend your verification email →</Link>}
      {error && <p className="form-error" role="alert">{error}</p>}
      <button className="button" type="submit" disabled={saving}>
        {saving ? "Signing you in…" : next === "/dashboard" ? "Sign in to dashboard →" : "Sign in and continue →"}
      </button>
    </form>
  );
}
