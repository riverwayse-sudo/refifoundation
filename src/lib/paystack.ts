/**
 * Server-only Paystack helpers.
 *
 * Everything here runs on the server: the secret key never reaches the browser.
 * A payment is only ever treated as a donation after Paystack itself confirms it,
 * so a browser cannot turn a cancelled checkout into a confirmed gift by editing
 * the success URL.
 */

const PAYSTACK_BASE = "https://api.paystack.co";

export type VerifiedPayment = {
  ok: boolean;
  reference: string | null;
  amountMinor: number | null;
  currency: string | null;
  status: string | null;
  paidAt: string | null;
  donorEmail: string | null;
  error?: string;
};

export function paystackSecret(): string | null {
  const secret = process.env.PAYSTACK_SECRET_KEY;
  return secret && secret.trim().length > 0 ? secret : null;
}

/**
 * Confirm a transaction with Paystack. Returns ok:true only when the provider
 * reports the transaction as successful. Any other outcome (pending, failed,
 * abandoned, unknown reference, provider error) returns ok:false.
 */
export async function verifyTransaction(reference: string): Promise<VerifiedPayment> {
  const secret = paystackSecret();
  if (!secret) {
    return {
      ok: false, reference, amountMinor: null, currency: null, status: null,
      paidAt: null, donorEmail: null,
      error: "Payment verification is not configured yet.",
    };
  }

  try {
    const response = await fetch(
      `${PAYSTACK_BASE}/transaction/verify/${encodeURIComponent(reference)}`,
      { headers: { Authorization: `Bearer ${secret}`, accept: "application/json" }, cache: "no-store" },
    );
    const payload = await response.json() as {
      status?: boolean;
      data?: { status?: string; amount?: number; currency?: string; reference?: string; paid_at?: string; customer?: { email?: string } };
    };

    if (!response.ok || !payload.status || !payload.data) {
      return {
        ok: false, reference, amountMinor: null, currency: null, status: null,
        paidAt: null, donorEmail: null,
        error: "We could not verify this payment with Paystack.",
      };
    }

    const data = payload.data;
    const succeeded = data.status === "success";
    return {
      ok: succeeded,
      reference: data.reference ?? reference,
      amountMinor: typeof data.amount === "number" ? data.amount : null,
      currency: data.currency ?? null,
      status: data.status ?? null,
      paidAt: data.paid_at ?? null,
      donorEmail: data.customer?.email ?? null,
      error: succeeded ? undefined : "This payment has not been completed successfully.",
    };
  } catch {
    return {
      ok: false, reference, amountMinor: null, currency: null, status: null,
      paidAt: null, donorEmail: null,
      error: "Unable to reach Paystack to verify this payment.",
    };
  }
}

/**
 * Verify that a webhook payload genuinely came from Paystack by recomputing the
 * HMAC-SHA256 signature over the raw request body with the secret key.
 */
export async function isValidWebhookSignature(rawBody: string, signature: string | null): Promise<boolean> {
  const secret = paystackSecret();
  if (!secret || !signature) return false;
  const { createHmac, timingSafeEqual } = await import("node:crypto");
  const expected = createHmac("sha512", secret).update(rawBody).digest("hex");
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(signature, "utf8");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
