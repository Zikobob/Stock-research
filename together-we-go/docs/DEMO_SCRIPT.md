# 7-minute presentation script

Built around the rating sheet so every scored item gets shown. Times are cumulative. Split the speaking parts between teammates (all members must present).

**Before the 3-minute set-up ends** (do not talk to the judges while you do it):

* Laptop: slides on screen, and a second terminal running `npm run server`. Put the laptop and **both phones on a phone hotspot** (venue wifi often stops devices seeing each other). That is exactly three devices.
* Phone A: signed in as the demo account, *Settings → Demo timeline* on **"Starts in 3 days"**, notifications allowed, volume up (phrasebook audio). *Settings → Sync across phones → Test connection* says **Connected**.
* Phone B: signed in with a second account (Sign Up with any name, skip the survey), on the *Join a trip* screen.
* Backup if the network fails: skip the two-phone minute and show `docs/screenshots/`.

| Time | Show | Say (key points) | Rating-sheet item |
|---|---|---|---|
| 0:00 | Title / app icon | The problem: group trips scattered across chats, spreadsheets and screenshots. TogetherWeGo puts plan, money, people and paperwork in one place that works offline. | Addresses the prompt |
| 0:25 | Planning doc (personas, journey, MoSCoW) | How we planned: personas → user journey → feature priorities → navigation map → data model → test log. | Planning process |
| 0:50 | Sign-in → tap Demo Account → Sign In; then a validation error on sign-up | Expo SDK 57 / React Native for iOS **and** Android. Passwords are salted and stretched (PBKDF2). Every form checks format *and* meaning. | Platform · Input validation · Data handling |
| 1:10 | Home: hero photo, ☀️/🌙 chip, countdown, code pill, weather + local time, budget, Up next | The hero follows the local time in Positano. Everything you need before a trip is on one screen. | UX · Functionality |
| 1:35 | Home → 360° chip → spin Positano, switch to Paris, 🌙 (lights come on), tap a landmark chip | Any city in 360°; at night the windows, landmarks and cars light up. Drawn in code, so it works offline. | Innovation · UX |
| 1:50 | More → Crew & roles → **Share** → WhatsApp; change a role; vote in a poll | Invite codes, roles, polls and a shared checklist. One tap shares into social apps; the invite is also a QR code (we do not ask you to scan it). | **Social media integration** · Collaboration |
| 2:20 | Crew & roles → **Share this trip across phones**; phone B: type the code → Join. Send a chat message from each phone, add an expense on B, add a photo on A | Two real phones, one server we run. Changes arrive within a second; the badge says *Live · 2 phones*. Mention airplane mode: changes wait and catch up. | Collaboration · Communication · Innovation |
| 3:00 | Plan: filters (Food, Under 1 hour), expand a card → 🔔; Vote tab → **Lock in** | Time and category filters. Votes show who is in; the organizer locks in the winner and the reminder turns on. | Scheduling · Collaboration |
| 3:30 | ➕ Add Activity → submit empty (errors) → fill → overlap warning | Syntactic and semantic validation (it even warns about schedule clashes). | Input validation |
| 3:50 | More → Flights & arrivals → tap the time-zone line | Flights are stored as exact instants, so arrivals convert between Rome time and your time. | Scheduling / time zones |
| 4:15 | Budget: donut, Local · EUR, ➕ add a € expense + **receipt photo**, Who owes who → Settle up | Money is kept in whole cents; the settle-up finds the fewest payments; the receipt is attached (and reaches the other phone). | Budgeting |
| 4:55 | Chat → Crew, then **Scout AI** → "How's the budget?" | The group chat stays human; Scout answers from our real trip data, **offline**. Optional Claude mode with a key in the secure keychain. | Innovation |
| 5:20 | Airplane mode → Offline Docs, Trip Map → Offline radar, Packing → Split the rest fairly | Built for bad wifi: documents, map, phrasebook and emergency info work offline. Everyone sees who is bringing what. | Data handling · Organization |
| 5:45 | Settings → Language → 日本語 → back; text size; mention Reduce Motion | 6 languages, adjustable text, screen-reader labels, and the phone's Reduce Motion setting is respected. | Accessibility |
| 6:00 | Home → Customize → Make it yours → Sunset/Midnight + interests → Apply | Every user makes the app theirs: themes incl. dark mode, interests drive "Picked for you". | Innovation · UX |
| 6:15 | Settings → Demo timeline "In progress" → Home "Today" card; then "Just finished" → Recap story card | The full lifecycle: planning → travelling → recap with stats, balances and a shareable story card. | Addresses all parts |
| 6:35 | More → How it works; then the repo: README, `docs/`, tests | Layered MVVM, a sync engine with its own tests, strict TypeScript, 0 lint errors; unit tests and browser tests; every library, API and photo documented. | Code quality · Architecture · Documentation |

**Protocol reminders** (full checklist in `docs/RATING_SHEET.md`): max 3 devices, no external speakers, no power, never ask judges to scan a QR code or click a link, leave nothing behind, stay silent during set-up.

## Likely questions: short answers

- **How do friends' phones stay in sync?** Every phone keeps its own full copy and turns each edit into a tiny stamped change. A small server we run passes the changes between phones, and each field takes its newest change, so all phones end up identical whatever the order. Changes made offline wait in a queue and are sent when the connection is back.
- **How do you know the merge is correct?** We wrote a test that makes three simulated phones edit at random (add, change, delete, vote) and swap changes in random orders, 150 times; they always end identical. There are also tests with the real server over real HTTP.
- **Why not Firebase?** It needs an account and keys that a school project cannot safely hold, and it does not give us offline merging for free. Our server is about 150 lines, has no dependencies and is part of the repo. A real release would put the same protocol behind HTTPS and accounts.
- **Is the sync secure?** A trip is protected by a 24-character random id that only the invite code reveals, code look-ups are rate limited, and private things (your Scout chat, people's emails, flight tickets) never leave your phone. It is plain HTTP, so it is for a network you trust. That is a stated limit, not a surprise.
- **What if the venue wifi blocks it?** We use a phone hotspot. Without a network each phone still works fully on its own.
- **What did you test?** Unit tests for the money maths (exact settle-up), validation, time zones, password hashing against the official test vector, the store, the assistant and the whole sync stack; browser tests of every main flow, a sideways-overflow audit of every screen, and two phones syncing. We have **not** yet tapped the camera QR scanner, on-device file upload and "share as picture" on a physical phone.
- **Why Expo / React Native?** One TypeScript codebase for iOS and Android, with native modules for notifications, maps, camera, files and secure storage.
- **How is data protected?** Salted PBKDF2-HMAC-SHA256 password hashes (stretched, upgraded automatically), optional session persistence, API key in Keychain/Keystore, files in app-private storage, private data kept off the sync server.
- **What makes it accessible?** Labels and roles on every control, adjustable text size, colour contrast, haptics toggle, Reduce Motion respected, 6 languages, clear inline errors.
- **What happens with no internet?** Everything keeps working from local storage; weather and exchange rates show the last saved data (or an estimate) and say so.
- **How does the AI work offline?** It is our own intent-matching engine over the trip data (budget maths, settle-up algorithm, weather cache, place database). Claude is optional for open-ended questions.
- **Can I try to break it?** Yes: `docs/JUDGE_CHECKLIST.md` lists things to try and what should happen.
