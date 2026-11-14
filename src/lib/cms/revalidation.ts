import "server-only";

import { revalidatePath, revalidateTag } from "next/cache";

/**
 * Invalidate the shared public content data and all pages that render it.
 * Route handlers call this after publishing or withdrawing a public record.
 * Regeneration happens on the next request; this does not create a deployment.
 */
export function revalidateCmsContent(): void {
  revalidateTag("cms-content", { expire: 0 });
  revalidatePath("/", "layout");
  revalidatePath("/sitemap.xml");
}
