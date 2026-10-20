// Runs the browser tests: exports the web app, serves it, runs each script, prints a summary.
//   node e2e/run.js                 build + run everything
//   node e2e/run.js --no-build      reuse the last build (e2e/.dist)
//   node e2e/run.js verify twophones   only these scripts
// Needs a browser: run `npx playwright-core install chromium` once, or set E2E_CHROME to a Chrome path.
const { spawn, spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { serve } = require('./serve');

const root = path.join(__dirname, '..');
// E2E_DIST and E2E_PORT let several people (or agents) build and test side by side without sharing a folder or a port
const dist = process.env.E2E_DIST ? path.resolve(process.env.E2E_DIST) : path.join(__dirname, '.dist');
const port = Number(process.env.E2E_PORT) || 8081;
const args = process.argv.slice(2);
const wanted = args.filter((a) => !a.startsWith('--'));
const ALL = ['verify', 'verify2', 'verify3', 'verify4', 'places', 'motion', 'overflow', 'nesting', 'targets', 'twophones'];
const LIMIT_MS = { overflow: 600000, targets: 400000, twophones: 400000 }; // anything else gets 5 minutes

function run(script) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [path.join(__dirname, `${script}.js`)], { cwd: __dirname, env: { ...process.env, E2E_URL: `http://localhost:${port}` } });
    let out = '';
    child.stdout.on('data', (d) => (out += d));
    child.stderr.on('data', (d) => (out += d));
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill();
    }, LIMIT_MS[script] ?? 300000);
    child.on('close', () => {
      clearTimeout(timer);
      resolve(timedOut ? `${out}\nCRASH ${script} did not finish in time` : out);
    });
  });
}

(async () => {
  fs.mkdirSync(path.join(__dirname, 'shots'), { recursive: true });
  if (!args.includes('--no-build')) {
    console.log('Exporting the web app…');
    const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx';
    const r = spawnSync(npx, ['expo', 'export', '--platform', 'web', '--output-dir', dist], { cwd: root, stdio: 'inherit', shell: process.platform === 'win32' });
    if (r.status !== 0) process.exit(1);
  }
  const server = await serve(dist, port);
  let pass = 0;
  let fail = 0;
  let crashed = 0;
  for (const script of ALL.filter((s) => !wanted.length || wanted.includes(s))) {
    console.log(`\n=== ${script}`);
    const out = await run(script);
    console.log(out.trim());
    pass += (out.match(/^PASS /gm) || []).length;
    fail += (out.match(/^FAIL /gm) || []).length;
    crashed += /^CRASH/m.test(out) ? 1 : 0;
  }
  server.close();
  console.log(`\n${pass} passed, ${fail} failed${crashed ? `, ${crashed} script(s) crashed` : ''}`);
  process.exit(fail || crashed ? 1 : 0);
})();
