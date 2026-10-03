# TogetherWeGo — Planning documents

These are the planning artifacts behind the app (rating sheet: *Planning Process — tangible planning documents*).

## 1. Problem statement
Group trips fall apart in group chats: plans live in five apps, nobody knows who paid for what, flights land at different times in different time zones, and the one person with the booking PDF has no signal. **TogetherWeGo puts the whole trip — plan, money, people and paperwork — in one shared place that still works offline.**

## 2. Personas
| Persona | Needs | Features that serve them |
|---|---|---|
| **Maya, 17 — the organizer** | Get six friends to agree, keep everyone on schedule | Invite codes, roles, polls & activity voting, live reminders, printable planner |
| **Priya, 17 — the treasurer** | Track a shared budget fairly, settle up without awkwardness | Budget cap, multi-currency expenses, splits, fewest-payment settle-up |
| **Diego, 16 — the foodie** | Find great food nearby within budget | Nearby radius + price filter, budget finds, Trip Assistant “best food nearby?” |
| **Mr. Kim — a parent chaperone** | Know where everyone is, keep documents & emergency info handy | Flights & arrivals board, offline document vault, emergency numbers, location sharing |

## 3. User journey
```mermaid
flowchart LR
  A[Onboarding] --> B[Sign in / Sign up]
  B --> C{Has a trip?}
  C -- no --> D[Create trip<br/>or Join with code]
  C -- yes --> E[Explore]
  D --> F[Invite group<br/>share code to socials]
  F --> G[Assign roles]
  G --> H[Build itinerary<br/>vote & confirm]
  H --> I[Add flights<br/>time-zone board]
  I --> J[Budget & expenses]
  J --> K[Travel: reminders,<br/>chat + assistant, map,<br/>photo dump]
  K --> L[Mark complete →<br/>Recap & settle up]
```

## 4. Navigation map
```mermaid
flowchart TB
  Root[Root Stack<br/>Stack.Protected] --> Auth[Onboarding · Sign in · Sign up · Reset password]
  Root --> Tabs[Bottom tabs]
  Tabs --> T1[Explore]
  Tabs --> T2[Itinerary]
  Tabs --> T3[Budget]
  Tabs --> T4[Chat]
  Tabs --> T5[Profile / Trip hub]
  Root --> More[Stack screens]
  More --> M1[Destination · All destinations · Nearby · Map]
  More --> M2[Flights · Weather · Currency · Nearest airport]
  More --> M3[Photo dump · Documents · Packing · Bucket list]
  More --> M4[Quiz · Survey · Recap · Emergency · Phrasebook]
  More --> M5[My trips · New/Edit trip · Join · Notifications · Settings · Help · About]
```

## 5. Architecture
```mermaid
flowchart LR
  subgraph View[Views — src/app + src/components]
    S[Screens] --> UI[UI kit: Button, Sheet, Chip, Input, Slider…]
  end
  subgraph VM[View-model — selector hooks]
    H[useActiveTrip · useCurrentUser · tripStatus · balances · settlePlan]
  end
  subgraph Model[Model — src/store]
    Z[(Zustand + Immer store)] --> P[(AsyncStorage<br/>offline persistence)]
  end
  subgraph Svc[Services — src/services]
    W[weather] & C[currency] & N[notifications] & AI[assistant] & F[files] & PR[print] & SH[share] & L[location] & SE[secrets]
  end
  S --> H --> Z
  S -- actions --> Z
  S --> Svc
  W --> OM[(Open-Meteo)]
  C --> ER[(ExchangeRate API)]
  AI -. optional .-> CL[(Claude API)]
  SE --> KC[(Keychain / Keystore)]
```

## 6. Data model
```mermaid
erDiagram
  ACCOUNT ||--o{ MEMBER : "is"
  TRIP ||--|{ MEMBER : has
  TRIP ||--o{ ACTIVITY : schedules
  TRIP ||--o{ EXPENSE : tracks
  TRIP ||--o{ FLIGHT : lists
  TRIP ||--o{ POLL : runs
  TRIP ||--o{ TASK : checklist
  TRIP ||--o{ DOC : vault
  TRIP ||--o{ MESSAGE : chat
  TRIP ||--o{ PHOTO : "photo dump"
  TRIP ||--o{ PACKING_ITEM : packs
  ACTIVITY }o--o{ MEMBER : "assigned / votes"
  EXPENSE }o--|| MEMBER : "paid by"
  EXPENSE }o--|{ MEMBER : "split between"
  FLIGHT }o--|| MEMBER : "belongs to"
```
Key decisions:
- **Dates vs. instants.** Itinerary times are wall-clock times in the destination’s zone (`2026-10-06` + `14:30`), because that is how people plan. Flights are stored as UTC instants so they convert correctly to any time zone.
- **Money in one base currency.** Expenses are stored in USD (with the original amount kept) so totals and splits are always comparable; views convert to home or local currency.
- **Majority voting.** A “voting” activity becomes “confirmed” when more than half of members vote yes.

## 7. Feature priorities (MoSCoW)
| Must | Should | Could | Won’t (this version) |
|---|---|---|---|
| Trips + invite codes, roles, itinerary, voting, budget & splits, chat, flights & time zones, reminders, offline storage, validation | AI assistant, currency converter, weather, documents vault, map, nearby radius & filters, printable planner, social sharing | Quiz, survey recommendations, phrasebook TTS, recap, packing suggestions, emergency screen, 6 languages | Cloud sync server, real Google OAuth, payments |

## 8. Accessibility & UX rationale
- Reference-matched visual language: cream canvas, forest-green primary, soft-green highlights, pill navigation — calm and readable outdoors.
- Every icon-only control has an `accessibilityLabel`; toggles expose checked/selected state; sliders are adjustable with screen readers.
- Text size setting (Default / Large / Extra large) on top of the phone’s own font scaling.
- Errors appear inline under the field in red with a plain-language fix (“Codes look like ABC-1234”).
- Destructive actions always confirm; toasts confirm every successful action.

## 9. Test log (manual + automated browser run)
| Area | Checks |
|---|---|
| Auth | Empty-field errors, wrong password, sign-up validation & strength meter, reset-code flow, old password rejected after reset |
| Itinerary | Add-activity validation, overlap warning, vote → auto-confirm, reminder toggle, edit, delete, category filter |
| Budget | Amount validation, ¥ expense converted to USD, settle-up records payment, budget-cap validation |
| Collaboration | Join with empty/unknown/valid code, add-member validation (name, email), polls (vote, close), checklist add + empty-task error |
| Flights | Missing-field errors, unknown IATA rejected, flight saved, time-zone toggle |
| Platform | `tsc --noEmit` (strict) ✔, `expo lint` 0 problems ✔, `expo-doctor` 21/21 ✔, iOS + Android bundles compile ✔ |
