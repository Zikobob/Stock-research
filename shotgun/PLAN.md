# Shotgun: plan

Work one phase at a time. After each phase: `npm run typecheck`, `npm run lint`, `npm test`, `npm run e2e` (from Phase 2), fix everything, commit, then stop for the owner's review.
Legend: [x] done, [ ] to do.

## Phase 0: Setup (done when `npm run dev` shows a Tailwind-styled "Shotgun" home screen; 1 unit + 1 e2e test pass; first commit)

- [x] Vite react-ts in `shotgun/`, TypeScript strict, Tailwind v4 via `@tailwindcss/vite` (`@import "tailwindcss"`, `@theme` colours)
- [x] React Router, ESLint (flat config) + Prettier
- [x] Vitest + jsdom + Testing Library (+ jest-dom, user-event), Playwright with a phone project
- [x] CLAUDE.md, PLAN.md, README.md, .gitignore
- [x] Home screen shell, layout with skip link, not-found page
- [x] Tests: 3 unit, 2 e2e

## Phase 1: Design system + safety shell

- [ ] `BigButton` (variants: emergency, primary, quiet; min 96 px tall for emergency), `StepCard`, `Timer`, `Metronome`, `DisclaimerBanner`, `ReviewBadge`
- [ ] Layout: dark "night drive" theme by default, light theme option, large-text option, respects `prefers-reduced-motion`
- [ ] First-launch disclaimer (blocks until accepted; remembered in localStorage) and the footer disclaimer
- [ ] Settings page (theme, text size, voice on/off) stored in localStorage
- [ ] Persistent "Call 911" button (`tel:911`) on every page
- [ ] Component tests; `@axe-core/playwright` scan of every main page; disclaimer e2e

## Phase 2: Content model + core guides

- [ ] `src/content/types.ts` (Source, Step, Guide, Sign, Drill), `sources.ts`
- [ ] Validator (`validate.ts`) + `npm run validate-content`: every guide has a source and a 911 item, at most 12 steps, steps at most 25 words, links resolve, unique ids
- [ ] The 7 core guides: CPR + AED, choking (AHA 2025), seizure, anaphylaxis, low blood sugar, driver faint / chest pain / stroke (BE FAST), crash scene
- [ ] First 60 signs
- [ ] Guide viewer + step runner + "read aloud" (speech synthesis)
- [ ] Generated test per guide (`test.each`); e2e opens every guide

## Phase 3: Voice + Pull-Over Protocol

- [ ] Speech wrappers (recognition feature-detect, synthesis), wake phrase parser ("Shotgun, help", "pull over"...)
- [ ] Pull-Over Protocol as a pure state machine (steps 1 to 6 + branches), commands: next, repeat, back, call 911, where am I, stop
- [ ] Buttons fallback; "Voice works here?" panel in Settings (Chrome needs internet; Firefox none; offline voice when available)
- [ ] Tests with fake speech; protocol works with voice off

## Phase 4: Mile Marker Mode + driving lock

- [ ] Geolocation (high accuracy), heading to "northbound" etc., coordinates read digit by digit, accuracy in feet
- [ ] Configurable geocoder (Nominatim OFF until the owner confirms): 1 req/s throttle, cache, attribution, only on tap
- [ ] Offline fallback with age of last fix; "what to tell 911" script
- [ ] Driving lock: speed over 2.2 m/s for 3+ readings; null-speed fallback; passenger unlock
- [ ] Unit tests (heading, speed logic, throttle, cache); e2e with mocked locations (moving, parked)

## Phase 5: After the Crash + more content

- [ ] Delaware checklist (21 Del. C. sections 4201, 4203, 4134) with sources and "last checked" date; saved locally; text export
- [ ] Expand to 40+ guides and 250+ signs (new ones marked `draft`)
- [ ] Validator passes on everything

## Phase 6: Training Mode

- [ ] Drill engine (multiple choice, ordering), 60+ drills, scoring, streaks, badges
- [ ] Progress dashboard in IndexedDB (`idb`), reset, JSON export
- [ ] Parent co-sign + print view
- [ ] Generated test per drill; progress survives reload (e2e)

## Phase 7: Technique Lab

- [ ] Local MediaPipe wasm + models (copy and download scripts, cross-platform Node)
- [ ] Camera page: permission handling (denied shows tips), stop camera and `close()` on leave
- [ ] CPR drill: rate, count, elbows, hand position, pauses over 10 s, spoken cues, metronome, session score
- [ ] Choking drill: 5 and 5 order coaching (demo motions only)
- [ ] Pure math (rate, angles, peaks) unit-tested with landmark fixtures; privacy note: video never leaves the device

## Phase 8: PWA + offline

- [ ] `vite-plugin-pwa` (prompt update toast, manifest, icons incl. maskable), globPatterns for wasm/task/json, max file size about 15 MB, navigate fallback
- [ ] No precache size warnings in `npm run build`; offline e2e (guides, drills, protocol, timers, Technique Lab)

## Phase 9: Business pages + polish

- [ ] `/schools`, `/insurers` (concept, no payments), About page with reviewer credits
- [ ] Performance pass, final README with run steps and a judges' demo script
- [ ] 250+ tests, lint and typecheck clean, Lighthouse PWA and accessibility good, tag `v1.0`

## Open questions for the owner

- Nominatim use (Phase 4): confirm a deliberate choice or pick another geocoder.
- A nurse, EMT or CPR instructor to review every guide before judging (Phase 2 onward uses `reviewStatus: "draft"`).
