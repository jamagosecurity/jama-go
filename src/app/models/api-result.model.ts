export interface ApiResult<T> {
  succeeded: boolean;
  data: T | null;
  errors: string[];
}

/**
 * A page of results, matching PaginatedResult<T> on the API.
 *
 * dia.model.ts and technician.model.ts each declare their own copy of this
 * shape; new code should use this one so there is a single definition to keep
 * in step with the server. Folding the older two into it is a separate change.
 */
export interface PaginatedData<T> {
  items: T[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
  totalPages: number;
}

export function unwrapApiResult<T>(result: ApiResult<T>): T {
  if (!result.succeeded || result.data === null || result.data === undefined) {
    throw new Error(result.errors?.[0] ?? 'Request failed.');
  }
  return result.data;
}
