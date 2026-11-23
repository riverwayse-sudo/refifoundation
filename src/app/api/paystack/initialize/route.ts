import { NextResponse } from "next/server";
import { initializeTransaction, validateDonationAmount } from "@/lib/paystack";
import { resolveAttribution } from "@/lib/donation-attribution";

export const runtime = "nodejs";

/**
 * Start a donation.
 *
 * The amount is validated here, within server-side bounds, before Paystack is
 * called. The validated amount is echoed back in the transaction metadata so
 * verification can confirm later that what was paid is what was intended.
 */
export async function POST(request: Request) {
  let body: {
    email?: unknown;
    name?: unknown;
    amount?: unknown;
    source?: unknown;
    fundraiser?: unknown;
    game?: unknown;
    player?: unknown;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "A valid request body is required." }, { status: 400 });
  }

  const email = String(body.email ?? "").trim();
  const name = String(body.name ?? "").trim();
  const amountMinor = Number(body.amount);

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "A valid email is required." }, { status: 400 });
  }

  const amountCheck = validateDonationAmount(amountMinor);
  if (!amountCheck.ok) {
    return NextResponse.json({ error: amountCheck.error }, { status: 400 });
  }

  // Attribution is validated before the payment starts: an unknown fundraiser
  // must fail here, not after the donor has paid.
  const attribution = await resolveAttribution({
    fundraiser: body.fundraiser,
    game: body.game,
    player: body.player,
  });
  if (!attribution.ok) {
    return NextResponse.json({ error: attribution.error }, { status: 400 });
  }

  const origin = new URL(request.url).origin;
  const reference = `refi-${Date.now()}-${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`;

  const result = await initializeTransaction({
    email,
    amountMinor,
    reference,
    callbackUrl: `${origin}/donate/success`,
    metadata: {
      source: String(body.source || "donate"),
      donor_name: name || null,
      initiative: "REFI Play for Impact",
      fundraiser: attribution.value.fundraiserSlug,
      game: attribution.value.game,
      player: attribution.value.playerName,
    },
  });

  if (!result.ok) {
    const notConfigured = result.error === "Payments are not configured yet.";
    return NextResponse.json({ error: result.error }, { status: notConfigured ? 503 : 502 });
  }

  return NextResponse.json({ authorizationUrl: result.authorizationUrl, reference: result.reference });
}
