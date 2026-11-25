import { Configuration, ConfigurationParameters, GrantsApi } from '../generated/typescript-fetch';
import { arcDataPortalErrorMiddleware } from './ArcDataPortalApiError';

export const DEFAULT_ARC_DATA_PORTAL_URL = 'https://dataportal.arc.gov.au/NCGP/API';

export interface ArcDataPortalClientOptions {
  /** Base URL of the API. Defaults to `https://dataportal.arc.gov.au/NCGP/API`. */
  url?: string;
  /** Extra request headers, for example a `User-Agent` that names your application. */
  headers?: Record<string, string>;
  fetchApi?: ConfigurationParameters['fetchApi'];
}

export interface ArcDataPortalClient {
  grants: GrantsApi;
  configuration: Configuration;
  /** Resolves when the API answers a one grant search, and rejects with an `ArcDataPortalApiError` otherwise. */
  health(): Promise<void>;
}

export function createArcDataPortalClient(options: ArcDataPortalClientOptions = {}): ArcDataPortalClient {
  const { url = DEFAULT_ARC_DATA_PORTAL_URL, headers, fetchApi } = options;

  const configuration = new Configuration({
    basePath: url.replace(/\/+$/, ''),
    headers: { ...headers },
    fetchApi,
    middleware: [arcDataPortalErrorMiddleware],
  });

  const grants = new GrantsApi(configuration);

  return {
    grants,
    configuration,
    // The API has no health endpoint, so the cheapest search stands in for one.
    health: async () => {
      await grants.grantsGet({ pageSize: 1 });
    },
  };
}
