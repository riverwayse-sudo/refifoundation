import type { Metadata } from "next";
import { requireAdmin } from "@/lib/cms/auth";
import { isContentBackendConfigured, isWriteBackendConfigured } from "@/lib/cms/config";
import { CmsDashboard } from "./dashboard";
import { SignInForm } from "./sign-in-form";

export const metadata: Metadata = {
  title: "Content manager",
  // The dashboard must never be indexed.
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  // The dashboard itself is not secret, but it must not be reachable without a
  // verified administrator session.
  const admin = await requireAdmin();

  if (!admin) {
    return (
      <main className="refi-container refi-admin-shell">
        <SignInForm
          // Surfaced so the client sees a clear setup message rather than a
          // sign-in form that cannot possibly work.
          backendReady={isContentBackendConfigured && isWriteBackendConfigured}
        />
      </main>
    );
  }

  return (
    <main className="refi-container refi-admin-shell">
      <CmsDashboard email={admin.email} />
    </main>
  );
}
