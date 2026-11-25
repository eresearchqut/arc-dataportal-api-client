import { EndpointFeature, WireMock } from 'wiremock-captain';
import { FetchAPI } from '../generated/typescript-fetch';
import { createArcDataPortalClient } from '../src';

export const origin = `http://${global.__TESTCONTAINERS_ARC_IP__}:${global.__TESTCONTAINERS_ARC_PORT_8080__}`;

export const wiremock = new WireMock(origin, { requestEndpointFeature: EndpointFeature.UrlPath });

export const configuration = createArcDataPortalClient({
  url: origin,
  fetchApi: fetch as unknown as FetchAPI,
}).configuration;
