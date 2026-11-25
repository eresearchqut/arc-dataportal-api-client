const fs = require('fs');
const path = require('path');

const BASE_URL = 'https://dataportal.arc.gov.au/NCGP/API';

// Chosen to cover the shapes the API returns: recent and early grants, LIEF items, fellowships, outcome statements, search ASTs, null fields and an id with a slash.
const FIXTURES = {
  'grants.json': ['/grants', { 'page[size]': 50 }],
  'grants-oldest.json': ['/grants', { 'page[size]': 50, sort: 'announced' }],
  'grants-lief.json': ['/grants', { 'page[size]': 20, filter: '(lief-register="true")' }],
  'grants-search.json': ['/grants', { 'page[size]': 10, filter: 'climate => (status="Active") AND(lief-register="true")' }],
  'grants-empty.json': ['/grants', { 'page[size]': 10, filter: 'zzqxnotaword' }],
  'grant.json': ['/grants/SR200100008'],
  'grant-lief.json': ['/grants/LE230100008'],
  'grant-fellowship.json': ['/grants/FT260100001'],
  'grant-outcome.json': ['/grants/DP190102138'],
  'grant-nulls.json': ['/grants/FT260101590'],
  'grant-early.json': ['/grants/FF0241206'],
  'grant-slash.json': ['/grants/AR04%2F00252'],
};

async function main() {
  const output = path.join(__dirname, '..', 'test', 'fixtures');
  fs.mkdirSync(output, { recursive: true });
  for (const [file, [route, query = {}]] of Object.entries(FIXTURES)) {
    // URLSearchParams encodes a space as `+`, which the API reads as its exact match operator.
    const search = Object.entries(query).map(([name, value]) => `${encodeURIComponent(name)}=${encodeURIComponent(value)}`);
    const url = `${BASE_URL}${route}${search.length ? `?${search.join('&')}` : ''}`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Could not download ${url}: ${response.status}`);
    }
    fs.writeFileSync(path.join(output, file), `${JSON.stringify(await response.json(), null, 2)}\n`);
    console.log(`Recorded ${file} from ${url}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
