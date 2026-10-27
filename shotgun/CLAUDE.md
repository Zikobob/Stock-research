# Shotgun: project notes for Claude Code

**What it is.** A mobile-first Progressive Web App for a Diamond Challenge / Blue Ocean pitch, by a Delaware high-school student.
A voice co-pilot that "rides shotgun" and talks teen drivers through in-car emergencies hands-free, plus pre-license practice drills.
Original product; do not copy any other app. No backend, no accounts, no tracking: everything stays on the device.

**Stack (same as the "Hold On" app; add nothing else without the owner's approval).**
TypeScript (strict), React, Vite, Tailwind CSS v4 (Vite plugin, `@theme` in `src/index.css`), React Router,
`vite-plugin-pwa` (Workbox), `@mediapipe/tasks-vision` (Technique Lab), `idb` (IndexedDB), Vitest + Testing Library + jsdom,
Playwright (+ `@axe-core/playwright`), ESLint + Prettier. Goal: 250+ passing tests.

**Commands** (run from `shotgun/`):

- `npm run dev` / `build` / `preview`
- `npm test` (Vitest once), `npm run test:watch`, `npm run coverage`
- `npm run e2e` (Playwright; run `npx playwright install chromium` once, or set `E2E_CHROME` to a Chrome path)
- `npm run typecheck`, `npm run lint`, `npm run format`
- Phase 2 adds `npm run validate-content`.

**Always run `typecheck`, `lint`, `test` (and `e2e` from Phase 2) before saying a phase is done.** Never delete or skip a test to make it pass.
End every phase with a git commit, then stop and report to the owner: what was built, tests passed/total, how to see it, what to check by hand.

**Windows / PowerShell friendly.** Use npm scripts and cross-platform Node tools. No bash-only commands (`rm -rf`, `cp`, `export`) in scripts.
Forward slashes in config paths. Prefer separate commands to `&&` chains in instructions for the owner.

**Folders.** `src/app` (App, routes, layout, pages), `src/components` (shared UI), `src/features/<feature>` (voice, pullover, location,
guides, drills, crash, lab, training, driving-lock, business), `src/content` (ALL content as typed data, validated), `src/lib` (storage, geo math),
`src/test` (setup, helpers, fixtures), `e2e` (Playwright specs), `public` (icons; models and wasm come in Phase 7). Pure logic lives in plain
functions with unit tests; React components stay thin.

## Safety rules (non-negotiable)

1. Never encourage using the phone while driving. The app is voice-first.
2. "Car is moving" lock: `navigator.geolocation.watchPosition`; `coords.speed` is m/s and can be `null`. If speed > 2.2 m/s (~5 mph) for 3+ readings,
   switch to DRIVING MODE: only the huge HELP / PULL OVER button, voice, and a passenger-only "I'm the passenger" unlock. No reading, menus or typing.
   If speed is `null`, use distance between position updates; if still unknown ask "Are you parked?" with two giant buttons.
3. Every emergency flow says "Call 911" early and has a one-tap `tel:911` button. Never say the app replaces 911, a doctor or training.
4. First launch and every guide footer show: "Shotgun is an education tool. It does not replace 911, professional medical care, or certified
   first-aid/CPR training. Content reviewed by: [REVIEWER NAME, CREDENTIAL, DATE: placeholder until a real medical professional signs off]."
   Every guide has `reviewStatus: "draft" | "reviewed"`; drafts show a yellow "Not yet medically reviewed" badge.
5. Never diagnose: say "signs of" and "if you think".
6. Camera, mic, location: ask only when needed, explain why in one sentence, and always work with buttons if denied.

## Facts that other guides get wrong (keep them right)

- Choking (AHA 2025): conscious adult or child = 5 back blows, then 5 abdominal thrusts, repeat. Infant = 5 back blows + 5 chest thrusts.
- CPR: 100 to 120 per minute, at least 2 in (5 cm) and not more than 2.4 in (6 cm); hands-only for untrained bystanders.
- Delaware police report: $2,000 of damage (21 Del. C. section 4203, HB 28, effective 9/30/2021), not $500. Many websites are outdated.
- Delaware Move Over (21 Del. C. section 4134, HB 92, 2023): covers any stopped vehicle with hazards, flares, cones or signs.
- Chrome speech recognition usually needs the internet; Firefox has none. Big buttons + speech synthesis must always work.
- Nominatim (OpenStreetMap) public API: max 1 request/second, attribution, cache, only on a user tap. Keep it OFF until the owner confirms.
- Workbox ignores files over 2 MiB by default: raise `maximumFileSizeToCacheInBytes` (~15 MB) so MediaPipe models and wasm are cached.
- Do not invent sources or URLs. If a fact cannot be verified, mark the guide `draft` and tell the owner.

## Lessons (add a line whenever a mistake is made so it is not repeated)

- (none yet)
