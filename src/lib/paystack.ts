/**
 * Server-only Paystack helpers.
 *
 * Everything here runs on the server: the secret key never reaches the browser.
 * A payment is only ever treated as a donation after Paystack itself confirms
 * it, so a browser cannot turn a cancelled checkout into a confirmed gift by
 * editing the success URL.
 */

// Overridable so verification can run against a mock Paystack during testing,
// which avoids creating real transactions or spending live API calls.
const PAYSTACK_BASE = process.env.PAYSTACK_API_BASE?.trim() || "https://api.paystack.co";

/** Paystack amounts are in the minor unit (kobo). */
export const MIN_DONATION_MINOR = 10_000; // ₦100
/**
 * Upper bound on a single donation. Paystack will happily accept a value the
 * browser sends, so without a ceiling a typo or a crafted request could attempt
 * a charge far larger than intended.
 */
export const MAX_DONATION_MINOR = 50_000_000; // ₦500,000

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

export type InitializeResult = {
  ok: boolean;
  authorizationUrl: string | null;
  reference: string | null;
  error?: string;
};

export function paystackSecret(): string | null {
  const secret = process.env.PAYSTACK_SECRET_KEY;
  return secret && secret.trim().length > 0 ? secret : null;
}

/** Clamp a caller-supplied amount into the allowed range, or reject it. */
export function validateDonationAmount(amountMinor: number): { ok: true } | { ok: false; error: string } {
  if (!Number.isInteger(amountMinor)) return { ok: false, error: "Donation amount must be a whole number of kobo." };
  if (amountMinor < MIN_DONATION_MINOR) return { ok: false, error: "Donation amount must be at least ₦100." };
  if (amountMinor > MAX_DONATION_MINOR) return { ok: false, error: "Donation amount exceeds the maximum accepted in a single payment." };
  return { ok: true };
}

/**
 * Start a transaction. The amount is decided here and echoed back in the
 * transaction metadata, so the server can later check that what was paid is
 * what was intended rather than trusting whatever the browser sends.
 */
export async function initializeTransaction(input: {
  email: string;
  amountMinor: number;
  reference: string;
  callbackUrl: string;
  metadata?: Record<string, unknown>;
}): Promise<InitializeResult> {
  const secret = paystackSecret();
  if (!secret) return { ok: false, authorizationUrl: null, reference: null, error: "Payments are not configured yet." };

  try {
    const response = await fetch(`${PAYSTACK_BASE}/transaction/initialize`, {
      method: "POST",
      headers: { Authorization: `Bearer ${secret}`, "Content-Type": "application/json" },
      cache: "no-store",
      body: JSON.stringify({
        email: input.email,
        amount: String(input.amountMinor),
        currency: "NGN",
        reference: input.reference,
        callback_url: input.callbackUrl,
        metadata: { ...input.metadata, expected_amount_minor: input.amountMinor, expected_currency: "NGN" },
      }),
    });
    const payload = await response.json() as { status?: boolean; message?: string; data?: { authorization_url?: string; reference?: string } };
    if (!response.ok || !payload.status || !payload.data?.authorization_url) {
      return { ok: false, authorizationUrl: null, reference: null, error: payload.message || "Paystack could not start the payment." };
    }
    return { ok: true, authorizationUrl: payload.data.authorization_url, reference: payload.data.reference ?? input.reference };
  } catch {
    return { ok: false, authorizationUrl: null, reference: null, error: "Unable to reach Paystack to start the payment." };
  }
}

/**
 * Confirm a transaction with Paystack. Returns ok:true only when the provider
 * reports the transaction as successful AND, when expectations are supplied,
 * the amount and currency match what was intended. Any other outcome (pending,
 * failed, abandoned, unknown reference, wrong amount, provider error) returns
 * ok:false, so a mismatched payment can never be recorded as a donation.
 */
export async function verifyTransaction(
  reference: string,
  expected?: { amountMinor?: number | null; currency?: string | null },
): Promise<VerifiedPayment> {
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
      data?: {
        status?: string; amount?: number; currency?: string; reference?: string; paid_at?: string;
        customer?: { email?: string };
        metadata?: { expected_amount_minor?: number; expected_currency?: string };
      };
    };

    if (!response.ok || !payload.status || !payload.data) {
      return {
        ok: false, reference, amountMinor: null, currency: null, status: null,
        paidAt: null, donorEmail: null,
        error: "We could not verify this payment with Paystack.",
      };
    }

    const data = payload.data;
    const amountMinor = typeof data.amount === "number" ? data.amount : null;
    const currency = data.currency ?? null;

    if (data.status !== "success") {
      return {
        ok: false, reference: data.reference ?? reference, amountMinor, currency,
        status: data.status ?? null, paidAt: data.paid_at ?? null, donorEmail: data.customer?.email ?? null,
        error: "This payment has not been completed successfully.",
      };
    }

    // Compare against what the server intended. The expectation comes from the
    // transaction metadata we set at initialize time, or from an explicit
    // caller-supplied expectation. A mismatch is a failure, not a warning.
    const expectedAmount = expected?.amountMinor ?? data.metadata?.expected_amount_minor ?? null;
    const expectedCurrency = expected?.currency ?? data.metadata?.expected_currency ?? null;

    if (typeof expectedAmount === "number" && amountMinor !== expectedAmount) {
      return {
        ok: false, reference: data.reference ?? reference, amountMinor, currency,
        status: data.status ?? null, paidAt: data.paid_at ?? null, donorEmail: data.customer?.email ?? null,
        error: "The amount paid does not match the expected donation amount.",
      };
    }
    if (expectedCurrency && currency && currency !== expectedCurrency) {
      return {
        ok: false, reference: data.reference ?? reference, amountMinor, currency,
        status: data.status ?? null, paidAt: data.paid_at ?? null, donorEmail: data.customer?.email ?? null,
        error: "The payment currency does not match the expected currency.",
      };
    }
    if (amountMinor === null || amountMinor <= 0) {
      return {
        ok: false, reference: data.reference ?? reference, amountMinor: null, currency,
        status: data.status ?? null, paidAt: data.paid_at ?? null, donorEmail: data.customer?.email ?? null,
        error: "The payment amount could not be confirmed.",
      };
    }

    return {
      ok: true,
      reference: data.reference ?? reference,
      amountMinor,
      currency,
      status: data.status ?? null,
      paidAt: data.paid_at ?? null,
      donorEmail: data.customer?.email ?? null,
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
 * HMAC-SHA512 signature over the raw request body with the secret key.
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
