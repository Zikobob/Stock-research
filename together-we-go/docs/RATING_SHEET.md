# Rating sheet map: where each point is earned

The FBLA 2026-27 *Mobile Application Development* rating sheet has 16 scored lines (110 points). This page lists every line, what we show the judges, and where to find it. It also lists the honest weak spots.

## Design and code quality (25)

| Line | Pts | Evidence | Where |
|---|---|---|---|
| Planning process | 10 | Personas, user journey, navigation map, MoSCoW priorities, data model, manual test log, all in one planning document. Terms used: persona, user journey, MoSCoW, MVP, MVVM, offline-first, one-way data flow. | `docs/PLANNING.md` |
| Classes, modules, components | 5 | UI kit of reusable components (`Screen`, `Card`, `Button`, `Press`, `Segmented`, `Donut`), trip widgets, one component per file, services for every outside system. | `src/components/ui/`, `src/components/trip/`, `src/services/` |
| Architectural patterns | 5 | Layered MVVM: screens (views) read selector hooks and call store actions; services wrap APIs and device features; one-way data flow; Expo Router file-based navigation with `Stack.Protected` guards; platform-specific files (`TripMap.tsx` / `TripMap.web.tsx`). | `src/store/`, `src/app/`, *More → How it works* |
| Innovation and creativity | 5 | 360° city views with day/night and night lights, skyline hero that follows the city's local time, offline Scout AI answering from trip data, "Lock in" voting, 7-step personalization survey with live themes, offline radar map. | `src/app/panorama.tsx`, `src/services/assistant.ts`, `src/app/personalize.tsx` |

## User experience (20)

| Line | Pts | Evidence | Where |
|---|---|---|---|
| UX design: user journey, rationale, accessibility | 5 | Journey map and rationale in the planning doc. Accessibility: labels and roles on every control, adjustable text size, high-contrast palette, haptics toggle, "Animations" off switch, 6 languages. | `docs/PLANNING.md`, *Settings* |
| Intuitive UI or clear instructions | 5 | First-run guided tour, a 9-step *How to use* page with an FAQ, inline hints, empty states that say what to do next. | `src/components/GuidedTour.tsx`, `src/app/help.tsx` |
| Icons and graphics consistent | 5 | Custom app icon (a take-off plane on a forest-green tile) reused as the in-app logo on sign-in, onboarding, tour and recap; one icon set and one palette throughout. | `assets/images/icon.png`, `src/components/Logo.tsx` |
| Input validation (syntax **and** meaning) | 5 | Syntax: email, invite-code format (`AML-2026`), time `HH:MM`, flight number, IATA code, amount parsing. Meaning: trip end after start, amount between limits, activity time-clash warning, duplicate email is refused, joining a trip you are already in is refused. | `src/utils/validation.ts` |

## Application functionality (25)

| Line | Pts | Evidence | Where |
|---|---|---|---|
| Addresses all parts of the prompt | 10 | The topic names collaboration, communication, scheduling, budgeting, organization and multi-user trip management. Each is a feature set, and the mapping is explained inside the app. | README section 2, *More → How it works → Rubric map* |
| Social media integration | 5 | Direct deep links into WhatsApp, X, Facebook, Messenger, Telegram, Instagram, SMS and email, plus the native share sheet. Photos share as images. Invite codes and the trip recap share straight from the app. | `src/services/share.ts`, *Crew & roles → Share*, *Recap* |
| Data handling and storage | 5 | Zustand store persisted to local storage with versioned migrations (integrity); salted password hashes, session off when "Remember me" is off, API key in the Keychain/Keystore (protection); export a trip and reset all data (accessibility and control); whole app works offline. | `src/store/useAppStore.ts`, `src/services/secrets.ts`, *Settings* |
| Documentation and copyright | 5 | README, planning doc, attributions: every library with its licence, every photo with its Unsplash source URL, fonts under OFL, no logos or trademarks. | `README.md`, `ATTRIBUTIONS.md` |

## Presentation delivery (30)

| Line | Pts | Prepared | Where |
|---|---|---|---|
| Organized, clearly stated | 10 | A timed 7-minute script built around this very sheet, with a speaker split. | `docs/DEMO_SCRIPT.md` |
| Confidence, body language, eye contact, voice | 10 | Rehearse with the table below. Judges mark this by watching you, not the app. | n/a |
| Answering questions | 10 | Short answers to the likely questions (sync, security, offline, why React Native, accessibility). | `docs/DEMO_SCRIPT.md` |

## Presentation protocols (10): the checklist

- [ ] At most **3 devices** (e.g. phone + laptop for slides + a tablet). Screens laptop-sized or smaller.
- [ ] **No external speakers**: audio (phrasebook voice) comes from the phone itself.
- [ ] **No power outlet**: charge everything beforehand.
- [ ] **Links and QR codes**: you may show them, but judges must never scan or click them. Do not make the demo depend on a QR code or link.
- [ ] Nothing left with the judges afterwards. Pack up printouts.
- [ ] No food or animals. Topic stays "Together We Go: Group Trip Planner".
- [ ] Do not talk to the judges during the 3-minute set-up.
- [ ] Every teammate presents a part.
- [ ] Venue wifi may fail: use *Settings → Demo timeline*, airplane-mode offline demo, and the screenshots in `docs/screenshots/` as a backup.

## Honest weak spots (so you are not surprised in Q&A)

1. **Standalone run.** The rules say the solution must run standalone. Expo Go needs your laptop's dev server, so build an installed copy before the event: `npx eas-cli@latest build -p android --profile preview` gives an `.apk` (needs a free Expo account). iPhone standalone needs an Apple Developer account.
2. **Phones don't sync with each other.** Data lives on each device. The service layer is where a Firebase/Supabase backend would plug in without touching the screens. Say this out loud rather than letting a judge find it.
3. **Passwords** use one round of salted SHA-256. A real server should use bcrypt or Argon2, and sign-in should run on the server.
4. **Live weather and exchange rates** need internet. Offline, the app shows the last saved data and labels it.
