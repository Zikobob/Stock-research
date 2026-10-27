# Browser tests

These tests open the **web build** of the app in a phone-sized browser window and use it like a person would. They sit next to the unit tests (`npm test`), which cover the logic without a screen.

```bash
npm install
npx playwright-core install chromium   # once: downloads a browser (or set E2E_CHROME to your Chrome)
npm run e2e                            # builds the web app, serves it, runs everything
npm run e2e -- --no-build              # reuse the last build
npm run e2e -- twophones overflow      # only some scripts
E2E_DIST=/tmp/mybuild E2E_PORT=8130 npm run e2e -- verify   # build into your own folder and port (to work next to someone else)
```

| Script | What it checks |
|---|---|
| `verify.js` | Home, Plan filters and Lock in, Budget (expenses, receipt, settle up), Chat and Scout AI, the More menu |
| `verify2.js` | Crew roles, polls and checklist, flights and validation, packing, recap, language switch, trip phases, joining a trip |
| `verify3.js` | Sign-up, the personalisation survey, themes, the first-run tour |
| `verify4.js` | The 360° city views: spin, day and night, landmarks, city picker |
| `places.js` | The "Where do you want to go?" box: matches appear as you type, each with how far it is from you; pick one, type your own, no connection, location not shared |
| `motion.js` | The phone's *Reduce Motion* setting: nothing hidden, nothing moving, Settings says why |
| `overflow.js` | **Every screen** at 390 px, 320 px and with larger text: nothing may stick out sideways |
| `nesting.js` | **Every screen**: no button may sit inside another button (React's *"`<button>` cannot contain a nested `<button>`"* warning) |
| `targets.js` | **Every screen**: every control you tap is at least 44 x 44 points (Fitts's law) |
| `auth.js` | The screens before you sign in (first-run slides, sign-in, sign-up, reset password): tap sizes, overflow and nesting at three phone sizes, then each one used like a person: validation in words, the demo ticket, Join with a code, Google, reset |
| `shoot.js` | Not a test: takes pictures of screens in any theme and in light or dark, so the design can be looked at |
| `twophones.js` | Two phones and the real sync server: share, join from a QR code, chat, expenses, offline catch-up, restart, photo, receipt and PDF |

Each script prints `PASS`/`FAIL` lines and `errors:` (browser console errors). `run.js` adds them up and exits with a non-zero code if anything failed.

The web build cannot show the native map, camera, notifications or file system; the on-phone parts of those features were built for iOS but not run on a physical phone.
