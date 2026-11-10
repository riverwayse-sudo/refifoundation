import type { Metadata } from "next";
import StudioClient from "./studio-client";

export const metadata: Metadata = {
  title: "REFI Content Studio",
  robots: { index: false, follow: false },
};

export const dynamic = "force-static";

export default function StudioPage() {
  const configured = Boolean(process.env.NEXT_PUBLIC_SANITY_PROJECT_ID && process.env.NEXT_PUBLIC_SANITY_DATASET);
  if (!configured) {
    return (
      <main style={{ fontFamily: "system-ui, sans-serif", maxWidth: 760, margin: "12vh auto", padding: 24, color: "#172033" }}>
        <p style={{ color: "#1555A3", fontWeight: 700, letterSpacing: ".12em", textTransform: "uppercase" }}>REFI Foundation · Content management</p>
        <h1>Content Studio setup required</h1>
        <p>The editing workspace is scaffolded, but it needs a Sanity project before it can be used.</p>
        <ol>
          <li>Create or select the REFI Foundation project in Sanity.</li>
          <li>Set <code>NEXT_PUBLIC_SANITY_PROJECT_ID</code> and <code>NEXT_PUBLIC_SANITY_DATASET</code> in the Vercel project.</li>
          <li>Deploy again, then invite the owner as an authorised Sanity editor.</li>
        </ol>
        <p>Do not add API write tokens to public environment variables. The Studio uses Sanity account authentication for editor access.</p>
      </main>
    );
  }
  return <StudioClient />;
}
