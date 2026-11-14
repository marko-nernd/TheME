import AuthShell from "@/components/auth-shell";
import AccountRecoveryForm from "@/components/account-recovery-form";
export default function ForgotPasswordPage() { return <AuthShell centered eyebrow="Account help" title="Reset your password." intro="Enter the email you used to sign up. We will send a secure link to choose a new password."><AccountRecoveryForm /></AuthShell>; }
