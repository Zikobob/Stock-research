# 7-minute presentation script

Built around the rating sheet so every scored item gets shown. Times are cumulative. Split the speaking parts between teammates (all members must present).

**Before the 3-minute setup ends:** phone mirrored to the laptop, app open on the sign-in screen, *Settings → Demo timeline* set to **“Starts in 3 days”**, notifications allowed, volume up (for the phrasebook audio).

| Time | Show | Say (key points) | Rating-sheet item |
|---|---|---|---|
| 0:00 | Title / app icon | The problem: group trips scattered across chats, spreadsheets and screenshots. TogetherWeGo puts plan, money, people and paperwork in one place that works offline. | Program addresses the prompt |
| 0:30 | Planning doc (personas, journey, MoSCoW) | How we planned: personas → user journey → feature priorities → navigation map → data model. | Planning process |
| 1:00 | Sign-in → tap Demo Account → Sign In; then show a validation error on sign-up | Built with Expo SDK 57 / React Native for iOS **and** Android. Passwords are salted + hashed. Every form validates format *and* meaning. | Platform · Input validation · Data handling |
| 1:30 | Explore: active-trip card, live reminder countdown, search, categories, weather + nearest airport, radius slider | Home screen answers “what’s next?” at a glance. Radius slider + price filter find places nearby. | UX design · Functionality |
| 2:15 | Profile → Invite code → Share → WhatsApp/Instagram | Invite codes for collaboration; one tap shares straight into social apps. | **Social media integration** |
| 2:40 | Members & roles → change a role; vote in a poll; tick the checklist | Roles (Treasurer, Navigator, Food Lead…), polls and a shared checklist. | Collaboration |
| 3:10 | Itinerary: date pills, filters (Food, Under 1 hour), expand a card → “I’m in” confirms it; tap 🔔 | Majority voting auto-confirms. Bell = real phone notification before it starts. | Scheduling |
| 3:40 | Add Activity → submit empty (errors) → fill → overlap warning | Syntactic + semantic validation (it even warns about schedule clashes). | Input validation |
| 4:00 | Flights & arrivals → tap time-zone toggle | Flights are stored as exact instants, so arrivals convert between Tokyo time and your time. | Scheduling / time zones |
| 4:20 | Budget: breakdown, USD↔JPY view, add a ¥ expense, Settle up | Multi-currency expenses, fair splits, fewest payments to settle. | Budgeting |
| 4:50 | Chat → “How’s the budget?” / “Best food nearby?” | Trip Assistant answers from our real trip data — **offline**. Optional Claude mode with a key in the secure keychain. | Innovation & creativity |
| 5:20 | Turn on airplane mode → Documents, Map → Offline radar, Emergency | Built for bad wifi: documents, map, phrasebook and emergency info all work offline. | Data handling · UX |
| 5:50 | Settings → Language → 日本語; text size; then back to English | 6 languages, adjustable text size, screen-reader labels everywhere. | Accessibility |
| 6:05 | 🎨 on Explore → Make it yours → pick Sunset/Midnight + interests → Apply | Every user makes the app theirs: themes incl. dark mode, interests drive “Picked for you”, choose home sections; animations can be switched off. | Innovation · UX |
| 6:15 | Settings → Demo timeline “Just finished” → Recap | The full lifecycle: planning → travelling → recap with stats, highlights, balances, share. | Addresses all parts of prompt |
| 6:40 | README / ATTRIBUTIONS / code structure | Layered MVVM architecture, reusable components, strict TypeScript, 0 lint errors; every library, API and photo documented. | Code quality · Architecture · Documentation |

## Likely questions — short answers
- **How do friends’ phones stay in sync?** In this version data is stored on each device (offline-first). The store/service split means adding a sync backend (Firebase/Supabase) only changes the service layer — the screens stay the same.
- **Why Expo / React Native?** One TypeScript codebase for iOS and Android, native modules for notifications, maps, camera, files and secure storage.
- **How is data protected?** Salted SHA-256 password hashes, optional session persistence, API key in Keychain/Keystore, files in app-private storage.
- **What makes it accessible?** Labels and roles on every control, adjustable text size, colour contrast, haptics toggle, 6 languages, clear inline errors.
- **What happens with no internet?** Everything keeps working from local storage; weather and exchange rates show the last saved data (or an estimate) and say so.
- **How does the AI work offline?** It’s our own intent-matching engine over the trip data (budget math, settle-up algorithm, weather cache, place database). Claude is optional for open-ended questions.
