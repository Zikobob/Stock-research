# TogetherWeGo design system

**The idea: a boarding pass printed on paper.** The app looks like the things you carry on a trip: tickets, stamps, a departures board, a passport. A warm paper page, black ink for every word and outline, one flat accent colour used like a highlighter, and a hard "plate" of ink under the things you can press. Nothing glows, blurs or fades. That restraint is what makes it look designed instead of generated.

The second idea is **quiet base, loud moments**: the frame is calm, and colour, motion and celebration are kept for the moments that matter (the countdown, a vote locking in, a quiz win). Each screen has at most one loud thing.

The colours live in `src/theme/palettes.ts` (plain data, unit-tested), the other tokens in `src/theme/index.ts`, the building blocks in `src/components/ui/`.

## 1. Look

### Colour: a theme (accent) and a mode (light, dark, or follow the phone)

| Part | Light (paper) | Dark (night flight) |
|---|---|---|
| Page | `#F4EFE4` | `#121212` |
| Card | `#FFFDF8` | `#1E1C19` |
| Sheet | `#FFFDF8` | `#2A2722` (height = a lighter surface) |
| Ink: text, every outline, main buttons | `#16130E` | `#F1EADC` (cream) |
| Secondary, muted text | `#4D463A`, `#6B6353` | `#C4BCAA`, `#A39B89` |
| Plate (the hard shadow) | ink | the accent |

Six themes, each adding **one flat accent** (used as a fill, never as a gradient):

| Theme | Light | Dark |
|---|---|---|
| Limoncello (default) | `#FFD23F` | `#F6CF4D` |
| Tomato | `#FF5B37` | `#FF8461` |
| Lagoon | `#25CDB8` | `#4FD8C8` |
| Bubblegum | `#FF8DB8` | `#FF9EC4` |
| Grape (picking it switches to dark) | `#A394FF` | `#B7A9FF` |
| Ink | black | cream |

Rules:

