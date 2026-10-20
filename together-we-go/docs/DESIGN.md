# TogetherWeGo design system

**The idea: quiet base, loud moments.** The frame of the app is calm: a neutral canvas, black text, black buttons, one condensed headline face. Colour, motion and celebration are saved for the moments that matter: the hero, the countdown, a vote locking in, a quiz win, the last step of "Make it yours". When everything is loud nothing is, so each screen gets at most one loud thing.

This page is the reference for anyone changing the look. The colours live in `src/theme/palettes.ts` (plain data, unit-tested), the other tokens in `src/theme/index.ts`, the building blocks in `src/components/ui/`.

## 1. Look

### Colour: a theme (accent) and a mode (light, dark, or follow the phone)

| Part | Light | Dark |
|---|---|---|
| Page | `#FFFFFF` | `#121212` (never pure black) |
| Card, then sheet | white, white | `#1E1E1E`, then `#2A2A2A`: height is shown by a **lighter surface**, not a shadow |
| Text, then secondary, then muted | `#0A0A0A`, `#4A4A4A`, `#6B6B6B` | `#F5F5F5`, `#BDBDBD`, `#A0A0A0` |
| Primary action (every main button) | black | white |

Every theme adds **one** vivid accent and a soft gradient wash for the top of a page:

| Theme | Accent (light, dark) | Wash |
|---|---|---|
| Amalfi 🍋 (default) | lemon `#FBC91B`, `#F2CC4A` | pale lemon |
| Sunset 🌅 | `#FF5A36`, `#FF8A6B` | peach to pink |
| Lagoon 🌊 | `#00B3A4`, `#4FD1C5` | mint |
| Rose 🌸 | `#F2427F`, `#FF8DB3` | blossom |
| Midnight 🌙 | `#7A5CFF`, `#B69CFF` (soft violet) | violet; picking it switches to dark |
| Classic ⚪ | black or white | none |

Rules:

