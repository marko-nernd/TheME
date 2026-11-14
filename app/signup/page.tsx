import Link from "next/link";
import AuthShell from "@/components/auth-shell";
import SignupForm from "./signup-form";

export default function SignupPage() {
  return (
    <AuthShell
      eyebrow="Apply to join"
      title="Create your Model Escape account."
      intro="Four short steps. Your progress stays in place while you move between them."
      centered
    >
      <SignupForm />
      <p className="signup-signin-link">
        Already a member?{" "}
        <Link className="quiet-dark-link" href="/login">
          Sign in →
        </Link>
      </p>
    </AuthShell>
  );
}
