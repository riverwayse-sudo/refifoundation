/**
 * Donation records and campaign totals.
 *
 * Storage is optional. When Supabase is configured (the same free-tier project
 * the CMS plan uses) verified donations are persisted through its REST API, so
 * no extra dependency or recurring cost is introduced. When it is not
 * configured, nothing is invented: totals report themselves as unavailable and
 * the UI must say so rather than showing a made-up figure.
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
  /** True only when a durable store accepted a new row. */
  stored: boolean;
  /** True when the reference was already recorded. */
  duplicate: boolean;
  /** True when a durable store is configured at all. */
  persistence: boolean;
  error?: string;
};

/**
 * Campaign totals.
 *
 * `available: true` with a zero total means the store was queried and there are
 * genuinely no donations. `available: false` means the figure could not be
 * established. Those two states must never be collapsed, or an unreachable
 * database would be reported to donors as "nothing raised".
 */
export type CampaignTotals =
  | { available: true; totalMinor: number; currency: string; donationCount: number; updatedAt: string }
  | { available: false; reason: "not-configured" | "unavailable" };

/** Cap on rows fetched for a total, so a large table cannot exhaust the free tier. */
const MAX_ROWS = 10_000;

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
 *
 * `ignore-duplicates` is deliberate: with `merge-duplicates` a replayed webhook
 * would overwrite the stored row and PostgREST would return it as if it were a
 * fresh insert, so a replay could both mutate the record and be reported as
 * newly stored. Ignoring duplicates makes a replay a genuine no-op.
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
        Prefer: "resolution=ignore-duplicates,return=representation",
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

    // PostgREST reports a unique-violation as 409 when the conflict cannot be
    // ignored; treat it as the duplicate it is.
    if (response.status === 409) return { stored: false, duplicate: true, persistence: true };

    if (!response.ok) {
      // A missing table is a setup gap, not a transient fault, and must not be
      // reported as a recorded donation.
      const hint = response.status === 404 || response.status === 400
        ? "The donation store is not ready. The donations table may not exist yet."
        : `The donation store rejected the donation (${response.status}).`;
      return { stored: false, duplicate: false, persistence: true, error: hint };
    }

    const rows = await response.json() as unknown[];
    // With ignore-duplicates, a replay returns 201 and an empty representation.
    return { stored: Array.isArray(rows) && rows.length > 0, duplicate: !Array.isArray(rows) || rows.length === 0, persistence: true };
  } catch {
    return { stored: false, duplicate: false, persistence: true, error: "Unable to reach the donation store." };
  }
}

/**
 * Campaign totals derived only from persisted, verified donations.
 *
 * A sum is only reported when the full set of rows was retrieved. If the store
 * holds more rows than we are willing to fetch, the total is reported as
 * unavailable rather than as a truncated, understated figure.
 */
export async function getCampaignTotals(initiative?: string): Promise<CampaignTotals> {
  const config = supabaseConfig();
  if (!config) return { available: false, reason: "not-configured" };

  const query = new URLSearchParams({
    select: "amount_minor,currency",
    currency: "eq.NGN",
    limit: String(MAX_ROWS + 1),
  });
  if (initiative) query.set("initiative", `eq.${initiative}`);

  try {
    const response = await fetch(`${config.url}/rest/v1/donations?${query.toString()}`, {
      headers: { apikey: config.key, Authorization: `Bearer ${config.key}`, accept: "application/json" },
      cache: "no-store",
    });
    if (!response.ok) return { available: false, reason: "unavailable" };

    const rows = await response.json() as { amount_minor?: number; currency?: string }[];
    if (!Array.isArray(rows)) return { available: false, reason: "unavailable" };

    // More rows than we are prepared to sum: report unavailable, never partial.
    if (rows.length > MAX_ROWS) return { available: false, reason: "unavailable" };

    const totalMinor = rows.reduce((sum, row) => sum + (typeof row.amount_minor === "number" ? row.amount_minor : 0), 0);
    // An empty table is a known zero, which is different from an unknown total.
    return { available: true, totalMinor, currency: "NGN", donationCount: rows.length, updatedAt: new Date().toISOString() };
  } catch {
    return { available: false, reason: "unavailable" };
  }
}
