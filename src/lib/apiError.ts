export interface ApiErrorInfo {
  message: string;
  code?: string;
  status?: number;
}

function str(v: unknown): string | undefined {
  return typeof v === 'string' && v ? v : undefined;
}

/**
 * Reads the useful parts of anything thrown by RTK Query, axios or fetch: a plain Error, `{ status, data }`
 * (data being a string or a backend envelope with `message` / `errorCode`), or `{ response: { data } }`.
 */
export function readApiError(err: unknown, fallback = 'Something went wrong'): ApiErrorInfo {
  const e = (err ?? {}) as Record<string, unknown>;
  const response = (e.response ?? {}) as Record<string, unknown>;
  const data = e.data ?? response.data;
  const body = (data && typeof data === 'object' ? data : {}) as Record<string, unknown>;
  const nested = (body.error && typeof body.error === 'object' ? body.error : {}) as Record<string, unknown>;
  const status = typeof e.status === 'number' ? e.status : typeof response.status === 'number' ? response.status : undefined;
  return {
    message: str(typeof data === 'string' ? data : undefined) ?? str(body.message) ?? str(nested.message) ?? str(body.error) ?? str(e.message) ?? fallback,
    code: str(body.errorCode) ?? str(body.code) ?? str(nested.code) ?? str(typeof body.error === 'string' ? body.error : undefined) ?? str(e.errorCode) ?? str(e.code),
    status,
  };
}
