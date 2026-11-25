import { GrantsApi, collect, paginate } from '../src';
import { configuration, wiremock } from './Config';
import recorded from './fixtures/grants.json';

const grants = (...ids: string[]) => ids.map((id) => ({ ...recorded.data[0], id }));

const grantsPage = (pageNumber: number, pageSize: number, data: object[], total: number) => ({
  meta: {
    'requested-page-number': pageNumber,
    'requested-page-size': pageSize,
    'actual-page-size': data.length,
    'total-pages': Math.ceil(total / pageSize),
    'total-size': total,
    'search-description': null,
    'sort-by': '',
  },
  links: { self: `http://dataportal.arc.gov.au/NCGP/API/grants?page%5Bnumber%5D=${pageNumber}&page%5Bsize%5D=${pageSize}` },
  data,
});

describe('paginate', () => {
  const grantsApi = new GrantsApi(configuration);

  const stubPage = (pageNumber: number, data: object[], total: number) =>
    wiremock.register(
      { method: 'GET', endpoint: '/grants', queryParameters: { 'page[number]': String(pageNumber), 'page[size]': '2', filter: 'climate' } },
      { status: 200, body: grantsPage(pageNumber, 2, data, total) },
    );

  const pages = () => paginate((pageNumber, pageSize) => grantsApi.grantsGet({ filter: 'climate', pageNumber, pageSize }), { pageSize: 2 });

  test('requests pages until the last one', async () => {
    await stubPage(1, grants('A1', 'A2'), 5);
    await stubPage(2, grants('A3', 'A4'), 5);
    await stubPage(3, grants('A5'), 5);

    expect((await collect(pages())).map((grant) => grant.id)).toEqual(['A1', 'A2', 'A3', 'A4', 'A5']);
  });

  test('stops after a full last page', async () => {
    await stubPage(1, grants('A1', 'A2'), 4);
    await stubPage(2, grants('A3', 'A4'), 4);

    expect(await collect(pages())).toHaveLength(4);
  });

  test('stops on an empty page', async () => {
    await stubPage(1, grants('A1', 'A2'), 6);
    await stubPage(2, [], 6);

    expect(await collect(pages())).toHaveLength(2);
  });

  test('stops requesting pages when the caller stops iterating', async () => {
    await stubPage(1, grants('A1', 'A2'), 5);

    for await (const grant of pages()) {
      expect(grant.id).toEqual('A1');
      break;
    }
  });

  test.each([0, 1001, 1.5])('rejects a page size of %s', async (pageSize) => {
    await expect(collect(paginate(() => grantsApi.grantsGet(), { pageSize }))).rejects.toThrow(RangeError);
  });
});
