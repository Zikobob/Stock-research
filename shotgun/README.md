# Shotgun

A voice co-pilot that rides shotgun and talks teen drivers through in-car emergencies, plus pre-license practice drills.
A mobile-first, installable, offline Progressive Web App. No accounts, no tracking: everything stays on the device.

> Shotgun is an education tool. It does not replace 911, professional medical care, or certified first-aid/CPR training.

**Status:** Phase 0 (setup). See `PLAN.md` for the phases and `CLAUDE.md` for the project rules.

## Run it

```powershell
cd shotgun
npm install
npm run dev          # opens on http://localhost:5173 (localhost counts as secure, so camera, mic and location work)
```

```powershell
npm test             # unit and component tests (Vitest)
npx playwright install chromium   # once
npm run e2e          # end-to-end tests on a phone-sized browser (Playwright)
npm run typecheck
npm run lint
npm run build
```

Stack: TypeScript, React, Vite, Tailwind CSS v4, React Router. Later phases add vite-plugin-pwa and MediaPipe.
