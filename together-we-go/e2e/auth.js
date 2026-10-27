// The screens you see before you are signed in: the first-run slides, sign-in, sign-up and reset password. They cannot be reached once
// signed in (the router sends you home), so the sideways-overflow, tap-size and nesting checks that visit every screen miss them. This
// script opens them in a fresh browser, checks those three things at 390 px, 320 px and with larger text, and uses each one like a person.
const { BASE, launch, nestedControls } = require('./lib');
const results = [];
const check = (name, ok, extra = '') => results.push(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok ? '' : '  ' + extra}`);
const vis = async (loc, t = 2500) => loc.filter({ visible: true }).first().waitFor({ state: 'visible', timeout: t }).then(() => true).catch(() => false);
const MIN = 44;

// every control you tap, smaller than 44 x 44 (same rule as targets.js)
const smallTargets = (p) =>
  p.evaluate((min) => {
    const SEL = 'button, a[href], [role=button], [role=link], [role=tab], [role=radio], [role=menuitem], input:not([type=hidden]):not([role=switch]):not([type=checkbox]), textarea, select';
    const out = [];
    for (const el of document.querySelectorAll(SEL)) {
      const rc = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      if (rc.width < 1 || rc.height < 1 || cs.visibility === 'hidden' || cs.display === 'none' || Number(cs.opacity) === 0 || el.closest('[aria-hidden=true]')) continue;
      if (Math.round(rc.width) >= min && Math.round(rc.height) >= min) continue;
      out.push(`"${(el.getAttribute('aria-label') || el.textContent || el.tagName).trim().slice(0, 30)}" ${Math.round(rc.width)}x${Math.round(rc.height)}`);
    }
    return [...new Set(out)];
  }, MIN);

// anything wider than the screen (same idea as overflow.js)
const sticksOut = (p, vw) =>
  p.evaluate((w) => {
    const doc = document.scrollingElement || document.documentElement;
    const scrollers = [...document.querySelectorAll('*')].filter((el) => /(auto|scroll)/.test(getComputedStyle(el).overflowX));
    const inScroller = (el) => scrollers.some((s) => s !== el && s.contains(el));
    const clipped = (el) => { for (let n = el.parentElement; n; n = n.parentElement) { const cs = getComputedStyle(n); if ((cs.overflowX === 'hidden' || cs.overflow === 'hidden') && n.getBoundingClientRect().right <= w + 1) return true; } return false; };
    const out = [];
    for (const el of document.querySelectorAll('body *')) {
      const rc = el.getBoundingClientRect();
      if (rc.width < 2 || rc.right <= w + 1 || getComputedStyle(el).visibility === 'hidden' || inScroller(el) || clipped(el)) continue;
      out.push(`${el.tagName.toLowerCase()}[${(el.getAttribute('aria-label') || el.textContent || '').trim().slice(0, 24)}] right=${Math.round(rc.right)}`);
      if (out.length >= 3) break;
    }
    return doc.scrollWidth > w + 1 ? [`page ${doc.scrollWidth} > ${w}`, ...out] : out;
  }, vw);

(async () => {
  const b = await launch();
  const open = async (viewport, scale = 1) => {
    const ctx = await b.newContext({ viewport, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
    if (scale !== 1) await ctx.addInitScript((sc) => { try { const j = JSON.parse(localStorage.getItem('togetherwego-v1') || '{"state":{"settings":{}},"version":0}'); j.state = j.state || {}; j.state.settings = { ...(j.state.settings || {}), textScale: sc }; localStorage.setItem('togetherwego-v1', JSON.stringify(j)); } catch {} }, scale);
    const p = await ctx.newPage();
    const errors = [];
    p.on('console', (m) => { if (m.type() === 'error' && !m.text().includes('ERR_CERT')) errors.push(m.text().slice(0, 300)); });
    p.on('pageerror', (e) => errors.push('PAGEERROR ' + e.message.slice(0, 300)));
    return { ctx, p, errors };
  };

  // ------------------------------------------------------------------ audit: sizes, overflow and nesting at three phone sizes
  for (const [label, viewport, scale] of [['390 px', { width: 390, height: 844 }, 1], ['320 px', { width: 320, height: 640 }, 1], ['360 px, larger text', { width: 360, height: 740 }, 1.25]]) {
    const { ctx, p } = await open(viewport, scale);
    const bad = [];
    const audit = async (where) => {
      const small = await smallTargets(p);
      const wide = await sticksOut(p, viewport.width);
      const nested = await nestedControls(p);
      if (small.length) bad.push(`${where}: small ${small.slice(0, 4).join(' | ')}`);
      if (wide.length) bad.push(`${where}: sticks out ${wide.join(' | ')}`);
      if (nested.length) bad.push(`${where}: nested ${nested.slice(0, 3).join(' | ')}`);
    };
    await p.goto(BASE + '/', { waitUntil: 'networkidle' }); await p.waitForTimeout(1800);
    await audit('first-run slide 1');
    await p.getByTestId('onboarding-next').click(); await p.waitForTimeout(1500); await audit('first-run slide 2');
    await p.getByTestId('onboarding-next').click(); await p.waitForTimeout(1500); await audit('first-run slide 3');
    await p.goto(BASE + '/sign-in', { waitUntil: 'networkidle' }); await p.waitForTimeout(1400);
    await audit('sign-in');
    await p.getByTestId('sign-in').click(); await p.waitForTimeout(400); await audit('sign-in with errors');
    await p.evaluate(() => { const el = [...document.querySelectorAll('*')].find((e) => /(auto|scroll)/.test(getComputedStyle(e).overflowY) && e.scrollHeight > e.clientHeight + 40); if (el) el.scrollTop = 99999; });
    await p.waitForTimeout(300); await audit('sign-in, lower part');
    await p.getByLabel('Join with a code').click(); await p.waitForTimeout(900); await audit('join with a code sheet'); await p.keyboard.press('Escape');
    await p.goto(BASE + '/sign-in', { waitUntil: 'networkidle' }); await p.waitForTimeout(1200);
    await p.getByRole('button', { name: 'Continue with Google' }).click(); await p.waitForTimeout(900); await audit('Google sheet');
    await p.goto(BASE + '/sign-up', { waitUntil: 'networkidle' }); await p.waitForTimeout(1200);
    await audit('sign-up');
    await p.getByRole('button', { name: 'Create account' }).click(); await p.waitForTimeout(400); await audit('sign-up with errors');
    await p.goto(BASE + '/forgot-password', { waitUntil: 'networkidle' }); await p.waitForTimeout(1200);
    await audit('reset password, step 1');
    await p.getByPlaceholder('you@email.com').fill('maya.chen@togetherwego.app');
    await p.getByRole('button', { name: 'Send reset code' }).click(); await p.waitForTimeout(700);
    await p.getByRole('button', { name: 'OK' }).click(); await p.waitForTimeout(400);
    await audit('reset password, step 2');
    check(`signed-out screens fit at ${label}: no control under ${MIN} x ${MIN}, nothing sticks out, no button inside a button`, bad.length === 0, bad.slice(0, 4).join(' ;; '));
    await ctx.close();
  }

  // ------------------------------------------------------------------ first run
  {
    const { ctx, p, errors } = await open({ width: 390, height: 844 });
    await p.goto(BASE + '/', { waitUntil: 'networkidle' }); await p.waitForTimeout(1800);
    check('a first visit opens the first-run slides', await vis(p.getByRole('heading', { name: 'Plan together' })));
    check('there is exactly one Skip', (await p.getByRole('button', { name: 'Skip' }).count()) === 1);
    check('the step bar says where you are', await vis(p.getByRole('progressbar', { name: 'Step 1 of 3' })));
    await p.getByRole('button', { name: 'Next' }).click(); await p.waitForTimeout(900);
    check('Next shows the second idea', await vis(p.getByRole('heading', { name: 'Split the money' })) && await vis(p.getByRole('progressbar', { name: 'Step 2 of 3' })));
    await p.getByRole('button', { name: 'Next' }).click(); await p.waitForTimeout(900);
    check('the last slide says Get Started and hides Skip', await vis(p.getByRole('button', { name: 'Get Started' })) && (await p.getByRole('button', { name: 'Skip' }).count()) === 0);
    await p.getByRole('button', { name: 'Get Started' }).click(); await p.waitForTimeout(900);
    check('Get Started opens sign-in', await vis(p.getByRole('heading', { name: 'Welcome back' })));
    await p.goto(BASE + '/', { waitUntil: 'networkidle' }); await p.waitForTimeout(1500);
    check('after the slides, the app opens on sign-in', await vis(p.getByRole('heading', { name: 'Welcome back' })));
    check('first run and sign-in log no console errors', errors.length === 0, errors.join(' | '));
    await ctx.close();
  }

  // ------------------------------------------------------------------ sign-in
  {
    const { ctx, p, errors } = await open({ width: 390, height: 844 });
    await p.goto(BASE + '/sign-in', { waitUntil: 'networkidle' }); await p.waitForTimeout(1500);
    await p.getByTestId('sign-in').click(); await p.waitForTimeout(400);
    check('an empty form says what is missing, in words', await vis(p.getByText('Enter your email address')) && await vis(p.getByText('Enter your password')));
    await p.getByTestId('email').fill('nobody@school.org'); await p.getByTestId('password').fill('Trip2027go');
    await p.getByTestId('sign-in').click(); await p.waitForTimeout(900);
    check('an unknown account gets a clear message with an icon', await vis(p.getByRole('alert')));
    await p.getByLabel('Use the demo account').click(); await p.waitForTimeout(500);
    check('the demo ticket fills the form', (await p.getByTestId('email').inputValue()) === 'maya.chen@togetherwego.app' && (await p.getByTestId('password').inputValue()).length > 8);
    check('the form error clears once you change something', !(await vis(p.getByText(/No account found/), 400)));
    check('the demo ticket has its own copy buttons (not inside another button)', (await p.getByLabel('Copy demo email').count()) === 1 && (await p.getByLabel('Copy demo password').count()) === 1);
    // Join with a code: kept, and the join page opens with it after signing in
    await p.getByLabel('Join with a code').click(); await p.waitForTimeout(800);
    await p.getByTestId('join-code').fill('abc'); await p.getByTestId('join-code-continue').click(); await p.waitForTimeout(300);
    check('a code that is not a code is refused with words', await vis(p.getByText('Codes look like ABC-1234')));
    await p.getByTestId('join-code').fill('seo5521'); await p.getByTestId('join-code-continue').click(); await p.waitForTimeout(800);
    check('the invite code is kept on the sign-in screen', await vis(p.getByText('SEO-5521', { exact: true })) && await vis(p.getByLabel('Remove the invite code')));
    await p.getByTestId('sign-in').click(); await p.waitForTimeout(3200);
    if (await p.getByRole('button', { name: 'Skip' }).count()) await p.getByRole('button', { name: 'Skip' }).first().click().catch(() => {});
    await p.waitForTimeout(800);
    check('after signing in, the join page opens with the code filled in', (await p.getByTestId('invite-code').inputValue().catch(() => '')) === 'SEO-5521');
    check('sign-in with an invite logs no console errors', errors.length === 0, errors.join(' | '));
    await ctx.close();
  }

  // ------------------------------------------------------------------ Google sheet
  {
    const { ctx, p } = await open({ width: 390, height: 844 });
    await p.goto(BASE + '/sign-in', { waitUntil: 'networkidle' }); await p.waitForTimeout(1500);
    await p.getByRole('button', { name: 'Continue with Google' }).click(); await p.waitForTimeout(800);
    check('the Google sheet lists Maya and "Use another account"', await vis(p.getByText('Maya Chen', { exact: true })) && await vis(p.getByLabel('Use another account')));
    await p.getByLabel('Use another account').click(); await p.waitForTimeout(400);
    await p.getByRole('button', { name: 'Continue', exact: true }).click(); await p.waitForTimeout(400);
    check('the Google form checks name and email in words', await vis(p.getByText('Enter a name')) && await vis(p.getByText('Enter your email address')));
    await p.getByRole('button', { name: /Maya Chen, / }).click(); await p.waitForTimeout(3000);
    check('picking Maya signs in', await vis(p.getByRole('tab', { name: 'Home', exact: true }), 4000) || (await p.getByRole('button', { name: 'Skip' }).count()) > 0);
    await ctx.close();
  }

  // ------------------------------------------------------------------ sign-up
  {
    const { ctx, p, errors } = await open({ width: 390, height: 844 });
    await p.goto(BASE + '/sign-up', { waitUntil: 'networkidle' }); await p.waitForTimeout(1300);
    await p.getByPlaceholder('e.g. Alex Rivera').fill('Jordan Smith');
    await p.getByPlaceholder('you@email.com').fill('nope'); await p.getByPlaceholder('you@email.com').blur(); await p.waitForTimeout(300);
    check('a bad email is marked when you leave the field (words, not just colour)', await vis(p.getByText(/doesn’t look right/)));
    await p.getByPlaceholder('you@email.com').fill('jordan@school.org'); await p.waitForTimeout(300);
    check('a good email gets a tick', await vis(p.getByLabel('Looks good')));
    await p.getByPlaceholder('At least 8 characters').first().fill('abc'); await p.waitForTimeout(300);
    check('the password bar says how strong it is', await vis(p.getByLabel(/Password strength: /)));
    await p.getByPlaceholder('At least 8 characters').first().fill('Trip2027go'); await p.getByPlaceholder('Re-enter password').fill('Trip2027'); await p.getByPlaceholder('Re-enter password').blur(); await p.waitForTimeout(300);
    check('a password that does not match says so', await vis(p.getByText('Passwords don’t match')));
    await p.getByRole('button', { name: 'Create account' }).click(); await p.waitForTimeout(500);
    check('the terms box is required, in words', await vis(p.getByText('Please accept the terms to continue')));
    check('there is one checkbox and it is at least 44 high', (await p.getByRole('checkbox').count()) === 1 && (await p.getByRole('checkbox').boundingBox()).height >= 44);
    await p.getByPlaceholder('Re-enter password').fill('Trip2027go'); await p.getByRole('checkbox').click(); await p.getByRole('button', { name: 'Create account' }).click(); await p.waitForTimeout(2500);
    check('a new account lands in Make it yours', await vis(p.getByRole('heading', { name: /make it yours/i })));
    check('sign-up logs no console errors', errors.length === 0, errors.join(' | '));
    await ctx.close();
  }

  // ------------------------------------------------------------------ reset password
  {
    const { ctx, p, errors } = await open({ width: 390, height: 844 });
    await p.goto(BASE + '/sign-in', { waitUntil: 'networkidle' }); await p.waitForTimeout(1500);
    await p.getByRole('link', { name: 'Forgot password?' }).click(); await p.waitForTimeout(900);
    check('Forgot password opens the reset screen at step 1', await vis(p.getByRole('heading', { name: 'Reset password' })) && await vis(p.getByRole('progressbar', { name: 'Step 1 of 2' })));
    await p.getByPlaceholder('you@email.com').last().fill('ghost@school.org'); await p.getByRole('button', { name: 'Send reset code' }).click(); await p.waitForTimeout(500);
    check('an unknown email is told so', await vis(p.getByText(/couldn’t find an account/)));
    await p.getByPlaceholder('you@email.com').last().fill('maya.chen@togetherwego.app'); await p.getByRole('button', { name: 'Send reset code' }).click(); await p.waitForTimeout(900);
    check('the demo build shows the code', await vis(p.getByText(/Demo build: your code is \d{6}/)));
    await p.getByRole('button', { name: 'OK' }).click(); await p.waitForTimeout(500);
    check('step 2 shows the code on screen too and the step bar moves', await vis(p.getByLabel(/^Fill in the demo code \d{6}$/)) && await vis(p.getByRole('progressbar', { name: 'Step 2 of 2' })));
    await p.getByTestId('reset-code').fill('000000'); await p.getByTestId('reset-code').blur(); await p.waitForTimeout(300);
    check('a wrong code is refused in words', await vis(p.getByText('That code doesn’t match')));
    await p.getByLabel(/^Fill in the demo code \d{6}$/).click(); await p.waitForTimeout(300);
    await p.getByPlaceholder('At least 8 characters').fill('NewTrip2027'); await p.waitForTimeout(300);
    await p.getByRole('button', { name: 'Update password' }).click(); await p.waitForTimeout(1500);
    check('the new password is saved and you are back on sign-in', await vis(p.getByText(/Password updated/)) && await vis(p.getByTestId('sign-in')));
    await p.getByTestId('email').fill('maya.chen@togetherwego.app'); await p.getByTestId('password').fill('NewTrip2027'); await p.getByTestId('sign-in').click(); await p.waitForTimeout(3000);
    check('signing in with the new password works', await vis(p.getByRole('tab', { name: 'Home', exact: true }), 4000) || (await p.getByRole('button', { name: 'Skip' }).count()) > 0);
    check('reset logs no console errors', errors.length === 0, errors.join(' | '));
    await ctx.close();
  }

  console.log(results.join('\n'));
  await b.close();
})().catch((e) => { console.log(results.join('\n')); console.error('CRASH', e.message.slice(0, 600)); process.exit(1); });
