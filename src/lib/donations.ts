/**
 * Donation records and campaign totals.
 *
 * Storage is optional. When Supabase is configured (the same free-tier project
 * the CMS plan uses) verified donations are persisted through its REST API, so
 * no extra dependency or recurring cost is introduced. When it is not
 * configured, nothing is invented: `getCampaignTotals()` returns null and the
 * UI must say the figures are unavailable rather than showing a made-up total.
 *
 * A donation row is keyed by the Paystack reference. That single constraint is
 * what makes webhook delivery idempotent: Paystack retries webhooks, and a
 * replay of the same reference must not be counted twice.
 */

export type DonationRecord = {
  reference: string;
  amountMinor: number;
  currency: string;
  donorEmail: string | null;
  donorName: string | null;
  initiative: string | null;
  paidAt: string | null;
};

export type RecordResult = {
  stored: boolean;
  duplicate: boolean;
  persistence: boolean;
  error?: string;
};

export type CampaignTotals = {
  currency: string;
  totalMinor: number;
  donationCount: number;
  updatedAt: string;
} | null;

function supabaseConfig(): { url: string; key: string } | null {
  const url = process.env.SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) return null;
  return { url: url.replace(/\/$/, ""), key };
}

export function persistenceConfigured(): boolean {
  return supabaseConfig() !== null;
}

/**
 * In-process guard used when no durable store is configured. It stops a
 * duplicate webhook from being processed twice inside the same server instance,
 * but it is not durable across restarts or instances, and it is reported as
 * such rather than passed off as persistence.
 */
const seenInProcess = new Set<string>();

/**
 * Persist a verified donation. Returns duplicate:true when the reference has
 * already been recorded, so callers can acknowledge the webhook without
 * counting the donation again.
 */
export async function recordDonation(record: DonationRecord): Promise<RecordResult> {
  const config = supabaseConfig();

  if (!config) {
    const duplicate = seenInProcess.has(record.reference);
    if (!duplicate) seenInProcess.add(record.reference);
    return { stored: false, duplicate, persistence: false };
  }

  try {
    const response = await fetch(`${config.url}/rest/v1/donations`, {
      method: "POST",
      headers: {
        apikey: config.key,
        Authorization: `Bearer ${config.key}`,
        "Content-Type": "application/json",
        // merge-duplicates makes a replayed webhook a no-op instead of an error,
        // and returning=representation lets us tell a fresh insert from a replay.
        Prefer: "resolution=merge-duplicates,return=representation",
      },
      body: JSON.stringify([{
        reference: record.reference,
        amount_minor: record.amountMinor,
        currency: record.currency,
        donor_email: record.donorEmail,
        donor_name: record.donorName,
        initiative: record.initiative,
        paid_at: record.paidAt,
      }]),
      cache: "no-store",
    });

    if (response.status === 409) return { stored: false, duplicate: true, persistence: true };
    if (!response.ok) {
      return { stored: false, duplicate: false, persistence: true, error: `Store rejected the donation (${response.status}).` };
    }

    const rows = await response.json() as unknown[];
    return { stored: Array.isArray(rows) && rows.length > 0, duplicate: !Array.isArray(rows) || rows.length === 0, persistence: true };
  } catch {
    return { stored: false, duplicate: false, persistence: true, error: "Unable to reach the donation store." };
  }
}

/**
 * Campaign totals derived only from persisted, verified donations. Returns null
 * when there is no durable store, so the caller cannot render a total that was
 * not actually counted.
 */
export async function getCampaignTotals(initiative?: string): Promise<CampaignTotals> {
  const config = supabaseConfig();
  if (!config) return null;

  const query = new URLSearchParams({ select: "amount_minor,currency", limit: "10000" });
  if (initiative) query.set("initiative", `eq.${initiative}`);

  try {
    const response = await fetch(`${config.url}/rest/v1/donations?${query.toString()}`, {
      headers: { apikey: config.key, Authorization: `Bearer ${config.key}`, accept: "application/json" },
      next: { revalidate: 60 },
    });
    if (!response.ok) return null;
    const rows = await response.json() as { amount_minor?: number; currency?: string }[];
    if (!Array.isArray(rows) || rows.length === 0) return null;
    const currency = rows[0]?.currency || "NGN";
    const totalMinor = rows.reduce((sum, row) => sum + (typeof row.amount_minor === "number" ? row.amount_minor : 0), 0);
    return { currency, totalMinor, donationCount: rows.length, updatedAt: new Date().toISOString() };
  } catch {
    return null;
  }
}
