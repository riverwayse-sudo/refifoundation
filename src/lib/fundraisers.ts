/**
 * Play for Impact campaigns.
 *
 * A fundraiser is a small public record: a title, the organiser's display name,
 * an optional story, an optional goal and an optional game. Donations attribute
 * to it by slug, so a campaign total is a sum of confirmed Paystack payments -
 * never an editorial figure.
 *
 * Reads and writes run on the server with the service role. The public pages
 * receive only the fields declared here, so no donor detail reaches a browser.
 */

import { serviceRequest } from "./cms/supabase";
import { GAME_SLUGS } from "./games/catalog";
import { isPrivateOrLinky, sanitiseDisplayName } from "./games/scores";

export const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;
export const TITLE_MIN = 3;
export const TITLE_MAX = 120;
export const STORY_MAX = 2_000;
export const ORGANISER_MIN = 2;
export const ORGANISER_MAX = 40;
/** Minimum goal, in kobo. Matches the minimum donation. */
export const TARGET_MIN_MINOR = 10_000;
export const TARGET_MAX_MINOR = 50_000_000;
export const LIST_LIMIT = 24;

export type FundraiserInput = {
  title: string;
  organiserName: string;
  story: string | null;
  game: string | null;
  targetMinor: number | null;
  slug: string;
};

export type Validation = { ok: true; value: FundraiserInput } | { ok: false; errors: string[] };

export type Fundraiser = {
  slug: string;
  title: string;
  organiserName: string;
  story: string | null;
  game: string | null;
  targetMinor: number | null;
  totalMinor: number;
  donationCount: number;
  createdAt: string;
};

export type FundraiserList =
  | { available: true; items: Fundraiser[] }
  | { available: false; reason: "not-configured" | "unavailable" };

export type CreateResult =
  | { ok: true; fundraiser: Fundraiser }
  | { ok: false; status: number; error: string };

function configured(): boolean {
  return Boolean(process.env.SUPABASE_URL?.trim() && process.env.SUPABASE_SERVICE_ROLE_KEY?.trim());
}

/** A short, readable slug with a random suffix so two campaigns cannot collide or be squatted. */
export function buildSlug(title: string, random: () => number = Math.random): string {
  const base = title
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9\s-]/g, " ")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
  const suffix = Math.floor(random() * 36 ** 4).toString(36).padStart(4, "0");
  const slug = `${base || "campaign"}-${suffix}`.slice(0, 60).replace(/-+$/, "");
  return SLUG_PATTERN.test(slug) ? slug : `campaign-${suffix}`;
}

/**
 * Validate a creation request. Every rejection carries a reason, and the
 * sanitised values - not the raw input - are what get stored.
 */
export function validateFundraiser(payload: unknown, random: () => number = Math.random): Validation {
  const errors: string[] = [];
  if (typeof payload !== "object" || payload === null) {
    return { ok: false, errors: ["A JSON object body is required."] };
  }
  const body = payload as Record<string, unknown>;

  const title = String(body.title ?? "").replace(/\s+/g, " ").trim();
  if (title.length < TITLE_MIN || title.length > TITLE_MAX) {
    errors.push(`A campaign title of ${TITLE_MIN} to ${TITLE_MAX} characters is required.`);
  }

  const rawOrganiser = String(body.organiserName ?? "");
  const organiser = validateName(rawOrganiser);
  if (!organiser.ok) errors.push(organiser.error);

  let story: string | null = null;
  if (body.story !== undefined && body.story !== null && String(body.story).trim() !== "") {
    const text = String(body.story).trim();
    if (text.length > STORY_MAX) errors.push(`The story must be ${STORY_MAX} characters or fewer.`);
    else story = text;
  }

  let game: string | null = null;
  if (body.game !== undefined && body.game !== null && String(body.game).trim() !== "") {
    const slug = String(body.game).trim();
    if (!(GAME_SLUGS as string[]).includes(slug)) errors.push("Choose one of the published games, or leave the game empty.");
    else game = slug;
  }

  let targetMinor: number | null = null;
  if (body.targetMinor !== undefined && body.targetMinor !== null && String(body.targetMinor).trim() !== "") {
    const value = Number(body.targetMinor);
    if (!Number.isSafeInteger(value) || value < TARGET_MIN_MINOR || value > TARGET_MAX_MINOR) {
      errors.push("A campaign goal must be a whole number of kobo between ₦100 and ₦500,000, or left empty.");
    } else {
      targetMinor = value;
    }
  }

  if (errors.length > 0) return { ok: false, errors };

  return {
    ok: true,
    value: {
      title,
      organiserName: (organiser as { ok: true; value: string }).value,
      story,
      game,
      targetMinor,
      slug: buildSlug(title, random),
    },
  };
}

function validateName(raw: string): { ok: true; value: string } | { ok: false; error: string } {
  if (isPrivateOrLinky(raw)) {
    return { ok: false, error: "The organiser name cannot contain an email address or a link." };
  }
  const value = sanitiseDisplayName(raw);
  if (value.length < ORGANISER_MIN) {
    return { ok: false, error: `An organiser name of at least ${ORGANISER_MIN} characters is required.` };
  }
  if (value.length > ORGANISER_MAX) {
    return { ok: false, error: `The organiser name must be ${ORGANISER_MAX} characters or fewer.` };
  }
  return { ok: true, value };
}