* The accent is for **fills, rings, the countdown, the active tab bar and celebrations**. As text use `accentText`, which is the accent darkened (or lightened) until it passes 4.5:1.
* Gradients are a **background wash only**, never on a button.
* **Green, amber and red mean a state** (under, near or over budget; going, maybe, can't go; delete). They are never decoration.
* The dark mode desaturates every accent.
* Every text pair is checked by `src/theme/__tests__/palettes.test.ts`: body text reaches 4.5:1 (WCAG AA) on every surface in all 6 themes in both modes.
* The person picks the theme and mode in *Make it yours* or *Settings*. `System` is the default and follows the phone when the app opens.

### Type: three tiers (`T` in `src/components/ui/T.tsx`)

| Tier | Variants | Use |
|---|---|---|
| **Display**: Anton, condensed, uppercase, tight tracking (-0.03em) | `hero` 96, `display` 44, `headline` 28, `numeral` 40, `numeralSm` 28 | The big countdown, page titles, section titles, and **numbers that matter** (days, money, scores). Never below 26 px, never for paragraphs. |
| **Heading**: Manrope bold | `h1` 28, `h2` 22, `h3` 20 | Card and sheet titles |
| **Body and UI**: Manrope 400 to 700 | `title` 16, `body` 16, `bodySm` 15, `small` 14, `caption` 12.5, `kicker` 11.5, `micro` 11 | Everything else |

### Shape, space and depth

* **Radius:** 8 for buttons and inputs (`radius.button`), 12 for cards and images (`radius.card`), 16 for sheets and dialogs (`radius.modal`), fully round for pills, chips and tab selectors. *Corner style* in Settings scales them.
* **Space:** a 4-point scale (`space`). The gap **between** blocks on a page (`space.section`, 32) is always bigger than any gap **inside** one block.
* **Shadows** only on cards and floating things, and only in the light mode.
* **Touch:** everything you tap is at least 44 x 44 points (`touch.min`). `Press` adds an invisible hit area to anything smaller. Buttons are 44, 48 or 56 high.

### Motion (`src/components/ui/motion.tsx`)

* Press: squeeze to 96% and spring back with a little overshoot (`Press`). Small things take 150 to 250 ms, sheets 340 ms (`timing`).
* Headlines slide up word by word, 50 ms apart (`StaggerText`); a countdown's digits roll when they change (`RollingNumber`); photo heroes zoom slowly (Ken Burns, 1.0 to 1.08) and drift against the scroll (parallax).
* **Everything that moves is gated.** It stops when the person turns *Animations* off in Settings or the phone's *Reduce Motion* is on (`useMotion`). Replace movement with a fade, never remove the content.
* **Celebrations are rare and chosen:** a quiz win, an activity or poll locking in, a settled budget, "1 day to go", the end of *Make it yours*. `celebrate()` ticks the haptic and throws confetti according to the *Effects* setting (Chill: none, Lively: some, Max: lots).
* **Loading** shows a `Skeleton` the size of the real thing. **Empty** screens are invitations (`EmptyState`): a big playful picture, a display-type prompt, one button.

## 2. Structure

* **Five tabs:** Home, Plan, Budget, Chat, More. Home is first and More last, the two ends that are easiest to find. The accent bar on the tab bar slides to where you are.
* **Home**, top to bottom, in the order of the chosen layout (*Planner*, *Money* or *Party*; any block can be hidden or moved in Settings): hero with the countdown (3 DAYS TO GO, then DAY 2 OF 5, then a recap), Up next, Weather, Group budget, Your crew, Play (today's trivia, the crew-points podium, something to vote on), then Picked for you and Discover.
* **Make it yours** is short: Welcome, Look (theme and mode), Interests, Home layout, Vibe (effects and a trivia reminder), then a reveal. One question per screen, every step can be skipped, and every answer changes the app you can see. Everything is editable later in Settings, and Settings has *Make it yours again*.
* **One main action per screen** in the thumb zone: a black round **+** button at the bottom right (`Fab`) or a sticky button at the bottom of a sheet.

## 3. The Laws of UX, and how the app uses them

| Law | In plain words | What the app does |
|---|---|---|
| **Hick's law** | More choices, slower decisions | Five tabs; More is 4 groups of big tiles; settings are split into a few cards with the rest under *Advanced*; Add activity asks for a place first and hides the rest under *More options*; Home shows the blocks you chose. |
| **Fitts's law** | Big, close targets are easy | Every tap target is at least 44 pt (`Press` grows small ones); the main action sits in the thumb zone; buttons are 44 to 56 high; destructive buttons are never next to the main one. |
| **Jakob's law** | People expect what other apps do | Bottom tabs, a back chevron, pull to refresh, bottom sheets, a share sheet, standard switches and a keyboard that does not cover the field. |
| **Miller's law** and **chunking** | Short lists are easier to remember | Lists are grouped under headings (Your trip, Around town, Just for fun, The app); the crew strip shows 5 faces and "+3"; sheets group fields in 3 to 5. |
| **Law of proximity** and **common region** | Things that belong together sit together | Space between blocks (32) is always bigger than inside one (8 to 16); each idea sits in its own card. |
| **Law of similarity** | Things that look alike behave alike | One button style per kind of action; chips always choose; pills are labels; icons are one family. |
| **Law of Prägnanz** | People read the simplest shape | Flat cards, one border style, one radius per kind of object, no gradients on controls. |
| **Von Restorff effect** | The odd one out gets remembered | The accent and the one black button are the only loud things on a screen, so they are the ones you notice. |
| **Aesthetic-usability effect** | Beautiful feels easier | A systematic type scale, a calm palette, a real photo hero and smooth motion. |
| **Doherty threshold** | Answer within 400 ms | Optimistic updates, skeletons the size of the real thing, saved places shown at once while the web results load, 150 to 250 ms transitions. |
| **Goal-gradient** and **Zeigarnik effect** | Progress pulls you to finish | The step bar in *Make it yours*, the budget bar, the packing and checklist progress, "3 days to go". |
| **Peak-end rule** | People remember the high point and the end | Confetti at the moments that matter and a "Building your trip HQ" reveal at the end of the survey; the trip recap is a shareable card. |
| **Serial position effect** | The first and last items stick | Home first and More last in the tab bar; the main action first in a list of actions; the invite button is in the first row of the crew block. |
| **Tesler's law** | Someone has to deal with the complexity: the app, not the user | Categories are guessed from the words, the distance to a place is worked out for you, currencies are converted, time zones are shown for you. |
| **Postel's law** | Be liberal in what you accept | "the museum" finds "Museum"; dates and times are checked kindly; one-tap suggestions fill forms. |
| **Mental model** and **paradox of the active user** | People start using it at once and do not read manuals | A short tour and tooltips instead of a manual; a demo account; nothing needs reading before it can be used. |
| **Cognitive load** and **selective attention** | Less to take in at once | Progressive disclosure (*More options*, *Advanced*, *Filter*), one question per screen, calm base colours so the few bright things are seen. |
| **Choice overload** | Too many options freeze people | Presets first (three Home layouts, six themes), custom second. |

## 4. Accessibility

* **Contrast:** unit-tested (see above). **Text size:** the Settings switch scales text; the display tier grows less so layouts hold. **Reduce Motion** is respected; nothing is hidden when motion stops.
* **Targets:** at least 44 pt; `e2e/targets.js` fails if a visible control is smaller than 44 x 44.
* **Screen readers:** every control has a name; the headline is one heading; the countdown reads as a sentence; decorative art is hidden.
* **Colour is never the only signal:** states also have an icon or a word.

## 5. Checking the design

```bash
npm test                         # palettes, contrast, layouts, confetti, migrations ...
npm run e2e                      # every screen at 3 sizes, no nested buttons, tap-target sizes, reduced motion ...
node e2e/shoot.js --modes=light,dark --themes=amalfi,midnight --routes=explore,itinerary   # pictures to look at
```

When you add a screen: use `Screen` and `Header`, the `T` variants and the tokens (no loose hex colours or font sizes), one `Fab` or one primary `Button`, an `EmptyState`, a `Skeleton` for anything that loads, `celebrate()` only for a real achievement, and look at it in the light and the dark mode.
