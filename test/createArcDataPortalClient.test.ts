import { ArcDataPortalApiError, createArcDataPortalClient } from '../src';
import { origin, wiremock } from './Config';
import empty from './fixtures/grants-empty.json';

const notFound = {
  links: { self: 'http://dataportal.arc.gov.au/NCGP/API/grants/NOPE999' },
  errors: [
    { id: '400BadRequest', status: 'BadRequest', code: '400', title: 'ApiBadRequestException', detail: 'A Grant does not exist for id: NOPE999' },
  ],
};

describe('createArcDataPortalClient', () => {
  test('defaults to the public API', () => {
    expect(createArcDataPortalClient().configuration.basePath).toBe('https://dataportal.arc.gov.au/NCGP/API');
  });

  test('trims a trailing slash and sends extra headers', async () => {
    await wiremock.register({ method: 'GET', endpoint: '/grants', headers: { 'User-Agent': 'my-app/1.0' } }, { status: 200, body: empty });

    const { grants } = createArcDataPortalClient({ url: `${origin}/`, headers: { 'User-Agent': 'my-app/1.0' } });

    await expect(grants.grantsGet()).resolves.toMatchObject({ meta: { total_size: 0 }, data: [] });
  });

  test('health requests a single grant and rejects when the API fails', async () => {
    const { health } = createArcDataPortalClient({ url: origin });

    await wiremock.register({ method: 'GET', endpoint: '/grants', queryParameters: { 'page[size]': '1' } }, { status: 200, body: empty });
    await expect(health()).resolves.toBeUndefined();

    await wiremock.clearAll();
    await wiremock.register({ method: 'GET', endpoint: '/grants' }, { status: 503 });
    await expect(health()).rejects.toMatchObject({ name: 'ArcDataPortalApiError', status: 503 });
  });

  test('a JSON:API error document is parsed and its detail is in the message', async () => {
    await wiremock.register(
      { method: 'GET', endpoint: '/grants/NOPE999' },
      { status: 400, body: notFound, headers: { 'Content-Type': 'application/vnd.api+json' } },
    );
    const { grants } = createArcDataPortalClient({ url: origin });

    const error = await grants.grantsIdGet({ id: 'NOPE999' }).catch((e) => e);

    expect(error).toBeInstanceOf(ArcDataPortalApiError);
    expect(error).toMatchObject({
      message: 'Request failed with status code 400: A Grant does not exist for id: NOPE999',
      method: 'GET',
      url: `${origin}/grants/NOPE999`,
      status: 400,
      body: notFound,
    });
  });

  test('a text error body is kept as text', async () => {
    await wiremock.register({ method: 'GET', endpoint: '/grants' }, { status: 502, body: 'Bad Gateway', headers: { 'Content-Type': 'text/plain' } });
    const { grants } = createArcDataPortalClient({ url: origin });

    await expect(grants.grantsGet()).rejects.toMatchObject({ message: 'Request failed with status code 502', status: 502, body: 'Bad Gateway' });
  });

  test('a network failure throws an ArcDataPortalApiError with the code and no status', async () => {
    const { grants } = createArcDataPortalClient({ url: 'http://127.0.0.1:59999' });

    const error = await grants.grantsGet().catch((e) => e);

    expect(error).toBeInstanceOf(ArcDataPortalApiError);
    expect(error.status).toBeUndefined();
    expect(error.code).toBe('ECONNREFUSED');
    expect(error.method).toBe('GET');
  });
});
