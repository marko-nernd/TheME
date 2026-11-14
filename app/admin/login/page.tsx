import { redirect } from "next/navigation";
import { getCurrentAdmin } from "@/lib/admin-auth";
import AdminLoginForm from "./admin-login-form";

export const dynamic = "force-dynamic";

export default async function AdminLoginPage() {
  if (await getCurrentAdmin()) redirect("/admin");
  return (
    <main className="admin-login-page">
      <section className="admin-login-card">
        <p className="astryx-kicker">RESTRICTED OPERATIONS</p>
        <h1>Admin access.</h1>
        <p>This authentication surface is intentionally absent from public navigation.</p>
        <AdminLoginForm />
        <small>Local development environment</small>
      </section>
    </main>
  );
}
