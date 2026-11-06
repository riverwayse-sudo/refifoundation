/**
 * Converts database rows into the JSON-compatible records expected by the
 * existing public content loaders. The database slug is authoritative: it is
 * stored alongside the editor data and must survive both live reads and
 * recovery snapshots.
 */
export type CmsContentRow = {
  slug: string;
  data: unknown;
  published: boolean;
  published_at: string | null;
};

export function rowsToContentRecords(rows: CmsContentRow[]): Record<string, unknown>[] {
  return rows
    .filter((row) => row.data !== null && typeof row.data === "object" && !Array.isArray(row.data))
    .map((row) => {
      const data = row.data as Record<string, unknown>;
      return {
        ...data,
        slug: row.slug,
        published: row.published,
        publishedAt: data.publishedAt ?? row.published_at ?? undefined,
      };
    });
}
