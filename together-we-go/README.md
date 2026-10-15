# TogetherWeGo ✈️ — Group Trip Planner

**FBLA Mobile Application Development 2026–27 · Topic: “Together We Go: Group Trip Planner”**

TogetherWeGo helps a group of friends or family plan, budget and enjoy a shared trip — from the first idea, through the trip itself, to the final recap. It runs natively on **iPhone and Android** (Expo / React Native, TypeScript) and keeps working **offline**, which matters at a conference venue with unreliable wifi.

<p>
<img src="docs/screenshots/03-home-night.jpg" width="170" alt="Home with the night skyline hero"/>
<img src="docs/screenshots/04-home-day.jpg" width="170" alt="Home by day"/>
<img src="docs/screenshots/05-plan.jpg" width="170" alt="The Plan"/>
<img src="docs/screenshots/06-vote.jpg" width="170" alt="Vote tab with Lock in"/>
<img src="docs/screenshots/07-budget.jpg" width="170" alt="Budget with who owes who"/>
<img src="docs/screenshots/08-chat-scout-ai.jpg" width="170" alt="Chat: Crew and Scout AI"/>
<img src="docs/screenshots/09-more.jpg" width="170" alt="More menu"/>
<img src="docs/screenshots/19-360-day.jpg" width="170" alt="360° view of Paris by day"/>
<img src="docs/screenshots/20-360-night.jpg" width="170" alt="360° view of Paris at night with the lights on"/>
<img src="docs/screenshots/15-make-it-yours.jpg" width="170" alt="Make it yours: pick a colour theme"/>
<img src="docs/screenshots/16-midnight-theme.jpg" width="170" alt="Home in the Midnight dark theme"/>
</p>

---

## 1. Run it on your phone (5 minutes)

