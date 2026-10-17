# Rating sheet map: where each point is earned

The FBLA 2026-27 *Mobile Application Development* rating sheet has 16 scored lines (110 points). This page lists every line, what we show the judges, and where to find it. It also lists the honest weak spots.

## Design and code quality (25)

| Line | Pts | Evidence | Where |
|---|---|---|---|
| Planning process | 10 | Personas, user journey, navigation map, MoSCoW priorities, data model, manual test log, all in one planning document. Terms used: persona, user journey, MoSCoW, MVP, MVVM, offline-first, one-way data flow. | `docs/PLANNING.md` |
| Classes, modules, components | 5 | UI kit of reusable components (`Screen`, `Card`, `Button`, `Press`, `Segmented`, `Donut`), trip widgets, one component per file, services for every outside system. The store is split into slices (`auth`, `trips`, `itinerary`, `budget`, `groupTools`, `social`, `files`, `demo`, `app`) and every large screen is a short composition of components (Home, Crew, Settings, Chat, Photos, Flights, Budget, Survey). No screen file is over 300 lines. | `src/components/ui/`, `src/components/home/`, `src/components/crew/`, `src/store/slices/`, `src/services/` |
| Architectural patterns | 5 | Layered MVVM: screens (views) read selector hooks and call store actions; services wrap APIs and device features; one-way data flow; Expo Router file-based navigation with `Stack.Protected` guards; platform-specific files (`TripMap.tsx` / `TripMap.web.tsx`). A separate **sync engine** that knows nothing about React or the network (store, storage and transport are passed in, so it is tested with two phones in memory), plus a small Node server. | `src/store/`, `src/app/`, `src/sync/`, `server/`, *More → How it works* |
| Innovation and creativity | 5 | **Live sync across phones** with a merge rule that gives identical trips whatever order changes arrive in (offline queue, photos and receipts included), 360° city views with day/night and night lights, skyline hero that follows the city's local time, offline Scout AI answering from trip data, "Lock in" voting, 7-step personalization survey with live themes, offline radar map, invite QR codes. | `src/sync/`, `src/app/panorama.tsx`, `src/services/assistant.ts`, `src/app/personalize.tsx` |

## User experience (20)

| Line | Pts | Evidence | Where |
|---|---|---|---|
| UX design: user journey, rationale, accessibility | 5 | Journey map and rationale in the planning doc. Accessibility: labels and roles on every control, adjustable text size, high-contrast palette, haptics toggle, "Animations" off switch that also follows the phone's **Reduce Motion** setting, 6 languages. A browser audit checks that no screen scrolls sideways at 390 px, 320 px or with larger text. | `docs/PLANNING.md`, *Settings*, `e2e/overflow.js` |
| Intuitive UI or clear instructions | 5 | First-run guided tour, a 9-step *How to use* page with an FAQ, inline hints, empty states that say what to do next. | `src/components/GuidedTour.tsx`, `src/app/help.tsx` |
| Icons and graphics consistent | 5 | Custom app icon (a take-off plane on a forest-green tile) reused as the in-app logo on sign-in, onboarding, tour and recap; one icon set and one palette throughout. | `assets/images/icon.png`, `src/components/Logo.tsx` |
| Input validation (syntax **and** meaning) | 5 | Syntax: email, invite-code format (`AML-2026`), time `HH:MM`, flight number, IATA code, amount parsing. Meaning: trip end after start, amount between limits, activity time-clash warning, duplicate email is refused, joining a trip you are already in is refused. | `src/utils/validation.ts` |

## Application functionality (25)

