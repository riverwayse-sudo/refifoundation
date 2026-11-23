/**
 * Attribution for a donation: which campaign, which game, which player.
 *
 * The browser may ask for attribution when a payment starts, so the values are
 * validated before they are written into the transaction metadata. Paystack then
 * stores that metadata, and the webhook reads it back from the verified
 * transaction - so the payer cannot change the campaign after checkout opens.
 *
 * A missing or unusable value is dropped, never replaced with a guess: an
 * unattributed gift must stay unattributed rather than inflate a campaign.
 */

import { GAME_SLUGS } from "./games/catalog";
import { isPrivateOrLinky, sanitiseDisplayName } from "./games/scores";
import { activeFundraiserExists, SLUG_PATTERN } from "./fundraisers";

export type Attribution = {
  fundraiserSlug: string | null;
  game: string | null;
  playerName: string | null;
};

export type AttributionResult =
  | { ok: true; value: Attribution }
  | { ok: false; error: string };

function clean(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  const text = String(value).trim();
  return text === "" ? null : text;
}

/** Validate attribution supplied when a payment starts. */
export async function resolveAttribution(input: {
  fundraiser?: unknown;
  game?: unknown;
  player?: unknown;
}): Promise<AttributionResult> {
  let fundraiserSlug: string | null = null;
  const requestedFundraiser = clean(input.fundraiser);
  if (requestedFundraiser) {
    if (!SLUG_PATTERN.test(requestedFundraiser)) {
      return { ok: false, error: "The fundraiser address is not valid." };
    }
    if (!(await activeFundraiserExists(requestedFundraiser))) {
      return { ok: false, error: "That fundraiser is not available for donations." };
    }
    fundraiserSlug = requestedFundraiser;
  }

  let game: string | null = null;
  const requestedGame = clean(input.game);
  if (requestedGame) {
    if (!(GAME_SLUGS as string[]).includes(requestedGame)) {
      return { ok: false, error: "Unknown game identifier." };
    }
    game = requestedGame;
  }

  return { ok: true, value: { fundraiserSlug, game, playerName: sanitisePlayer(input.player) } };
}

function sanitisePlayer(value: unknown): string | null {
  const raw = clean(value);
  if (!raw || isPrivateOrLinky(raw)) return null;
  const name = sanitiseDisplayName(raw);
  return name.length >= 2 ? name : null;
}

/**
 * Read attribution back from verified transaction metadata. The metadata was
 * written by this server at initialize time, so the values are still sanitised
 * here rather than trusted, and an invalid value is dropped.
 */
export function attributionFromMetadata(metadata: Record<string, unknown> | null | undefined): Attribution {
  if (!metadata) return { fundraiserSlug: null, game: null, playerName: null };

  const fundraiser = clean(metadata.fundraiser);
  const game = clean(metadata.game);

  return {
    fundraiserSlug: fundraiser && SLUG_PATTERN.test(fundraiser) ? fundraiser : null,
    game: game && (GAME_SLUGS as string[]).includes(game) ? game : null,
    playerName: sanitisePlayer(metadata.player),
  };
}
