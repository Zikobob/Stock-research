/**
 * TogetherWeGo sync server.  Run it with:  npm run server
 *
 * It lets friends' phones share one trip: chat, itinerary, votes, expenses... Phones send small changes here and
 * ask for everyone else's. There are no accounts. A trip is protected by its long random id, which a phone only
 * learns by entering the trip's invite code, so only run this on a network you trust (home wifi or a hotspot).
 *
 *   POST /v1/trips/:id/ops      { code, client, ops }        send changes
 *   GET  /v1/trips/:id/ops      ?since=N&wait=ms&client=ID   get changes (waits for new ones if there are none)
 *   GET  /v1/codes/:code                                     invite code -> trip id
 *   GET  /health                                             is the server alive?
 */
const http = require('http');
const os = require('os');
const path = require('path');

const { SyncStore, SyncError } = require('./store');

const MAX_BODY = 1_000_000;
const MAX_WAIT_MS = 25000;
const LOOKUPS_PER_MINUTE = 60;

function createServer(store, options = {}) {
  const lookups = new Map(); // ip -> { count, resetAt }
  const now = options.now || Date.now;

  function tooManyLookups(ip) {
    const entry = lookups.get(ip);
    if (!entry || entry.resetAt < now()) {
      lookups.set(ip, { count: 1, resetAt: now() + 60000 });
      return false;
    }
    entry.count += 1;
    return entry.count > LOOKUPS_PER_MINUTE;
  }

  function send(res, status, body) {
    const text = JSON.stringify(body);
    res.writeHead(status, {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(text),
      'Cache-Control': 'no-store',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'content-type',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    });
    res.end(text);
  }

  function readJson(req) {
    return new Promise((resolve, reject) => {
      let size = 0;
      let tooBig = false;
      const chunks = [];
      req.on('data', (c) => {
        size += c.length;
        if (size > MAX_BODY) tooBig = true; // keep reading (and ignoring) so the 413 answer can still reach the sender
        else chunks.push(c);
      });
      req.on('end', () => {
        if (tooBig) return reject(new SyncError(413, 'Request too large'));
        try {
          resolve(JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}'));
        } catch {
          reject(new SyncError(400, 'Body must be JSON'));
        }
      });
      req.on('error', reject);
    });
  }

  return http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url, 'http://localhost');
      const parts = url.pathname.split('/').filter(Boolean);
      if (req.method === 'OPTIONS') return send(res, 204, {});

      if (req.method === 'GET' && url.pathname === '/health') return send(res, 200, { ok: true, ...store.stats() });
      if (req.method === 'GET' && url.pathname === '/') {
        res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
        return res.end('TogetherWeGo sync server is running.\nIn the app: Settings, Sync across phones, enter this address.\n');
      }

      if (req.method === 'GET' && parts[0] === 'v1' && parts[1] === 'codes' && parts.length === 3) {
        const ip = req.socket.remoteAddress || '';
        if (tooManyLookups(ip)) throw new SyncError(429, 'Too many tries. Wait a minute.');
        const tripId = store.lookup(decodeURIComponent(parts[2]));
        if (!tripId) throw new SyncError(404, 'No trip with that code');
        return send(res, 200, { tripId });
      }

      if (parts[0] === 'v1' && parts[1] === 'trips' && parts[3] === 'ops' && parts.length === 4) {
        const tripId = parts[2];
        if (req.method === 'POST') {
          const body = await readJson(req);
          return send(res, 200, store.append(tripId, body.code, body.client, body.ops));
        }
        if (req.method === 'GET') {
          const since = Number(url.searchParams.get('since')) || 0;
          const wait = Math.min(Number(url.searchParams.get('wait')) || 0, MAX_WAIT_MS);
          const waiting = store.wait(tripId, since, wait);
          req.on('close', () => waiting.cancel && waiting.cancel()); // the phone hung up: stop waiting
          await waiting;
          return send(res, 200, store.since(tripId, since, url.searchParams.get('client')));
        }
      }
      throw new SyncError(404, 'Not found');
    } catch (e) {
      if (e instanceof SyncError) return send(res, e.status, { error: e.message });
      console.error(e);
      return send(res, 500, { error: 'Server error' });
    }
  });
}

function lanAddresses() {
  return Object.values(os.networkInterfaces())
    .flat()
    .filter((i) => i && i.family === 'IPv4' && !i.internal)
    .map((i) => i.address);
}

if (require.main === module) {
  const port = Number(process.env.PORT) || 8787;
  const file = process.env.SYNC_DATA || path.join(__dirname, 'data', 'sync.json');
  const store = new SyncStore({ file });
  const server = createServer(store);
  server.listen(port, '0.0.0.0', () => {
    console.log('\nTogetherWeGo sync server is running.\n');
    console.log('Phones on the same wifi can use any of these addresses:');
    for (const ip of lanAddresses()) console.log(`   http://${ip}:${port}`);
    console.log(`   http://localhost:${port}   (this computer only)\n`);
    console.log(`Saving to ${file}\nPress Ctrl+C to stop.\n`);
  });
  const stop = () => {
    store.flush();
    process.exit(0);
  };
  process.on('SIGINT', stop);
  process.on('SIGTERM', stop);
}

module.exports = { createServer, lanAddresses };