| Line | Pts | Evidence | Where |
|---|---|---|---|
| Addresses all parts of the prompt | 10 | The topic names collaboration, communication, scheduling, budgeting, organization and multi-user trip management. Each is a feature set, and the mapping is explained inside the app. | README section 2, *More → How it works → Rubric map* |
| Social media integration | 5 | Direct deep links into WhatsApp, X, Facebook, Messenger, Telegram, Instagram, SMS and email, plus the native share sheet. Photos and the **recap story card share as pictures**. Invites are a code, a link and a **QR code** (scan it inside the app or with a camera); the link opens the Join screen with the code filled in, and also carries the sync server's address. Invite link and QR round trips are unit tested. (Logging in with or posting to a social network from inside the app needs OAuth credentials and app review, which is out of reach for a student project.) | `src/services/share.ts`, `src/sync/invite.ts`, `src/components/crew/InviteQrSheet.tsx`, *Recap* |
| Data handling and storage | 5 | Zustand store persisted to local storage with versioned migrations (integrity); passwords salted and stretched with PBKDF2, session off when "Remember me" is off, API key in the Keychain/Keystore (protection); money kept in whole cents so totals never drift; export a trip, clear the sample data and reset all data (control); whole app works offline; shared trips are kept identical across phones and private data (Scout chat, emails, tickets) never leaves the phone. | `src/store/`, `src/sync/`, `src/services/secrets.ts`, `src/utils/password.ts`, *Settings* |
| Documentation and copyright | 5 | README, planning doc (with a test log), sync design, build guide, judge checklist and attributions: every library with its licence, every photo with its Unsplash source URL, fonts under OFL, no logos or trademarks. | `README.md`, `docs/`, `ATTRIBUTIONS.md` |

## Evidence that it works

* `npm test`: unit tests for money, validation, time zones, passwords, the store, the assistant, invites, QR codes and the whole sync stack (merge convergence on 150 random three-phone runs; the real server over HTTP).
* `npm run e2e`: browser tests of every main flow, a sideways-overflow audit of every screen, Reduce Motion, and two phones syncing through the real server.
* `docs/JUDGE_CHECKLIST.md`: things to try (wrong input, airplane mode, two phones, large text) and what should happen.

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
- [ ] **Links and QR codes**: you may show them, but judges must never scan or click them. Do not make the demo depend on a QR code or link (for the two-phone demo type the invite code on the second phone).
- [ ] **Two-phone sync demo**: phone A, phone B and the laptop (which shows the slides *and* runs `npm run server`) are exactly 3 devices. Put all three on a **phone hotspot** (venue wifi often blocks devices from seeing each other), start the server before set-up ends and check *Settings → Sync across phones → Test connection* on both phones.
- [ ] Nothing left with the judges afterwards. Pack up printouts.
- [ ] No food or animals. Topic stays "Together We Go: Group Trip Planner".
- [ ] Do not talk to the judges during the 3-minute set-up.
- [ ] Every teammate presents a part.
- [ ] Venue wifi may fail: use *Settings → Demo timeline*, airplane-mode offline demo, and the screenshots in `docs/screenshots/` as a backup.

## Honest weak spots (so you are not surprised in Q&A)

1. **Standalone run.** The rules say the solution must run standalone. Expo Go needs your laptop's dev server, so build an installed copy before the event (`docs/BUILDING.md`): `npx eas-cli@latest build -p android --profile preview` gives an `.apk` (free Expo account). iPhone standalone needs an Apple Developer account. **No installed build was made while writing this**: it needs an Expo account that only the team can create. The build configuration was checked with `expo prebuild`.
2. **Sync needs a server you run.** Phones share a trip through `npm run server` on a computer they can reach. There is no hosted service and no accounts, and the traffic is plain HTTP, so it belongs on a network you trust. Say so before a judge asks (`docs/SYNC.md`, "Limits").
3. **Not run on a physical phone.** The on-device file upload and download, the camera QR scanner and "share as picture" are native-only. They compile into the iPhone bundle and the logic around them is tested, but nobody has tapped them on a phone yet. Try them once before the event.
4. **Same-field edits.** If two people change the *same* field at the same instant, the later change wins and the other is lost. Chat, votes, expenses and photos are separate items, so they never clash.
5. **Passwords** use salted PBKDF2-HMAC-SHA256 with 10,000 rounds (a server would use 600,000 or Argon2id). The count is a judgement call for a phone's JavaScript engine: it takes about 20 ms in Node, and we expect well under a second on a phone, but we have **not timed it on a phone**. The work is split into 8 ms slices so the screen stays responsive, and the round count is stored in each hash so it can be raised later. Accounts live on the phone, not on a server.
6. **Live weather and exchange rates** need internet. Offline, the app shows the last saved data and labels it.
7. **"Continue with Google"** is a simulated account chooser and says so on screen.
