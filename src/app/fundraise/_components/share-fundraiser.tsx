"use client";

import { Share2 } from "lucide-react";
import { useState } from "react";
import styles from "../../engagement.module.css";

/**
 * Shares a campaign page. It uses the platform share sheet when one exists and
 * the clipboard otherwise, and reports what happened. A cancelled share is not
 * reported as a failure.
 */
export function ShareFundraiser({ title, url }: { title: string; url: string }) {
  const [status, setStatus] = useState<string | null>(null);

  async function share() {
    const text = `I am raising support for REFI Foundation: ${title}`;
    try {
      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share({ title, text, url });
        setStatus("Campaign shared.");
        return;
      }
      await navigator.clipboard.writeText(`${text} ${url}`);
      setStatus("Campaign link copied - paste it to your friends.");
    } catch {
      setStatus(null);
    }
  }

  return (
    <div>
      <button type="button" className={styles.secondary} onClick={share}>
        <Share2 size={16} aria-hidden="true" /> Share this campaign
      </button>
      {status && (
        <p role="status" style={{ marginTop: 10, color: "var(--refi-ink-soft)" }}>
          {status}
        </p>
      )}
    </div>
  );
}
