import { Middleware } from '../generated/typescript-fetch';

export interface ArcDataPortalApiErrorDetails {
  message: string;
  method: string;
  url: string;
  status?: number;
  body?: unknown;
  code?: string;
  cause?: unknown;
}

/** Thrown for every failed request made through `createArcDataPortalClient`: a non-2xx response, or a request that never reached the API. */
export class ArcDataPortalApiError extends Error {
  override name = 'ArcDataPortalApiError';
  readonly method: string;
  readonly url: string;
  /** Set when the API answered with a non-2xx status. */
  readonly status?: number;
  /** The parsed JSON:API error document, or the text body when it is not JSON. */
  readonly body?: unknown;
  /** Set for network failures, for example `ECONNREFUSED`. */
  readonly code?: string;

  constructor({ message, method, url, status, body, code, cause }: ArcDataPortalApiErrorDetails) {
    super(message, { cause });
    this.method = method;
    this.url = url;
    this.status = status;
    this.body = body;
    this.code = code;
  }
}

async function readBody(response: Response): Promise<unknown> {
  const text = await response.text().catch(() => '');
  if (!text) {
    return undefined;
  }
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function errorDetail(body: unknown): string | undefined {
  const errors = (body as { errors?: { detail?: unknown }[] } | undefined)?.errors;
  const detail = Array.isArray(errors) ? errors[0]?.detail : undefined;
  return typeof detail === 'string' && detail ? detail : undefined;
}

export const arcDataPortalErrorMiddleware: Middleware = {
  async post({ url, init, response }) {
    if (response.ok) {
      return undefined;
    }
    const body = await readBody(response);
    const detail = errorDetail(body);
    throw new ArcDataPortalApiError({
      message: `Request failed with status code ${response.status}${detail ? `: ${detail}` : ''}`,
      method: init.method ?? 'GET',
      url,
      status: response.status,
      body,
    });
  },
  async onError({ url, init, error }) {
    // fetch reports the system error one level down, as error.cause.code
    const cause = (error as { cause?: { message?: string; code?: string } })?.cause;
    throw new ArcDataPortalApiError({
      message: cause?.message ?? (error as Error)?.message ?? 'The request failed',
      method: init.method ?? 'GET',
      url,
      code: cause?.code ?? (error as { code?: string })?.code,
      cause: error,
    });
  },
};
