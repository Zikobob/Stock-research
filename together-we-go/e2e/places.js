// "Where do you want to go?": type a place, see matches with how far each is from you, pick one.
// The place-search service is answered by this script (no internet needed) and the browser is placed in New Jersey,
// so the distances are real arithmetic: Sorrento is about 6,700 km from there.
const { BASE, start } = require('./lib');
const results = [];
const check = (name, ok, extra = '') => { results.push(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok ? '' : '  ' + extra}`); };
const vis = async (loc, t = 4000) => loc.filter({ visible: true }).first().waitFor({ state: 'visible', timeout: t }).then(() => true).catch(() => false);

const NEW_JERSEY = { latitude: 40.7357, longitude: -74.1724 };
const feature = (props, lng, lat) => ({ type: 'Feature', geometry: { type: 'Point', coordinates: [lng, lat] }, properties: props });
const MUSEUM = feature({ osm_type: 'N', osm_id: 11, osm_key: 'tourism', osm_value: 'museum', name: 'Museo Correale di Terranova', street: 'Via Correale', city: 'Sorrento' }, 14.3809, 40.6288);
const json = (features) => ({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify({ type: 'FeatureCollection', features }) });

const openAdd = async (p) => {
  await p.goto(BASE + '/itinerary', { waitUntil: 'load' });
  await p.waitForTimeout(1500);
  await p.getByLabel('Add activity').first().click();
  await p.getByTestId('activity-name').waitFor({ state: 'visible', timeout: 4000 });
  await p.waitForTimeout(1500); // the phone's location arrives
};

(async () => {
  const { b, p } = await start({ context: { geolocation: NEW_JERSEY, permissions: ['geolocation'] } });
  const asked = [];
  await p.route('https://photon.komoot.io/**', (route) => {
    const url = new URL(route.request().url());
    asked.push(url);
    route.fulfill(json(url.searchParams.get('q').toLowerCase().includes('museum') ? [MUSEUM] : []));
  });

  // ---- an online match, with its distance from the phone
  await openAdd(p);
  await p.getByTestId('activity-name').fill('The museum');
  check('an online place appears below the box', await vis(p.getByLabel(/Museo Correale di Terranova/)));
  const row = await p.getByLabel(/Museo Correale di Terranova/).first().getAttribute('aria-label');
  check('it says how far it is from you', /7,\d{3} km from you/.test(row || ''), row);
  check('"The" is dropped from what is sent', asked.some((u) => u.searchParams.get('q') === 'museum'), asked.map((u) => u.search).join(' | '));
  const first = asked.find((u) => u.searchParams.get('q') === 'museum');
  check('it searches around the trip, with a rounded point and a box', !!first && first.searchParams.get('lat') === '40.63' && first.searchParams.get('lon') === '14.49' && /^14\.\d+,40\.\d+,14\.\d+,40\.\d+$/.test(first.searchParams.get('bbox') || ''), first && first.search);
  check('you can always use what you typed', await vis(p.getByLabel('Use The museum as typed')));

  // ---- a saved place shows at once and fills in the form
  await p.getByTestId('activity-name').fill('vincenzo');
  check('a saved place matches', await vis(p.getByLabel(/^Da Vincenzo, .*from you/)));
  await p.getByLabel(/^Da Vincenzo, .*from you/).first().click();
  check('picking a place shows its address and distance', await vis(p.getByText(/Viale Pasitea, Positano · [\d,]+ km from you/)));
  check('the box now holds the place name', (await p.getByTestId('activity-name').inputValue()) === 'Da Vincenzo');
  await p.getByTestId('add-activity-submit').click(); await p.waitForTimeout(900);
  check('the picked place is added to the plan', await vis(p.getByLabel('Delete Da Vincenzo')));
  await p.getByLabel('Delete Da Vincenzo').click(); await p.waitForTimeout(400);
  await p.getByRole('button', { name: 'Delete', exact: true }).last().click(); await p.waitForTimeout(500);

  // ---- no connection: saved places still work and the box says so
  await p.unroute('https://photon.komoot.io/**');
  await p.route('https://photon.komoot.io/**', (route) => route.abort());
  await openAdd(p);
  await p.getByTestId('activity-name').fill('santa maria');
  check('offline: a saved place still shows', await vis(p.getByLabel(/^Santa Maria Assunta, /)));
  check('offline: the box says only saved places are shown', await vis(p.getByText(/No connection, so only saved places are shown/)));
  await p.getByTestId('activity-name').fill('Sunset picnic');
  await p.getByLabel('Use Sunset picnic as typed').click(); await p.waitForTimeout(300);
  check('using the typed words hides the list', !(await vis(p.getByLabel('Use Sunset picnic as typed'), 600)));
  await p.getByTestId('add-activity-submit').click(); await p.waitForTimeout(900);
  check('a place typed by hand is added', await vis(p.getByText('Sunset picnic')));
  await p.getByLabel('Delete Sunset picnic').click(); await p.waitForTimeout(400);
  await p.getByRole('button', { name: 'Delete', exact: true }).last().click(); await p.waitForTimeout(500);
  await b.close();

  // ---- location not shared: distances start from the middle of the trip's city
  const denied = await start({ context: { permissions: [] } });
  await denied.p.route('https://photon.komoot.io/**', (route) => route.fulfill(json([])));
  await openAdd(denied.p);
  await denied.p.getByTestId('activity-name').fill('vincenzo');
  check('without location, distances start from the trip city', await vis(denied.p.getByLabel(/^Da Vincenzo, .*from Positano/), 12000));
  await denied.b.close();

  console.log(results.join('\n'));
})().catch((e) => { console.log(results.join('\n')); console.error('CRASH', e.message.slice(0, 600)); process.exit(1); });
