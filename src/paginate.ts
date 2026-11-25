export const MAX_PAGE_SIZE = 1000;

export interface PaginateOptions {
  /** Grants requested per page. Defaults to 100; the API allows up to 1000. */
  pageSize?: number;
}

interface Page<T> {
  meta: {
    requested_page_number: number;
    total_pages: number;
  };
  data: T[];
}

/**
 * Yields every item of a paged list, requesting pages lazily so the caller can stop early.
 * `fetchPage` receives the page number, starting at 1, and the page size to pass as `pageNumber` and `pageSize`.
 */
export async function* paginate<T>(
  fetchPage: (pageNumber: number, pageSize: number) => Promise<Page<T>>,
  { pageSize = 100 }: PaginateOptions = {},
): AsyncGenerator<T, void, undefined> {
  if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > MAX_PAGE_SIZE) {
    throw new RangeError(`pageSize must be an integer from 1 to ${MAX_PAGE_SIZE}, not ${pageSize}`);
  }
  for (let pageNumber = 1; ; pageNumber++) {
    const { meta, data } = await fetchPage(pageNumber, pageSize);
    yield* data;
    // A page past the end is empty rather than an error, so total-pages is the reliable end.
    if (data.length === 0 || pageNumber >= meta.total_pages) {
      return;
    }
  }
}

/** Drains an async iterable into an array. */
export async function collect<T>(iterable: AsyncIterable<T>): Promise<T[]> {
  const all: T[] = [];
  for await (const item of iterable) {
    all.push(item);
  }
  return all;
}
