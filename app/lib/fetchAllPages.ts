// Supabase/PostgREST caps every response at 1000 rows (server-side `max-rows`).
// Asking for a bigger .limit() does NOT raise it — the extra rows are silently
// dropped, so a filter matching 1265 orders quietly returns 1000 and looks fine.
// This helper pages through with .range() until a short page comes back.

const PAGE_SIZE = 1000;

// Safety valve so a misbehaving query can never loop forever.
const MAX_PAGES = 100;

type PageResult<T> = { data: T[] | null; error: { message: string } | null };

/**
 * Runs `makeQuery` repeatedly with advancing .range() windows and returns every row.
 *
 * The query MUST have a deterministic sort (an .order() on the builder, or an
 * ORDER BY inside the RPC), otherwise Postgres may repeat or skip rows across pages.
 */
export async function fetchAllPages<T>(
  makeQuery: (from: number, to: number) => PromiseLike<PageResult<T>>
): Promise<T[]> {
  const all: T[] = [];

  for (let page = 0; page < MAX_PAGES; page++) {
    const offset = page * PAGE_SIZE;
    const { data, error } = await makeQuery(offset, offset + PAGE_SIZE - 1);

    if (error) throw new Error(error.message);

    const rows = data ?? [];
    all.push(...rows);

    // A short page means we've reached the end.
    if (rows.length < PAGE_SIZE) return all;
  }

  return all;
}
