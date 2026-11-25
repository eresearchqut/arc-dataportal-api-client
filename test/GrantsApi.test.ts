import { GrantsApi } from '../src';
import { configuration, wiremock } from './Config';
import grant from './fixtures/grant.json';
import grantSlash from './fixtures/grant-slash.json';
import search from './fixtures/grants-search.json';

describe('GrantsApi', () => {
  const grantsApi = new GrantsApi(configuration);

  test('grantsGet sends the filter with spaces as %20, and the paging parameters with their bracketed names', async () => {
    const filter = 'climate => (status="Active") AND(lief-register="true")';
    await wiremock.register(
      { method: 'GET', endpoint: '/grants', queryParameters: { filter, sort: '-money', 'page[number]': '2', 'page[size]': '10' } },
      { status: 200, body: search },
    );

    const { meta, data } = await grantsApi.grantsGet({ filter, sort: '-money', pageNumber: 2, pageSize: 10 });

    expect(meta.total_size).toBe(search.meta['total-size']);
    expect(data[0].attributes.scheme_name).toBe(search.data[0].attributes['scheme-name']);

    const [{ request }] = (await wiremock.getAllRequests()) as { request: { url: string } }[];
    // The API reads `+` as its exact match operator, so a space must not be sent as one.
    expect(request.url).toContain('filter=climate%20%3D%3E%20(status%3D%22Active%22)%20AND(lief-register%3D%22true%22)');
  });

  test('grantsIdGet returns the grant details', async () => {
    await wiremock.register({ method: 'GET', endpoint: '/grants/SR200100008' }, { status: 200, body: grant });

    const { data } = await grantsApi.grantsIdGet({ id: 'SR200100008' });

    expect(data.type).toBe('grant-details');
    expect(data.attributes.scheme_name).toBe('Special Research Initiatives');
    expect(data.attributes.investigators_current[0]).toMatchObject({ familyName: 'King', roleCode: 'PD' });
  });

  test('grantsIdGet encodes a slash in the id', async () => {
    await wiremock.register({ method: 'GET', endpoint: '/grants/AR04%2F00252' }, { status: 200, body: grantSlash });

    const { data } = await grantsApi.grantsIdGet({ id: 'AR04/00252' });

    expect(data.id).toBe('AR04/00252');
  });
});
