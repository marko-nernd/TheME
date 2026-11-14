import Link from "next/link";
import AuthShell from "@/components/auth-shell";
import AccountRecoveryForm from "@/components/account-recovery-form";

export default async function CheckEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  const { email } = await searchParams;
  return (
    <AuthShell
      eyebrow="One last step"
      title="Check your email."
      intro={`We sent a verification link${email ? ` to ${email}` : ""}. After verification, an administrator will review your account before dashboard access is enabled.`}
    >
      <div className="check-email-card">
        <span className="email-mark">✉</span>
        <h2>Verification sent</h2>
        <p>
          For this local version, open the private test inbox. Select the newest
          Model Escape message, then choose “Verify email.” You can sign in after
          the administrator approves the account.
        </p>
        <a className="button" href="http://localhost:8025" target="_blank" rel="noreferrer">
          Open local inbox ↗
        </a>
        <Link className="quiet-dark-link" href="/signup">Use another email →</Link>
        <details className="recovery-resend"><summary>Didn’t receive an email?</summary><AccountRecoveryForm action="verification" initialEmail={email ?? ""} /></details>
      </div>
    </AuthShell>
  );
}
