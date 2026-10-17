# Browser tests

These tests open the **web build** of the app in a phone-sized browser window and use it like a person would. They sit next to the unit tests (`npm test`), which cover the logic without a screen.

```bash
npm install
npx playwright-core install chromium   # once: downloads a browser (or set E2E_CHROME to your Chrome)
npm run e2e                            # builds the web app, serves it, runs everything
npm run e2e -- --no-build              # reuse the last build
npm run e2e -- twophones overflow      # only some scripts
```

| Script | What it checks |
|---|---|
| `verify.js` | Home, Plan filters and Lock in, Budget (expenses, receipt, settle up), Chat and Scout AI, the More menu |
| `verify2.js` | Crew roles, polls and checklist, flights and validation, packing, recap, language switch, trip phases, joining a trip |
| `verify3.js` | Sign-up, the personalisation survey, themes, the first-run tour |
| `verify4.js` | The 360° city views: spin, day and night, landmarks, city picker |
| `motion.js` | The phone's *Reduce Motion* setting: nothing hidden, nothing moving, Settings says why |
| `overflow.js` | **Every screen** at 390 px, 320 px and with larger text: nothing may stick out sideways |
| `nesting.js` | **Every screen**: no button may sit inside another button (React's *"`<button>` cannot contain a nested `<button>`"* warning) |
| `twophones.js` | Two phones and the real sync server: share, join from a QR code, chat, expenses, offline catch-up, restart, photo, receipt and PDF |

Each script prints `PASS`/`FAIL` lines and `errors:` (browser console errors). `run.js` adds them up and exits with a non-zero code if anything failed.

The web build cannot show the native map, camera, notifications or file system; the on-phone parts of those features were built for iOS but not run on a physical phone.