**You need:** a laptop with [Node.js 20+](https://nodejs.org), and the free **Expo Go** app on your phone ([iOS](https://apps.apple.com/app/expo-go/id982107779) · [Android](https://play.google.com/store/apps/details?id=host.exp.exponent)). Make sure Expo Go is up to date — this project uses **Expo SDK 57**.

```bash
cd together-we-go
npm install
npx expo start            # same wifi for phone + laptop
# or, on school / conference wifi that blocks devices from seeing each other:
npx expo start --tunnel
```

Scan the QR code (iPhone: Camera app · Android: Expo Go → *Scan QR code*).

**Demo login** (also shown on the sign-in screen — tap the box to fill it in):

| Email | Password |
|---|---|
| `maya.chen@togetherwego.app` | `TravelTogether2026!` |

The sample trip is generated **relative to today**, so “Amalfi Squad” (4 friends, 6 days in Positano, Italy) always starts in 3 days; a second 10-day “Tokyo & Kyoto Explorer” trip, a Bali plan and a finished Barcelona trip show multi-trip management. *Settings → Demo timeline* rebuilds it as **upcoming**, **in progress (Day 2)** or **just finished** to show every stage.

### For the competition: run with zero internet
Expo Go needs the laptop’s dev server. For a fully standalone app, build an installable copy with EAS (free account):

```bash
npx eas-cli@latest build -p android --profile preview   # gives you an .apk to install
```

(iOS standalone builds need an Apple Developer account; Expo Go over a phone hotspot also works without venue wifi.)
Once installed, everything except live weather, live exchange rates, maps tiles and the optional Claude AI works offline — and those fall back to cached/estimated data automatically.

Other scripts: `npm run web` (browser preview), `npx tsc --noEmit` (type-check), `npx expo lint`.

---

## 2. What it does — mapped to the brief

| Brief area | Feature in TogetherWeGo | Where |
|---|---|---|
| **Collaboration** | Trips with auto-generated invite codes (`AML-2026`), join by code or deep link | Home code pill · More → Crew & roles · *Join a trip* |
| | Roles: Organizer, Treasurer, Navigator, Food Lead, Photographer… with descriptions | More → Crew & roles |
| | Shared checklist with assignees | More → Crew & roles |
| | Voting: 👍/👎 on activities (majority auto-confirms) + multi-option polls | Plan → Vote tab (progress bar + **Lock in**) · More → Crew & roles (polls) |
| **Communication** | Group trip chat with typing indicators | Chat tab |
| | **Trip Assistant (AI chatbot)** — answers from live trip data: budget, who owes who, weather, food nearby, next activity, flights, time zones, currency, phrases, emergencies. Works offline; optional Claude mode with your own key | Chat tab (✨ button or quick chips) |
| **Scheduling** | Day-by-day itinerary/calendar with timeline, status pills, assignees | Plan tab |
| | Members upload flight tickets (photo/PDF); everyone’s arrivals & departures in one list | Flights |
| | **Time zones**: times stored as exact instants; toggle trip time ↔ your phone’s time | More → Flights & arrivals |
| | Trip map with itinerary pins, places and airports + **offline radar map** (no tiles needed) | Trip map |
| | **Live reminders**: tap 🔔 on an activity → real phone notification before it starts (10/30/60/120 min) + live countdown on Home | Activity card · Settings |
| **Budgeting** | Group budget cap, spent so far, per-person, % used | Budget tab |
| | Spending breakdown by category (Wanderlog-style bar) | Budget tab |
| | Currency converter (live rates, cached offline) + **home ↔ local currency view** | Budget tab · Currency |
| | Expenses in any currency, split between chosen members, **settle-up with fewest payments** | Budget tab |
| | Daily spending planner + “budget finds” within budget & radius | Budget tab |
| | Printable planner (print or save as PDF) | Plan → printer button · More → Printable Planner |
| **Organization** | Offline document vault (PDFs, photos, notes) | More → Offline Docs |
| | Weather (7-day forecast, best outdoor day, packing tips) | Weather |
| | Choose your own radius → popular places nearby | Home · More → Explore Nearby |
| | Photo dump with likes, captions, per-day filter, share to socials | Photo dump |
| | Activity filters (adventure, sightseeing, food…) **and** time filters (under 1 h, 1–2 h, 2–4 h, half day, full day) | Plan · Nearby |
| **Other** | Interactive travel quiz with timer, streak bonus and group leaderboard | Travel quiz |
| | 6 languages: English, Español, Français, 日本語, हिन्दी, 中文 | Settings → Language |
| | Bucket list with inspiration | Bucket list |
| | Tracks location → nearest airport, distance, drive time, directions | Nearest airport |
| | Recommendation survey → ranked destinations with photography | For you |
| | Offline map | Trip map → Offline |
| **Trip management** | Multiple trips, switch / create / edit / leave / delete, planning → active → completed | My trips |

### Extras to stand out
- **360° city views** — drag (or use the arrows / auto-rotate) to spin all the way around 10 popular cities: Positano, Tokyo, Paris, New York, London, Dubai, Sydney, Singapore, Rio and Rome. Three parallax skyline layers, famous landmarks (tap a landmark chip to turn to it and read a fact), a compass readout and a **day / night toggle**: at night the windows light up, the landmarks glow, cars stream along the street and stars and a moon come out. Open it from Home (360° chip), a destination page or More → 360° City Views.
- **Skyline hero that follows the clock** — the Home photo switches between a sunny day look (sun glare, drifting clouds) and a blue-hour night look (stars, moon) based on the local time in the trip’s city, with a sun/moon chip to preview the other half of the day.
- **Lock in voting** — Plan → Vote shows each proposal’s vote count, a progress bar towards a majority and a **Lock in** button (organizer only) that confirms it and turns its reminder on.
- **Scout AI tab** — the group chat stays human; the Trip Assistant has its own tab with quick questions (budget, food nearby, weather, who owes who…).
- **Today card** — once the trip starts, Home shows “Today · Day 2 of 6” with a tick-off list.
- **Who’s bringing what** — the packing list assigns every item to a person, with a “Split the rest fairly” button.
- **Receipt photos** on expenses, and a shareable **story card** for the trip recap.
- **First-run tour** and a **How it works** page (architecture, security, validation and a rubric map) inside the app.
- **Make it yours** — a 7-step animated personalization survey: 6 colour themes (Forest, Ocean, Sunset, Lavender, Sakura, **Midnight dark mode**), card shape (Rounded / Bubbly / Crisp), travel interests with photos, pace & budget style, which Explore sections to show, nickname + emoji avatar, language and home currency — with a live preview and a confetti finish. New accounts get it right after sign-up; it's always in *Settings*, the 🎨 button on Explore and the menu.
- **“Picked for you”** — Home ranks destinations against your interests and budget style and shows a match %.
- **Motion everywhere** — animated home hero (a plane flies a dotted route past drifting clouds and a pulsing sun), staggered card entrances, a tab highlight that glides between tabs, Ken Burns zoom on onboarding photos, floating logo, pulsing live-reminder bell. One *Animations* switch turns it all off for people who prefer less motion.
- **Trip recap** — stats (days, km between stops, votes, photos), highlights, final balances, rating, shareable summary.
- **Emergency & safety** — local police/ambulance numbers (tap to call), share live location, hospital & embassy finder.
- **Phrasebook** with **text-to-speech** pronunciation (Japanese, French, Spanish, Italian, Korean, Thai, Portuguese).
- **Smart packing list** — suggestions from the destination and the forecast (e.g. “IC card (Suica)”, umbrella when rain is likely).
- **Demo timeline** switch to show the whole trip lifecycle live.
- **Social media integration** — direct share into WhatsApp, Instagram, X, Facebook, Messenger, Telegram, Messages, Email + the native share sheet; photos share as images.
- Accessibility: screen-reader labels on every control, adjustable text size, haptics toggle, high-contrast palette.

---

## 3. How it’s built

```
src/
  app/            Screens (Expo Router — every file is a route)
    (tabs)/       Home · Plan · Budget · Chat · More
    *.tsx         Feature screens (flights, map, weather, photos, …)
  components/     Reusable UI kit (ui/), trip widgets (trip/), map (native + web)
  store/          Zustand store: data model, actions, selectors, demo seed
  services/       Side effects: weather, currency, notifications, assistant, files, print, share, location
  data/           Offline datasets: 32 destinations, curated places, 100+ airports, phrases, quiz…
  i18n/           Translations (6 languages) + useT() hook
  utils/          Validation, time zones, geo math, formatting
```

- **Architecture:** layered MVVM-style. Screens (views) read state through selector hooks (view-model) and call store actions; services wrap every external API/device capability so screens never talk to the network directly. One-way data flow.
- **State & storage:** Zustand + Immer, persisted to AsyncStorage → the whole app works offline and survives restarts.
- **Navigation:** Expo Router with `Stack.Protected` guards (signed-out users can only see onboarding/auth).
- **Platform-specific code:** `TripMap.tsx` (react-native-maps) vs `TripMap.web.tsx` (OpenStreetMap embed).
- **Theming:** `src/theme` holds 6 palettes and 3 corner styles. The saved choice is read synchronously before any screen's styles are created, so every `StyleSheet` picks up the user's palette; applying a new look restarts the UI once (`DevSettings.reload` on phones, a page reload on web).
- **Animations:** `src/components/ui/motion.tsx` (FadeIn, Float, Pulse, looping values) on React Native's `Animated` API with the native driver on iOS/Android.
- **React Compiler** enabled; the code passes the compiler’s lint rules (`npx expo lint` → 0 problems) and `tsc --noEmit` with `strict: true`.

### Data handling & security
- Passwords are **salted and SHA-256 hashed** (expo-crypto) — never stored in plain text.
- “Remember me” off → the session is not persisted.
- The optional Anthropic API key lives in the **iOS Keychain / Android Keystore** (expo-secure-store), never in the app database.
- Documents are copied into the app’s private storage so they stay available offline.
- Network calls have timeouts and fall back to cached or bundled data.

### Input validation (syntactic + semantic)
Email format, password strength meter, matching passwords, names (letters only), money amounts (`25` / `25.50`, positive, sane max), trip dates (end after start, ≤ 60 days, not in the past), invite-code format `ABC-1234`, flight numbers (`NH 175`), IATA codes checked against the airport database, arrival-after-departure across time zones, seat format, overlapping-activity warning, duplicate poll options, file-size limits.

---

## 4. Libraries, sources & licences
See **[ATTRIBUTIONS.md](ATTRIBUTIONS.md)** for every library, API, font, icon set and photo source. Planning documents: **[docs/PLANNING.md](docs/PLANNING.md)**. Presentation script: **[docs/DEMO_SCRIPT.md](docs/DEMO_SCRIPT.md)**.

## 5. Honest limitations
- There is **no cloud server**: trips are stored on each device. Invite codes join trips that exist on that device plus a built-in demo directory (try `SEO-5521`). A production version would sync through a backend such as Firebase or Supabase — the store/service split means only the service layer would change.
- The 360° city views are illustrated scenes drawn in code (SVG), not photographs, so they work offline and need no image licences. The Home hero’s day/night effect is a bundled photo with code-drawn light, stars and clouds (no video file), so it works offline and adds no download size.
- “Continue with Google” is a simulated account chooser; a store build would use Google OAuth (expo-auth-session).
- Claude AI mode requires the user’s own Anthropic API key; without it the built-in offline assistant answers.
- Standalone Android builds need a Google Maps API key for the native map (Expo Go already includes one); the offline radar map needs nothing.
