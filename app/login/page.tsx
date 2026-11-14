import Link from "next/link";
import AuthShell from "@/components/auth-shell";
import LoginForm from "./login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; verification?: string }>;
}) {
  const query = await searchParams;
  const requestedNext = query.next;
  const next =
    requestedNext?.startsWith("/") && !requestedNext.startsWith("//")
      ? requestedNext
      : "/dashboard";
  return (
    <AuthShell
      eyebrow="Member access"
      title="Pick up where you left off."
      intro="Open your role-based workspace for events, invitations, messages, portfolio, and billing."
      variant="signin"
    >
      <div className="signin-card-heading">
        <span>Secure member login</span>
        <h2>Sign in to Model Escape.</h2>
        <p>Use the username or email attached to your approved account.</p>
      </div>
      <LoginForm next={next} />
      {["expired", "invalid"].includes(query.verification ?? "") && <p className="approval-pending-notice" role="alert">That verification link has expired or was already used. <Link href="/signup/check-email">Send a new verification email →</Link></p>}
      {query.verification === "pending-approval" && (
        <p className="approval-pending-notice">
          <strong>Email verified.</strong> Your account is now waiting for administrator approval.
        </p>
      )}
      <p className="signin-apply-link">
        New to the network?{" "}
        <Link className="quiet-dark-link" href="/signup">
          Apply to join →
        </Link>
      </p>
    </AuthShell>
  );
}
