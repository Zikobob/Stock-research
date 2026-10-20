// Shared helpers for the browser tests: launch a browser, open the app as a phone-sized screen, sign in as the demo user.
const path = require('path');
const { chromium } = require('playwright-core');

/** Where the exported web app is being served (run.js starts it for you). */
exports.BASE = process.env.E2E_URL || 'http://localhost:8081';
exports.fixture = (name) => path.join(__dirname, 'fixtures', name);
exports.shot = (name) => path.join(__dirname, 'shots', name);
/** Set E2E_CHROME to a Chrome/Chromium path, or run `npx playwright-core install chromium` once. */
exports.launch = () => chromium.launch(process.env.E2E_CHROME ? { executablePath: process.env.E2E_CHROME } : {});

/** Every screen of the app (route paths). */
exports.ROUTES = ['', 'explore', 'itinerary', 'budget', 'chat', 'profile', 'about', 'airport', 'bucket-list', 'crew', 'currency', 'destinations', 'documents', 'emergency', 'flights', 'help', 'how-it-works', 'join', 'map', 'nearby', 'new-trip', 'notifications', 'packing', 'personalize', 'photos', 'phrasebook', 'quiz', 'recap', 'settings', 'trips', 'weather', 'destination/tokyo', 'sign-up', 'sign-in'];

/** Buttons and links that sit inside another button or link on the current screen, as `"outer" contains "inner"`. */
exports.nestedControls = (p) =>
  p.evaluate(() => {
    const SEL = 'button, a, [role=button], [role=link]';
    const name = (el) => (el.getAttribute('aria-label') || el.textContent || el.tagName).trim().slice(0, 40);
    const out = [];
    for (const inner of document.querySelectorAll(SEL)) {
      const outer = inner.parentElement && inner.parentElement.closest(SEL);
      if (outer) out.push(`"${name(outer)}" contains "${name(inner)}"`);
    }
    return [...new Set(out)];
  });

/**
 * `beforeSignIn(page)` runs on the sign-in screen, before the demo account is used.
 * `context` adds browser settings, for example a pretend location: `{ geolocation: { latitude, longitude }, permissions: ['geolocation'] }`.
 */
exports.start = async ({ beforeSignIn, context } = {}) => {
  const b = await exports.launch();
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, ...context });
  const p = await ctx.newPage();
  const errors = [];
  // a join that tries the (not running) sync server on :8787 and falls back to this phone logs one harmless "connection refused"
  p.on('console', (m) => { if (m.type() === 'error' && !m.text().includes('ERR_CERT') && !m.location().url.includes(':8787')) errors.push(m.text().slice(0, 400)); });
  p.on('pageerror', (e) => errors.push('PAGEERROR ' + e.message.slice(0, 400)));
  await p.goto(exports.BASE + '/', { waitUntil: 'networkidle' });
  await p.waitForTimeout(2000);
  if (await p.getByRole('button', { name: 'Skip' }).count()) { await p.getByRole('button', { name: 'Skip' }).click(); await p.waitForTimeout(1000); }
  if (beforeSignIn) await beforeSignIn(p);
  await p.getByLabel('Use the demo account').click(); await p.waitForTimeout(300);
  await p.getByTestId('sign-in').click(); await p.waitForTimeout(2500);
  if (!process.env.KEEP_TOUR && await p.getByRole('button', { name: 'Skip' }).count()) { await p.getByRole('button', { name: 'Skip' }).first().click(); await p.waitForTimeout(600); }
  return { b, p, errors };
};