type TotalRow = {
  slug?: unknown;
  title?: unknown;
  organiser_name?: unknown;
  game?: unknown;
  target_minor?: unknown;
  total_minor?: unknown;
  donation_count?: unknown;
  created_at?: unknown;
};

function toFundraiser(row: TotalRow): Fundraiser | null {
  if (typeof row.slug !== "string" || !SLUG_PATTERN.test(row.slug)) return null;
  if (typeof row.title !== "string" || typeof row.organiser_name !== "string") return null;
  return {
    slug: row.slug,
    title: row.title,
    organiserName: row.organiser_name,
    story: null,
    game: typeof row.game === "string" ? row.game : null,
    targetMinor: typeof row.target_minor === "number" ? row.target_minor : null,
    totalMinor: typeof row.total_minor === "number" ? row.total_minor : 0,
    donationCount: typeof row.donation_count === "number" ? row.donation_count : 0,
    createdAt: typeof row.created_at === "string" ? row.created_at : "",
  };
}

/** Active campaigns, newest first, with their confirmed totals. */
export async function listFundraisers(limit: number = LIST_LIMIT): Promise<FundraiserList> {
  if (!configured()) return { available: false, reason: "not-configured" };

  const query = new URLSearchParams({
    select: "*",
    status: "eq.active",
    order: "created_at.desc",
    limit: String(limit),
  });
  const result = await serviceRequest<TotalRow[]>(`fundraiser_totals?${query.toString()}`);
  if (!result.ok || !Array.isArray(result.data)) return { available: false, reason: "unavailable" };

  return { available: true, items: result.data.map(toFundraiser).filter((item): item is Fundraiser => item !== null) };
}

/** The most raised campaigns, for the fundraising leaderboard. */
export async function listTopFundraisers(limit: number = 5): Promise<FundraiserList> {
  if (!configured()) return { available: false, reason: "not-configured" };

  const query = new URLSearchParams({
    select: "*",
    status: "eq.active",
    order: "total_minor.desc,created_at.asc",
    limit: String(limit),
  });
  const result = await serviceRequest<TotalRow[]>(`fundraiser_totals?${query.toString()}`);
  if (!result.ok || !Array.isArray(result.data)) return { available: false, reason: "unavailable" };

  return { available: true, items: result.data.map(toFundraiser).filter((item): item is Fundraiser => item !== null) };
}

/** One campaign by slug, including its story. Hidden campaigns are not returned. */
export async function getFundraiser(slug: string): Promise<
  { available: true; fundraiser: Fundraiser } | { available: false; reason: "not-configured" | "unavailable" | "missing" }
> {
  if (!SLUG_PATTERN.test(slug)) return { available: false, reason: "missing" };
  if (!configured()) return { available: false, reason: "not-configured" };

  const [totals, detail] = await Promise.all([
    serviceRequest<TotalRow[]>(`fundraiser_totals?select=*&slug=eq.${encodeURIComponent(slug)}&status=eq.active&limit=1`),
    serviceRequest<{ story?: unknown }[]>(`fundraisers?select=story&slug=eq.${encodeURIComponent(slug)}&status=eq.active&limit=1`),
  ]);

  if (!totals.ok) return { available: false, reason: "unavailable" };
  const row = Array.isArray(totals.data) ? totals.data[0] : null;
  if (!row) return { available: false, reason: "missing" };

  const fundraiser = toFundraiser(row);
  if (!fundraiser) return { available: false, reason: "missing" };
  const storyRow = detail.ok && Array.isArray(detail.data) ? detail.data[0] : null;
  fundraiser.story = typeof storyRow?.story === "string" ? storyRow.story : null;
  return { available: true, fundraiser };
}

export async function createFundraiser(input: FundraiserInput): Promise<CreateResult> {
  if (!configured()) {
    return { ok: false, status: 503, error: "Campaign storage is not configured on this deployment yet." };
  }

  const result = await serviceRequest<TotalRow[]>("fundraisers", {
    method: "POST",
    prefer: "return=representation",
    body: [{
      slug: input.slug,
      title: input.title,
      organiser_name: input.organiserName,
      story: input.story,
      game: input.game,
      target_minor: input.targetMinor,
    }],
  });

  if (!result.ok) {
    const conflict = result.status === 409;
    return {
      ok: false,
      status: conflict ? 409 : 503,
      error: conflict
        ? "That campaign address is already taken. Try a different title."
        : "The campaign could not be saved. Please try again shortly.",
    };
  }

  return {
    ok: true,
    fundraiser: {
      slug: input.slug,
      title: input.title,
      organiserName: input.organiserName,
      story: input.story,
      game: input.game,
      targetMinor: input.targetMinor,
      totalMinor: 0,
      donationCount: 0,
      createdAt: new Date().toISOString(),
    },
  };
}

/** True when a slug names an active campaign, used to vet donation attribution. */
export async function activeFundraiserExists(slug: string): Promise<boolean> {
  if (!SLUG_PATTERN.test(slug) || !configured()) return false;
  const result = await serviceRequest<{ slug?: unknown }[]>(
    `fundraisers?select=slug&slug=eq.${encodeURIComponent(slug)}&status=eq.active&limit=1`,
  );
  return result.ok && Array.isArray(result.data) && result.data.length === 1;
}