* The accent is a **highlighter**: selected chips, the tab sticker, the plate under the main button in the light mode, the one stamp that matters, a bar that fills. Text on it is ink (`onAccent`). As text on paper use `accentText`, the accent darkened until it passes 4.5:1.
* **No gradients** (a scrim on a photo, so type stays readable, is the only exception) and **no soft or blurred shadows**.
* **Green, amber and red mean a state** (under budget, near, over; going, maybe, can't go; delete) and are never decoration. A state also gets an icon or a word, never colour alone.
* **No emoji as decoration.** Icons are Ionicons line icons. Emoji appear only where a person typed them (a nickname, a message).
* Every text pair is checked by `src/theme/__tests__/palettes.test.ts`: body text reaches 4.5:1 (WCAG AA) on every surface in all 6 themes in both modes.

### Type: three voices (`T` in `src/components/ui/T.tsx`)

| Voice | Font | Variants | Use |
|---|---|---|---|
| **Serif** | Fraunces, heavy | `display` 40, `headline` 26 | Page titles and section titles. Sentence case. Never for paragraphs, never below 26 px. |
| **Mono** | Space Mono bold | `hero` 72, `numeral` 34, `numeralSm` 22, `kicker` 11 (caps) | Every number that matters (days, money, times, scores) and the small caps labels (DAY 02 / 05, POSITANO, WHO PAID). The print on a ticket. |
| **Grotesk** | Space Grotesk | `h1` 26, `h2` 21, `h3` 18, `title` 16, `body` 16, `bodySm` 15, `small` 14, `caption` 12.5, `micro` 11 | Everything you read. |

### Shape, depth and space

* **Outline:** every card, button, input and chip has a 2 px ink outline (`line`). Dividers *inside* a card are 1 px (`hair`). Section titles sit over a 2 px rule (`Rule`).
* **Radius:** 10 for buttons and inputs, 12 for cards and images, 16 for sheets and dialogs, 8 for chips and tags. Round shapes are only for avatars, dots and the notches of a ticket. *Corner style* in Settings scales them.
* **Plate:** pressable things and the one standing card per screen have a solid plate 4 px right and down (`Plate`, `PlatePress`). Pressing slides the face onto the plate. Flat cards have no plate.
* **Space:** a 4-point scale (`space`). The gap **between** blocks (`space.section`, 32) is always bigger than the gap **inside** one (8 to 16).
* **Touch:** everything you tap is at least 44 x 44 points (`touch.min`) in its real size. Buttons are 44, 48 or 56 high.

### Motifs (use these, do not invent new ones)

| Motif | Component | Where |
|---|---|---|
| **Ticket** with a perforated stub and punched edges | `Ticket` | The trip on Home, Up next, flights, the invitation, the recap |
| **Stamp**: a short word in mono caps in an outline, slightly crooked | `Stamp` | Every status: GOING, LOCKED IN, SETTLED, OVER BUDGET, NEW BEST. It can slam in (`slam`). |
| **Departures board** digits that flip | `SplitFlap` | The countdown (days to go) |
| **Plate** under a button or card | `Plate`, `PlatePress` | Buttons, the floating add button, the standing card |
| **Rule** (solid) and **Perforation** (dashed) | `Rule`, `Perforation` | Under titles, between a ticket's halves |
| **Sticker** (accent block with an outline) | tab bar, `Fab`, chosen `Chip` | The thing that is selected or main |

### Motion (`src/components/ui/motion.tsx`)

* Pressing a plated thing slides it onto its plate (70 ms) and springs back; anything else squeezes to 96%. Small things take 150 to 250 ms, sheets 340 ms.
* Headlines slide up word by word (`StaggerText`); the countdown flips (`SplitFlap`); the photo hero zooms slowly and drifts against the scroll.
* **Everything that moves is gated** by `useMotion()`: it stops when *Animations* is off or the phone's *Reduce Motion* is on. Replace movement with a fade, never remove content.
* **Celebrations are rare and chosen** (`celebrate()`): a quiz win, an activity or poll locking in, a settled budget, "1 day to go", the end of *Make it yours*. The haptic always ticks; confetti follows the *Effects* setting (Chill none, Lively some, Max lots).
* **Loading** shows a `Skeleton` the size of the real thing. **Empty** screens are invitations (`EmptyState`): a line icon in a dashed ring, a serif prompt, one button.

## 2. Structure

* **Five tabs:** Home, Plan, Budget, Chat, More. Home first and More last, the ends that are easiest to find. A sticker slides to where you are.
* **Home**, in the order of the chosen layout (*Planner*, *Money* or *Party*; any block can be hidden or moved in Settings): the boarding pass (photo, days to go, crew, invite code), Up next, Weather, Group budget, Your crew, Play (today's trivia, the crew-points podium, something to vote on), then Picked for you and Discover.
* **Make it yours** is short: Welcome, Look (theme and mode), Interests, Home layout, Vibe (effects and a trivia reminder), then a reveal. One question per screen, every step skippable, every answer changes the app you can see, all editable later in Settings, with *Make it yours again*.
* **One main action per screen** in the thumb zone: the accent **+** button at the bottom right (`Fab`) or a black button at the bottom of a sheet.

## 3. The Laws of UX, and how the app uses them

| Law | In plain words | What the app does |
|---|---|---|
| **Hick's law** | More choices, slower decisions | Five tabs; More is 4 groups of big tiles; settings are a few cards with the rest under *Advanced*; Add activity asks for a place first and hides the rest under *More options*; Home shows the blocks you chose. |
| **Fitts's law** | Big, close targets are easy | Every tap target is at least 44 pt (`e2e/targets.js` checks every screen); the main action sits in the thumb zone; destructive buttons are never next to the main one. |
| **Jakob's law** | People expect what other apps do | Bottom tabs, a back arrow, pull to refresh, bottom sheets, a share sheet, standard switches, a keyboard that does not cover the field. |
| **Miller's law**, **chunking** | Short lists are easier to hold | Lists are grouped under headings; the crew shows 4 faces and "+3"; sheets group fields in 3 to 5. |
| **Proximity**, **common region** | Things that belong together sit together | 32 between blocks, 8 to 16 inside; each idea sits in its own outlined card. |
| **Similarity** | Things that look alike behave alike | One button style per kind of action; chips always choose; stamps are always labels; one icon family. |
| **Prägnanz** | People read the simplest shape | Flat paper, one outline weight, three radii, no gradients, no shadows. |
| **Von Restorff effect** | The odd one out is remembered | The accent and the one black button are the only loud things on a screen, so they are what you notice. |
| **Aesthetic-usability effect** | Beautiful feels easier | One idea (a boarding pass), applied everywhere, with real photos and a systematic type scale. |
| **Doherty threshold** | Answer within 400 ms | Optimistic updates, skeletons, saved places shown at once while web results load, 70 to 250 ms transitions. |
| **Goal-gradient**, **Zeigarnik** | Progress pulls you to finish | The step bar in *Make it yours*, the budget bar, packing and checklist progress, a countdown. |
| **Peak-end rule** | The high point and the end are remembered | Confetti and a stamp slam at the moments that matter, a "Building your trip HQ" reveal at the end of the survey, a trip recap you can share. |
| **Serial position effect** | First and last items stick | Home first and More last in the tab bar; the main action first in a list of actions. |
| **Tesler's law** | The app, not the user, absorbs complexity | Categories are guessed from the words, distances are worked out for you, currencies are converted, time zones are shown for you. |
| **Postel's law** | Be liberal in what you accept | "the museum" finds "Museum"; dates and times are checked kindly; half-typed forms are kept (`useDraft`). |
| **Mental model**, **paradox of the active user** | People start using it at once | A demo account, a short tour instead of a manual, familiar words. |
| **Cognitive load**, **selective attention** | Less to take in at once | Progressive disclosure (*More options*, *Advanced*, *Filter*), one question per screen, a calm base so the few bright things are seen. |
| **Choice overload** | Too many options freeze people | Presets first (three Home layouts, six themes), custom second. |

## 4. Accessibility

* **Contrast:** unit-tested. **Text size:** the Settings switch scales text; the serif and mono voices grow less so layouts hold. **Reduce Motion** is respected and nothing is hidden when motion stops.
* **Targets:** at least 44 pt; `e2e/targets.js` fails on anything smaller.
* **Screen readers:** every control has a name; the countdown reads as a sentence; decorative marks are hidden.
* **Colour is never the only signal.**

## 5. Checking the design

```bash
npm test                         # palettes, contrast, layouts, confetti, migrations ...
npm run e2e                      # every screen at 3 sizes, no nested buttons, tap-target sizes, reduced motion ...
node e2e/shoot.js --modes=light,dark --themes=amalfi,midnight --routes=explore,itinerary   # pictures to look at
```

**Before adding or changing a screen:** use `Screen` and `Header`, the `T` variants and the tokens (no loose hex colours or font sizes), one `Fab` or one primary `Button`, `Stamp` for statuses, an `EmptyState`, a `Skeleton` for anything that loads, `celebrate()` only for a real achievement, no emoji, no gradient, no soft shadow. Then look at it in the light and the dark mode.
