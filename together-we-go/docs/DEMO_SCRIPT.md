# 7-minute presentation script

Built around the rating sheet so every scored item gets shown. Times are cumulative. Split the speaking parts between teammates (all members must present).

**Before the 3-minute setup ends:** phone mirrored to the laptop, app open on the sign-in screen, *Settings → Demo timeline* set to **“Starts in 3 days”**, notifications allowed, volume up (for the phrasebook audio).

| Time | Show | Say (key points) | Rating-sheet item |
|---|---|---|---|
| 0:00 | Title / app icon | The problem: group trips scattered across chats, spreadsheets and screenshots. TogetherWeGo puts plan, money, people and paperwork in one place that works offline. | Program addresses the prompt |
| 0:25 | Planning doc (personas, journey, MoSCoW) | How we planned: personas → user journey → feature priorities → navigation map → data model. | Planning process |
| 0:50 | Sign-in → tap Demo Account → Sign In; then show a validation error on sign-up | Built with Expo SDK 57 / React Native for iOS **and** Android. Passwords are salted + hashed. Every form validates format *and* meaning. | Platform · Input validation · Data handling |
| 1:10 | Home: hero photo, tap the ☀️/🌙 chip, countdown, code pill, weather + local time, budget, Up next | The hero follows the local time in Positano (sun by day, stars by night). Everything you need before a trip is on one screen. | UX design · Functionality |
| 1:35 | Home → 360° chip → spin around Positano, switch to Paris, ☀️/🌙 toggle (lights come on), tap a landmark chip | Any city can be explored in 360°; at night the windows, landmarks and cars light up. Drawn in code, so it works offline. | Innovation & creativity · UX |
| 1:50 | More → Crew & roles → Share code → WhatsApp; change a role; vote in a poll; tick the checklist | Invite codes, roles (Treasurer, Navigator, Food Lead…), polls and a shared checklist. One tap shares into social apps. | **Social media integration** · Collaboration |
| 2:20 | Plan: filters (Food, Under 1 hour), expand a card → 🔔; Vote tab → **Lock in** | Time + category filters. Votes show who’s in; the organizer locks in the winner and the reminder turns on. | Scheduling · Collaboration |
| 3:00 | ➕ Add Activity → submit empty (errors) → fill → overlap warning | Syntactic + semantic validation (it even warns about schedule clashes). | Input validation |
| 3:20 | More → Flights & arrivals → tap the time-zone line | Flights are stored as exact instants, so arrivals convert between Rome time and your time. | Scheduling / time zones |
| 3:45 | Budget: donut, Local · EUR, ➕ add a € expense + **receipt photo**, Who owes who → Settle up | Multi-currency expenses, fair splits, fewest payments to settle, receipts attached. | Budgeting |
| 4:30 | Chat → Crew, then **Scout AI** → “How’s the budget?” / “Best food nearby?” | The group chat stays human; Scout answers from our real trip data — **offline**. Optional Claude mode with a key in the secure keychain. | Innovation & creativity |
| 5:00 | Airplane mode → More → Offline Docs, Trip Map → Offline radar, Emergency | Built for bad wifi: documents, map, phrasebook and emergency info all work offline. | Data handling · UX |
| 5:20 | More → Packing list → Split the rest fairly | Everyone sees who is bringing what. | Organization |
| 5:40 | Settings → Language → 日本語; text size; then back to English | 6 languages, adjustable text size, screen-reader labels everywhere. | Accessibility |
| 5:55 | Home → “Customize this page” → Make it yours → Sunset/Midnight + interests → Apply | Every user makes the app theirs: themes incl. dark mode, interests drive “Picked for you”, choose home sections; animations can be switched off. | Innovation · UX |
| 6:15 | Settings → Demo timeline “In progress” → Home “Today” card; then “Just finished” → Recap story card | The full lifecycle: planning → travelling → recap with stats, balances and a shareable story card. | Addresses all parts of prompt |
| 6:40 | More → How it works; README / ATTRIBUTIONS | Layered MVVM architecture, reusable components, strict TypeScript, 0 lint errors; every library, API and photo documented. | Code quality · Architecture · Documentation |

**Protocol reminders** (full checklist in `docs/RATING_SHEET.md`): max 3 devices, no external speakers, no power, never ask judges to scan a QR code or click a link, leave nothing behind, stay silent during set-up.

## Likely questions — short answers
- **How do friends’ phones stay in sync?** In this version data is stored on each device (offline-first). The store/service split means adding a sync backend (Firebase/Supabase) only changes the service layer — the screens stay the same.
- **Why Expo / React Native?** One TypeScript codebase for iOS and Android, native modules for notifications, maps, camera, files and secure storage.
- **How is data protected?** Salted SHA-256 password hashes, optional session persistence, API key in Keychain/Keystore, files in app-private storage.
- **What makes it accessible?** Labels and roles on every control, adjustable text size, colour contrast, haptics toggle, 6 languages, clear inline errors.
- **What happens with no internet?** Everything keeps working from local storage; weather and exchange rates show the last saved data (or an estimate) and say so.
- **How does the AI work offline?** It’s our own intent-matching engine over the trip data (budget math, settle-up algorithm, weather cache, place database). Claude is optional for open-ended questions.
