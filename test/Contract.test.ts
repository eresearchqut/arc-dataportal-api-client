import { GrantDetailDocumentFromJSON, GrantDetailDocumentToJSON, GrantListFromJSON, GrantListToJSON } from '../generated/typescript-fetch';
import grant from './fixtures/grant.json';
import grantEarly from './fixtures/grant-early.json';
import grantFellowship from './fixtures/grant-fellowship.json';
import grantLief from './fixtures/grant-lief.json';
import grantNulls from './fixtures/grant-nulls.json';
import grantOutcome from './fixtures/grant-outcome.json';
import grantSlash from './fixtures/grant-slash.json';
import grants from './fixtures/grants.json';
import grantsEmpty from './fixtures/grants-empty.json';
import grantsLief from './fixtures/grants-lief.json';
import grantsOldest from './fixtures/grants-oldest.json';
import grantsSearch from './fixtures/grants-search.json';

type Codec = [(json: any) => unknown, (value: any) => unknown];

const list: Codec = [GrantListFromJSON, GrantListToJSON];
const detail: Codec = [GrantDetailDocumentFromJSON, GrantDetailDocumentToJSON];

const fixtures: [string, unknown, Codec][] = [
  ['grants', grants, list],
  ['grants-oldest', grantsOldest, list],
  ['grants-lief', grantsLief, list],
  ['grants-search', grantsSearch, list],
  ['grants-empty', grantsEmpty, list],
  ['grant', grant, detail],
  ['grant-early', grantEarly, detail],
  ['grant-fellowship', grantFellowship, detail],
  ['grant-lief', grantLief, detail],
  ['grant-nulls', grantNulls, detail],
  ['grant-outcome', grantOutcome, detail],
  ['grant-slash', grantSlash, detail],
];

function describeValue(value: unknown): string {
  return value === null ? 'null' : Array.isArray(value) ? 'array' : typeof value;
}

function droppedPaths(raw: unknown, roundTripped: unknown, path = '', dropped = new Set<string>()): Set<string> {
  if (raw === null) {
    return dropped;
  }
  if (describeValue(raw) !== describeValue(roundTripped)) {
    dropped.add(`${path} (${describeValue(raw)} became ${describeValue(roundTripped)})`);
  } else if (Array.isArray(raw)) {
    raw.forEach((item, index) => droppedPaths(item, (roundTripped as unknown[])[index], `${path}[]`, dropped));
  } else if (typeof raw === 'object') {
    for (const [key, value] of Object.entries(raw)) {
      // The generator reads null as undefined for optional fields, so a null only proves the key is known once it is non-null in another fixture.
      if (!(key in (roundTripped as object)) && value !== null) {
        dropped.add(`${path}.${key}`);
      } else {
        droppedPaths(value, (roundTripped as Record<string, unknown>)[key], `${path}.${key}`, dropped);
      }
    }
  }
  return dropped;
}

describe('droppedPaths', () => {
  test('reports an empty array that comes back as an object', () => {
    expect([...droppedPaths({ 'lief-register': [] }, { 'lief-register': {} })]).toEqual(['.lief-register (array became object)']);
  });

  test('reports values that come back as null', () => {
    expect([...droppedPaths({ code: 'DP1', years: [2020] }, { code: null, years: [null] })]).toEqual([
      '.code (string became null)',
      '.years[] (number became null)',
    ]);
  });
});

// The generated FromJSON functions drop any field the spec does not name, so these tests fail
// when the spec drifts from the JSON that the ARC Data Portal returns.
describe('ARC Data Portal recorded responses', () => {
  test.each(fixtures)('%s keeps every field', (_name, raw, [fromJSON, toJSON]) => {
    const roundTripped = JSON.parse(JSON.stringify(toJSON(fromJSON(raw))));

    expect([...droppedPaths(raw, roundTripped)]).toEqual([]);
  });

  test('a search keeps its parsed expression tree', () => {
    const { meta } = GrantListFromJSON(grantsSearch);

    expect(meta.search_description?.ast?.ChildNodes?.length).toBeGreaterThan(0);
    expect(Object.keys(meta.search_description?.types ?? {})).toContain('Exact');
  });

  test('grant details keep their classifications and LIEF items', () => {
    const { data } = GrantDetailDocumentFromJSON(grantLief);

    expect(data.attributes.field_of_research.some((field) => field.isPrimary)).toBe(true);
    expect(data.attributes.lief_register[0].primaryItem).toBeDefined();
    expect(data.attributes.achievement_summary).toEqual(expect.any(String));
  });
});
