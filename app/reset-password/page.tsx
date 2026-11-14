import AuthShell from "@/components/auth-shell";
import AccountRecoveryForm from "@/components/account-recovery-form";
export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) { const { token } = await searchParams; return <AuthShell centered eyebrow="Account help" title="Choose a new password." intro="Your reset link can be used once and expires after one hour."><AccountRecoveryForm action="reset" token={token ?? ""} /></AuthShell>; }
